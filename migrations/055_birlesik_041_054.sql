-- ═══════════════════════════════════════════════════════════════════════════
-- 055 — BİRLEŞİK DEVİR: 041 → 054'ün TAMAMI, TEK KOŞUDA
--
-- NEDEN VAR: `migrations/README.md`'nin "bekleyen ELLE borcu" defteri on dört
-- dosyaya çıkmıştı ve hangisinin uygulandığı **repodan görünmez** (§6.5 —
-- deploy edilmiş varsayılmaz). Bu dosya o defteri tek bir yapıştırmaya
-- indirir: sırayı, atlanabilirliği ve blok taşımayı senin hatırlamana gerek
-- kalmaz. Emre'nin talebi, 2026-09-05.
--
-- ═══ NEYİ KAPSAR ═══
--   041 · chat_history.decorations        → sohbetin süsleri hard reload'da yaşar
--   043 · persona_directives_history      → "Yayınla" geri alınabilir olur
--   047 · telefon kimliği + posta defteri → e-posta tek anahtar + bülten rızası
--   051 · admin_usage_report (17 blok)    → Gözlemevi'nin bütün kartları
--   052 · notif_mark_clicked RPC          → tık atıfı yazılabilir olur
--   053 · usage_events_daily + prune      → saklama politikası
--   054 · hukuk_kabul                     → rıza defteri
--
-- ═══ 042 · 044 · 045 · 046 · 048 · 049 · 050 NEDEN YOK ═══
-- Bu yedi dosyanın HİÇBİRİ başka bir şey yapmaz: yalnızca
-- `admin_usage_report`'u yeniden kurar ve her biri bir öncekinin gövdesini
-- taşıyıp üstüne kendi bloğunu ekler. `051` on yedi bloğun HEPSİNİ taşır
-- (mode · memory · latency · ctx · kart · ritus · esik · duygu · kimlik ·
-- model + kota · arac · bolge · paylasim · safety · error · notification),
-- yani yedisini de kapsar. Kanıtı bir yorum değil bir kapıdır:
-- `tests/migration-blok-tasima.test.js` zinciri her koşuda sınar ve bu dosya
-- da o zincire dahildir — bir blok düşerse vitest kırmızı olur.
--
-- ⚠ BU DOSYAYI KOŞTUKTAN SONRA 041–054'ten hiçbirini TEK BAŞINA KOŞMA.
-- README'nin kuralı burada da geçerlidir: **en güncel tanım daima en yüksek
-- numaradadır** (artık `055`). Daha düşük numaralı bir dosyayı sonradan
-- koşmak, kendinden sonraki blokları siler — kaybolan kartın sebebi kodda
-- görünmez.
--
-- ═══ NASIL UYGULANIR ═══
-- Supabase Dashboard → SQL Editor → New query → bu dosyanın TAMAMINI
-- yapıştır → Run. Başka adım yok.
--
-- İDEMPOTENT: baştan sona birden çok kez koşmak zarar vermez. Hangi
-- migration'ın daha önce uygulandığından bağımsız olarak eksikleri tamamlar,
-- var olana dokunmaz — yani "hangisini yapmıştım?" sorusunu hiç sormana gerek
-- yok.
--
-- VERİ SİLİNMEZ — ve bu cümlenin tek bir istisnası var, o da silmiyor:
-- dosyada tek bir DROP TABLE / DROP COLUMN / TRUNCATE yoktur. Geçen tek
-- `DELETE FROM usage_events`, `usage_events_prune()` fonksiyonunun GÖVDESİ
-- içindedir (§053) — yani bu dosyayı koşmak o fonksiyonu TANIMLAR, çağırmaz.
-- Hiçbir satır silinmez; silme ancak sen `SELECT usage_events_prune(90);`
-- dediğinde olur ve o çağrı da ham satırı önce agregata taşır (K3).
-- `DROP POLICY IF EXISTS` / `DROP TRIGGER IF EXISTS` deyimleri politikayı
-- hemen ardından yeniden kurmak içindir (000'ın deseni) — veri taşımazlar.
--
-- SIRA İÇERİDE DOĞRUDUR: bölümler bağımlılık sırasına göre dizildi
-- (`047`'nin bağımlılığı yalnız `profiles` ve `auth.users`; gözlemevi
-- fonksiyonu en sona yakın durur).
--
-- ÖNKOŞUL: `000_wanderer_schema.sql` uygulanmış olmalı. Emin değilsen önce
-- onu koş — o da idempotenttir.
-- ═══════════════════════════════════════════════════════════════════════════



-- ███████████████████████████████████████████████████████████████████████████
-- ██  BÖLÜM — 041_chat_decorations.sql
-- ███████████████████████████████████████████████████████████████████████████

-- ═══════════════════════════════════════════════════════════════════════════
-- 041 · chat_history.decorations — sohbetin izleri kalıcı olsun
-- ───────────────────────────────────────────────────────────────────────────
-- NEDEN: Kitap alıntısı kartı, araç onay çipleri, takip soruları, kaynakça —
-- bunların hepsi bugün yalnız canlı kancalarda doğuyor ve DB'de yaşamıyor.
-- Navigasyonda marker koruması kurtarıyor, ama sayfa YENİLENİNCE gidiyorlar.
-- Sohbet "yaşanmış bir yer" olacaksa izleri de yaşamalı: bir mesaj neyle
-- birlikte doğduysa, geri dönüldüğünde onunla birlikte durmalı.
--
-- Süsler mesajın KİMLİĞİNE bağlanır (bkz. İç Çalışma 01 · boşluk A → C):
-- deko-ledger, id olmadan yazılamaz.
--
-- Biçim: { "<tip>": <veri>, ... }  — ör. { "arac": { tools, kagit, takip } }
-- Tanınmayan tip sessizce atlanır (ileri uyumluluk): eski bir istemci yeni
-- bir süs tipini görürse çizmez, ama kaydı da bozmaz.
--
-- İdempotent: tekrar çalıştırmak güvenlidir.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF to_regclass('public.chat_history') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name   = 'chat_history'
         AND column_name  = 'decorations'
     ) THEN
    EXECUTE 'ALTER TABLE public.chat_history ADD COLUMN decorations JSONB';
  END IF;
