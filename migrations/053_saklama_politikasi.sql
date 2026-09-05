-- ═══════════════════════════════════════════════════════════════════════════
-- 053 — SAKLAMA POLİTİKASI  (İç Çalışma 17 · boşluk C · Kalan Yol Haritası FAZ 6)
--
-- `usage_events` sınırsız büyüyor; `000_wanderer_schema.sql:1229` bu işi
-- yalnız bir YORUM olarak taşıyordu:
--   -- DELETE FROM usage_events WHERE entered_at < now() - INTERVAL '90 days';
-- Bu dosya o yorumu gerçek bir politikaya çevirir.
--
-- K3 (plan `.claude/plans/ic-calisma-kalan-fazlar.md`) — SIRA PAZARLIKSIZ:
-- ham satır silinmeden ÖNCE günlük agregat tablosu dolmalı; tersi, kapanan
-- pencerede veri kaybıdır. Üç adım:
--   1. usage_events_daily — granül (user_id, gun, screen, kind)
--   2. geri doldurma      — mevcut usage_events satırları agregata yazılır
--   3. usage_events_prune — pencerenin dışına çıkan ham satırı ÖNCE agregata
--                            taşır, SONRA siler
--
-- TASARIM NOTU — GÜN BAZLI CUTOFF (saat değil):
-- Hem geri doldurma hem prune AYNI deyimi kullanır ve o deyim REPLACE
-- semantiğindedir (`ON CONFLICT ... DO UPDATE SET adet = EXCLUDED.adet`,
-- toplayarak değil YERİNE koyarak). Bu güvenlidir ÇÜNKÜ prune'un filtresi
-- bir TAM TAKVİM GÜNÜdür — `(entered_at AT TIME ZONE 'Europe/Istanbul')::date
-- < cutoff_gun` — bir ZAMAN DAMGASI değil. Fark şu: saat bazlı bir cutoff
-- ("entered_at < now() - 90 gün") bugünün ortasında ilerler ve TEK BİR GÜNÜ
-- iki ayrı prune() çağrısı arasında YARIYA BÖLEBİLİR — ilk çağrı günün
-- sabah yarısını sayıp siler, ikinci çağrı akşam yarısını yeniden hesaplar
-- ve REPLACE ile sabah yarısının sayısını SESSİZCE SİLERDİ (§6.10 ihlali:
-- ölçülmüş bir değer kanıtsız kaybolur). Gün bazlı cutoff bunu yapısal
-- olarak imkânsız kılar: bir gün ya TAMAMEN cutoff'un altındadır (o günün
-- TÜM satırları tek çağrıda toplanır ve silinir) ya da TAMAMEN üstündedir
-- (hiç dokunulmaz) — ara hâl yoktur. Bu yüzden REPLACE, ardışık prune()
-- çağrıları arasında hem idempotent hem kayıpsızdır; geri doldurmanın
-- kendisi de aynı sebeple dosya iki kez koşulsa katlanmaz (aynı raw
-- veriden aynı toplam yeniden hesaplanır, üstüne eklenmez).
--
-- Cron'a BAĞLANMAZ: `pg_cron` bu repoda hiç kullanılmamış
-- (`grep -rn "pg_cron" migrations/` boş — supabase/functions/send-push
-- yorumundaki tek geçiş bir Edge Function tetikleyicisidir, migration
-- değildir) ve kurulumu ELLE'dir (§6.5). `usage_events_prune()` çağrılabilir
-- bir fonksiyon olarak durur; periyodik koşum Emre'nin kararıdır.
--
-- Gözlemevi'nin 051'de kurulan tek-RPC rapor fonksiyonuna KESİNLİKLE
-- DOKUNULMAZ — bu dosyada o fonksiyonun adı hiç geçmez (bilerek; kapı bunu
-- ölçer). Dokunsaydı 051'in on yedi bloğunu taşımak zorunda kalırdı
-- (migrations/README.md §SIRA ÖNEMLİDİR; kapı: tests/migration-blok-tasima.test.js).
-- `usage_events_daily` o fonksiyonun OKUDUĞU kaynaklardan biri DEĞİLDİR;
-- Tek Cam'ın kota/paylaşım/vb. panoları bu tabloya bağlı değildir.
--
-- OKUMA SÖZLEŞMESİ — bu tabloyu okuyacak olan İÇİN (faz denetimi, 2026-09-04):
-- `usage_events_daily` SICAK/SOĞUK bölünmesinin SOĞUK yarısıdır ve YALNIZ
-- ham satırı artık var olmayan günler için otoritedir. Sebebi geri
-- doldurmadadır: adım 2 bugünü de kapsar, yani o gün için bir satır yazar —
-- ama o gün henüz bitmemiştir ve akşam gelen olaylar agregata YANSIMAZ
-- (agregat ancak o gün cutoff'un altına düştüğünde prune tarafından
-- REPLACE edilir ve orada doğrulanır). Aradaki pencerede satır DURUR ama
-- EKSİKTİR.
-- Bu bir kırık değil bir sözleşmedir; kırık, sözleşmenin yazılmamış
-- olmasıydı. Yazılmasaydı bir gün biri o satırı "günün toplamı" diye okur
-- ve ölçülmüş görünen bir eksik sayı basardı — §6.10'un en sinsi hâli
-- (kanıtsız sıfırdan kötüsü, kanıtlı görünen yanlış).
-- Doğru okuma tek cümledir: **ham satırı duran gün için `usage_events`,
-- durmayan gün için `usage_events_daily`.** Bir gün ikisinde birdense
-- otorite HAM olandır. Bugün bu tabloyu okuyan hiçbir yüzey yok —
-- Gözlemevi'nin 051'de kurulan rapor RPC'si de ona bakmaz (adı bu dosyada
-- BİLEREK hiç geçmiyor, kapı bunu ölçüyor); ilk okuyucu yazıldığında bu
-- satır onun şartnamesidir.
--
-- Bu dosya ELLE uygulanır (§6.5) — Supabase Dashboard → SQL Editor → New
-- query → yapıştır → Run.
-- ═══════════════════════════════════════════════════════════════════════════

