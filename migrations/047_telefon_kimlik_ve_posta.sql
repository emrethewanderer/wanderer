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