END $$;

-- UPDATE politikası: süs, mesaj yazıldıktan SONRA iliştirilir; istemcinin
-- kendi satırını güncelleyebilmesi gerekir. (SELECT/INSERT/DELETE politikaları
-- 000_wanderer_schema.sql §3.3'te.)
DO $$
BEGIN
  IF to_regclass('public.chat_history') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_policies
                     WHERE schemaname = 'public' AND tablename = 'chat_history'
                       AND policyname = 'users update own chat') THEN
    EXECUTE $sql$
      CREATE POLICY "users update own chat" ON public.chat_history
        FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
    $sql$;
  END IF;
END $$;


-- ███████████████████████████████████████████████████████████████████████████
-- ██  BÖLÜM — 043_persona_directives_history.sql
-- ███████████████████████████████████████████████████████████████████████████

-- ═══════════════════════════════════════════════════════════════════════════
-- 043 · persona_directives geçmişi — "yayınla" geri alınabilir olsun
-- ───────────────────────────────────────────────────────────────────────────
-- NEDEN: Emre'nin Sesi odasında "Yayınla" bir upsert'tir; eski içerik ezilir
-- ve geriye hiçbir iz kalmaz. Ne değişti, ne zaman, önceki hâli neydi —
-- hiçbiri sorulamıyordu. Yanlış bir yayının tek panzehiri "Varsayılana Dön"dü,
-- o da kendi önceki sürümüne değil, koddaki sözlük varsayılanına döndürür.
--
-- Risk bu ay büyüdü: yönetilen yüzey 342 → 386 anahtara çıktı ve yenilerin
-- çoğu tek cümlelik ayar değil, HÜKÜM VEREN uzun bloklar — Oluş Sınaması'nın
-- karar prompt'u, Ayna Protokolü'nün hipotez kuralları. Böyle bir metinde
-- yapılan hatalı bir düzenleme, fark edilene kadar her kullanıcıya iner.
--
-- NEDEN TRIGGER, uygulama katmanı değil (plan K4):
-- persona_directives'e yazan taraf tek değil. Bugün 16d paneli yazıyor;
-- yarın bir edge fonksiyonu, bir bakım script'i ya da doğrudan SQL Editor
-- yazabilir. Uygulama katmanına bağlanan bir geçmiş, uygulama DIŞINDAN gelen
-- değişikliği sessizce kaçırır — ve kaçırdığını da söylemez.
--
-- KAPSAM: yalnız UPDATE ve DELETE kaydedilir. INSERT'in "önceki hâli" yoktur;
-- bir anahtarın ilk kez yazılması geçmişe girmez — geri dönülecek bir şey
-- yok demektir (o durumda "Varsayılana Dön" zaten satırı siler).
--
-- İdempotent: CREATE TABLE IF NOT EXISTS + CREATE OR REPLACE FUNCTION +
-- DROP/CREATE TRIGGER. Tekrar çalıştırmak güvenlidir.
-- ═══════════════════════════════════════════════════════════════════════════

/* ─── 1 · Defter ─────────────────────────────────────────────────────────── */

CREATE TABLE IF NOT EXISTS persona_directives_history (
  id           BIGSERIAL PRIMARY KEY,
  key          TEXT NOT NULL,
  lang         TEXT NOT NULL,
  content_old  TEXT NOT NULL,           -- değişimden ÖNCEKİ içerik
  action       TEXT NOT NULL CHECK (action IN ('update', 'delete')),
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by   UUID                     -- auth.uid(); SQL Editor'dan gelirse NULL
);

-- Panel bir anahtarın geçmişini "en yeni önce" ister.
CREATE INDEX IF NOT EXISTS idx_pdh_key_lang_at
  ON persona_directives_history (key, lang, changed_at DESC);

ALTER TABLE persona_directives_history ENABLE ROW LEVEL SECURITY;

-- Yalnız admin okur. Yazma politikası YOK: satırları yalnız trigger
-- (SECURITY DEFINER) yazar — kimse elle geçmiş uyduramaz.
DROP POLICY IF EXISTS "pdh admin read" ON persona_directives_history;
CREATE POLICY "pdh admin read"
  ON persona_directives_history FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

/* ─── 2 · Kalem ──────────────────────────────────────────────────────────── */

