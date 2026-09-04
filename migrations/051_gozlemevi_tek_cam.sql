-- ═══════════════════════════════════════════════════════════════════════════
-- 051 — GÖZLEMEVİ · TEK CAM  (On İki Odanın Denetimi · FAZ 4)
--
-- On bir oda (09–18) + Atlas tek soruyu tekrarladı: uygulama çok şey
-- yazıyor, Gözlemevi azını okuyor (oda 17'nin "Tek Cam" başlığı). Bu dosya
-- o boşluğun yedisini kapatır — beşi zaten yazılan ama hiç okunmayan
-- usage_events kanalları (kota · araç · bölge · paylaşım · emniyet), ikisi
-- bugüne dek hiç OKUNMAMIŞ iki ayrı tablo (error_logs, notification_log).
--
-- K2 (plan `.claude/plans/ic-calisma-08-19-denetim.md`) — TEK MİGRATION,
-- ON YEDİ BLOK: admin_usage_report'a dokunan her dosya bir öncekinin TÜM
-- bloklarını taşımak zorundadır (migrations/README.md: "bir blok düşerse
-- o kart Gözlemevi'nden kaybolur"). 050'nin on altı üst-düzey bloğu
-- AŞAĞIDA AYNEN taşınır: overview · screens · heatmap · transitions ·
-- trend · chat_depth · mode_pulse · memory_pulse · latency_pulse ·
-- ctx_pulse · kart_pulse · ritus_pulse · esik_pulse · duygu_pulse ·
-- kimlik_pulse · model_pulse. Üstüne yedi yeni blok biner: kota_pulse ·
-- arac_pulse · bolge_pulse · paylasim_pulse · safety_pulse · error_pulse ·
-- notification_pulse — toplam on yedi `*_pulse`.
-- Kapı: tests/migration-blok-tasima.test.js — bir sonraki dosya bir
-- öncekinin blok kümesini eksiltirse test kırmızı olur (bir blok düşerse
-- artık kanıtla yakalanır, sözle değil — §6.6).
--
-- K3 — ORAN BURADA HESAPLANMAZ: yeni yedi blok da öncekiler gibi yalnız
-- HAM SAYI döner; oranı panel (13q) kurar, payda 0/NULL ise göstermez
-- (§6.10, kanıtsız değer yok).
--
-- RİSK 3 — error_logs ve notification_log usage_events DEĞİLDİR, kendi
-- tablolarından okunur ve prod'da HENÜZ uygulanmamış olabilirler (000'e
-- sonradan eklendiler; bugünkü canlı şemanın hangi 000 sürümüyle
-- kurulduğu repodan görünmez — §10.2'nin dersi: mekanik olarak mümkün mü
-- diye önce bak). Doğrudan sorgu gömmek check_function_bodies'i tabloyu
-- CREATE FUNCTION ANINDA arattırır — tablo yoksa migration'ın KENDİSİ
-- patlar. Bu yüzden ikisi de to_regclass(...) kapısının arkasında,
-- dinamik SQL (EXECUTE metin) ile DECLARE aşamasında hesaplanıp
-- v_error_pulse ile v_notification_pulse değişkenlerine yazılır; metin hâlindeki EXECUTE
-- isim çözümlemesini çalışma anına erteler — tablo yoksa dal hiç
-- çalışmaz, değer NULL kalır, fonksiyon yine de kurulur ve çalışır
-- (emsal: 000_wanderer_schema.sql §2 ad göçü bloğundaki to_regclass
-- kapısı).
--
-- MUTLAK KURAL (error_pulse) — error_message / error_stack / context /
-- user_agent BURADA HİÇBİRİ DÖNMEZ. `label` geliştiricinin yazdığı sabit
-- etikettir, ötekiler kullanıcı verisi taşıyabilir. Bu raporun çıktısı
-- 13q'da gzYorumla üzerinden LLM'e giden bir özetin girdisidir
-- (13q:1079 _compactForLLM) — serbest metni rapora hiç koymamak sızma
-- ihtimalini kökten keser (§6.10 + oda 17'nin "içerik loglanmaz, kimlik
-- LLM'e gitmez" sözleşmesi).
--
-- MUTLAK KURAL (notification_pulse) — title / body BURADA DÖNMEZ; LLM'in
-- yazdığı kişisel metinlerdir. Yalnız tip + gönderim/tıklanma sayısı
-- döner (huninin iki basamağı); oran panelde kurulur (K3).
--
-- Gövde 050'nin üstüne biner; sıra 000 → 041 → … → 050 → 051 olduğu
-- sürece güncel tanım budur. İdempotent: CREATE OR REPLACE — tekrar
-- çalıştırmak güvenlidir. ELLE koşulur (§6.5) — Supabase Dashboard →
-- SQL Editor → yapıştır → Run.
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
  -- RİSK 3: to_regclass kapısının arkasında dinamik SQL ile doldurulur;
  -- tablo yoksa NULL kalır (bkz. yukarıdaki başlık notu).
  v_error_pulse        JSONB := NULL;
  v_notification_pulse JSONB := NULL;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'admin_usage_report: yetkisiz';
  END IF;

  -- HATA NABZI'nın kaynağı: error_logs tablo VARSA doldurulur, yoksa NULL
  -- kalır — fonksiyon yine de kurulur ve çalışır (RİSK 3).
  IF to_regclass('public.error_logs') IS NOT NULL THEN
    EXECUTE $err$
      WITH e AS (
        SELECT user_id, label,
               (occurred_at AT TIME ZONE 'Europe/Istanbul') AS local_ts
        FROM error_logs
        WHERE occurred_at >= $1
      )
      SELECT jsonb_build_object(
          'total',          COUNT(*),
          'affected_users', COUNT(DISTINCT user_id),
          'top_labels', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                             'label', l.label, 'n', l.c) ORDER BY l.c DESC), '[]'::jsonb)
                         FROM (SELECT label, COUNT(*) AS c FROM e
                               GROUP BY label ORDER BY COUNT(*) DESC LIMIT 8) l),
          'trend', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'day', tr.d, 'count', tr.c) ORDER BY tr.d), '[]'::jsonb)
                    FROM (SELECT to_char(local_ts, 'YYYY-MM-DD') AS d, COUNT(*) AS c
                          FROM e GROUP BY 1) tr)
        ) FROM e
    $err$ INTO v_error_pulse USING v_since;
  END IF;

  -- BİLDİRİM NABZI'nın kaynağı: notification_log tablo VARSA doldurulur,
  -- yoksa NULL kalır (RİSK 3).
  IF to_regclass('public.notification_log') IS NOT NULL THEN
    EXECUTE $notif$
      WITH n AS (
        SELECT type, clicked_at
        FROM notification_log
        WHERE sent_at >= $1
      )
      SELECT jsonb_build_object(
          'total', COUNT(*),
          'tip_dagilim', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                              'tip', t.type, 'gonderim', t.sent, 'tiklanma', t.clicked)
                            ORDER BY t.sent DESC), '[]'::jsonb)
                          FROM (SELECT type, COUNT(*) AS sent,
                                       COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) AS clicked
                                FROM n GROUP BY type) t)
        ) FROM n
    $notif$ INTO v_notification_pulse USING v_since;
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
        'avg_ms',   COALESCE(ROUND(AVG(dur_ms) FILTER (WHERE dur_ms > 0))::INT, 0),
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
        'p50_ms', COALESCE(ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY dur_ms))::INT, 0),
        'p95_ms', COALESCE(ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY dur_ms))::INT, 0),
        'models', (SELECT COALESCE(jsonb_agg(jsonb_build_object('model', m.screen, 'count', m.c, 'p50_ms', m.p50) ORDER BY m.c DESC), '[]'::jsonb)
                   FROM (SELECT screen, COUNT(*) AS c,
                                ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY dur_ms))::INT AS p50
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

    -- RİTÜELLERİN NABZI: huninin iki ucu tek kanalda. prev_screen olayı taşır
    -- (basladi|tamam|birakti), screen ritüelin adıdır. Terk noktası meta.adim'de:
    -- çok adımlı ritüelde nereye kadar gelindiği. GİZLİLİK: meta yalnız iki
    -- sayı taşır (adim, n) — kullanıcının cümlesi bu kanala hiç girmez.
    'ritus_pulse', (SELECT jsonb_build_object(
        'total',             COUNT(*),
        'basladi',           COUNT(*) FILTER (WHERE prev_screen = 'basladi'),
        'tamam',             COUNT(*) FILTER (WHERE prev_screen = 'tamam'),
        'birakti',           COUNT(*) FILTER (WHERE prev_screen = 'birakti'),
        -- gezgin sayısı satır sayısından ayrı okunur: bir kişinin on seansı
        -- "on gezgin" değildir
        'baslayan_gezgin',   COUNT(DISTINCT user_id) FILTER (WHERE prev_screen = 'basladi'),
        'tamamlayan_gezgin', COUNT(DISTINCT user_id) FILTER (WHERE prev_screen = 'tamam'),
        -- Günlük Ritüel'in iki emek anı: söz verildi (adim=2) / akşam hesabı
        -- verildi (adim=3). İkisinin oranı taahhüt döngüsünün kapanma payıdır.
        'soz_veren',         COUNT(*) FILTER (WHERE screen = 'gunluk-ritus' AND prev_screen = 'tamam' AND (meta->>'adim')::INT = 2),
        'hesap_veren',       COUNT(*) FILTER (WHERE screen = 'gunluk-ritus' AND prev_screen = 'tamam' AND (meta->>'adim')::INT = 3),
        'soz_atlanan',       COUNT(*) FILTER (WHERE screen = 'gunluk-ritus' AND prev_screen = 'birakti'),
        'tutulan_soz',       COALESCE(SUM((meta->>'n')::INT) FILTER (WHERE screen = 'gunluk-ritus' AND (meta->>'adim')::INT = 3), 0),
        -- ritüel başına üç sayı: panel hangi direğin sessiz olduğunu buradan okur
        'ritueller', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                          'ad', r.ad, 'basladi', r.b, 'tamam', r.t, 'birakti', r.k,
                          'gezgin', r.g)
                        ORDER BY r.t DESC, r.b DESC), '[]'::jsonb)
                      FROM (SELECT screen AS ad,
                                   COUNT(*) FILTER (WHERE prev_screen = 'basladi') AS b,
                                   COUNT(*) FILTER (WHERE prev_screen = 'tamam')   AS t,
                                   COUNT(*) FILTER (WHERE prev_screen = 'birakti') AS k,
                                   COUNT(DISTINCT user_id)                         AS g
                            FROM ev WHERE kind = 'ritus'
                            GROUP BY 1) r),
        -- terk noktası: yarım bırakılan ritüelde en son görülen adım
        'terk_adimlari', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                              'ad', x.ad, 'adim', x.adim, 'count', x.c)
                            ORDER BY x.c DESC), '[]'::jsonb)
                          FROM (SELECT screen AS ad,
                                       COALESCE((meta->>'adim')::INT, 0) AS adim,
                                       COUNT(*) AS c
                                FROM ev
                                WHERE kind = 'ritus' AND prev_screen = 'birakti'
                                GROUP BY 1, 2) x)
      ) FROM ev WHERE kind = 'ritus'),

    -- EŞİĞİN NABZI (İç Çalışma 06 rev.2 · boşluk A · K7): 00f wtLogEsik() —
    -- screen=olay (perde|dil-kapisi|basladi|kategori|sentez|dogus|atladi|
    -- esik-ekrani); prev_screen ikincil eksendir — perde'de kat1|kat2,
    -- kategori'de dusunceler|inanclar|duygular|davranislar, sentez'de
    -- ok|fallback, esik-ekrani'nde acildi|kapandi (küme dışı satırlarda
    -- NULL). meta={adim,n,atlandi} — üçü de sayı, kullanıcının cümlesi bu
    -- kanala HİÇ girmez (00f gizlilik sözleşmesi).
    -- Eşik bir huni + dört kadran olarak okunur: doğuş oranı (dogus/basladi),
    -- kalemin düştüğü kategori (huninin en büyük basamağı), perdenin bedeli
    -- (atlama oranı + ort_ms), sentez sağlığı (fallback/ok+fallback).
    -- ORAN BURADA HESAPLANMAZ: payı da paydası da ham sayı döner, payda 0
    -- ise panel (13q) oranı göstermez, davet koyar (§6.10).
    'esik_pulse', (SELECT jsonb_build_object(
        'total', COUNT(*),
        'perde', jsonb_build_object(
          'n',       COUNT(*) FILTER (WHERE screen = 'perde'),
          'atlandi', COUNT(*) FILTER (WHERE screen = 'perde' AND (meta->>'atlandi')::INT = 1),
          'ort_ms',  COALESCE(ROUND(AVG(dur_ms) FILTER (WHERE screen = 'perde' AND dur_ms > 0))::INT, 0),
          'kat1',    COUNT(*) FILTER (WHERE screen = 'perde' AND prev_screen = 'kat1'),
          'kat2',    COUNT(*) FILTER (WHERE screen = 'perde' AND prev_screen = 'kat2')
        ),
        'dil_kapisi', COUNT(*) FILTER (WHERE screen = 'dil-kapisi'),
        'huni', jsonb_build_object(
          'basladi',         COUNT(*) FILTER (WHERE screen = 'basladi'),
          'dusunceler',      COUNT(*) FILTER (WHERE screen = 'kategori' AND prev_screen = 'dusunceler'),
          'inanclar',        COUNT(*) FILTER (WHERE screen = 'kategori' AND prev_screen = 'inanclar'),
          'duygular',        COUNT(*) FILTER (WHERE screen = 'kategori' AND prev_screen = 'duygular'),
          'davranislar',     COUNT(*) FILTER (WHERE screen = 'kategori' AND prev_screen = 'davranislar'),
          'sentez_ok',       COUNT(*) FILTER (WHERE screen = 'sentez' AND prev_screen = 'ok'),
          'sentez_fallback', COUNT(*) FILTER (WHERE screen = 'sentez' AND prev_screen = 'fallback'),
          'dogus',           COUNT(*) FILTER (WHERE screen = 'dogus'),
          'atladi',          COUNT(*) FILTER (WHERE screen = 'atladi')
        ),
        'esik_ekrani', jsonb_build_object(
          'acildi',  COUNT(*) FILTER (WHERE screen = 'esik-ekrani' AND prev_screen = 'acildi'),
          'kapandi', COUNT(*) FILTER (WHERE screen = 'esik-ekrani' AND prev_screen = 'kapandi')
        )
      ) FROM ev WHERE kind = 'esik'),

    -- YANILMA NABZI (13D §10 · K13 · FAZ 15): 00f wtLogDuygu() — screen=eksen
    -- (kural gereği tutma hariç altısı), kind='duygu', meta.yuzey (kapalı
    -- küme, yedi değer — geriye dönük satırlarda NULL→'sohbet' düşer),
    -- meta.duzeltildi (bool — false: "konuştu", true: "beni yanlış okudun").
    -- Bir satır ya birini ya öbürünü sayar, ikisini birden değil — konustu
    -- ve duzeltildi bu yüzden AYRI FILTER'lardır, toplamları çakışmaz.
    -- ORAN BURADA HESAPLANMAZ: payı da paydası da ham sayı döner, payda
    -- 5'in (13D DG_YANILMA_MIN_N) altındaysa panel (13q) oranı göstermez.
    'duygu_pulse', (SELECT jsonb_build_object(
        'total', COUNT(*),
        'yuzeyler', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'yuzey', y.yuzey, 'konustu', y.konustu, 'duzeltildi', y.duzeltildi)
                      ORDER BY y.konustu DESC), '[]'::jsonb)
                    FROM (SELECT COALESCE(meta->>'yuzey', 'sohbet') AS yuzey,
                                 COUNT(*) FILTER (WHERE COALESCE((meta->>'duzeltildi')::boolean, false) = false) AS konustu,
                                 COUNT(*) FILTER (WHERE (meta->>'duzeltildi')::boolean = true) AS duzeltildi
                          FROM ev WHERE kind = 'duygu'
                          GROUP BY 1) y)
      ) FROM ev WHERE kind = 'duygu'),

    -- KİMLİK ÜÇGENİNİN NABZI (İç Çalışma 07 rev.2 · boşluk D): 00f
    -- wtLogKimlik() — screen=olay (oik-dogus|oik-serbest|kayma|devir),
    -- prev_screen=kaynak (ilk|yeniden|earn|resolve), meta={gun,n}.
    -- GEZGİN SAYISI SATIR SAYISINDAN AYRI OKUNUR: bir kişinin üç kayması
    -- "üç gezgin" değildir.
    'kimlik_pulse', (SELECT jsonb_build_object(
        'total',           COUNT(*),
        -- lapis köşe: kaç gezgin olmak istediği kişiyi gerçekten yazdı
        'tasarlayan',      COUNT(DISTINCT user_id) FILTER (WHERE screen = 'oik-dogus'),
        'ilk_tasarim',     COUNT(*) FILTER (WHERE screen = 'oik-dogus' AND prev_screen = 'ilk'),
        'yeniden_tasarim', COUNT(*) FILTER (WHERE screen = 'oik-dogus' AND prev_screen = 'yeniden'),
        -- niyetten dönüş: kaç kez tasarlanan kişiden vazgeçildi
        'serbest',         COUNT(*) FILTER (WHERE screen = 'oik-serbest'),
        -- kartın dolgusu: doğduğu anda kaç madde taşıyordu (boş kart bir
        -- tasarım değildir; ortalama düşükse tören yarım kalıyor demektir)
        'ort_madde',       COALESCE(ROUND(AVG((meta->>'n')::INT) FILTER (WHERE screen = 'oik-dogus' AND (meta->>'n')::INT > 0))::INT, 0),
        -- altın köşe: kimlik davranışla mı el değiştiriyor (kayma),
        -- yoksa yalnız kart kazanımıyla mı (devir)?
        'kayma',           COUNT(*) FILTER (WHERE screen = 'kayma'),
        'devir',           COUNT(*) FILTER (WHERE screen = 'devir'),
        'kayan_gezgin',    COUNT(DISTINCT user_id) FILTER (WHERE screen = 'kayma'),
        -- HİSTEREZİSİN GERÇEK ÖLÇÜSÜ: kimlik ortalama kaç gün durduktan
        -- sonra el değiştirdi. 13l'in 18 saat / 8 puan eşiğine dokunmadan
        -- ÖNCE bu sayı okunur — raporun bilinçli sınırı budur.
        'ort_tutus_gun',   COALESCE(ROUND(AVG((meta->>'gun')::INT) FILTER (WHERE screen IN ('kayma', 'devir') AND (meta->>'gun')::INT > 0))::INT, 0)
      ) FROM ev WHERE kind = 'kimlik'),

    -- ÜÇ SESİN NABZI (İç Çalışma 08 rev.2 · boşluk A): 00f wtLogModel() —
    -- screen=olay (sec|kilit|dus), prev_screen=olayın öznesi eksen
    -- (oz|bag|eser), meta={oteki, prem}.
    -- GEZGİN SAYISI SATIR SAYISINDAN AYRI OKUNUR: bir kişinin dört geçişi
    -- "dört gezgin" değildir.
    'model_pulse', (SELECT jsonb_build_object(
        'total',      COUNT(*),
        -- niyet: kullanıcının eliyle yaptığı eksen değişimi
        'secim',      COUNT(*) FILTER (WHERE screen = 'sec'),
        'secen',      COUNT(DISTINCT user_id) FILTER (WHERE screen = 'sec'),
        -- karşılanmamış talep: Free gezgin Bağ/Eser'e dokundu, paywall'a gitti
        'kilit',      COUNT(*) FILTER (WHERE screen = 'kilit'),
        'kilitlenen', COUNT(DISTINCT user_id) FILTER (WHERE screen = 'kilit'),
        -- sessiz kayıp: Pro bitti, kayıtlı eksen Öz'e döndü, kimse söylemedi
        'dus',        COUNT(*) FILTER (WHERE screen = 'dus'),
        'dusen',      COUNT(DISTINCT user_id) FILTER (WHERE screen = 'dus'),
        -- kullanıcının ELİYLE geçtiği eksenler (kilit ve düşüş DIŞARIDA:
        -- onlar seçim değil, seçilememedir)
        'secim_dagilim', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                              'model', x.m, 'n', x.c, 'gezgin', x.g) ORDER BY x.c DESC), '[]'::jsonb)
                          FROM (SELECT prev_screen AS m, COUNT(*) AS c, COUNT(DISTINCT user_id) AS g
                                FROM ev WHERE kind = 'model' AND screen = 'sec' AND prev_screen IS NOT NULL
                                GROUP BY 1) x),
        -- kapıya çarpılan eksenler: hangi sesin arkasında kaç gezgin bekliyor
        'kilit_dagilim', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                              'model', x.m, 'n', x.c, 'gezgin', x.g) ORDER BY x.c DESC), '[]'::jsonb)
                          FROM (SELECT prev_screen AS m, COUNT(*) AS c, COUNT(DISTINCT user_id) AS g
                                FROM ev WHERE kind = 'model' AND screen = 'kilit' AND prev_screen IS NOT NULL
                                GROUP BY 1) x),
        -- geçiş matrisi: hangi eksenden hangisine gidiliyor
        'gecis', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                      'from', y.o, 'to', y.h, 'n', y.c) ORDER BY y.c DESC), '[]'::jsonb)
                  FROM (SELECT meta->>'oteki' AS o, prev_screen AS h, COUNT(*) AS c
                        FROM ev WHERE kind = 'model' AND screen = 'sec'
                          AND meta->>'oteki' IS NOT NULL AND prev_screen IS NOT NULL
                        GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 12) y),
        -- YAŞANMIŞ HÂLİ: tur başına eksen, latency kanalının meta.fm'inden.
        -- Ayrı olay yazılmaz (K2) — seçim niyettir, bu gerçekten konuşulandır.
        'eksen_tur', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                          'model', z.f, 'tur', z.c, 'gezgin', z.g) ORDER BY z.c DESC), '[]'::jsonb)
                      FROM (SELECT meta->>'fm' AS f, COUNT(*) AS c, COUNT(DISTINCT user_id) AS g
                            FROM ev WHERE kind = 'latency' AND meta->>'fm' IS NOT NULL
                            GROUP BY 1) z)
      ) FROM ev WHERE kind = 'model'),

    -- KOTA NABZI (İç Çalışma 16 rev.2 · boşluk C): 00f wtLogKota() —
    -- paywall hunisi bugüne dek kördü, `13m`'in tek çağrısı safety_pulse bloğuna
    -- (crisis_grace) biniyordu; duvara kaç kişi çarptı, sheet'i kaçı gördü,
    -- kaçı bonus'la geçti hiç sayılmıyordu. screen=olay (duvar|sheet|gate|
    -- iptal|bonus), prev_screen=dal (a|b|bonus|crisis), meta.tier=katman
    -- (free|pro|max). Bu kanal yalnız GÖZLEMLER — kota sayacının kendisine
    -- dokunmaz (Riskler §4, 00f wtLogKota başlığı).
    'kota_pulse', (SELECT jsonb_build_object(
        'total', COUNT(*),
        'huni', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                     'olay', o.screen, 'n', o.c, 'gezgin', o.g) ORDER BY o.c DESC), '[]'::jsonb)
                 FROM (SELECT screen, COUNT(*) AS c, COUNT(DISTINCT user_id) AS g
                       FROM ev WHERE kind = 'kota' GROUP BY screen) o),
        'dal_dagilim', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                            'dal', d.prev_screen, 'n', d.c) ORDER BY d.c DESC), '[]'::jsonb)
                        FROM (SELECT prev_screen, COUNT(*) AS c
                              FROM ev WHERE kind = 'kota' AND prev_screen IS NOT NULL
                              GROUP BY prev_screen) d),
        'tier_dagilim', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                             'tier', t.tier, 'n', t.c) ORDER BY t.c DESC), '[]'::jsonb)
                         FROM (SELECT meta->>'tier' AS tier, COUNT(*) AS c
                               FROM ev WHERE kind = 'kota' AND meta->>'tier' IS NOT NULL
                               GROUP BY 1) t)
      ) FROM ev WHERE kind = 'kota'),

    -- ARAÇ NABZI (İç Çalışma 09 rev.2 · boşluk D): 00f wtLogArac() —
    -- Araç Motoru'nun (13a `_ARAC_DEFS`) önerdiği her şeyin kabul mü ret mi
    -- gördüğü bilinmiyordu. screen=olay (oner|onayla|reddet), prev_screen=
    -- araç (soz|not|gecis|imge). Kabul oranı BURADA HESAPLANMAZ (K3) —
    -- matris ham sayı döner, oranı panel kurar.
    'arac_pulse', (SELECT jsonb_build_object(
        'total', COUNT(*),
        'matris', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                       'arac', m.prev_screen, 'olay', m.screen, 'n', m.c)
                     ORDER BY m.prev_screen, m.screen), '[]'::jsonb)
                   FROM (SELECT prev_screen, screen, COUNT(*) AS c
                         FROM ev WHERE kind = 'arac' AND prev_screen IS NOT NULL
                         GROUP BY prev_screen, screen) m)
      ) FROM ev WHERE kind = 'arac'),

    -- BÖLGE NABZI (İç Çalışma 18 rev.2 · boşluk A): 00f wtLogBolge() —
    -- ayracın altına kaç kişi indiği, galeri/İç Dünya/yolculuk/ocak hiç
    -- görülüp görülmediği sezgiyle biliniyordu, kadrandan değil. screen=
    -- bölge (ayrac|galeri|icdunya|yolculuk|ocak), tek eksen — bir
    -- GÖRÜNÜRLÜK, ikinci bir olay taşımaz. PAYDA burada ayrıca döner:
    -- Bugün'ün kendi `view` segmenti zaten paydadır (00f'in kendi notu),
    -- ayrı bir 'gun' olayı aynı şeyi ikinci kez sayardı. Oran panelde
    -- kurulur (K3).
    'bolge_pulse', (SELECT jsonb_build_object(
        'total', COUNT(*),
        'bugun_gorenler', (SELECT COUNT(DISTINCT user_id) FROM view_ev WHERE screen = 'bugun'),
        'bolgeler', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                         'bolge', b.screen, 'gezgin', b.g) ORDER BY b.g DESC), '[]'::jsonb)
                     FROM (SELECT screen, COUNT(DISTINCT user_id) AS g
                           FROM ev WHERE kind = 'bolge' GROUP BY screen) b)
      ) FROM ev WHERE kind = 'bolge'),

    -- PAYLAŞIM NABZI (İç Çalışma 12 rev.2 · boşluk C): 00f wtLogPaylasim() —
    -- paylaşım hunisi (story mi yazı mı, panoya kopyalama mı, indirme mi)
    -- ve neyin paylaşıldığı sezgiyle biliniyordu. screen=olay (story|yazi|
    -- kopyala|indir), meta.tur=paylaşılan şeyin sınıfı (kart|rapor|film) —
    -- DİKKAT: prev_screen DEĞİL, meta.tur (00f wtLogPaylasim gövdesi
    -- prev_screen'i hep null yazar). `tur` çoğu satırda NULL kalır — altı
    -- çağıranın kendi 'tur'unu geçirmesi ayrı bir fazın işi (FAZ 2+3
    -- Duraklar §3); NULL satırlar burada uydurulmadan dışarıda bırakılır.
    'paylasim_pulse', (SELECT jsonb_build_object(
        'total', COUNT(*),
        'huni', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                     'olay', o.screen, 'n', o.c, 'gezgin', o.g) ORDER BY o.c DESC), '[]'::jsonb)
                 FROM (SELECT screen, COUNT(*) AS c, COUNT(DISTINCT user_id) AS g
                       FROM ev WHERE kind = 'paylasim' GROUP BY screen) o),
        'tur_dagilim', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                            'tur', t.tur, 'n', t.c) ORDER BY t.c DESC), '[]'::jsonb)
                        FROM (SELECT meta->>'tur' AS tur, COUNT(*) AS c
                              FROM ev WHERE kind = 'paylasim' AND meta->>'tur' IS NOT NULL
                              GROUP BY 1) t)
      ) FROM ev WHERE kind = 'paylasim'),

    -- EMNİYET NABZI (İç Çalışma 15 rev.2 · boşluk B): 00f wtLogSafety() —
    -- `13-extras`/`13m`'in kriz sinyali/kart/grace olayları bir aydır
    -- yazılıyordu, hiç okunmuyordu. screen=olay adı (crisis_signal|
    -- crisis_card|crisis_grace — 13-extras.js:874/879, 13m-kota.js:115),
    -- prev_screen boş, meta boş. İÇERİK ZATEN YOK (wtLogSafety yalnız olay
    -- adını yazar) — bu blok yine de yalnız SAYI döndürür, mahremiyet yükü
    -- kanaldan gelir, sözden değil.
    'safety_pulse', (SELECT jsonb_build_object(
        'total', COUNT(*),
        'olaylar', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'olay', o.screen, 'n', o.c, 'gezgin', o.g) ORDER BY o.c DESC), '[]'::jsonb)
                    FROM (SELECT screen, COUNT(*) AS c, COUNT(DISTINCT user_id) AS g
                          FROM ev WHERE kind = 'safety' GROUP BY screen) o),
        'trend', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                      'day', tr.d, 'count', tr.c) ORDER BY tr.d), '[]'::jsonb)
                  FROM (SELECT to_char(local_ts, 'YYYY-MM-DD') AS d, COUNT(*) AS c
                        FROM ev WHERE kind = 'safety' GROUP BY 1) tr)
      ) FROM ev WHERE kind = 'safety'),

    -- HATA NABZI (İç Çalışma 14 rev.2 · boşluk B): error_logs bir aydır
    -- yazılıyordu, hiç okunmuyordu. Kaynağı yukarıda DECLARE aşamasında
    -- to_regclass kapısının arkasında hesaplanır (RİSK 3) — burada yalnız
    -- değişkeni takar. MUTLAK KURAL: error_message/error_stack/context/
    -- user_agent bu değişkenin İÇİNDE YOK (yukarıdaki EXECUTE metni onları
    -- hiç seçmez) — dönen tek serbest metin yoktur.
    'error_pulse', v_error_pulse,

    -- BİLDİRİM NABZI (İç Çalışma 11 rev.2 · boşluk B): notification_log
    -- bir aydır yazılıyordu, hiç okunmuyordu. Aynı to_regclass + dinamik
    -- SQL kapısı (RİSK 3). MUTLAK KURAL: title/body bu değişkenin İÇİNDE
    -- YOK — yukarıdaki EXECUTE metni yalnız type + sayıları seçer.
    'notification_pulse', v_notification_pulse,

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