/* ─── 1. usage_events_daily — günlük agregat ────────────────────────────── */
--      RLS usage_events'in birebir aynısı: sahibi okur/yazar, admin SELECT
--      politikası bilerek YOK (admin okuması yalnız 051'in rapor RPC'sinden —
--      ve bu tablo o fonksiyonun okuduğu kaynaklardan biri DEĞİL).
CREATE TABLE IF NOT EXISTS usage_events_daily (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gun         DATE NOT NULL,
  screen      TEXT NOT NULL,
  kind        TEXT NOT NULL,
  adet        INTEGER NOT NULL DEFAULT 0,
  toplam_ms   BIGINT  NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, gun, screen, kind)
);

ALTER TABLE usage_events_daily ENABLE ROW LEVEL SECURITY;

-- Admin SELECT politikası bilerek YOK (usage_events'in kendi kuralı — yukarı bkz.).
DROP POLICY IF EXISTS "usage_events_daily owner insert" ON usage_events_daily;
CREATE POLICY "usage_events_daily owner insert"
  ON usage_events_daily FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "usage_events_daily owner select" ON usage_events_daily;
CREATE POLICY "usage_events_daily owner select"
  ON usage_events_daily FOR SELECT TO authenticated
  USING (user_id = auth.uid());


/* ─── 2. Geri doldurma — mevcut usage_events satırları agregatı doldurur ── */
--      Gün Europe/Istanbul'a göre türetilir — toISOString UTC'dir, TR'de
--      gün kaydırır (13q Korunanlar'ın sunucu ikizi, bkz. _quota_day ve
--      051'in local_ts'i aynı deseni kullanır). REPLACE semantiği yukarıdaki
--      TASARIM NOTU'nun gerekçesiyle idempotenttir.
INSERT INTO usage_events_daily (user_id, gun, screen, kind, adet, toplam_ms)
  SELECT
    user_id,
    (entered_at AT TIME ZONE 'Europe/Istanbul')::date AS gun,
    screen,
    kind,
    COUNT(*)::int                          AS adet,
    COALESCE(SUM(duration_ms), 0)::bigint  AS toplam_ms
  FROM usage_events
  GROUP BY user_id, (entered_at AT TIME ZONE 'Europe/Istanbul')::date, screen, kind
ON CONFLICT (user_id, gun, screen, kind) DO UPDATE
  SET adet      = EXCLUDED.adet,
      toplam_ms = EXCLUDED.toplam_ms;


/* ─── 3. usage_events_prune — pencerenin dışına çıkanı ÖNCE taşır, SONRA siler ─ */
--      SECURITY DEFINER; yalnız service_role çağırabilir (bir bakım işidir,
--      kullanıcı kendi verisini toplu silmez — emsal: fn_quota_consume,
--      000:2128-2130).
CREATE OR REPLACE FUNCTION public.usage_events_prune(p_gun INT DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Negatif/aşırı küçük bir pencere bugünü de silmesin diye tabana oturtulur
  -- (_quota_day/fn_quota_consume'un GREATEST/COALESCE savunması ile aynı desen).
  v_cutoff_gun DATE := (now() AT TIME ZONE 'Europe/Istanbul')::date
                        - GREATEST(COALESCE(p_gun, 90), 1);
  v_silinen    INTEGER;
BEGIN
  -- ÖNCE agregat — adım 2'nin AYNI deyimi, yalnız cutoff_gun'dan eski TAM
  -- günlerle sınırlı (TASARIM NOTU: bir gün asla iki çağrı arasında bölünmez).
  INSERT INTO usage_events_daily (user_id, gun, screen, kind, adet, toplam_ms)
    SELECT
      user_id,
      (entered_at AT TIME ZONE 'Europe/Istanbul')::date AS gun,
      screen,
      kind,
      COUNT(*)::int                          AS adet,
      COALESCE(SUM(duration_ms), 0)::bigint  AS toplam_ms
    FROM usage_events
    WHERE (entered_at AT TIME ZONE 'Europe/Istanbul')::date < v_cutoff_gun
    GROUP BY user_id, (entered_at AT TIME ZONE 'Europe/Istanbul')::date, screen, kind
  ON CONFLICT (user_id, gun, screen, kind) DO UPDATE
    SET adet      = EXCLUDED.adet,
        toplam_ms = EXCLUDED.toplam_ms;

  -- SONRA sil — aynı gün filtresi, aynı fonksiyon çağrısı (aynı transaction):
  -- agregatsız satır asla silinmez (K3).
  DELETE FROM usage_events
   WHERE (entered_at AT TIME ZONE 'Europe/Istanbul')::date < v_cutoff_gun;
  GET DIAGNOSTICS v_silinen = ROW_COUNT;

  RETURN v_silinen;
END;
$$;

REVOKE ALL ON FUNCTION public.usage_events_prune(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.usage_events_prune(INT) TO service_role;

-- Cron'a BİLEREK bağlanmaz — yukarıdaki dosya başlığına bkz. Periyodik
-- koşum kurulana kadar `usage_events` büyümeye devam eder; bu ELLE bir
-- karardır, sessiz bir eksiklik değil.

-- ═══════════════════════════════════════════════════════════════════════════
-- DOĞRULAMA (SQL editöründe elle koşulabilir)
--   SELECT gun, screen, kind, adet, toplam_ms FROM usage_events_daily
--     WHERE user_id = auth.uid() ORDER BY gun DESC LIMIT 10;
--   SELECT public.usage_events_prune(90);         -- silinen ham satır sayısı
--   SELECT public.usage_events_prune(90);          -- ikinci çağrı: 0 (gün zaten silindi)
-- ═══════════════════════════════════════════════════════════════════════════