CREATE OR REPLACE FUNCTION _persona_directives_gecmis()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO persona_directives_history (key, lang, content_old, action, changed_by)
    VALUES (OLD.key, OLD.lang, OLD.content, 'delete', auth.uid());
    RETURN OLD;
  END IF;

  -- İçerik gerçekten değiştiyse yaz. Yalnız updated_at'in tazelendiği bir
  -- upsert geçmişe girmemeli — yoksa defter aynı metnin kopyalarıyla dolar
  -- ve "önceki sürüm" listesi işe yaramaz hâle gelir.
  IF NEW.content IS DISTINCT FROM OLD.content THEN
    INSERT INTO persona_directives_history (key, lang, content_old, action, changed_by)
    VALUES (OLD.key, OLD.lang, OLD.content, 'update', auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_persona_directives_gecmis ON persona_directives;
CREATE TRIGGER trg_persona_directives_gecmis
  AFTER UPDATE OR DELETE ON persona_directives
  FOR EACH ROW EXECUTE FUNCTION _persona_directives_gecmis();

/* ─── 3 · Yetki ──────────────────────────────────────────────────────────── */

GRANT SELECT ON persona_directives_history TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE persona_directives_history_id_seq TO authenticated;


-- ███████████████████████████████████████████████████████████████████████████
-- ██  BÖLÜM — 047_telefon_kimlik_ve_posta.sql
-- ███████████████████████████████████████████████████████████████████████████

-- ═══════════════════════════════════════════════════════════════════════════
-- 047 — KOD KAPISI KİMLİĞİ + POSTA DEFTERİ
--
-- Eşik bu sürümle tek anahtarla açılır: e-posta adresi ve ona gelen kod.
-- Google, Apple ve şifre kapıları sökülür.
--
--   Adres hem anahtar hem adrestir.
--
-- Karar notu (Emre, 2026-08-27): kapı önce TELEFON + SMS olarak tasarlandı;
-- SMS'in mesaj başına ücretli olduğu (ve Türkiye'de ayrıca A2P kaydı
-- istediği) görülünce kanal e-postaya çevrildi. Kazanç yalnız maliyet
-- değildi: adres kimliğin kendisi olunca bülten listesindeki HER e-posta
-- doğrulanmış doğar — telefon planında adres ayrı, doğrulanmamış bir alandı.
--
-- Bu dosya üç şey yapar:
--   §1  profiles'a kimlik ve rıza alanlarını ekler (username · email · bülten)
--   §2  posta defterini kurar (kampanyalar · akışlar · gönderimler)
--   §3  RPC'ler: kullanıcı adı müsaitliği + bülten özeti
--
-- SIRA: 000 → 041 → 042 → 044 → 045 → 046 → 047. Bağımlılığı yalnız
-- `profiles` (000 §3.1) ve `auth.users`.
--
-- ⚠ profiles bu repoda KURULMAZ (Supabase'de elle kuruldu) — 000 §3'ün
-- deseni burada da geçerlidir: her blok "tablo gerçekten varsa" kapısından
-- geçer, boş projede sessizce atlanır.
--
-- ── GERÇEKLİK KURALI (Anayasa §6.10) ŞEMAYA GÖMÜLDÜ ────────────────────────
-- Bülten izni bir `true`'dan ibaret bırakılamazdı. "Bu kullanıcı bültene
-- razı" bir YARGIDIR ve yargının kanıtı olmak zorundadır: hangi metni, ne
-- zaman, hangi yolla kabul etti. Bu yüzden `bulten_izin` yazılabilir bir
-- kolon DEĞİL, GENERATED bir kolondur — kökeni olmayan izin şemada
-- doğamaz. Client `true` yazmaya çalışsa bile Postgres reddeder; izin ancak
-- üç köken alanı (at · kaynak · surum) dolduğunda ve çıkış damgası boşken
-- var sayılır. Damgaları da client basmaz: bulten_rizasi_muhru() trigger'ı
-- zamanı sunucuda yazar (istemcinin saati kanıt değildir).
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- §1 · profiles — kimlik ve rıza alanları
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RAISE NOTICE '047: public.profiles yok — kimlik alanları atlandı.';
    RETURN;
  END IF;

  -- Köken alanları ÖNCE: GENERATED kolon bunlara yaslanır, aynı ALTER
  -- içinde kendisine yaslandığı kolonu göremez.
  EXECUTE $sql$
    ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS username            text,
      ADD COLUMN IF NOT EXISTS email               text,
      ADD COLUMN IF NOT EXISTS bulten_izin_at      timestamptz,
      ADD COLUMN IF NOT EXISTS bulten_izin_kaynak  text,
      ADD COLUMN IF NOT EXISTS bulten_izin_surum   text,
      ADD COLUMN IF NOT EXISTS bulten_cikis_at     timestamptz,
      ADD COLUMN IF NOT EXISTS bulten_cikis_kaynak text,
      ADD COLUMN IF NOT EXISTS email_sekme_at      timestamptz,
      ADD COLUMN IF NOT EXISTS email_sekme_tip     text,
      ADD COLUMN IF NOT EXISTS email_sekme_sebep   text
  $sql$;

  -- İzin = kökeninin toplamı. Yazılamaz, yalnız türetilir (§6.10).
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name = 'bulten_izin'
  ) THEN
    EXECUTE $sql$
      ALTER TABLE public.profiles
        ADD COLUMN bulten_izin boolean
        GENERATED ALWAYS AS (
          bulten_izin_at     IS NOT NULL
          AND bulten_izin_kaynak IS NOT NULL
          AND bulten_izin_surum  IS NOT NULL
          AND bulten_cikis_at    IS NULL
        ) STORED
    $sql$;
  END IF;

  -- Köken alanlarının DEĞER KÜMESİ şemada durur: kaynak serbest metin
  -- olsaydı "izin nereden geldi" sorusunun cevabı zamanla bulanırdı ve
  -- §6.10'un aradığı KÖKEN, denetlenemez bir etikete dönüşürdü.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_bulten_koken_kume') THEN
    EXECUTE $sql$
      ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_bulten_koken_kume CHECK (
          (bulten_izin_kaynak  IS NULL OR bulten_izin_kaynak  IN ('kayit_sozlesme','ayarlar_geri_donus','admin'))
          AND (bulten_cikis_kaynak IS NULL OR bulten_cikis_kaynak IN ('tek_tik','ayarlar','admin','sikayet_webhook'))
          AND (email_sekme_tip     IS NULL OR email_sekme_tip     IN ('hard','soft','sikayet'))
        )
    $sql$;
  END IF;

  -- Uzunluk kapısı şemada; BİÇİM kapısı username_musait()'te ve istemcide.
  -- Ayrı durmalarının sebebi: biçim kuralı (hangi karakterler) ürünün
  -- kararıdır ve değişebilir; uzunluk veri bütünlüğüdür ve değişmez.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_boy'
  ) THEN
    EXECUTE $sql$
      ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_username_boy
        CHECK (username IS NULL OR char_length(btrim(username)) BETWEEN 2 AND 24)
    $sql$;
  END IF;

  -- Benzersizlik BÜYÜK/KÜÇÜK HARF DUYARSIZDIR: "Emre" ile "emre" aynı adı
  -- işgal eder. Ama ad YAZILDIĞI GİBİ saklanır ve gösterilir — selam
  -- "Merhaba, Emre" olur. Tek ad, tek gerçek (Anayasa §4.3).
  EXECUTE $sql$
    CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_ci
      ON public.profiles (lower(btrim(username)))
      WHERE username IS NOT NULL
  $sql$;

  -- Bülten sorgusunun tek indeksi: adresi olan, izni duran VE postası
  -- sekmemiş satırlar. Üçüncü koşul indeksin içindedir ki gönderim sorgusu
  -- onu unutamasın — sekmiş adrese ikinci kez yazmak, bir alan adının
  -- itibarını harcamanın en hızlı yoludur (bkz. §1.1).
  EXECUTE $sql$
    CREATE INDEX IF NOT EXISTS idx_profiles_bulten_alici
      ON public.profiles (email)
      WHERE email IS NOT NULL AND bulten_izin = true AND email_sekme_at IS NULL
  $sql$;
