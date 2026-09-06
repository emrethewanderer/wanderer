-- ═══════════════════════════════════════════════════════════════════════
-- 056 · EŞİK ALARMLARI — kadranın gördüğünü motorun da görmesi
-- İç Çalışma 17 · F2 (FAZ 13b) · 2026-09-06
-- ═══════════════════════════════════════════════════════════════════════
--
-- NEDEN VAR: Gözlemevi'nin 24 nabız kartı eşiği aşınca kendi tanısını
-- yazıyor — ama o cümleler TARAYICIDA, admin sayfası açıkken doğuyor.
-- Emre kadranı açmadıkça hiçbir alarm kimseye ulaşmıyordu. Push ise
-- SUNUCUDA gidiyor (`send-push`, service-role, cron) ve oradan kadranın
-- verisine erişmenin önünde bir KİLİT var: `admin_usage_report` yetkisini
-- `auth.uid()`'den okur (`000:1933`), service-role'ün ise JWT'si yoktur.
--
-- Bu dosya o kilidi açar: motorun çağırabileceği, aynı ham tablolardan
-- okuyan, YALNIZ ALARM döndüren bir fonksiyon.
--
-- ── KAPSAM BİLEREK DARDIR ve bu, kabul edilmiş bir borcun ölçüsüdür ──
-- Emre 2026-09-06'da "şerit + SQL alarm RPC'si + push" yolunu seçti ve o
-- seçeneğin metni borcu adıyla söylüyordu: eşikler artık İKİ yerde yaşar
-- (istemcinin `if`'i ve buradaki `WHERE`). Borç saklanmadı, KÜÇÜLTÜLDÜ:
-- bu fonksiyon 14 alarm alanının hepsini değil, yalnız **push atmayı hak
-- eden** ikisini hesaplar. Gerekçe basit — bir bildirim ancak kullanıcı
-- tarafında bir zarar ya da bir sessizlik varsa gönderilir; "ölçüm yeni
-- açıldı" türü tanılar kadranda okunur, telefonu titretmez. Böylece
-- ayrışabilecek eşik sayısı 14'ten 2'ye iner.
-- İkizliğin kapısı: `tests/alarm-esik-kapisi.test.js` bu dosyanın
-- sabitlerini `js/parts/13q-gozlemevi.js`'in `GZ_ALARM_ESIK` bloğuna karşı
-- ayrıştırır ve sayıların birebir eşleşmesini şart koşar (§6.6: kapısı
-- olmayan kural tavsiyeye döner).
--
-- ── PENCERE 1 GÜNDÜR ──
-- Alarm "şimdi bir şey bozuk" demektir, "bu ay şöyleydi" değil. Uzun bir
-- pencere aynı alarmı günlerce tekrarlatır ve `send-push`'un freq-cap'i
-- (aynı tip 24 saatte bir) bunu her gün bir kez geçirir — yani bir hafta
-- boyunca aynı bildirim. Gürültüye dönen bir alarm, alarm olmaktan çıkar.
--
-- ── YETKİ: `auth.uid()` KAPISI YOK, ve bu bir gevşetme DEĞİL ──
-- Bu fonksiyonu çağıran taraf bir kullanıcı değil, cron'un koşturduğu
-- motordur; JWT'si yoktur, `auth.uid()` NULL döner. Bu yüzden kapı
-- kimlikte değil YETKİDE kurulur: PUBLIC/anon/authenticated'dan tamamen
-- REVOKE edilir, yalnız `service_role`'a GRANT verilir. `usage_events_prune`
-- ile aynı desen (`055:1521`).
--
-- ── MAHREMİYET ──
-- Dönen JSON'da serbest metin YOKTUR: yalnız alan adı, seviye ve SAYILAR.
-- `error_logs`'un `error_message`/`error_stack`/`context` sütunları hiç
-- seçilmez; yalnız `label` (kapalı küme, uygulamanın kendi etiketi) ve
-- sayımlar okunur. `usage_events` tarafında zaten içerik yoktur
-- (`wtLogSafety` yalnız olay adını yazar, `055:1211`).
--
-- ELLE İŞTİR (§6.5): bu dosyayı Supabase SQL editöründe SEN koşarsın.
-- Koşulmadan `send-push` alarm gönderemez — motor RPC hatasını yutar ve
-- bildirimlerin geri kalanı çalışmaya devam eder (asla bloklama).
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_alarms(p_gun INT DEFAULT 1)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Negatif/sıfır bir pencere bugünü de kaçırmasın diye tabana oturtulur
  -- (`usage_events_prune`'un GREATEST/COALESCE savunmasıyla aynı desen).
  v_since    TIMESTAMPTZ := now() - make_interval(days => GREATEST(COALESCE(p_gun, 1), 1));
  v_alarmlar JSONB := '[]'::jsonb;

  v_sinyal   INT := 0;
  v_kart     INT := 0;

  v_hata     JSONB;
BEGIN
  -- ─── ALARM 1 · EMNİYET — sinyal yakalanıyor ama kart gösterilmiyor ───
  -- Kadranın en ağır cümlesi (`13q _emniyetNabzi`): kriz sinyali düşüyor
  -- ama kriz kartı hiç açılmıyorsa, birisi 112'yi GÖRMÜYOR demektir.
  -- Eşik bir orana değil bir YOKLUĞA bağlıdır — tek bir kaçırma bile
  -- ürünün en kırılgan anıdır, "kaçının kaçırıldığı" sorusu burada sorulmaz.
  SELECT
    COUNT(*) FILTER (WHERE screen = 'crisis_signal'),
    COUNT(*) FILTER (WHERE screen = 'crisis_card')
    INTO v_sinyal, v_kart
    FROM usage_events
   WHERE kind = 'safety' AND entered_at >= v_since;

  IF COALESCE(v_sinyal, 0) > 0 AND COALESCE(v_kart, 0) = 0 THEN
    v_alarmlar := v_alarmlar || jsonb_build_object(
      'alan',   'emniyet',
      'seviye', 'kritik',
      'olcum',  jsonb_build_object('sinyal', v_sinyal, 'kart', v_kart));
  END IF;

  -- ─── ALARM 2 · HATA — tek bir kırık herkesi vuruyor ───
  -- `13q _hataNabzi` ile AYNI eşik: en sık etiketin payı %40'ı aşarsa
  -- hatalar dağınık değil TEK bir kırıkta toplanıyordur.
  -- `error_logs` tablo yoksa blok sessizce atlanır — fonksiyon yine kurulur
  -- ve çalışır (`055`'in RİSK 3 kalıbı, `to_regclass` kapısı).
  IF to_regclass('public.error_logs') IS NOT NULL THEN
    EXECUTE $err$
      WITH e AS (
        SELECT label FROM error_logs WHERE occurred_at >= $1
      ), t AS (
        SELECT label, COUNT(*) AS n FROM e GROUP BY label ORDER BY COUNT(*) DESC LIMIT 1
      )
      SELECT jsonb_build_object(
               'alan',   'hata',
               'seviye', 'kritik',
               'olcum',  jsonb_build_object(
                           'etiket', t.label,
                           'n',      t.n,
                           'toplam', (SELECT COUNT(*) FROM e),
                           'pay',    ROUND(t.n * 100.0 / NULLIF((SELECT COUNT(*) FROM e), 0)))
             )
        FROM t
       WHERE (SELECT COUNT(*) FROM e) > 0
         AND ROUND(t.n * 100.0 / NULLIF((SELECT COUNT(*) FROM e), 0)) >= 40
    $err$ INTO v_hata USING v_since;

    IF v_hata IS NOT NULL THEN
      v_alarmlar := v_alarmlar || v_hata;
    END IF;
  END IF;

  RETURN v_alarmlar;
END;
$$;

-- Kapı kimlikte değil yetkide (bkz. başlık): çağıran motorun JWT'si yoktur.
REVOKE ALL ON FUNCTION public.admin_alarms(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_alarms(INT) FROM anon;
REVOKE ALL ON FUNCTION public.admin_alarms(INT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_alarms(INT) TO service_role;

-- ─── Elle doğrulama (Supabase SQL editöründe) ───
--   SELECT public.admin_alarms(1);    -- bugünün alarmları; alarm yoksa []
--   SELECT public.admin_alarms(7);    -- son yedi gün (teşhis için)
-- Boş bir dizi bir hata DEĞİLDİR: kadran sessizse alarm da sessizdir.
