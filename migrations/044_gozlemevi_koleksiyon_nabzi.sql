-- ═══════════════════════════════════════════════════════════════════════════
-- 044 · Gözlemevi · Koleksiyonun Nabzı — kart evreninin iki kolu
-- ───────────────────────────────────────────────────────────────────────────
-- NEDEN: İç Çalışma 04 rev.2 (19 Ağustos 2026) kart evrenini bugünkü koda
-- karşı inceledi ve bir aylık boşluğun genişlediğini buldu: kimlik kolu
-- (10q Kişi Kartları) kart dağıtıyor, bilgelik kolu (12f Hazine) Elmas
-- HARCATIYOR — ve ikisi de sayılmıyordu. Ekonomisi olan bir koleksiyon
-- ölçülmeden ayarlanamaz; nadirlik oranlarına ve pity eşiklerine bu tablo
-- dolmadan dokunulmaması bilinçli bir sınırdır.
--
-- Şema DEĞİŞMEZ: nabız mevcut usage_events satırlarıdır (kind='kart',
-- 00f wtLogKart). Bu dosyanın yaptığı tek şey admin_usage_report'a
-- 'kart_pulse' bloğunu eklemek — yani fonksiyonu yeniden kurmak.
--
-- Gövde 042'nin üstüne biner; sıra 000 → 041 → 042 → 044 olduğu sürece
-- güncel tanım budur. (043 persona_directives_history bu fonksiyona dokunmaz.)
--
-- İdempotent: CREATE OR REPLACE — tekrar çalıştırmak güvenlidir.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION admin_usage_report(p_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since TIMESTAMPTZ := now() - make_interval(days => GREATEST(COALESCE(p_days, 30), 1));
  v_out   JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'admin_usage_report: yetkisiz';
  END IF;

  WITH ev AS (
    SELECT user_id, session_id, screen, kind, prev_screen, entered_at,
           (entered_at AT TIME ZONE 'Europe/Istanbul')  AS local_ts,
           LEAST(GREATEST(duration_ms, 0), 1800000)     AS dur_ms,   -- absürt değer kırpma (≤30 dk)
           meta
    FROM usage_events
    WHERE entered_at >= v_since
  ),
  view_ev AS (SELECT * FROM ev WHERE kind = 'view'),
  user_top AS (  -- gezgin başına en çok yaşadığı ekran
    SELECT DISTINCT ON (user_id) user_id, screen
    FROM (SELECT user_id, screen, SUM(dur_ms) AS s FROM view_ev GROUP BY user_id, screen) q
    ORDER BY user_id, s DESC
  )
  SELECT jsonb_build_object(
    'period_days', p_days,
    'generated_at', now(),

    'overview', (SELECT jsonb_build_object(
        'total_view_seconds',  COALESCE(SUM(dur_ms) / 1000, 0)::BIGINT,
        'active_users',        COUNT(DISTINCT user_id),
        'sessions',            COUNT(DISTINCT session_id),
        'avg_session_seconds', COALESCE((SUM(dur_ms) / 1000.0) / NULLIF(COUNT(DISTINCT session_id), 0), 0)::INT
      ) FROM view_ev),

    'screens', (SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'seconds')::BIGINT DESC), '[]'::jsonb)
      FROM (SELECT jsonb_build_object(
              'screen', screen, 'kind', kind,
              'seconds', (SUM(dur_ms) / 1000)::BIGINT,
              'enters',  COUNT(*),
              'users',   COUNT(DISTINCT user_id)) AS x
            FROM ev GROUP BY screen, kind) s),

    'heatmap', (SELECT COALESCE(jsonb_agg(jsonb_build_object('dow', d, 'hour', h, 'seconds', s)), '[]'::jsonb)
      FROM (SELECT EXTRACT(ISODOW FROM local_ts)::INT AS d,   -- 1=Pzt … 7=Paz
                   EXTRACT(HOUR   FROM local_ts)::INT AS h,
                   (SUM(dur_ms) / 1000)::BIGINT       AS s
            FROM view_ev GROUP BY 1, 2) q),

    'transitions', (SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'count')::INT DESC), '[]'::jsonb)
      FROM (SELECT jsonb_build_object('from', prev_screen, 'to', screen, 'count', COUNT(*)) AS x
            FROM view_ev
            WHERE prev_screen IS NOT NULL AND prev_screen <> screen
            GROUP BY prev_screen, screen
            ORDER BY COUNT(*) DESC LIMIT 15) t),

    'trend', (SELECT COALESCE(jsonb_agg(x ORDER BY x->>'day'), '[]'::jsonb)
      FROM (SELECT jsonb_build_object(
              'day',     to_char(local_ts, 'YYYY-MM-DD'),
              'seconds', (SUM(dur_ms) / 1000)::BIGINT,
              'users',   COUNT(DISTINCT user_id)) AS x
            FROM view_ev GROUP BY to_char(local_ts, 'YYYY-MM-DD')) tr),

    'chat_depth', (SELECT jsonb_build_object(
        'segments',        COUNT(*),
        'silent_segments', COUNT(*) FILTER (WHERE COALESCE((meta->>'msgs')::INT, 0) = 0),
        'total_msgs',      COALESCE(SUM((meta->>'msgs')::INT), 0)
      ) FROM view_ev WHERE screen = 'chat'),

    -- Mod Nabzı: 00f wtLogMode() her LLM turunda kind='mode' satırı ekler —
    -- screen=gerçekleşen mod, prev_screen=regex ipucu, meta.tag_missing=[MOD:] gelmedi.
    'mode_pulse', (SELECT jsonb_build_object(
        'total_turns',     COUNT(*),
        'tag_missing_pct', COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE (meta->>'tag_missing')::boolean) / NULLIF(COUNT(*), 0), 1), 0),
        'hint_match_pct',  COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE screen = prev_screen) / NULLIF(COUNT(*), 0), 1), 0),
        'distribution', (SELECT COALESCE(jsonb_agg(jsonb_build_object('mode', m.screen, 'count', m.c) ORDER BY m.c DESC), '[]'::jsonb)
                         FROM (SELECT screen, COUNT(*) AS c FROM ev WHERE kind = 'mode' GROUP BY screen) m)
      ) FROM ev WHERE kind = 'mode'),

    -- Hafıza Nabzı (İç Çalışma 02 · boşluk A): 00f wtLogMemory() —
    -- screen=tur (recall|prefetch|ingest|backfill), prev_screen=yol
    -- (uzak|yerel|bos|hata), duration_ms=süre, meta.sayi=kayıt adedi.
    -- ASIL SORU: 09f gerçekten uzak yoldan mı çalışıyor, yoksa şema/embed
    -- deploy edilmediği için sessizce hep yerel fallback'te mi? 'uzak_pct'
    -- düşükse motor prod'da yaşamıyor demektir.
    'memory_pulse', (SELECT jsonb_build_object(
        'total',    COUNT(*),
        'recall',   COUNT(*) FILTER (WHERE screen = 'recall'),
        'prefetch', COUNT(*) FILTER (WHERE screen = 'prefetch'),
        'ingest',   COUNT(*) FILTER (WHERE screen IN ('ingest', 'backfill')),
        'uzak_pct', COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE prev_screen = 'uzak') / NULLIF(COUNT(*), 0), 1), 0),
        'hata_pct', COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE prev_screen = 'hata') / NULLIF(COUNT(*), 0), 1), 0),
        'avg_ms',   COALESCE(ROUND(AVG(duration_ms) FILTER (WHERE duration_ms > 0))::INT, 0),
        'yollar', (SELECT COALESCE(jsonb_agg(jsonb_build_object('tur', y.screen, 'yol', y.prev_screen, 'count', y.c) ORDER BY y.c DESC), '[]'::jsonb)
                   FROM (SELECT screen, prev_screen, COUNT(*) AS c
                         FROM ev WHERE kind = 'memory' GROUP BY screen, prev_screen) y)
      ) FROM ev WHERE kind = 'memory'),

    -- Gecikme Nabzı (İç Çalışma 01 · FAZ 4 · rev.2 boşluk F): 00f wtLogLatency()
    -- bir aydır yazıyordu, hiçbir yerde OKUNMUYORDU. screen=yanıtlayan model,
    -- duration_ms=ilk token süresi. "Hız mı derinlik mi" kararı bu iki sayıya
    -- (p50/p95) bakılarak verilir — izlenime değil.
    'latency_pulse', (SELECT jsonb_build_object(
        'total_turns', COUNT(*),
        'p50_ms', COALESCE(ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms))::INT, 0),
        'p95_ms', COALESCE(ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms))::INT, 0),
        'models', (SELECT COALESCE(jsonb_agg(jsonb_build_object('model', m.screen, 'count', m.c, 'p50_ms', m.p50) ORDER BY m.c DESC), '[]'::jsonb)
                   FROM (SELECT screen, COUNT(*) AS c,
                                ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms))::INT AS p50
                         FROM ev WHERE kind = 'latency' GROUP BY screen) m)
      ) FROM ev WHERE kind = 'latency'),

    -- Bağlam Nabzı (İç Çalışma 02 · boşluklar D+H): 00f wtLogCtx() —
    -- screen=ctx modu, meta.kanallar={kanal: bayt}, meta.toplam=system prompt
    -- uzunluğu. Kanal payları ölçülmeden tavan kararı sezgidir; `p_` önekli
    -- satırlar `personalization` kanalının İÇ kırılımıdır (09a), toplamla
    -- yarışmaz. meta ASLA metin taşımaz (00f gizlilik sözleşmesi).
    'ctx_pulse', (SELECT jsonb_build_object(
        'total_turns', COUNT(*),
        'avg_toplam',  COALESCE(ROUND(AVG((meta->>'toplam')::INT))::INT, 0),
        'max_toplam',  COALESCE(MAX((meta->>'toplam')::INT), 0),
        'kanallar', (SELECT COALESCE(jsonb_agg(jsonb_build_object('kanal', k.key, 'avg_bytes', k.avg_b, 'turns', k.n) ORDER BY k.avg_b DESC), '[]'::jsonb)
                     FROM (SELECT kv.key AS key,
                                  ROUND(AVG((kv.value #>> '{}')::INT))::INT AS avg_b,
                                  COUNT(*) AS n
                           FROM ev e2
                           CROSS JOIN LATERAL jsonb_each(COALESCE(e2.meta->'kanallar', '{}'::jsonb)) kv
                           WHERE e2.kind = 'ctx'
                           GROUP BY kv.key) k)
      ) FROM ev WHERE kind = 'ctx'),

    -- Koleksiyonun Nabzı (İç Çalışma 04 rev.2 · boşluk Y1): 00f wtLogKart() —
    -- screen=olay (ilk-kart|kazanim|paket|dupe-iade|set-tamam),
    -- prev_screen=katalog anahtarı, meta={nadirlik,kategori,n,elmas}.
    -- İKİ KOL tek kanalda: kategori='hazine' bilgelik kolu (12f, Elmas'la
    -- açılır), diğer her şey kimlik kolu (10q, davranışla kazanılır).
    -- ELMAS'IN İKİ YÖNÜ: meta.elmas harcamada negatif, iade/bonus'ta pozitif —
    -- toplamları ayrı ayrı okunur ki "biriktirip harcamayan" görünür olsun.
    -- meta ASLA metin taşımaz (00f gizlilik sözleşmesi): kart id'si bir
    -- katalog anahtarıdır, portre metni etiket desenine takılıp null'a düşer.
    'kart_pulse', (SELECT jsonb_build_object(
        'total',          COUNT(*),
        'ilk_karti_acan', COUNT(DISTINCT user_id) FILTER (WHERE screen = 'ilk-kart'),
        'kazanim',        COUNT(*) FILTER (WHERE screen IN ('kazanim', 'ilk-kart')),
        'paket',          COUNT(*) FILTER (WHERE screen = 'paket'),
        'set_tamam',      COUNT(*) FILTER (WHERE screen = 'set-tamam'),
        -- harcama negatif yazılır; okurken işareti çevirip pozitif gösteriyoruz
        'elmas_harcanan', COALESCE(-SUM((meta->>'elmas')::INT) FILTER (WHERE (meta->>'elmas')::INT < 0), 0),
        'elmas_iade',     COALESCE(SUM((meta->>'elmas')::INT) FILTER (WHERE (meta->>'elmas')::INT > 0), 0),
        -- kazanım satırlarında meta.n koleksiyon büyüklüğüdür (paket satırında
        -- paketteki kart sayısı) — bu yüzden yalnız kimlik olaylarından okunur
        'ort_koleksiyon', COALESCE(ROUND(AVG((meta->>'n')::INT) FILTER (WHERE screen IN ('kazanim', 'ilk-kart') AND (meta->>'n')::INT > 0))::INT, 0),
        'nadirlikler', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                            'nadirlik', n.nadirlik, 'kategori', n.kategori, 'count', n.c)
                          ORDER BY n.c DESC), '[]'::jsonb)
                        FROM (SELECT COALESCE(meta->>'nadirlik', 'bilinmiyor') AS nadirlik,
                                     -- KOLA İNDİRGENİR, kartın kendi kategorisine DEĞİL:
                                     -- kimlik kolu meta.kategori'ye kartın kategorisini yazar
                                     -- (cekirdek|temel|golge|tuzak|bilesik — beş değer), panel ise
                                     -- hepsini tek etiketle ("kimlik") çizer. Ham kategoriyle
                                     -- gruplayınca aynı satır beş kez görünüyordu; ayrım İKİ KOL.
                                     CASE WHEN meta->>'kategori' = 'hazine' THEN 'hazine'
                                          ELSE 'kimlik' END                    AS kategori,
                                     COUNT(*) AS c
                              FROM ev
                              WHERE kind = 'kart' AND screen IN ('kazanim', 'ilk-kart', 'paket')
                              GROUP BY 1, 2) n)
      ) FROM ev WHERE kind = 'kart'),

    'users', (SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'seconds')::BIGINT DESC), '[]'::jsonb)
      FROM (SELECT jsonb_build_object(
              'user_id',    u.user_id,
              'email',      au.email,
              'seconds',    u.secs,
              'sessions',   u.sess,
              'top_screen', ut.screen,
              'last_seen',  u.last_seen,
              'streak',     ue.streak) AS x
            FROM (SELECT user_id,
                         (SUM(dur_ms) / 1000)::BIGINT AS secs,
                         COUNT(DISTINCT session_id)   AS sess,
                         MAX(entered_at)              AS last_seen
                  FROM view_ev GROUP BY user_id
                  ORDER BY 2 DESC LIMIT 100) u
            LEFT JOIN auth.users      au ON au.id      = u.user_id
            LEFT JOIN user_top        ut ON ut.user_id = u.user_id
            LEFT JOIN user_engagement ue ON ue.user_id = u.user_id) us),

    'silent_users', (SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'silent_days')::INT DESC), '[]'::jsonb)
      FROM (SELECT jsonb_build_object(
              'user_id',     ue.user_id,
              'email',       au.email,
              'streak',      ue.streak,
              'last_active', ue.last_active_date,
              'silent_days', (CURRENT_DATE - ue.last_active_date)::INT) AS x
            FROM user_engagement ue
            LEFT JOIN auth.users au ON au.id = ue.user_id
            WHERE ue.last_active_date IS NOT NULL
              AND ue.last_active_date < CURRENT_DATE - 7
            ORDER BY ue.last_active_date ASC LIMIT 50) sq)
  ) INTO v_out;

  RETURN v_out;
END;
$$;

REVOKE ALL     ON FUNCTION admin_usage_report(INTEGER) FROM PUBLIC;
REVOKE ALL     ON FUNCTION admin_usage_report(INTEGER) FROM anon;
GRANT  EXECUTE ON FUNCTION admin_usage_report(INTEGER) TO authenticated;