END $$;


/* ─── 1.1 · Sekme Kalkanı — neden ayrı bir olgu ─────────────────────────── */
--      RIZA ile TESLİM EDİLEBİLİRLİK aynı şey değildir, bu yüzden ayrı
--      alanlarda durur. Kullanıcı bültene razı olabilir ve adresi yine de
--      ölü olabilir (şirketten ayrılmış, yanlış yazılmış, kutu dolmuş).
--      `bulten_izin` bunu bilemez — izin kullanıcının beyanıdır, sekme ise
--      sağlayıcının ÖLÇÜMÜdür (§6.10'un iki ayrı kökeni).
--
--      Neden kritik: gönderim sağlayıcıları sekme oranını alan adı bazında
--      izler. Sekmiş bir adrese ikinci kez yazmak yalnız o postayı değil,
--      TÜM listenin teslimatını riske atar — ve bu ders bu repoda pahalıya
--      öğrenildi: 2026-08-27'da eşiği doğrularken uydurma adreslere üç kod
--      postası gidince Supabase "bounce" uyarısı gönderdi. Kalkan o günün
--      ürünüdür.
--
--      tip: 'hard' (adres yok — bir daha ASLA) · 'soft' (geçici — kutu dolu,
--      sunucu meşgul) · 'sikayet' (spam bildirdi — hard'dan da kesin).
--      Yazan taraf yalnız service_role'dür (eposta-sekme webhook'u).

/* ─── 1.2 · Rızanın mührü — damgayı client basmaz ───────────────────────── */
--      Client yalnız BEYAN taşıyabilir (hangi metin sürümünü kabul ettiğini,
--      ya da çıkmak istediğini). Anı, kaynağı ve kalıcılığı sunucu yazar.
--      İstemcinin saati bir kanıt değildir; cihaz saati geriye alınabilir.
CREATE OR REPLACE FUNCTION public.bulten_rizasi_muhru()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _client boolean := coalesce(auth.jwt() ->> 'role', current_user) <> 'service_role'
                     AND current_user <> 'postgres';
BEGIN
  IF NOT _client THEN RETURN new; END IF;

  -- SEKME ALANLARI CLIENT'A KAPALIDIR. K9'un kendi tanımı gereği: rıza
  -- kullanıcının BEYANI, sekme ise sağlayıcının ÖLÇÜMÜdür. Bir kökeni
  -- korurken ötekini açık bırakmak, ölçümü beyana çevirirdi — kullanıcı
  -- kendi satırında "postam sekmedi" yazabilseydi kalkan delinirdi.
  -- Yazan taraf yalnız service_role'dür (eposta-sekme webhook'u).
  IF TG_OP = 'INSERT' THEN
    new.email_sekme_at    := NULL;
    new.email_sekme_tip   := NULL;
    new.email_sekme_sebep := NULL;
  ELSE
    new.email_sekme_at    := old.email_sekme_at;
    new.email_sekme_tip   := old.email_sekme_tip;
    new.email_sekme_sebep := old.email_sekme_sebep;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF new.bulten_izin_surum IS NOT NULL THEN
      new.bulten_izin_at     := now();
      new.bulten_izin_kaynak := 'kayit_sozlesme';
    ELSE
      new.bulten_izin_at     := NULL;
      new.bulten_izin_kaynak := NULL;
    END IF;
    new.bulten_cikis_at     := NULL;
    new.bulten_cikis_kaynak := NULL;
    RETURN new;
  END IF;

  -- Yeni bir metin sürümü kabul edildi → köken tazelenir.
  IF new.bulten_izin_surum IS DISTINCT FROM old.bulten_izin_surum
     AND new.bulten_izin_surum IS NOT NULL THEN
    new.bulten_izin_at     := now();
    new.bulten_izin_kaynak := coalesce(old.bulten_izin_kaynak, 'kayit_sozlesme');
  ELSE
    new.bulten_izin_at     := old.bulten_izin_at;
    new.bulten_izin_kaynak := old.bulten_izin_kaynak;
  END IF;

  IF new.bulten_cikis_at IS NOT NULL AND old.bulten_cikis_at IS NULL THEN
    -- Çıkış: client "çıkıyorum" der, anı sunucu damgalar.
    new.bulten_cikis_at     := now();
    new.bulten_cikis_kaynak := coalesce(new.bulten_cikis_kaynak, 'ayarlar');
  ELSIF new.bulten_cikis_at IS NULL AND old.bulten_cikis_at IS NOT NULL THEN
    -- Geri dönüş: çıkış damgası silinir, rıza YENİDEN kökenlenir.
    new.bulten_cikis_kaynak := NULL;
    new.bulten_izin_at      := now();
    new.bulten_izin_kaynak  := 'ayarlar_geri_donus';
  ELSE
    new.bulten_cikis_at     := old.bulten_cikis_at;
    new.bulten_cikis_kaynak := old.bulten_cikis_kaynak;
  END IF;

  RETURN new;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN RETURN; END IF;
  -- Trigger adı 'z_' ile başlar: BEFORE trigger'ları ad sırasıyla koşar ve
  -- bu mühür, protect_profile_privileges'tan SONRA basılmalıdır.
  EXECUTE 'DROP TRIGGER IF EXISTS z_trg_bulten_rizasi_ins ON public.profiles';
  EXECUTE $sql$
    CREATE TRIGGER z_trg_bulten_rizasi_ins
      BEFORE INSERT ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.bulten_rizasi_muhru()
  $sql$;
  EXECUTE 'DROP TRIGGER IF EXISTS z_trg_bulten_rizasi_upd ON public.profiles';
  EXECUTE $sql$
    CREATE TRIGGER z_trg_bulten_rizasi_upd
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.bulten_rizasi_muhru()
  $sql$;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- §2 · POSTA DEFTERİ
-- ═══════════════════════════════════════════════════════════════════════════

/* ─── 2.1 · eposta_kampanyalari — bülten sayıları ───────────────────────── */
CREATE TABLE IF NOT EXISTS eposta_kampanyalari (
  id                  BIGSERIAL PRIMARY KEY,
  baslik              TEXT NOT NULL,                 -- adminin iç adı
  konu                TEXT NOT NULL,                 -- e-postanın konu satırı
  govde               TEXT NOT NULL,                 -- düz metin (paragraflar boş satırla)
  durum               TEXT NOT NULL DEFAULT 'taslak'
                        CHECK (durum IN ('taslak','gonderiliyor','gonderildi','durduruldu')),
  hedef               TEXT NOT NULL DEFAULT 'tumu'
                        CHECK (hedef IN ('tumu','studio','ucretsiz')),
  alici_sayisi        INTEGER,                       -- kuyruklanan satır sayısı
  olusturan           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  gonderim_basladi_at TIMESTAMPTZ,
  gonderim_bitti_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_eposta_kampanya_created
  ON eposta_kampanyalari (created_at DESC);

ALTER TABLE eposta_kampanyalari ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eposta_kampanyalari admin all" ON eposta_kampanyalari;
CREATE POLICY "eposta_kampanyalari admin all"
  ON eposta_kampanyalari FOR ALL
  TO authenticated
  USING      (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));


/* ─── 2.2 · eposta_akislari — otomatik akışlar ──────────────────────────── */
--      Anahtar admin panelinden EKLENEMEZ: her akışın tetikleyicisi kodda
--      yaşar (eposta-gonder · mod:'akis'). Admin var olanı yönetir — metin,
--      gecikme, aç/kapa. Olmayan bir yeteneği panelde göstermek sahte
--      başarıdır (Anayasa §6.2).
CREATE TABLE IF NOT EXISTS eposta_akislari (
  anahtar      TEXT PRIMARY KEY,
  ad           TEXT NOT NULL,
  aciklama     TEXT,
  aktif        BOOLEAN NOT NULL DEFAULT false,   -- metni yazılmadan açılmaz
  gecikme_saat INTEGER NOT NULL DEFAULT 2 CHECK (gecikme_saat BETWEEN 0 AND 8760),
  konu         TEXT NOT NULL DEFAULT '',
  govde        TEXT NOT NULL DEFAULT '',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE eposta_akislari ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eposta_akislari admin all" ON eposta_akislari;
CREATE POLICY "eposta_akislari admin all"
  ON eposta_akislari FOR ALL
  TO authenticated
  USING      (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- İki akış tohumu. aktif=false: metni Emre yazana dek hiçbir posta çıkmaz.
INSERT INTO eposta_akislari (anahtar, ad, aciklama, gecikme_saat, konu, govde)
VALUES
  ('hos_geldin', 'Hoş geldin',
   'Tanışma tamamlandıktan sonra bir kez gönderilir. Gezginin ilk mektubu.',
   2, '', ''),
  ('geri_cagri', 'Geri çağrı',
   'Belirtilen gün kadar sessiz kalan gezgine bir kez gönderilir. 13o Geri Çağrı Motoru''nun e-posta ayağı.',
   168, '', '')
ON CONFLICT (anahtar) DO NOTHING;


/* ─── 2.3 · eposta_gonderimleri — gönderim defteri ──────────────────────── */
--      ÇİFTE GÖNDERİM ŞEMADA ENGELLENİR, kodun dikkatinde değil: iki kısmi
--      UNIQUE indeks. Fonksiyon kesilse (timeout, hata) ve yeniden koşsa bile
--      aynı kişiye ikinci posta yazılamaz — ikinci INSERT çakışır.
--
--      Damgayı ÜRETİCİ basmaz, TESLİM EDEN basar (Anayasa §6.10):
--      durum='gonderildi' yalnız sağlayıcı 200 döndüğünde yazılır; aksi hâlde
--      satır 'kuyrukta' kalır ya da 'hata' olur. Kuyrukta kalan satır bir
--      sonraki koşuda kaldığı yerden alınır.
CREATE TABLE IF NOT EXISTS eposta_gonderimleri (
  id           BIGSERIAL PRIMARY KEY,
  kampanya_id  BIGINT REFERENCES eposta_kampanyalari(id) ON DELETE CASCADE,
  akis_anahtar TEXT   REFERENCES eposta_akislari(anahtar) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,                  -- snapshot: adres sonra değişse de defter durur
  durum        TEXT NOT NULL DEFAULT 'kuyrukta'
                 CHECK (durum IN ('kuyrukta','gonderildi','hata','sekti')),
  hata         TEXT,
  saglayici_id TEXT,                           -- Resend message id
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at      TIMESTAMPTZ,
  -- Bir satır ya kampanyaya ya akışa aittir; ikisine birden ya da hiçbirine
  -- ait olamaz. XOR şemada durur, yoksa defterin anlamı bulanır.
  CONSTRAINT eposta_gonderim_tek_kaynak
    CHECK ((kampanya_id IS NOT NULL) <> (akis_anahtar IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_eposta_gonderim_kampanya_kisi
  ON eposta_gonderimleri (kampanya_id, user_id) WHERE kampanya_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_eposta_gonderim_akis_kisi
  ON eposta_gonderimleri (user_id, akis_anahtar) WHERE akis_anahtar IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_eposta_gonderim_kuyruk
  ON eposta_gonderimleri (durum, created_at) WHERE durum = 'kuyrukta';

CREATE INDEX IF NOT EXISTS idx_eposta_gonderim_zaman
  ON eposta_gonderimleri (created_at DESC);

-- Webhook satırı sağlayıcı kimliğinden bulur: sekme bildirimi geldiğinde
-- hangi gönderimin sektiğini bilmenin tek yolu budur.
CREATE INDEX IF NOT EXISTS idx_eposta_gonderim_saglayici
  ON eposta_gonderimleri (saglayici_id) WHERE saglayici_id IS NOT NULL;

ALTER TABLE eposta_gonderimleri ENABLE ROW LEVEL SECURITY;

-- Yazma yalnız service_role'ün (eposta-gonder). Admin okur.
DROP POLICY IF EXISTS "eposta_gonderimleri admin read" ON eposta_gonderimleri;
CREATE POLICY "eposta_gonderimleri admin read"
  ON eposta_gonderimleri FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));


-- ═══════════════════════════════════════════════════════════════════════════
-- §3 · RPC'LER
-- ═══════════════════════════════════════════════════════════════════════════

/* ─── 3.1 · username_musait — eşikte canlı müsaitlik ────────────────────── */
--      Yalnız BOOLEAN döner. Kullanıcı adı listesi, sayısı ya da benzeri
--      hiçbir şey sızmaz: eşik anonim bir yerdir, oradan veri toplanamaz.
--      Biçim kapısı burada da durur — istemci kapısı atlanabilir.
CREATE OR REPLACE FUNCTION public.username_musait(p_ad TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ad TEXT := btrim(coalesce(p_ad, ''));
BEGIN
  IF char_length(_ad) < 2 OR char_length(_ad) > 24 THEN RETURN false; END IF;
  -- Harf/rakamla başlar; içinde harf, rakam, boşluk, alt çizgi, nokta, tire.
  -- Türkçe harfler AÇIKÇA yazılır, [[:alnum:]]'e güvenilmez: POSIX sınıfları
  -- veritabanının ctype'ına bağlıdır ve ctype 'C' ise 'ş' alfanümerik
  -- SAYILMAZ — "Şeyma" adı sessizce reddedilirdi. Sessiz çünkü kapı yalnız
  -- false döner, sebebini söylemez.
  IF _ad !~ '^[[:alnum:]çğıöşüÇĞİÖŞÜ][[:alnum:]çğıöşüÇĞİÖŞÜ_ .-]{1,23}$'
  THEN RETURN false; END IF;
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(btrim(username)) = lower(_ad)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.username_musait(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.username_musait(TEXT) TO anon, authenticated;


/* ─── 3.2 · bulten_ozet — admin sayaçları ───────────────────────────────── */
--      Sayılar KANITLIDIR: "izinli" yalnız GENERATED kolonun true dediği
--      satırdır, yani kökeni tam olanlar. "adressiz" bir eksikliktir ve
--      panelde davet olarak görünür, sıfır olarak değil (§6.10).
CREATE OR REPLACE FUNCTION public.bulten_ozet()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _r JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'yetkisiz';
  END IF;

  SELECT jsonb_build_object(
    'toplam',    count(*),
    'adresli',   count(*) FILTER (WHERE email IS NOT NULL),
    'adressiz',  count(*) FILTER (WHERE email IS NULL),
    'izinli',    count(*) FILTER (WHERE email IS NOT NULL AND bulten_izin = true),
    'cikmis',    count(*) FILTER (WHERE bulten_cikis_at IS NOT NULL),
    'sekmis',    count(*) FILTER (WHERE email_sekme_at IS NOT NULL),
    -- İZİNLİ ile GÖNDERİLEBİLİR ayrı sayılır: ikisini tek sayıya katlamak,
    -- panelde olmayan bir kitleyi varmış gibi gösterirdi.
    'gonderilebilir', count(*) FILTER (WHERE email IS NOT NULL AND bulten_izin = true AND email_sekme_at IS NULL),
    'studio',    count(*) FILTER (WHERE email IS NOT NULL AND bulten_izin = true AND email_sekme_at IS NULL AND is_premium = true),
    'ucretsiz',  count(*) FILTER (WHERE email IS NOT NULL AND bulten_izin = true AND email_sekme_at IS NULL AND is_premium = false)
  ) INTO _r
  FROM profiles;

  RETURN coalesce(_r, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.bulten_ozet() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bulten_ozet() TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- DOĞRULAMA (SQL editöründe elle koşulabilir)
--   SELECT public.username_musait('Emre');        -- true (boş şemada)
--   SELECT public.username_musait('a');           -- false (kısa)
--   SELECT public.username_musait('@emre');       -- false (biçim)
--   SELECT public.username_musait('Şeyma');       -- true (Türkçe harf kapıdan geçer)
--   SELECT public.bulten_ozet();                  -- admin oturumunda JSONB
--   SELECT column_name, is_generated FROM information_schema.columns
--     WHERE table_name='profiles' AND column_name='bulten_izin';  -- ALWAYS
-- ═══════════════════════════════════════════════════════════════════════════


-- ███████████████████████████████████████████████████████████████████████████
-- ██  BÖLÜM — 051_gozlemevi_tek_cam.sql
-- ███████████████████████████████████████████████████████████████████████████

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


-- ███████████████████████████████████████████████████████████████████████████
-- ██  BÖLÜM — 052_tik_atifi.sql
-- ███████████████████████████████████████████████████████████████████████████

-- ═══════════════════════════════════════════════════════════════════════════
-- 052 — TIK ATIFI  (İç Çalışma 11 · boşluk B'nin yarısı · FAZ 5)
--
-- `notification_log.clicked_at` kolonu 000'dan beri şemada var (§4.16 Push
-- motoru altında, 000:1059) ama onu YAZAN hiçbir yer yoktu — Davetin
-- Nabzı kartı (13q `_davetNabzi`) bu yüzden "bu sıfır bir sonuç değil, bir
-- boşluk" diyordu. Bu dosya o yazma yolunu açar.
--
-- K2 (plan `.claude/plans/ic-calisma-kalan-fazlar.md`) — yazma yolu RLS
-- DEĞİL, RPC'dir: kullanıcı notification_log'a asla doğrudan UPDATE
-- atamaz (bugünkü politika yalnız SELECT ve AYNEN kalır), yalnız kendi
-- satırının clicked_at'ini mühürleyen bir SECURITY DEFINER fonksiyon
-- çağırabilir (emsal: 000_wanderer_schema.sql §4.17 quota_consume).
--
-- Üç koşul da gereklidir, hiçbiri süs değildir:
--   user_id = auth.uid() — başkasının satırını mühürlemeyi keser
--   clicked_at IS NULL   — İLK TIK KAZANIR; ikinci açılış yeni tık sayılmaz
--   id = p_id             — yalnız payload'ın gerçekten taşıdığı satır
--
-- Kanıt zinciri (§6.10): send-push nid'i payload'a satır GERÇEKTEN
-- oluştuktan SONRA koyar (insert → id al → gönder — sıra bu sprintte
-- tersine çevrildi, bkz. send-push/index.ts VERSION), sw.js onu
-- postMessage'a ve soğuk açılış hash'ine taşır, 10x bu RPC'yi çağırır.
-- `nid` yoksa 10x hiçbir şey yazmaz — "son gönderilen bildirimi tıklanmış
-- say" gibi bir tahmin ne orada ne burada var.
--
-- Bu dosya ELLE uygulanır (§6.5) — Supabase Dashboard → SQL Editor → New
-- query → yapıştır → Run. 051'in Gözlemevi rapor fonksiyonuna DOKUNMAZ
-- (K3 notu — o fonksiyonun on yedi bloğu bu dosyada YOK; taşıma borcu
-- doğmaz, migration-blok-tasima kapısı bu dosyayı zincire hiç almaz).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.notif_mark_clicked(p_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _n INT;
BEGIN
  UPDATE public.notification_log
     SET clicked_at = now()
   WHERE id = p_id
     AND user_id = auth.uid()
     AND clicked_at IS NULL;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.notif_mark_clicked(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notif_mark_clicked(BIGINT) TO authenticated;

-- RLS DEĞİŞMEZ: notification_log'un bugünkü politikası ("notif_log owner
-- read" — yalnız SELECT, owner) aynen kalır. Kullanıcıya UPDATE yetkisi
-- VERİLMEZ; yazma tek kapıdan (bu RPC) geçer.

-- ═══════════════════════════════════════════════════════════════════════════
-- DOĞRULAMA (SQL editöründe elle koşulabilir)
--   SELECT public.notif_mark_clicked(0);                      -- false (id yok)
--   -- kendi oturumunla gerçek bir notification_log.id dene:
--   SELECT id FROM notification_log WHERE user_id = auth.uid() ORDER BY sent_at DESC LIMIT 1;
--   SELECT public.notif_mark_clicked(<id>);                    -- true  (ilk tık)
--   SELECT public.notif_mark_clicked(<id>);                    -- false (ikinci tık kazanmaz)
--   SELECT clicked_at FROM notification_log WHERE id = <id>;   -- dolu
-- ═══════════════════════════════════════════════════════════════════════════


-- ███████████████████████████████████████████████████████████████████████████
-- ██  BÖLÜM — 053_saklama_politikasi.sql
-- ███████████████████████████████████████████████████████████████████████████

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


-- ███████████████████████████████████████████████████████████████████████████
-- ██  BÖLÜM — 054_riza_defteri.sql
-- ███████████████████████████████████████████████████████████████████████████

-- ═══════════════════════════════════════════════════════════════════════════
-- 054 — RIZA DEFTERİ  (İç Çalışma 15 · boşluk C · Kalan Yol Haritası FAZ 7)
--
-- `HK_VERSION` (`js/parts/13p-hukuk.js:21`) bugün tek bir sabit — kayıtta
-- bir kez okunur, ama HANGİ kullanıcının HANGİ sürümü kabul ettiği hiçbir
-- yerde tutulmuyordu. KVKK/GDPR'ın "değişiklik bildirimi" beklentisi
-- (bir sürüm arttığında kullanıcının o artışı GÖRDÜĞÜNÜ kanıtlayabilmek)
-- bugün karşılanmıyordu. Bu dosya o defteri açar.
--
-- KISMİ İSTİSNA — KORUNUR: `profiles.bulten_izin_surum` (`03-auth-shell.js:715`)
-- kayıt anında zaten `HK_VERSION` ile yazılıyor, ama o BAŞKA bir rızadır
-- (bülten izni) — tek sürüm sütunu, üzerine yazılan tek satır. Bu defter
-- onun YERİNE geçmez, YANINA gelir: genel hukuk metnini (Kullanım Koşulları +
-- Gizlilik + IP) kabul etme kaydı burada tutulur.
--
-- ═══ NEDEN UPDATE/DELETE POLİTİKASI YOK ═══
-- Bir rıza kaydı DÜZELTİLMEZ — yenisi eklenir. `hukuk_kabul`'ün birincil
-- anahtarı (user_id, surum) olduğu için aynı sürüm iki kez kabul edilemez
-- (ikinci upsert `ON CONFLICT DO NOTHING` ile sessizce düşer, bkz. 13p-hukuk.js
-- `hkKabulYaz`), ama sürüm arttığında (1.3 → 1.4) YENİ bir satır doğar ve
-- defterin tamamı kalır. Kullanıcıya UPDATE/DELETE yetkisi verilseydi,
-- "hangi sürümü ne zaman kabul ettiği" geçmişi kullanıcının kendi isteğiyle
-- (ya da bir bug'la) sessizce silinebilirdi — bu tam da bu defterin var olma
-- sebebini yer. Hesap silinince defter de gider (CASCADE) ama bu SİLME
-- HAKKIdır (GDPR "right to erasure"), rıza kaydını YANLIŞLAMA değildir.
--
-- K2 emsali (`notif_mark_clicked`, `052`) burada UYGULANMAZ: o kayıt admin
-- tarafından SECURITY DEFINER ile mühürlenen bir ATIF'tir (kullanıcı doğrudan
-- yazamaz). Rıza kaydı ise tam tersi — kullanıcının KENDİ eylemidir ve kendi
-- adına, kendi RLS'iyle yazılır; üçüncü bir tarafın onu mühürlemesi gerekmez.
--
-- Gözlemevi'nin 051'de kurulan tek-RPC rapor fonksiyonuna BU DOSYADA HİÇ
-- DEĞİNİLMEZ (adı bilerek anılmıyor, kapı bunu ölçer) — rıza defteri onun
-- okuduğu kaynaklardan biri DEĞİLDİR ve dokunsaydı 051'in on yedi bloğunu
-- taşımak zorunda kalırdı (migrations/README.md §SIRA ÖNEMLİDİR;
-- kapı: tests/migration-blok-tasima.test.js).
--
-- Bu dosya ELLE uygulanır (§6.5) — Supabase Dashboard → SQL Editor → New
-- query → yapıştır → Run.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS hukuk_kabul (
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  surum     TEXT NOT NULL,
  kabul_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, surum)
);

ALTER TABLE hukuk_kabul ENABLE ROW LEVEL SECURITY;

-- Sahibi okur — geçmiş sürümlerini görebilmesi kendi hakkıdır.
DROP POLICY IF EXISTS "hukuk_kabul owner select" ON hukuk_kabul;
CREATE POLICY "hukuk_kabul owner select"
  ON hukuk_kabul FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Sahibi yalnız KENDİ satırını yazar — başkasının adına rıza kaydı üretilemez.
DROP POLICY IF EXISTS "hukuk_kabul owner insert" ON hukuk_kabul;
CREATE POLICY "hukuk_kabul owner insert"
  ON hukuk_kabul FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE/DELETE politikası BİLEREK yazılmaz — yukarıdaki gerekçe bloğuna bkz.

-- ═══════════════════════════════════════════════════════════════════════════
-- DOĞRULAMA (SQL editöründe elle koşulabilir)
--   SELECT * FROM hukuk_kabul WHERE user_id = auth.uid();
--   INSERT INTO hukuk_kabul (user_id, surum) VALUES (auth.uid(), '1.3');
--   INSERT INTO hukuk_kabul (user_id, surum) VALUES (auth.uid(), '1.3');  -- 23505 (PK ihlali) — editörde HATA verir;
--                                                                          -- istemci tarafı upsert+ignoreDuplicates bunu sessizce yutar (bkz. hkKabulYaz)
--   INSERT INTO hukuk_kabul (user_id, surum) VALUES (auth.uid(), '1.4');  -- yeni satır — defter büyür, eski silinmez

-- ═══════════════════════════════════════════════════════════════════════════

