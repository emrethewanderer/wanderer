-- ═══════════════════════════════════════════════════════════════════════════
-- 000 — WANDERER AI · TEK ŞEMA
-- "Kırk taş, tek duvar."
-- ───────────────────────────────────────────────────────────────────────────
--
--   ┌───────────────────────────────────────────────────────────────────┐
--   │  NE YAPACAKSIN                                                    │
--   │                                                                   │
--   │  1. Supabase Dashboard → SQL Editor → New query                   │
--   │  2. BU DOSYANIN TAMAMINI yapıştır                                 │
--   │  3. Run                                                           │
--   │                                                                   │
--   │  Hepsi bu. Başka dosya, başka adım, başka sıra yok. Dosya kendi   │
--   │  içinde eksiksiz ve idempotenttir — istediğin kadar tekrar        │
--   │  çalıştırabilirsin.                                               │
--   │                                                                   │
--   │  Sonunda "Success. No rows returned" görmelisin. Kontrol etmek    │
--   │  istersen §10'daki sorgular hazır bekliyor (zorunlu değil).       │
--   └───────────────────────────────────────────────────────────────────┘
--
-- ───────────────────────────────────────────────────────────────────────────
-- Bu dosya, 001–040 arası kırk migration'ın CANLI olan her nesnesini tek
-- yerde toplar. Ölü nesneler (artık hiçbir kodun okumadığı tablolar, bir
-- kerelik veri göçleri, eski fonksiyon sürümleri) BİLİNÇLİ olarak dışarıda
-- bırakıldı — listesi §11'de.
--
-- İKİ DURUMDA DA DOĞRU ÇALIŞIR:
--   A) BOŞ PROJE — her şeyi sıfırdan kurar.
--   B) BUGÜNKÜ PRODUCTION — hangi migration'ın uygulanıp uygulanmadığından
--      bağımsız olarak eksikleri tamamlar, var olana DOKUNMAZ.
--
-- ⚠ VERİ GÜVENLİĞİ: Bu dosyada tek bir DROP TABLE / DROP COLUMN / DELETE
--   yoktur. Her CREATE `IF NOT EXISTS`, her kolon `ADD COLUMN IF NOT EXISTS`,
--   her politika `DROP POLICY IF EXISTS` + yeniden kurulum. Baştan sona
--   birden çok kez çalıştırmak zarar vermez (idempotent).
--
-- ⚠ İNCELİK: `CREATE TABLE IF NOT EXISTS` mevcut bir tabloya kolon EKLEMEZ.
--   Bu yüzden migration'ların sonradan eklediği her kolon ayrıca
--   `ADD COLUMN IF NOT EXISTS` olarak tekrar edilir. §2'deki RENAME yoluyla
--   gelen iki tablo (portre, gecis_kartlarim) CREATE'i hiç görmediği için
--   onların TÜM kolonları tamamlanır — eski/kısmi bir şemayla duruyorlarsa
--   bugünkü hâle çekilirler.
--
-- ⚠ BU ŞEMANIN DIŞINDA KALANLAR: profiles, chat_history, chat_summaries,
--   challenge_progress, admin_settings, public_settings, knowledge_base,
--   knowledge_chunks, user_analytics, user_profile, user_patterns,
--   user_tracks, user_manifesto, mood_history, homework, notebook,
--   parts_log, somatic_log, breakthrough_moments, transformation_cards,
--   weekly_reports, onboarding_answers, feedbacks — bunlar Supabase'de ELLE
--   kurulmuş, repoda hiç migration'ı olmayan tablolardır. Bu dosya onları
--   YARATMAZ; yalnız §2'de üzerlerine kolon/politika ekler ve bunu da tablo
--   gerçekten varsa yapar. Tam envanter için §12'deki sorguyu koştur.
--
-- Supabase SQL Editor'da ELLE çalıştırılır (repo konvansiyonu).
--
-- İÇİNDEKİLER
--   §1  Uzantılar
--   §2  Ad göçü — eski tablo adları bugünkü adına taşınır
--   §3  Elle kurulmuş tablolara eklentiler (savunmacı)
--   §4  Modül tabloları
--   §5  Görünüm (view)
--   §6  Fonksiyonlar
--   §7  Trigger'lar
--   §8  Yetkiler
--   §9  Tohum satırlar
--   §10 Doğrulama
--   §11 Kaldırılanların dökümü + opsiyonel temizlik
--   §12 Şema envanteri sorgusu
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- §1 · UZANTILAR
-- ═══════════════════════════════════════════════════════════════════════════

-- pgvector — epizodik hafıza (user_memories) + kitap parçaları (knowledge_chunks).
CREATE EXTENSION IF NOT EXISTS vector;


-- ═══════════════════════════════════════════════════════════════════════════
-- §2 · AD GÖÇÜ  (eski mig 027 + 039)
-- ───────────────────────────────────────────────────────────────────────────
-- PROTOKOL-FABLE §4.3: "Tek ad, tek gerçek — grep ettiğin ad, kullanıcının
-- gördüğü ad." İki tablo yolculuk boyunca ad değiştirdi:
--   benlik_karti     → portre            ("Portrem"      · 02c)
--   an_kartlari      → benim_kartlarim   → gecis_kartlarim ("Geçiş Kartım" · 10A)
-- Bu bölüm §4'ten ÖNCE gelmek zorunda: rename önce koşarsa veri taşınır;
-- CREATE önce koşsaydı yanına BOŞ bir ikiz tablo doğar ve veri eski adda
-- mahsur kalırdı.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 2.1 · benlik_karti → portre ────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.benlik_karti') IS NOT NULL
     AND to_regclass('public.portre') IS NULL THEN
    ALTER TABLE public.benlik_karti RENAME TO portre;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies
             WHERE schemaname = 'public' AND tablename = 'portre'
               AND policyname = 'benlik_karti owner all') THEN
    ALTER POLICY "benlik_karti owner all" ON public.portre
      RENAME TO "portre owner all";
  END IF;
END $$;

-- ── 2.2 · an_kartlari → benim_kartlarim → gecis_kartlarim ──────────────────
DO $$
BEGIN
  IF to_regclass('public.an_kartlari') IS NOT NULL
     AND to_regclass('public.benim_kartlarim') IS NULL
     AND to_regclass('public.gecis_kartlarim') IS NULL THEN
    ALTER TABLE public.an_kartlari RENAME TO benim_kartlarim;
  END IF;
END $$;

ALTER INDEX IF EXISTS idx_an_kartlari_user_state   RENAME TO idx_benim_kartlarim_user_state;
ALTER INDEX IF EXISTS idx_an_kartlari_user_updated RENAME TO idx_benim_kartlarim_user_updated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies
             WHERE schemaname = 'public' AND tablename = 'benim_kartlarim'
               AND policyname = 'an_kartlari owner all') THEN
    ALTER POLICY "an_kartlari owner all" ON public.benim_kartlarim
      RENAME TO "benim_kartlarim owner all";
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.benim_kartlarim') IS NOT NULL
     AND to_regclass('public.gecis_kartlarim') IS NULL THEN
    ALTER TABLE public.benim_kartlarim RENAME TO gecis_kartlarim;
  END IF;
END $$;

ALTER INDEX IF EXISTS idx_benim_kartlarim_user_state   RENAME TO idx_gecis_kartlarim_user_state;
ALTER INDEX IF EXISTS idx_benim_kartlarim_user_updated RENAME TO idx_gecis_kartlarim_user_updated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies
             WHERE schemaname = 'public' AND tablename = 'gecis_kartlarim'
               AND policyname = 'benim_kartlarim owner all') THEN
    ALTER POLICY "benim_kartlarim owner all" ON public.gecis_kartlarim
      RENAME TO "gecis_kartlarim owner all";
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- §3 · ELLE KURULMUŞ TABLOLARA EKLENTİLER  (eski mig 001 + 014 + 017 + 030)
-- ───────────────────────────────────────────────────────────────────────────
-- Bu tabloların kendisi repoda yok (Supabase'de elle kuruldu). Buradaki her
-- blok "tablo gerçekten varsa" kapısından geçer — boş bir projede sessizce
-- atlanır, hata vermez.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 3.1 · profiles — abonelik + sadakat durum makinesi alanları ────────────
--    is_premium / is_premium_plus / is_admin GENELDE elle kurulumda vardı —
--    ama garanti değil (2026-07-26: gerçek koşuda is_premium_plus eksik çıktı,
--    _quota_tier() 42703 ile patladı — LANGUAGE sql fonksiyonlar CREATE anında
--    tam parse-analyze'den geçer, "SELECT *" gibi sessiz geçmez). Üçü de
--    ADD COLUMN IF NOT EXISTS ile garantiye alınır — DB'de zaten varsa dokunulmaz.
--    NOT: trial_ends_at'a DEFAULT verilmez — Fiyatlandırma v2'de yeni hesap
--    FREE başlar (eski "otomatik +30 gün" default'u bilinçli kaldırıldı).
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RAISE NOTICE '000: public.profiles yok — profiles eklentileri atlandı.';
    RETURN;
  END IF;

  EXECUTE $sql$
    ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS is_admin             boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS is_premium           boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS is_premium_plus      boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS trial_ends_at        timestamptz,
      ADD COLUMN IF NOT EXISTS premium_until        timestamptz,
      ADD COLUMN IF NOT EXISTS store_platform       text,
      ADD COLUMN IF NOT EXISTS offer_a_deadline     timestamptz,
      ADD COLUMN IF NOT EXISTS has_used_offer_a     boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS has_used_offer_b     boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS has_cancelled_before boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS lapsed_at            timestamptz
  $sql$;

  -- Eski kurulumdan kalan "+30 gün" default'unu sök (mevcut satırlar etkilenmez —
  -- deneme süresi devam edenler süresi bitene dek onurlandırılır).
  EXECUTE 'ALTER TABLE public.profiles ALTER COLUMN trial_ends_at DROP DEFAULT';
END $$;

-- ── 3.2 · challenge_progress — Sefer alanları ──────────────────────────────
--    10h-w2-library-challenges.js hâlâ okuyup yazıyor (geri-uyum katmanı).
DO $$
BEGIN
  IF to_regclass('public.challenge_progress') IS NULL THEN
    RAISE NOTICE '000: public.challenge_progress yok — Sefer kolonları atlandı.';
    RETURN;
  END IF;

  EXECUTE $sql$
    ALTER TABLE public.challenge_progress
      ADD COLUMN IF NOT EXISTS boss_id        text,
      ADD COLUMN IF NOT EXISTS nefes_at_start integer DEFAULT 100,
      ADD COLUMN IF NOT EXISTS nefes_now      integer DEFAULT 100
  $sql$;

  EXECUTE $sql$
    CREATE INDEX IF NOT EXISTS idx_challenge_progress_boss_id
      ON public.challenge_progress (user_id, boss_id, status)
  $sql$;
END $$;

-- ── 3.3 · chat_history / chat_summaries — DELETE politikaları ──────────────
--    Gün silme + yeniden üretme akışları bu iki politikaya bağlı.
DO $$
BEGIN
  IF to_regclass('public.chat_history') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_policies
                     WHERE schemaname = 'public' AND tablename = 'chat_history'
                       AND policyname = 'users delete own chat') THEN
    EXECUTE $sql$
      CREATE POLICY "users delete own chat" ON public.chat_history
        FOR DELETE USING (auth.uid() = user_id)
    $sql$;
  END IF;

  IF to_regclass('public.chat_summaries') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_policies
                     WHERE schemaname = 'public' AND tablename = 'chat_summaries'
                       AND policyname = 'users delete own summaries') THEN
    EXECUTE $sql$
      CREATE POLICY "users delete own summaries" ON public.chat_summaries
        FOR DELETE USING (auth.uid() = user_id)
    $sql$;
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- §4 · MODÜL TABLOLARI
-- ───────────────────────────────────────────────────────────────────────────
-- Her blok aynı ritimde: CREATE (tam şema) → ADD COLUMN (eski kurulum için)
-- → INDEX → RLS → POLICY. CREATE mevcut tabloyu değiştirmediği için sonradan
-- eklenen her kolon ayrıca ADD COLUMN olarak tekrar edilir — yeni projede
-- no-op, eski projede eksiği tamamlar.
-- ═══════════════════════════════════════════════════════════════════════════

/* ─── 4.1 · error_logs — client hata telemetrisi (14-boot) ─────────────── */
CREATE TABLE IF NOT EXISTS error_logs (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  label         TEXT NOT NULL,
  error_message TEXT,
  error_stack   TEXT,
  context       JSONB,
  user_agent    TEXT,
  app_version   TEXT,
  session_id    TEXT
);

CREATE INDEX IF NOT EXISTS idx_error_logs_user_time  ON error_logs (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_label_time ON error_logs (label, occurred_at DESC);

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_reads_own_logs" ON error_logs;
CREATE POLICY "user_reads_own_logs" ON error_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_inserts_own_logs" ON error_logs;
CREATE POLICY "user_inserts_own_logs" ON error_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Saklama: 30 gün yeter. Elle temizlik:
--   DELETE FROM error_logs WHERE occurred_at < now() - INTERVAL '30 days';


/* ─── 4.2 · feature_videos — özellik kapısı tanıtım videoları (10o) ────── */
CREATE TABLE IF NOT EXISTS feature_videos (
  feature_id TEXT PRIMARY KEY,
  video_url  TEXT,
  poster_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE feature_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feature_videos public read" ON feature_videos;
CREATE POLICY "feature_videos public read"
  ON feature_videos FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "feature_videos admin write" ON feature_videos;
CREATE POLICY "feature_videos admin write"
  ON feature_videos FOR ALL
  TO authenticated
  USING      (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));


/* ─── 4.3 · founder_letter — Gezgine Mektup (13d), tek satır ───────────── */
CREATE TABLE IF NOT EXISTS founder_letter (
  id         SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  title      TEXT,
  body       TEXT,
  photo_url  TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE founder_letter ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "founder_letter public read" ON founder_letter;
CREATE POLICY "founder_letter public read"
  ON founder_letter FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "founder_letter admin write" ON founder_letter;
CREATE POLICY "founder_letter admin write"
  ON founder_letter FOR ALL
  TO authenticated
  USING      (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));


/* ─── 4.4 · library_announcement — Duyuru Bandı, tek satır ─────────────── */
CREATE TABLE IF NOT EXISTS library_announcement (
  id          SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  header_text TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE library_announcement ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "library_announcement public read" ON library_announcement;
CREATE POLICY "library_announcement public read"
  ON library_announcement FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "library_announcement admin write" ON library_announcement;
CREATE POLICY "library_announcement admin write"
  ON library_announcement FOR ALL
  TO authenticated
  USING      (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));


/* ─── 4.5 · app_download_links — mağaza bağlantıları, tek satır ────────── */
CREATE TABLE IF NOT EXISTS app_download_links (
  id          SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ios_url     TEXT,
  android_url TEXT,
  web_url     TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE app_download_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_download_links public read" ON app_download_links;
CREATE POLICY "app_download_links public read"
  ON app_download_links FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "app_download_links admin write" ON app_download_links;
CREATE POLICY "app_download_links admin write"
  ON app_download_links FOR ALL
  TO authenticated
  USING      (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));


/* ─── 4.6 · persona_directives — Emre'nin Sesi (16d) ───────────────────── */
--     Client sözlüğü (16b) çevrimdışı varsayılan; buradaki satır p() ile ezer.
CREATE TABLE IF NOT EXISTS persona_directives (
  key        TEXT NOT NULL,
  lang       TEXT NOT NULL DEFAULT 'tr' CHECK (lang IN ('tr', 'en')),
  content    TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (key, lang)
);

ALTER TABLE persona_directives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "persona_directives public read" ON persona_directives;
CREATE POLICY "persona_directives public read"
  ON persona_directives FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "persona_directives admin write" ON persona_directives;
CREATE POLICY "persona_directives admin write"
  ON persona_directives FOR ALL
  TO authenticated
  USING      (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));


/* ─── 4.7 · wanderer_models — Öz / Bağ / Eser (10w · Model Stüdyosu) ───── */
CREATE TABLE IF NOT EXISTS wanderer_models (
  model_id      TEXT PRIMARY KEY,             -- 'oz' | 'bag' | 'eser'
  display_name  TEXT DEFAULT '',
  version_label TEXT DEFAULT '',
  tagline       TEXT DEFAULT '',
  description   TEXT DEFAULT '',
  glyph         TEXT DEFAULT '◆',
  system_prompt TEXT DEFAULT '',              -- eksen davranışı (kimlik DEĞİL — o admin_settings'te)
  knowledge     TEXT DEFAULT '',              -- eksenin kitap içeriği
  greeting      TEXT DEFAULT '',              -- {{name}} destekler
  starters      JSONB DEFAULT '[]'::jsonb,
  params        JSONB DEFAULT '{}'::jsonb,    -- boş bırakmak bilinçli: 06'nın mod-bazlı ısısını ezmesin
  is_enabled    BOOLEAN DEFAULT true,
  is_default    BOOLEAN DEFAULT false,
  sort_order    INT DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE wanderer_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wanderer_models public read" ON wanderer_models;
CREATE POLICY "wanderer_models public read"
  ON wanderer_models FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "wanderer_models admin write" ON wanderer_models;
CREATE POLICY "wanderer_models admin write"
  ON wanderer_models FOR ALL
  TO authenticated
  USING      (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));


/* ─── 4.8 · billing_events — mağaza webhook denetim izi ────────────────── */
--     RLS açık, politika YOK → yalnız service_role (webhook) erişir.
CREATE TABLE IF NOT EXISTS billing_events (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID,
  event_type  TEXT,
  store       TEXT,
  environment TEXT,
  payload     JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_events_user_idx ON billing_events (user_id, created_at DESC);

ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;


/* ─── 4.9 · portre — "Portrem" · olduğun kişi (02c) ────────────────────── */
--     Kullanıcı başına TEK satır. Dört kategori JSONB dizi: {text, src, at}.
CREATE TABLE IF NOT EXISTS portre (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dusunceler  JSONB DEFAULT '[]'::jsonb,
  inanclar    JSONB DEFAULT '[]'::jsonb,
  duygular    JSONB DEFAULT '[]'::jsonb,
  davranislar JSONB DEFAULT '[]'::jsonb,
  baslik      TEXT    DEFAULT '',
  portrait    TEXT    DEFAULT '',            -- 2-3 cümlelik sentez
  confirmed   BOOLEAN DEFAULT false,
  sahne       JSONB,                          -- 12d prosedürel sahne reçetesi
  version     INTEGER DEFAULT 1,              -- her tam sentezde artar
  history     JSONB   DEFAULT '[]'::jsonb,    -- evrim defteri (son ~40)
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Kolon tamamlaması. portre §2.1'deki RENAME ile de gelebilir; o yol
-- CREATE'i atladığı için tablo eski/kısmi bir şemayla duruyor olabilir ve
-- CREATE TABLE IF NOT EXISTS mevcut tabloya kolon EKLEMEZ. Aşağıdaki liste
-- tabloyu her hâlükârda bugünkü şemaya tamamlar (var olanlarda no-op).
ALTER TABLE portre ADD COLUMN IF NOT EXISTS dusunceler  JSONB DEFAULT '[]'::jsonb;
ALTER TABLE portre ADD COLUMN IF NOT EXISTS inanclar    JSONB DEFAULT '[]'::jsonb;
ALTER TABLE portre ADD COLUMN IF NOT EXISTS duygular    JSONB DEFAULT '[]'::jsonb;
ALTER TABLE portre ADD COLUMN IF NOT EXISTS davranislar JSONB DEFAULT '[]'::jsonb;
ALTER TABLE portre ADD COLUMN IF NOT EXISTS baslik      TEXT    DEFAULT '';
ALTER TABLE portre ADD COLUMN IF NOT EXISTS portrait    TEXT    DEFAULT '';
ALTER TABLE portre ADD COLUMN IF NOT EXISTS confirmed   BOOLEAN DEFAULT false;
ALTER TABLE portre ADD COLUMN IF NOT EXISTS sahne       JSONB;
ALTER TABLE portre ADD COLUMN IF NOT EXISTS version     INTEGER DEFAULT 1;
ALTER TABLE portre ADD COLUMN IF NOT EXISTS history     JSONB   DEFAULT '[]'::jsonb;
ALTER TABLE portre ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT now();
ALTER TABLE portre ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT now();

ALTER TABLE portre ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portre owner all" ON portre;
CREATE POLICY "portre owner all"
  ON portre FOR ALL
  TO authenticated
  USING      (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


/* ─── 4.10 · gecis_kartlarim — "Geçiş Kartım" (10A) ────────────────────── */
--      İki kutuplu kart: golden = olduğun · lapis = olman gereken.
CREATE TABLE IF NOT EXISTS gecis_kartlarim (
  id         TEXT PRIMARY KEY,                     -- 'ak_…' (client üretir)
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ihtiyac    TEXT NOT NULL DEFAULT '',             -- tohum cümlesi (≤280)
  source     TEXT NOT NULL DEFAULT 'bugun',        -- 'bugun' | 'sohbet' | 'ilham'
  golden     JSONB,                                -- {baslik,whisper,dusunceler,inanclar,duygular,davranislar}
  lapis      JSONB,
  strikes    JSONB NOT NULL DEFAULT '{"gordun":false,"yurudun":false,"oldum":false}'::jsonb,
  state      TEXT NOT NULL DEFAULT 'active',       -- 'active' | 'completed' | 'abandoned'
  shared     BOOLEAN NOT NULL DEFAULT false,       -- lapis kutbu halkaya indi mi
  share_id   BIGINT,                               -- paylasilan_kartlar.id (FK değil — snapshot bağımsız)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sealed_at  TIMESTAMPTZ
);

-- Kolon tamamlaması — portre'deki gerekçenin aynısı: bu tablo §2.2'deki iki
-- adımlı RENAME zinciriyle de gelebilir (an_kartlari → benim_kartlarim →
-- gecis_kartlarim), o yolda CREATE hiç koşmaz.
ALTER TABLE gecis_kartlarim ADD COLUMN IF NOT EXISTS ihtiyac    TEXT NOT NULL DEFAULT '';
ALTER TABLE gecis_kartlarim ADD COLUMN IF NOT EXISTS source     TEXT NOT NULL DEFAULT 'bugun';
ALTER TABLE gecis_kartlarim ADD COLUMN IF NOT EXISTS golden     JSONB;
ALTER TABLE gecis_kartlarim ADD COLUMN IF NOT EXISTS lapis      JSONB;
ALTER TABLE gecis_kartlarim ADD COLUMN IF NOT EXISTS strikes    JSONB NOT NULL DEFAULT '{"gordun":false,"yurudun":false,"oldum":false}'::jsonb;
ALTER TABLE gecis_kartlarim ADD COLUMN IF NOT EXISTS state      TEXT NOT NULL DEFAULT 'active';
ALTER TABLE gecis_kartlarim ADD COLUMN IF NOT EXISTS shared     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE gecis_kartlarim ADD COLUMN IF NOT EXISTS share_id   BIGINT;
ALTER TABLE gecis_kartlarim ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE gecis_kartlarim ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE gecis_kartlarim ADD COLUMN IF NOT EXISTS sealed_at  TIMESTAMPTZ;
-- Geçiş Sınaması'nın kaydı (2026-08-10): {at, gecti, eksik, alintilar}.
-- `strikes` KORUNUYOR ama artık okunmuyor — üç vuruş söküldü, mühür kanıtla
-- düşüyor; eski satırların verisi silinmez (§4.3 madde 4).
ALTER TABLE gecis_kartlarim ADD COLUMN IF NOT EXISTS sinav      JSONB;

CREATE INDEX IF NOT EXISTS idx_gecis_kartlarim_user_state   ON gecis_kartlarim (user_id, state);
CREATE INDEX IF NOT EXISTS idx_gecis_kartlarim_user_updated ON gecis_kartlarim (user_id, updated_at DESC);

ALTER TABLE gecis_kartlarim ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gecis_kartlarim owner all" ON gecis_kartlarim;
CREATE POLICY "gecis_kartlarim owner all"
  ON gecis_kartlarim FOR ALL
  TO authenticated
  USING      (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


/* ─── 4.11 · oik_kartlari — Olmak İstediğin Kişi (10D) ─────────────────── */
CREATE TABLE IF NOT EXISTS oik_kartlari (
  id             TEXT PRIMARY KEY,                    -- 'oik_…'
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  baslik         TEXT NOT NULL DEFAULT '',            -- olmak istediğin kişinin adı (≤60)
  whisper        TEXT NOT NULL DEFAULT '',
  dusunceler     JSONB NOT NULL DEFAULT '[]'::jsonb,
  inanclar       JSONB NOT NULL DEFAULT '[]'::jsonb,
  duygular       JSONB NOT NULL DEFAULT '[]'::jsonb,
  davranislar    JSONB NOT NULL DEFAULT '[]'::jsonb,
  olumlama       TEXT NOT NULL DEFAULT '',            -- Geçiş Alanı olumlaması (sabah/gece okunur)
  olumlama_duygu TEXT NOT NULL DEFAULT '',
  source         TEXT NOT NULL DEFAULT 'tasarim',     -- 'tasarim' | 'hayattaki_sen' | 'konusma' | 'legacy_gecis'
  version        INT NOT NULL DEFAULT 1,
  parent_id      TEXT,                                -- yeniden tasarımda önceki sürüm
  state          TEXT NOT NULL DEFAULT 'active',      -- 'active' | 'archived'
  has_recording  BOOLEAN NOT NULL DEFAULT false,      -- ses kaydının kendisi IndexedDB'de
  sahne          JSONB,                               -- 12d sahne reçetesi
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  sealed_at      TIMESTAMPTZ
);

ALTER TABLE oik_kartlari ADD COLUMN IF NOT EXISTS sahne JSONB;

CREATE INDEX IF NOT EXISTS idx_oik_kartlari_user_state   ON oik_kartlari (user_id, state);
CREATE INDEX IF NOT EXISTS idx_oik_kartlari_user_updated ON oik_kartlari (user_id, updated_at DESC);

ALTER TABLE oik_kartlari ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "oik_kartlari owner all" ON oik_kartlari;
CREATE POLICY "oik_kartlari owner all"
  ON oik_kartlari FOR ALL
  TO authenticated
  USING      (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


/* ─── 4.12 · kimlik_yolculugu — Kimlik Motoru (13l) ────────────────────── */
--      Olay defteri GİZLİLİK gereği client'ta (SafeStorage); burada senkron.
CREATE TABLE IF NOT EXISTS kimlik_yolculugu (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_persona TEXT,                          -- 12b deste kart id'si
  persona_since   TIMESTAMPTZ,
  persona_history JSONB DEFAULT '[]'::jsonb,     -- [{cardId, name, at, via}] (son ~60)
  virtue_now      JSONB DEFAULT '{}'::jsonb,     -- 11 erdemin zaman-azalmalı skoru
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE kimlik_yolculugu ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kimlik_yolculugu owner all" ON kimlik_yolculugu;
CREATE POLICY "kimlik_yolculugu owner all"
  ON kimlik_yolculugu FOR ALL
  TO authenticated
  USING      (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


/* ─── 4.13 · kisi_karti_profile + kisi_kartlari — Kişilerim motoru (10q) ─ */
CREATE TABLE IF NOT EXISTS kisi_karti_profile (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dusunceler  INTEGER DEFAULT 0,            -- 0-100
  inanclar    INTEGER DEFAULT 0,
  hisler      INTEGER DEFAULT 0,
  davranislar INTEGER DEFAULT 0,
  history     JSONB DEFAULT '[]'::jsonb,    -- [{cardId, at, rarity}] (son ~300)
  hedefler    JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Hedef Mührü: {"<card_id>":{"at":ISO,"absorbed":int}}
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE kisi_karti_profile
  ADD COLUMN IF NOT EXISTS hedefler JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN kisi_karti_profile.hedefler IS
  'Hedef mührü vurulan Kişi Kartları: { "<card_id>": { "at": ISO, "absorbed": int } }. Bugün lapis destesinin kaynağı; kart kazanılınca client mührü düşürür (mezuniyet).';

/* Üç Usta, Tek Deste (K4/K6/K7) — kart yapısının cihaz-üstü hâli.
   TEK kolon, çünkü hepsi aynı şeyin parçaları ve birlikte okunur/yazılır:
     aileler     : {"<cat>":{at,total}}              — tamamlanan kitap çerçeveleri
     panzehirler : {"<golge_id>":{at,erdemKartId}}   — gölgenin karşıt kutbu açıldı
     emeller     : {"<cat>":{at}}                    — kullanıcının seçtiği küme hedefi
     donem       : {weekKey,virtue,cardId}           — haftanın gündemi
   Kolon YOKKEN client 42703'ü yakalar ve bu veri cihaz-yerel (IndexedDB)
   yaşamaya devam eder — hiçbir akış kırılmaz (hedefler kolonunun deseni). */
ALTER TABLE kisi_karti_profile
  ADD COLUMN IF NOT EXISTS yapi JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN kisi_karti_profile.yapi IS
  'Kart yapısı: { aileler, panzehirler, emeller, donem }. Aile/emel Elmas ödemesi client''ta YALNIZ canlı kazanımda yapılır — bu kolon senkronu ikinci cihazda mührün yeniden düşmesini de engeller.';

/* Oluş Mührü (2026-07-27, K1/K3) — "kart dağıtılmaz, beyan edilir". Reçetesi
   tutmuş ama kullanıcı henüz "artık o kişiyim" demediği kartlar burada
   bekler; collection'a geçiş yalnız client'taki kkMuhurle'nin beyanıyla olur.
   Kolon YOKKEN client 42703'ü yakalar ve havuz cihaz-yerel (IndexedDB) yaşar
   — ikinci cihazda kkTick aynı reçeteleri yeniden hesaplayıp havuzu doldurur
   (collection zaten bulutta, kayıp yok); tek maliyet reddedilmiş/davet
   geçmişinin o cihazda unutulması (hedefler/yapi kolonlarının deseni). */
ALTER TABLE kisi_karti_profile
  ADD COLUMN IF NOT EXISTS esik JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN kisi_karti_profile.esik IS
  'Eşik havuzu (Oluş Mührü): reçetesi tutmuş ama kullanıcı henüz beyan etmemiş kartlar. { "<card_id>": { "at": ISO, "skor": int, "dims": {}, "davet": int, "sonDavet": ISO|null, "red": [ISO] } }. Kart ancak beyanla (kkMuhurle) collection''a geçer.';

ALTER TABLE kisi_karti_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kisi_karti_profile owner all" ON kisi_karti_profile;
CREATE POLICY "kisi_karti_profile owner all"
  ON kisi_karti_profile FOR ALL
  TO authenticated
  USING      (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS kisi_kartlari (
  id        BIGSERIAL PRIMARY KEY,
  user_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id   TEXT NOT NULL,                 -- 12b deste id'si
  rarity    TEXT,                          -- yaygin | nadir | nadide | efsane
  dims      JSONB DEFAULT '{}'::jsonb,     -- kazanım anındaki 4-boyut
  score     INTEGER DEFAULT 0,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_kisi_kartlari_user ON kisi_kartlari (user_id, earned_at DESC);

ALTER TABLE kisi_kartlari ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kisi_kartlari owner all" ON kisi_kartlari;
CREATE POLICY "kisi_kartlari owner all"
  ON kisi_kartlari FOR ALL
  TO authenticated
  USING      (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


/* ─── 4.14 · suretler + meclis_derinlik — İç Meclis (10p) ──────────────── */
--      Suret = ters çevrilebilir kart; "Hayattaki Sen"in tanınan bir yüzü.
CREATE TABLE IF NOT EXISTS suretler (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  slug            TEXT NOT NULL,              -- 'erteleyen' — tekilleştirme anahtarı
  ad              TEXT,                       -- kullanıcının verdiği ad
  unvan           TEXT,
  koken_oruntu    TEXT,
  dogus_ani       TEXT,                       -- kullanıcının kendi cümlesinden alıntı
  ses             TEXT,                       -- 1. tekil iç-monolog
  niyet           TEXT,                       -- pozitif koruma amacı (IFS)
  korku           TEXT,
  kor_nokta       TEXT,
  zirh            TEXT,
  kokler          JSONB DEFAULT '[]'::jsonb,  -- 5 Temel / 4 Derinlik referansı
  ayna            TEXT,                       -- bütünleşince kim olur
  bag_seviyesi    INTEGER DEFAULT 0,
  hal             TEXT DEFAULT 'sezilen',     -- sezilen | tanisildi | adlandi | butunlesti
  sigil           TEXT,
  renk            TEXT,
  son_yuzlesme    DATE,
  yuzlesme_sayisi INTEGER DEFAULT 0,
  sefer_gun       INTEGER DEFAULT 0,          -- 0 = aktif sefer yok; 1..21
  sefer_son_muhur DATE,
  sefer_baslangic TIMESTAMPTZ,
  diyalog_sayisi  INTEGER DEFAULT 0,
  son_diyalog     DATE,                       -- günlük diyalog bağ kazancı kapısı
  butunlesti_at   TIMESTAMPTZ,
  kanitlar        JSONB DEFAULT '[]'::jsonb,  -- [{ "t": metin, "d": "YYYY-MM-DD" }]
  son_kanit       DATE,
  sahne           JSONB,                      -- 12d sahne reçetesi
  engel_id        TEXT,                       -- 6 Perde / 6 Zehir / 7 Tuzak referansı (10h)
  diyaloglar      JSONB DEFAULT '[]'::jsonb,  -- son 10 Konuş özeti
  kaynak          TEXT DEFAULT 'profil',      -- 'yp' | 'ap' | 'profil' | 'elle'
  oik_madde_id    TEXT,                       -- OİK'e işlendiği maddenin izi (idempotens)
  created_at      TIMESTAMPTZ DEFAULT now(),
  named_at        TIMESTAMPTZ,
  UNIQUE (user_id, slug)
);

ALTER TABLE suretler ADD COLUMN IF NOT EXISTS son_yuzlesme    DATE;
ALTER TABLE suretler ADD COLUMN IF NOT EXISTS yuzlesme_sayisi INTEGER DEFAULT 0;
ALTER TABLE suretler ADD COLUMN IF NOT EXISTS sefer_gun       INTEGER DEFAULT 0;
ALTER TABLE suretler ADD COLUMN IF NOT EXISTS sefer_son_muhur DATE;
ALTER TABLE suretler ADD COLUMN IF NOT EXISTS sefer_baslangic TIMESTAMPTZ;
ALTER TABLE suretler ADD COLUMN IF NOT EXISTS diyalog_sayisi  INTEGER DEFAULT 0;
ALTER TABLE suretler ADD COLUMN IF NOT EXISTS son_diyalog     DATE;
ALTER TABLE suretler ADD COLUMN IF NOT EXISTS butunlesti_at   TIMESTAMPTZ;
ALTER TABLE suretler ADD COLUMN IF NOT EXISTS kanitlar        JSONB DEFAULT '[]'::jsonb;
ALTER TABLE suretler ADD COLUMN IF NOT EXISTS son_kanit       DATE;
ALTER TABLE suretler ADD COLUMN IF NOT EXISTS sahne           JSONB;
ALTER TABLE suretler ADD COLUMN IF NOT EXISTS engel_id        TEXT;
ALTER TABLE suretler ADD COLUMN IF NOT EXISTS diyaloglar      JSONB DEFAULT '[]'::jsonb;
ALTER TABLE suretler ADD COLUMN IF NOT EXISTS kaynak          TEXT DEFAULT 'profil';
ALTER TABLE suretler ADD COLUMN IF NOT EXISTS oik_madde_id    TEXT;

CREATE INDEX IF NOT EXISTS idx_suretler_user ON suretler (user_id, hal);

ALTER TABLE suretler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suretler owner all" ON suretler;
CREATE POLICY "suretler owner all"
  ON suretler FOR ALL
  TO authenticated
  USING      (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Derinlik Aynası — BAZ ve SON ölçüm anlık görüntüleri (Zayıf→Güçlü kayışı).
CREATE TABLE IF NOT EXISTS meclis_derinlik (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  baseline    JSONB,
  baseline_at TIMESTAMPTZ,
  latest      JSONB,
  latest_at   TIMESTAMPTZ
);

ALTER TABLE meclis_derinlik ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meclis_derinlik owner all" ON meclis_derinlik;
CREATE POLICY "meclis_derinlik owner all"
  ON meclis_derinlik FOR ALL
  TO authenticated
  USING      (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


/* ─── 4.15 · Sosyal halka — Kişilerin Kişileri (10C) ───────────────────── */
--      Mahremiyet sözü: gerçek ad ASLA görünmez. Rumuz sunucuda türetilir
--      (§7.2 trigger'ları) — client beyanı değil.

CREATE TABLE IF NOT EXISTS paylasilan_kartlar (
  id             BIGSERIAL PRIMARY KEY,
  owner_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL DEFAULT 'ilham',   -- 'ilham' | 'an' | 'benim'
  source_card_id TEXT,
  card_snapshot  JSONB NOT NULL,
  rumuz          TEXT NOT NULL,                   -- 'GEZGİN_XXXX' (trigger yazar)
  rumuz_color    TEXT DEFAULT '#F5A623',
  like_count     INTEGER DEFAULT 0,               -- trigger'la güncellenir
  comment_count  INTEGER DEFAULT 0,
  save_count     INTEGER DEFAULT 0,
  report_count   INTEGER NOT NULL DEFAULT 0,
  hidden         BOOLEAN DEFAULT false,           -- admin moderasyon bayrağı
  shared_at      TIMESTAMPTZ DEFAULT now()
  -- NOT: "haftanın topu" GENERATED kolonla yapılmıyor — AT TIME ZONE IMMUTABLE
  -- değil (42P17). Hafta filtresi §5'teki view içinde shared_at ile kurulur.
);

ALTER TABLE paylasilan_kartlar
  ADD COLUMN IF NOT EXISTS report_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_paylasilan_kartlar_recent
  ON paylasilan_kartlar (shared_at DESC) WHERE hidden = false;
CREATE INDEX IF NOT EXISTS idx_paylasilan_kartlar_owner
  ON paylasilan_kartlar (owner_user_id, shared_at DESC);
CREATE INDEX IF NOT EXISTS idx_paylasilan_kartlar_rank
  ON paylasilan_kartlar (shared_at DESC, like_count DESC) WHERE hidden = false;

ALTER TABLE paylasilan_kartlar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "paylasilan_kartlar all read" ON paylasilan_kartlar;
CREATE POLICY "paylasilan_kartlar all read"
  ON paylasilan_kartlar FOR SELECT
  TO authenticated
  USING (hidden = false);

-- Admin gizlenenleri de görür (moderasyon listesi) — permissive politikalar OR'lanır.
DROP POLICY IF EXISTS "paylasilan_kartlar admin read" ON paylasilan_kartlar;
CREATE POLICY "paylasilan_kartlar admin read"
  ON paylasilan_kartlar FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

DROP POLICY IF EXISTS "paylasilan_kartlar owner insert" ON paylasilan_kartlar;
CREATE POLICY "paylasilan_kartlar owner insert"
  ON paylasilan_kartlar FOR INSERT
  TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "paylasilan_kartlar owner update" ON paylasilan_kartlar;
CREATE POLICY "paylasilan_kartlar owner update"
  ON paylasilan_kartlar FOR UPDATE
  TO authenticated
  USING      (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "paylasilan_kartlar admin update" ON paylasilan_kartlar;
CREATE POLICY "paylasilan_kartlar admin update"
  ON paylasilan_kartlar FOR UPDATE
  TO authenticated
  USING      (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

DROP POLICY IF EXISTS "paylasilan_kartlar owner delete" ON paylasilan_kartlar;
CREATE POLICY "paylasilan_kartlar owner delete"
  ON paylasilan_kartlar FOR DELETE
  TO authenticated
  USING (owner_user_id = auth.uid());

-- Beğeniler
CREATE TABLE IF NOT EXISTS paylasim_begenileri (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id    BIGINT NOT NULL REFERENCES paylasilan_kartlar(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_paylasim_begenileri_card ON paylasim_begenileri (card_id);
CREATE INDEX IF NOT EXISTS idx_paylasim_begenileri_user ON paylasim_begenileri (user_id, created_at DESC);

ALTER TABLE paylasim_begenileri ENABLE ROW LEVEL SECURITY;

-- Anonimlik daraltması: herkese açık SELECT rumuz sözünü deliyordu. Sayaçlar
-- paylasilan_kartlar'ın trigger kolonlarından okunur; client kendi satırını çeker.
DROP POLICY IF EXISTS "paylasim_begenileri all read" ON paylasim_begenileri;
DROP POLICY IF EXISTS "paylasim_begenileri own read" ON paylasim_begenileri;
CREATE POLICY "paylasim_begenileri own read"
  ON paylasim_begenileri FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "paylasim_begenileri owner write" ON paylasim_begenileri;
CREATE POLICY "paylasim_begenileri owner write"
  ON paylasim_begenileri FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "paylasim_begenileri owner del" ON paylasim_begenileri;
CREATE POLICY "paylasim_begenileri owner del"
  ON paylasim_begenileri FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Yorumlar
CREATE TABLE IF NOT EXISTS paylasim_yorumlari (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id     BIGINT NOT NULL REFERENCES paylasilan_kartlar(id) ON DELETE CASCADE,
  rumuz       TEXT NOT NULL,                  -- trigger yazar
  rumuz_color TEXT DEFAULT '#F5A623',
  body        TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 600),
  hidden      BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paylasim_yorumlari_card ON paylasim_yorumlari (card_id, created_at DESC);

ALTER TABLE paylasim_yorumlari ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "paylasim_yorumlari all read" ON paylasim_yorumlari;
CREATE POLICY "paylasim_yorumlari all read"
  ON paylasim_yorumlari FOR SELECT
  TO authenticated
  USING (hidden = false);

DROP POLICY IF EXISTS "paylasim_yorumlari owner write" ON paylasim_yorumlari;
CREATE POLICY "paylasim_yorumlari owner write"
  ON paylasim_yorumlari FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "paylasim_yorumlari owner del" ON paylasim_yorumlari;
CREATE POLICY "paylasim_yorumlari owner del"
  ON paylasim_yorumlari FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "paylasim_yorumlari admin update" ON paylasim_yorumlari;
CREATE POLICY "paylasim_yorumlari admin update"
  ON paylasim_yorumlari FOR UPDATE
  TO authenticated
  USING      (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- Kayıtlar — paylaşılan kartı kendi koleksiyonuna alma izi
CREATE TABLE IF NOT EXISTS paylasim_kayitlari (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id         BIGINT NOT NULL REFERENCES paylasilan_kartlar(id) ON DELETE CASCADE,
  cloned_ilham_id TEXT,
  saved_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_paylasim_kayitlari_user ON paylasim_kayitlari (user_id, saved_at DESC);

ALTER TABLE paylasim_kayitlari ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "paylasim_kayitlari all read" ON paylasim_kayitlari;
DROP POLICY IF EXISTS "paylasim_kayitlari own read" ON paylasim_kayitlari;
CREATE POLICY "paylasim_kayitlari own read"
  ON paylasim_kayitlari FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "paylasim_kayitlari owner write" ON paylasim_kayitlari;
CREATE POLICY "paylasim_kayitlari owner write"
  ON paylasim_kayitlari FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Raporlar — halkayı koruyan sessiz bildirim (⚑ Bildir)
CREATE TABLE IF NOT EXISTS paylasim_raporlari (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id    BIGINT NOT NULL REFERENCES paylasilan_kartlar(id) ON DELETE CASCADE,
  reason     TEXT NOT NULL DEFAULT '' CHECK (length(reason) <= 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_paylasim_raporlari_card ON paylasim_raporlari (card_id, created_at DESC);

ALTER TABLE paylasim_raporlari ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "paylasim_raporlari own insert" ON paylasim_raporlari;
CREATE POLICY "paylasim_raporlari own insert"
  ON paylasim_raporlari FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "paylasim_raporlari own read" ON paylasim_raporlari;
CREATE POLICY "paylasim_raporlari own read"
  ON paylasim_raporlari FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "paylasim_raporlari admin read" ON paylasim_raporlari;
CREATE POLICY "paylasim_raporlari admin read"
  ON paylasim_raporlari FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

DROP POLICY IF EXISTS "paylasim_raporlari admin delete" ON paylasim_raporlari;
CREATE POLICY "paylasim_raporlari admin delete"
  ON paylasim_raporlari FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));


/* ─── 4.16 · Push motoru — web + native (10x · 00e) ────────────────────── */
--      Native token'lar p256dh/auth taşımaz → o iki kolon NULL kabul eder.
--      Native satırda endpoint sentetik: 'native:<platform>:<token>'.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint     TEXT NOT NULL UNIQUE,          -- cihaz-tekil (upsert anahtarı)
  p256dh       TEXT,                          -- web push public key
  auth         TEXT,                          -- web push auth secret
  ua           TEXT,
  platform     TEXT,                          -- 'ios' | 'android' | NULL(web)
  native_token TEXT,                          -- APNs/FCM cihaz token'ı
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS platform     TEXT;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS native_token TEXT;
ALTER TABLE push_subscriptions ALTER COLUMN p256dh DROP NOT NULL;
ALTER TABLE push_subscriptions ALTER COLUMN auth   DROP NOT NULL;

CREATE INDEX IF NOT EXISTS push_subs_user_idx     ON push_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS push_subs_platform_idx ON push_subscriptions (platform) WHERE platform IS NOT NULL;

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subs owner all" ON push_subscriptions;
CREATE POLICY "push_subs owner all"
  ON push_subscriptions FOR ALL
  TO authenticated
  USING      (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Engagement snapshot — motorun "kimi/ne zaman/neyle" kararı. Kullanıcı başına TEK satır.
CREATE TABLE IF NOT EXISTS user_engagement (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tz               TEXT    DEFAULT 'Europe/Istanbul',
  lang             TEXT    NOT NULL DEFAULT 'tr',   -- push dili (send-push okur)
  streak           INT     DEFAULT 0,
  last_active_date DATE,
  last_sealed_date DATE,
  pending_soz_text TEXT,                            -- bugün verilmiş, hesabı görülmemiş söz
  quiet_start      INT     DEFAULT 23,              -- sessiz saat başlangıcı (yerel)
  quiet_end        INT     DEFAULT 8,
  push_enabled     BOOLEAN DEFAULT false,
  updated_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_engagement ADD COLUMN IF NOT EXISTS lang TEXT NOT NULL DEFAULT 'tr';

ALTER TABLE user_engagement ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_engagement owner all" ON user_engagement;
CREATE POLICY "user_engagement owner all"
  ON user_engagement FOR ALL
  TO authenticated
  USING      (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Bildirim günlüğü — freq-cap (günde max 1-2) + tıklanma analitiği.
-- INSERT'leri send-push (service_role) yapar; kullanıcı yalnız OKUR.
CREATE TABLE IF NOT EXISTS notification_log (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,   -- winback | streak_risk | soz | armagan | person_pack | morning | milestone | sosyal | test | broadcast
  title      TEXT,
  body       TEXT,
  sent_at    TIMESTAMPTZ DEFAULT now(),
  clicked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS notif_log_user_sent_idx ON notification_log (user_id, sent_at DESC);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_log owner read" ON notification_log;
CREATE POLICY "notif_log owner read"
  ON notification_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());


/* ─── 4.17 · Kota Motoru — çift pencere + armağanlar (13m) ─────────────── */
--      Free: 5 saatlik pencere + haftalık tavan · Pro: 24 saatlik + haftalık
--      Max: sınırsız. Armağanlar: günlük Ultra (Üç Mühür) + kalıcı Set (Hazine).
CREATE TABLE IF NOT EXISTS quota_settings (
  id               SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  five_hour_limit  INT NOT NULL DEFAULT 10,   -- Free · 5 saatlik pencere
  weekly_limit     INT NOT NULL DEFAULT 40,   -- Free · haftalık tavan
  pro_daily_limit  INT NOT NULL DEFAULT 50,   -- Pro · 24 saatlik pencere
  pro_weekly_limit INT NOT NULL DEFAULT 350,
  ultra_bonus      INT NOT NULL DEFAULT 9,    -- Üç Mühür günü armağanı
  set_bonus        INT NOT NULL DEFAULT 9,    -- Hazine seti tamamlama armağanı
  -- false: client quota_consume çağırır · true: llm-chat Edge Function tüketir
  server_enforced  BOOLEAN NOT NULL DEFAULT false,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE quota_settings ADD COLUMN IF NOT EXISTS ultra_bonus      INT NOT NULL DEFAULT 9;
ALTER TABLE quota_settings ADD COLUMN IF NOT EXISTS pro_daily_limit  INT NOT NULL DEFAULT 50;
ALTER TABLE quota_settings ADD COLUMN IF NOT EXISTS pro_weekly_limit INT NOT NULL DEFAULT 350;
ALTER TABLE quota_settings ADD COLUMN IF NOT EXISTS set_bonus        INT NOT NULL DEFAULT 9;

ALTER TABLE quota_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quota settings okunur" ON quota_settings;
CREATE POLICY "quota settings okunur"
  ON quota_settings FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "quota settings admin gunceller" ON quota_settings;
CREATE POLICY "quota settings admin gunceller"
  ON quota_settings FOR UPDATE TO authenticated
  USING      (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

-- Pencere durumu — kullanıcı başına TEK satır (mesaj başına satır YOK;
-- boot maliyeti sabit kalır, temizlik cron'u gerekmez).
CREATE TABLE IF NOT EXISTS quota_windows (
  user_id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  win5_start     TIMESTAMPTZ,
  win5_used      INT    NOT NULL DEFAULT 0,
  week_start     TIMESTAMPTZ,
  week_used      INT    NOT NULL DEFAULT 0,
  total_used     BIGINT NOT NULL DEFAULT 0,
  bonus_day      DATE,                                    -- günlük Ultra Armağanı
  bonus_left     INT    NOT NULL DEFAULT 0,
  bonus_granted  INT    NOT NULL DEFAULT 0,
  set_bonus_left INT    NOT NULL DEFAULT 0,               -- kalıcı Set Armağanı
  set_bonus_sets JSONB  NOT NULL DEFAULT '[]'::jsonb,     -- ödüllendirilmiş set id'leri
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE quota_windows ADD COLUMN IF NOT EXISTS bonus_day      DATE;
ALTER TABLE quota_windows ADD COLUMN IF NOT EXISTS bonus_left     INT   NOT NULL DEFAULT 0;
ALTER TABLE quota_windows ADD COLUMN IF NOT EXISTS bonus_granted  INT   NOT NULL DEFAULT 0;
ALTER TABLE quota_windows ADD COLUMN IF NOT EXISTS set_bonus_left INT   NOT NULL DEFAULT 0;
ALTER TABLE quota_windows ADD COLUMN IF NOT EXISTS set_bonus_sets JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE quota_windows ENABLE ROW LEVEL SECURITY;

-- Kullanıcı kendi satırını OKUR; yazma yalnız SECURITY DEFINER RPC'lerden.
DROP POLICY IF EXISTS "quota windows kendi satiri" ON quota_windows;
CREATE POLICY "quota windows kendi satiri"
  ON quota_windows FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Edge Function günlük kotaları (hayal-gorsel, llm-embed).
-- RLS açık, politika YOK — yalnız service_role dokunur.
CREATE TABLE IF NOT EXISTS fn_quota_days (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fn         TEXT NOT NULL,
  day        DATE NOT NULL,
  used       INT  NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, fn)
);

ALTER TABLE fn_quota_days ENABLE ROW LEVEL SECURITY;


/* ─── 4.18 · Kullanıcı Mektubu — Studio, ayda 1 (13d ikizi) ────────────── */
--      INSERT/UPDATE/DELETE yalnız service_role (send-user-letter) ile.
CREATE TABLE IF NOT EXISTS user_letters (
  id               BIGSERIAL PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email       TEXT,                -- snapshot (kullanıcı silinse de admin görsün)
  user_name        TEXT,
  body             TEXT NOT NULL,
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_email_at    TIMESTAMPTZ,
  sent_email_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_letters_user_sent ON user_letters (user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_letters_sent      ON user_letters (sent_at DESC);

ALTER TABLE user_letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_letters self read" ON user_letters;
CREATE POLICY "user_letters self read"
  ON user_letters FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_letters admin read" ON user_letters;
CREATE POLICY "user_letters admin read"
  ON user_letters FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE TABLE IF NOT EXISTS user_letter_settings (
  id                SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  destination_email TEXT,
  updated_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_letter_settings ENABLE ROW LEVEL SECURITY;

-- Hedef e-postayı kullanıcılar görmemeli → okuma da yalnız admin.
DROP POLICY IF EXISTS "user_letter_settings admin all" ON user_letter_settings;
CREATE POLICY "user_letter_settings admin all"
  ON user_letter_settings FOR ALL
  TO authenticated
  USING      (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));


/* ─── 4.19 · Kullanım Nabzı — Gözlemevi telemetrisi (00f · 13q) ────────── */
--      İçerik ASLA loglanmaz: yalnız ekran adı + süre + sayı (gizlilik sözü).
CREATE TABLE IF NOT EXISTS usage_events (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id  TEXT,                          -- sayfa-yüklemesi başına rastgele kimlik
  screen      TEXT NOT NULL,                 -- view/overlay adı, kind='mode' ise mod adı
  kind        TEXT NOT NULL DEFAULT 'view',  -- view | overlay | mode
  prev_screen TEXT,                          -- akış analizi
  entered_at  TIMESTAMPTZ NOT NULL,
  duration_ms INTEGER NOT NULL CHECK (duration_ms >= 0),
  meta        JSONB                          -- hafif sayısal bağlam — metin içerik YASAK
);

CREATE INDEX IF NOT EXISTS usage_events_user_time_idx ON usage_events (user_id, entered_at DESC);
CREATE INDEX IF NOT EXISTS usage_events_time_idx      ON usage_events (entered_at DESC);

ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

-- Admin SELECT politikası bilerek YOK — admin okuması yalnız admin_usage_report'tan.
DROP POLICY IF EXISTS "usage_events owner insert" ON usage_events;
CREATE POLICY "usage_events owner insert"
  ON usage_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "usage_events owner select" ON usage_events;
CREATE POLICY "usage_events owner select"
  ON usage_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Saklama: 90 gün yeter (pencereler 7/30/90). Elle temizlik:
--   DELETE FROM usage_events WHERE entered_at < now() - INTERVAL '90 days';

CREATE TABLE IF NOT EXISTS usage_insights (
  id            BIGSERIAL PRIMARY KEY,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  period_days   INTEGER NOT NULL DEFAULT 30,
  report_md     TEXT NOT NULL,               -- "Emre'nin Tavsiyeleri" markdown
  data_snapshot JSONB                        -- üretim anındaki aggregate (izlenebilirlik)
);

ALTER TABLE usage_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usage_insights admin all" ON usage_insights;
CREATE POLICY "usage_insights admin all"
  ON usage_insights FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));


/* ─── 4.20 · user_memories — Epizodik Hafıza (09f · Tanıyan Ayna) ──────── */
--      "Bunu 14 Mart'ta da yaşadın" türü anlamsal geri-getirme.
CREATE TABLE IF NOT EXISTS user_memories (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL DEFAULT 'day_summary',  -- day_summary | emotional_moment
  content    TEXT NOT NULL,                        -- embed edilen kaynak metin
  meta       JSONB,                                -- { day_key, intensity, topics[], emotions[] }
  embedding  VECTOR(1536) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_memories_user_time_idx ON user_memories (user_id, created_at DESC);

-- IVFFlat cosine — kullanıcı başına anı sayısı düşük/orta ölçekte; HNSW gereksiz.
CREATE INDEX IF NOT EXISTS user_memories_embedding_idx ON user_memories
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_memories owner all" ON user_memories;
CREATE POLICY "user_memories owner all"
  ON user_memories FOR ALL TO authenticated
  USING      (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ═══════════════════════════════════════════════════════════════════════════
-- §5 · GÖRÜNÜM
-- ═══════════════════════════════════════════════════════════════════════════

-- Haftanın Topu — 10C'deki raf. "Bu hafta" = ISO hafta başı (Pazartesi 00:00,
-- İstanbul). View içinde now()/AT TIME ZONE serbesttir (immutability şartı yok).
-- NEDEN DROP+CREATE (CREATE OR REPLACE değil): view SELECT * kullanıyor —
-- paylasilan_kartlar'a sonradan eklenen kolonlar (ör. report_count) * açılımının
-- kolon sırasını değiştirebilir; CREATE OR REPLACE VIEW kolon yeniden adlandırmaya/
-- sıra değişikliğine izin vermez (42P16), rerun'da patlar. DROP+CREATE idempotent.
DROP VIEW IF EXISTS paylasilan_haftanin_topu;
CREATE VIEW paylasilan_haftanin_topu AS
  SELECT *,
         (like_count * 2 + comment_count + save_count) AS rank_score
  FROM paylasilan_kartlar
  WHERE hidden = false
    AND shared_at >= (date_trunc('week', (now() AT TIME ZONE 'Europe/Istanbul')) AT TIME ZONE 'Europe/Istanbul')
  ORDER BY rank_score DESC, shared_at DESC;


-- ═══════════════════════════════════════════════════════════════════════════
-- §6 · FONKSİYONLAR
-- ═══════════════════════════════════════════════════════════════════════════

/* ─── 6.1 · profiles ayrıcalık koruması ────────────────────────────────── */
--      NEDEN: is_admin, admin tablolarının RLS politikalarında yetki kaynağı.
--      İstemci kendi profiles satırını güncelleyebildiği ve Postgres RLS
--      SÜTUN ayrımı yapmadığı için satır-bazlı RLS tek başına yetmez. Bu iki
--      trigger, service_role dışından gelen yazımlarda ayrıcalıklı sütunları
--      eski değerine sabitler.

CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF coalesce(auth.jwt() ->> 'role', current_user) <> 'service_role'
     AND current_user <> 'postgres' THEN
    new.is_admin             := old.is_admin;
    new.is_premium           := old.is_premium;
    new.is_premium_plus      := old.is_premium_plus;
    new.premium_until        := old.premium_until;
    new.trial_ends_at        := old.trial_ends_at;
    new.store_platform       := old.store_platform;
    new.offer_a_deadline     := old.offer_a_deadline;
    new.has_used_offer_a     := old.has_used_offer_a;
    new.has_used_offer_b     := old.has_used_offer_b;
    new.has_cancelled_before := old.has_cancelled_before;
    new.lapsed_at            := old.lapsed_at;
  END IF;
  RETURN new;
END;
$$;

-- INSERT yolu: ilk profil satırını istemci açar (03-auth-shell). Ayrıcalıklı
-- alanlar nötrlenir; İlk Kapı süresi (72 saat) burada verilir — tamper-proof.
CREATE OR REPLACE FUNCTION public.protect_profile_privileges_ins()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF coalesce(auth.jwt() ->> 'role', current_user) <> 'service_role'
     AND current_user <> 'postgres' THEN
    new.is_admin             := false;
    new.is_premium           := false;
    new.is_premium_plus      := false;
    new.premium_until        := null;
    new.trial_ends_at        := null;   -- v2: yeni hesap FREE başlar
    new.store_platform       := null;
    new.offer_a_deadline     := now() + interval '72 hours';
    new.has_used_offer_a     := false;
    new.has_used_offer_b     := false;
    new.has_cancelled_before := false;
    new.lapsed_at            := null;
  END IF;
  RETURN new;
END;
$$;

/* ─── 6.2 · Wanderer rumuzu — sunucu mührü ─────────────────────────────── */
--      10B ilhamRumuz()'un birebir SQL ikizi:
--        h = 2166136261; her karakter: h ^= charCode; h = Math.imul(h, 16777619)
--        tag = h.toString(36).toUpperCase().slice(0,4); color = PALET[h % 10]
--      SQL h'yi işaretsiz mod-2^32 aritmetiğiyle taşır — bit deseni JS ile aynı.
--      ⚠ PARİTE: JS değişirse burası da değişmeli (tests/10A fikstürü korur).

CREATE OR REPLACE FUNCTION _wanderer_fnv1a(p_str TEXT)
RETURNS BIGINT
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  h BIGINT := 2166136261;
  i INT;
BEGIN
  FOR i IN 1..length(p_str) LOOP
    h := h # ascii(substr(p_str, i, 1));            -- XOR
    h := (h * 16777619) % 4294967296;               -- imul mod 2^32
  END LOOP;
  RETURN h;
END;$$;

CREATE OR REPLACE FUNCTION _wanderer_base36(p_n BIGINT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  digits CONSTANT TEXT := '0123456789abcdefghijklmnopqrstuvwxyz';
  r TEXT := '';
  v BIGINT := p_n;
BEGIN
  IF v <= 0 THEN RETURN '0'; END IF;
  WHILE v > 0 LOOP
    r := substr(digits, (v % 36)::INT + 1, 1) || r; -- en anlamlı hane başa
    v := v / 36;
  END LOOP;
  RETURN r;
END;$$;

CREATE OR REPLACE FUNCTION wanderer_rumuz(p_user UUID)
RETURNS JSONB
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  -- 10B _GEZGIN_RENKLERI ile birebir aynı sıra
  palet CONSTANT TEXT[] := ARRAY[
    '#F5A623','#F7C744','#5A8AD8','#7FA6E4','#2D5FA8',
    '#C9A24B','#EAE2D6','#F0D9A8','#CBD8F0','#B8953C'];
  h   BIGINT;
  tag TEXT;
BEGIN
  h   := _wanderer_fnv1a(COALESCE(p_user::text, 'anon'));
  tag := upper(substr(_wanderer_base36(h), 1, 4));
  RETURN jsonb_build_object(
    'name',  'GEZGİN_' || tag,
    'color', palet[(h % 10)::INT + 1]
  );
END;$$;

-- BEFORE INSERT: client ne gönderirse göndersin rumuz sunucuda türetilir.
CREATE OR REPLACE FUNCTION _rumuz_muhru_kart()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r JSONB;
BEGIN
  r := wanderer_rumuz(NEW.owner_user_id);
  NEW.rumuz       := r->>'name';
  NEW.rumuz_color := r->>'color';
  RETURN NEW;
END;$$;

CREATE OR REPLACE FUNCTION _rumuz_muhru_yorum()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r JSONB;
BEGIN
  r := wanderer_rumuz(NEW.user_id);
  NEW.rumuz       := r->>'name';
  NEW.rumuz_color := r->>'color';
  RETURN NEW;
END;$$;

/* ─── 6.3 · Sosyal sayaç senkronu ──────────────────────────────────────── */

CREATE OR REPLACE FUNCTION _ilham_begeni_count_sync()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE paylasilan_kartlar SET like_count = like_count + 1 WHERE id = NEW.card_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE paylasilan_kartlar SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.card_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;$$;

CREATE OR REPLACE FUNCTION _ilham_yorum_count_sync()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE paylasilan_kartlar SET comment_count = comment_count + 1 WHERE id = NEW.card_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE paylasilan_kartlar SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.card_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;$$;

CREATE OR REPLACE FUNCTION _ilham_kayit_count_sync()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE paylasilan_kartlar SET save_count = save_count + 1 WHERE id = NEW.card_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;$$;

CREATE OR REPLACE FUNCTION _paylasim_rapor_count_sync()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE paylasilan_kartlar SET report_count = report_count + 1 WHERE id = NEW.card_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE paylasilan_kartlar SET report_count = GREATEST(0, report_count - 1) WHERE id = OLD.card_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;$$;

/* ─── 6.4 · Kota Motoru ────────────────────────────────────────────────── */

-- Tier çözücü — is_admin/is_premium_plus = max · is_premium/deneme = pro · yoksa free
CREATE OR REPLACE FUNCTION public._quota_tier(uid uuid)
RETURNS text
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = uid AND (p.is_admin = true OR p.is_premium_plus = true)
    ) THEN 'max'
    WHEN EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = uid AND (
             p.is_premium = true
          OR (p.trial_ends_at IS NOT NULL AND p.trial_ends_at > now())
          OR (p.premium_until IS NOT NULL AND p.premium_until > now())
       )
    ) THEN 'pro'
    ELSE 'free'
  END;
$$;

-- Geriye dönük uyum: eski _quota_is_premium çağıranlar için.
CREATE OR REPLACE FUNCTION public._quota_is_premium(uid uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT public._quota_tier(uid) <> 'free';
$$;

-- Gün çözücü — client'ın YEREL günü; geçersiz/uzaksa Istanbul günü.
-- (localISODate kuralının sunucu ikizi: toISOString UTC'dir, TR'de gün kaydırır.)
CREATE OR REPLACE FUNCTION public._quota_day(p_day text)
RETURNS date
LANGUAGE plpgsql STABLE SET search_path = public
AS $$
DECLARE d date;
BEGIN
  IF p_day ~ '^\d{4}-\d{2}-\d{2}$' THEN
    BEGIN
      d := p_day::date;
      IF abs(d - (now() AT TIME ZONE 'Europe/Istanbul')::date) <= 1 THEN
        RETURN d;
      END IF;
    EXCEPTION WHEN others THEN null;
    END;
  END IF;
  RETURN (now() AT TIME ZONE 'Europe/Istanbul')::date;
END;
$$;

-- Eski parametresiz sürüm varsa düşür — aşırı yükleme çakışması olmasın
-- (default sayesinde parametresiz çağrı yine çalışır).
DROP FUNCTION IF EXISTS public.quota_consume();

-- Durum — ARTIRMAZ; UI kota çemberi bunu çizer.
CREATE OR REPLACE FUNCTION public.quota_status()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  qs  public.quota_settings%rowtype;
  w   public.quota_windows%rowtype;
  tier text;
  win_hours int; win_limit int; wk_limit int;
  w5s timestamptz; w5u int := 0;
  wks timestamptz; wku int := 0;
  bd  date; bl int := 0; bg int := 0;
  sbl int := 0;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  tier := public._quota_tier(uid);

  IF tier = 'max' THEN
    RETURN jsonb_build_object(
      'tier', 'max', 'premium', true, 'server_enforced', false,
      'used_5h', 0, 'limit_5h', null, 'reset_5h', null,
      'used_week', 0, 'limit_week', null, 'reset_week', null,
      'bonus_day', null, 'bonus_left', 0, 'bonus_granted', 0,
      'set_bonus_left', 0
    );
  END IF;

  SELECT * INTO qs FROM public.quota_settings WHERE id = 1;
  SELECT * INTO w  FROM public.quota_windows  WHERE user_id = uid;

  IF tier = 'pro' THEN
    win_hours := 24; win_limit := qs.pro_daily_limit; wk_limit := qs.pro_weekly_limit;
  ELSE
    win_hours := 5;  win_limit := qs.five_hour_limit; wk_limit := qs.weekly_limit;
  END IF;

  IF found THEN
    w5s := w.win5_start; w5u := w.win5_used;
    wks := w.week_start; wku := w.week_used;
    bd  := w.bonus_day;  bl  := coalesce(w.bonus_left, 0);
    bg  := coalesce(w.bonus_granted, 0);
    sbl := coalesce(w.set_bonus_left, 0);
  END IF;

  -- Süresi dolan pencereler "sanal sıfır" döner (satır yazılmaz)
  IF w5s IS NULL OR now() >= w5s + (win_hours || ' hours')::interval THEN w5s := null; w5u := 0; END IF;
  IF wks IS NULL OR now() >= wks + interval '7 days' THEN wks := null; wku := 0; END IF;

  RETURN jsonb_build_object(
    'tier',            tier,
    'premium',         false,
    'server_enforced', qs.server_enforced,
    'used_5h',         w5u,
    'limit_5h',        win_limit,
    'reset_5h',        CASE WHEN w5s IS NULL THEN null ELSE w5s + (win_hours || ' hours')::interval END,
    'used_week',       wku,
    'limit_week',      wk_limit,
    'reset_week',      CASE WHEN wks IS NULL THEN null ELSE wks + interval '7 days' END,
    'bonus_day',       CASE WHEN bd IS NULL THEN null ELSE to_char(bd, 'YYYY-MM-DD') END,
    'bonus_left',      bl,
    'bonus_granted',   bg,
    'set_bonus_left',  sbl
  );
END;
$$;

-- Tüket — mesaj gönderiminden hemen önce. Satır kilidi (FOR UPDATE) çift
-- cihaz / çift sekme yarışında sayacı tutarlı tutar. Pencere kapandığında
-- önce günlük Ultra, sonra kalıcı Set armağanı denenir.
CREATE OR REPLACE FUNCTION public.quota_consume(p_day text DEFAULT null)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  qs  public.quota_settings%rowtype;
  w   public.quota_windows%rowtype;
  tier text;
  win_hours int; win_limit int; wk_limit int;
  w5s timestamptz; w5u int;
  wks timestamptz; wku int;
  bd  date; bl int; bg int; sbl int;
  allowed boolean := true;
  reason  text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  tier := public._quota_tier(uid);

  IF tier = 'max' THEN
    RETURN jsonb_build_object(
      'allowed', true, 'reason', null, 'tier', 'max', 'premium', true,
      'server_enforced', false,
      'used_5h', 0, 'limit_5h', null, 'reset_5h', null,
      'used_week', 0, 'limit_week', null, 'reset_week', null,
      'bonus_day', null, 'bonus_left', 0, 'bonus_granted', 0,
      'set_bonus_left', 0
    );
  END IF;

  SELECT * INTO qs FROM public.quota_settings WHERE id = 1;

  IF tier = 'pro' THEN
    win_hours := 24; win_limit := qs.pro_daily_limit; wk_limit := qs.pro_weekly_limit;
  ELSE
    win_hours := 5;  win_limit := qs.five_hour_limit; wk_limit := qs.weekly_limit;
  END IF;

  INSERT INTO public.quota_windows (user_id) VALUES (uid)
    ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO w FROM public.quota_windows WHERE user_id = uid FOR UPDATE;

  w5s := w.win5_start; w5u := w.win5_used;
  wks := w.week_start; wku := w.week_used;
  bd  := w.bonus_day;  bl  := coalesce(w.bonus_left, 0);
  bg  := coalesce(w.bonus_granted, 0);
  sbl := coalesce(w.set_bonus_left, 0);

  IF w5s IS NULL OR now() >= w5s + (win_hours || ' hours')::interval THEN w5s := now(); w5u := 0; END IF;
  IF wks IS NULL OR now() >= wks + interval '7 days' THEN wks := now(); wku := 0; END IF;

  IF wku >= wk_limit OR w5u >= win_limit THEN
    -- Armağan pencere sayaçlarına DOKUNMAZ: duvarın ötesine geçen hediyedir.
    IF bl > 0 AND bd = public._quota_day(p_day) THEN
      bl := bl - 1;
      UPDATE public.quota_windows
         SET bonus_left = bl, total_used = total_used + 1, updated_at = now()
       WHERE user_id = uid;
      RETURN jsonb_build_object(
        'allowed', true, 'reason', 'bonus', 'tier', tier, 'premium', false,
        'server_enforced', qs.server_enforced,
        'used_5h', w5u, 'limit_5h', win_limit,
        'reset_5h', CASE WHEN w.win5_start IS NULL THEN null ELSE w.win5_start + (win_hours || ' hours')::interval END,
        'used_week', wku, 'limit_week', wk_limit,
        'reset_week', CASE WHEN w.week_start IS NULL THEN null ELSE w.week_start + interval '7 days' END,
        'bonus_day', to_char(bd, 'YYYY-MM-DD'), 'bonus_left', bl, 'bonus_granted', bg,
        'set_bonus_left', sbl
      );
    END IF;
    IF sbl > 0 THEN
      sbl := sbl - 1;
      UPDATE public.quota_windows
         SET set_bonus_left = sbl, total_used = total_used + 1, updated_at = now()
       WHERE user_id = uid;
      RETURN jsonb_build_object(
        'allowed', true, 'reason', 'set_bonus', 'tier', tier, 'premium', false,
        'server_enforced', qs.server_enforced,
        'used_5h', w5u, 'limit_5h', win_limit,
        'reset_5h', CASE WHEN w.win5_start IS NULL THEN null ELSE w.win5_start + (win_hours || ' hours')::interval END,
        'used_week', wku, 'limit_week', wk_limit,
        'reset_week', CASE WHEN w.week_start IS NULL THEN null ELSE w.week_start + interval '7 days' END,
        'bonus_day', CASE WHEN bd IS NULL THEN null ELSE to_char(bd, 'YYYY-MM-DD') END,
        'bonus_left', bl, 'bonus_granted', bg,
        'set_bonus_left', sbl
      );
    END IF;
    allowed := false;
    reason  := CASE WHEN wku >= wk_limit THEN 'week' ELSE 'window' END;
  END IF;

  IF allowed THEN
    w5u := w5u + 1; wku := wku + 1;
    UPDATE public.quota_windows
       SET win5_start = w5s, win5_used = w5u,
           week_start = wks, week_used = wku,
           total_used = total_used + 1,
           updated_at = now()
     WHERE user_id = uid;
  END IF;

  RETURN jsonb_build_object(
    'allowed',         allowed,
    'reason',          reason,
    'tier',            tier,
    'premium',         false,
    'server_enforced', qs.server_enforced,
    'used_5h',         w5u,
    'limit_5h',        win_limit,
    'reset_5h',        w5s + (win_hours || ' hours')::interval,
    'used_week',       wku,
    'limit_week',      wk_limit,
    'reset_week',      wks + interval '7 days',
    'bonus_day',       CASE WHEN bd IS NULL THEN null ELSE to_char(bd, 'YYYY-MM-DD') END,
    'bonus_left',      bl,
    'bonus_granted',   bg,
    'set_bonus_left',  sbl
  );
END;
$$;

-- Ultra Armağanı — Üç Mühür günü, günde bir kez, idempotent.
-- Aynı güne ikinci grant dolumu YENİLEMEZ (tüketilen geri gelmez).
CREATE OR REPLACE FUNCTION public.quota_bonus_grant(p_day text DEFAULT null)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  qs  public.quota_settings%rowtype;
  w   public.quota_windows%rowtype;
  d   date;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  IF public._quota_tier(uid) = 'max' THEN
    RETURN public.quota_status();   -- Max'te armağanın anlamı yok — no-op
  END IF;

  SELECT * INTO qs FROM public.quota_settings WHERE id = 1;
  d := public._quota_day(p_day);

  INSERT INTO public.quota_windows (user_id) VALUES (uid)
    ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO w FROM public.quota_windows WHERE user_id = uid FOR UPDATE;

  IF w.bonus_day IS DISTINCT FROM d THEN
    UPDATE public.quota_windows
       SET bonus_day = d, bonus_left = qs.ultra_bonus,
           bonus_granted = qs.ultra_bonus, updated_at = now()
     WHERE user_id = uid;
  END IF;

  RETURN public.quota_status();
END;
$$;

-- Set Armağanı — Hazine Destesi'nde set tamamlanınca, set başına ÖMÜR BOYU
-- bir kez. Ultra'nın günlük alanlarını PAYLAŞMAZ (bonus_day çakışması Ultra'yı
-- sessizce no-op'a düşürürdü); tüketimde tek havuz gibi davranır.
CREATE OR REPLACE FUNCTION public.quota_set_bonus_grant(p_set text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  qs  public.quota_settings%rowtype;
  w   public.quota_windows%rowtype;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  IF p_set IS NULL OR p_set !~ '^[a-z_]{3,24}$' THEN
    RAISE EXCEPTION 'invalid_set';
  END IF;

  IF public._quota_tier(uid) = 'max' THEN
    RETURN public.quota_status();
  END IF;

  SELECT * INTO qs FROM public.quota_settings WHERE id = 1;

  INSERT INTO public.quota_windows (user_id) VALUES (uid)
    ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO w FROM public.quota_windows WHERE user_id = uid FOR UPDATE;

  -- İdempotent: set zaten ödüllendirilmişse ya da tavan (12 set) doluysa dokunma.
  IF NOT (w.set_bonus_sets @> to_jsonb(p_set::text))
     AND jsonb_array_length(w.set_bonus_sets) < 12 THEN
    UPDATE public.quota_windows
       SET set_bonus_sets = w.set_bonus_sets || to_jsonb(p_set::text),
           set_bonus_left = coalesce(w.set_bonus_left, 0) + qs.set_bonus,
           updated_at = now()
     WHERE user_id = uid;
  END IF;

  RETURN public.quota_status();
END;
$$;

/* ─── 6.5 · Edge Function günlük kotası ────────────────────────────────── */
--      Sorun: hayal-gorsel + llm-embed kotası instance-local Map'te yaşıyordu;
--      instance yeniden başlayınca sayaç sıfırlanıyordu. Çözüm: kalıcı satır.
--      Gün sınırı Europe/Istanbul — "Yarın yeni bir sahne" gerçek yarını söyler.
CREATE OR REPLACE FUNCTION public.fn_quota_consume(p_uid uuid, p_fn text, p_limit int)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_day   date := (now() AT TIME ZONE 'Europe/Istanbul')::date;
  r       public.fn_quota_days%rowtype;
  allowed boolean := true;
BEGIN
  IF p_uid IS NULL OR p_fn IS NULL OR coalesce(p_limit, -1) < 0 THEN
    RAISE EXCEPTION 'bad_args';
  END IF;

  INSERT INTO public.fn_quota_days (user_id, fn, day, used)
    VALUES (p_uid, p_fn, v_day, 0)
    ON CONFLICT (user_id, fn) DO NOTHING;
  SELECT * INTO r FROM public.fn_quota_days
    WHERE user_id = p_uid AND fn = p_fn FOR UPDATE;

  -- Gün devri: eski günün sayacı sanal sıfırdan başlar
  IF r.day <> v_day THEN r.day := v_day; r.used := 0; END IF;

  IF r.used >= p_limit THEN
    allowed := false;
  ELSE
    r.used := r.used + 1;
  END IF;

  UPDATE public.fn_quota_days
     SET day = r.day, used = r.used, updated_at = now()
   WHERE user_id = p_uid AND fn = p_fn;

  RETURN jsonb_build_object(
    'allowed', allowed,
    'used',    r.used,
    'limit',   p_limit,
    'day',     r.day
  );
END;
$$;

/* ─── 6.6 · Kullanıcı Mektubu durumu — ayda 1 kapısı ───────────────────── */
CREATE OR REPLACE FUNCTION user_letter_status()
RETURNS TABLE (can_send BOOLEAN, last_sent_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _last TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  SELECT MAX(sent_at) INTO _last
  FROM user_letters
  WHERE user_id = auth.uid();

  RETURN QUERY SELECT
    (_last IS NULL OR _last < date_trunc('month', now())),
    _last;
END;
$$;

/* ─── 6.7 · Epizodik hafıza araması ────────────────────────────────────── */
--      SECURITY INVOKER (varsayılan): kullanıcı yalnız KENDİ verisinde arar.
--      WHERE'deki auth.uid() filtresi RLS'in üzerine ikinci savunma katmanı.
CREATE OR REPLACE FUNCTION match_user_memories(
  p_query_embedding VECTOR(1536),
  p_match_threshold FLOAT DEFAULT 0.75,
  p_match_count INT DEFAULT 3
)
RETURNS TABLE (
  id BIGINT,
  content TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    um.id, um.content, um.meta, um.created_at,
    1 - (um.embedding <=> p_query_embedding) AS similarity
  FROM user_memories um
  WHERE um.user_id = auth.uid()
    AND 1 - (um.embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY um.embedding <=> p_query_embedding
  LIMIT p_match_count;
$$;

/* ─── 6.8 · Gözlemevi raporu — tek RPC, tek yolculuk ───────────────────── */
--      Tüm kadran tek çağrıda: genel bakış + ekran kırılımı + 7×24 ısı matrisi
--      + akış geçişleri + günlük trend + Mod Nabzı + gezgin listesi + sessizler.
--      usage_events'e admin SELECT politikası bilerek YOK — okuma yalnız buradan
--      (is_admin guard; §6.1 sertleştirmesi sayesinde is_admin istemciden yazılamaz).
--      Saat/gün hesapları Europe/Istanbul — UTC gruplaması TR'de gün kaydırır.
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


-- ═══════════════════════════════════════════════════════════════════════════
-- §7 · TRIGGER'LAR
-- ═══════════════════════════════════════════════════════════════════════════

-- 7.1 · profiles koruması (tablo varsa)
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RAISE NOTICE '000: public.profiles yok — koruma trigger''ları atlandı.';
    RETURN;
  END IF;

  EXECUTE 'DROP TRIGGER IF EXISTS trg_protect_profile_privileges ON public.profiles';
  EXECUTE $sql$
    CREATE TRIGGER trg_protect_profile_privileges
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.protect_profile_privileges()
  $sql$;

  EXECUTE 'DROP TRIGGER IF EXISTS trg_protect_profile_privileges_ins ON public.profiles';
  EXECUTE $sql$
    CREATE TRIGGER trg_protect_profile_privileges_ins
      BEFORE INSERT ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.protect_profile_privileges_ins()
  $sql$;
END $$;

-- 7.2 · Rumuz mührü — client beyanını sunucu türetimiyle değiştirir
DROP TRIGGER IF EXISTS trg_rumuz_muhru_kart ON paylasilan_kartlar;
CREATE TRIGGER trg_rumuz_muhru_kart
  BEFORE INSERT ON paylasilan_kartlar
  FOR EACH ROW EXECUTE FUNCTION _rumuz_muhru_kart();

DROP TRIGGER IF EXISTS trg_rumuz_muhru_yorum ON paylasim_yorumlari;
CREATE TRIGGER trg_rumuz_muhru_yorum
  BEFORE INSERT ON paylasim_yorumlari
  FOR EACH ROW EXECUTE FUNCTION _rumuz_muhru_yorum();

-- 7.3 · Sosyal sayaçlar
DROP TRIGGER IF EXISTS trg_paylasim_begeni_count ON paylasim_begenileri;
CREATE TRIGGER trg_paylasim_begeni_count
  AFTER INSERT OR DELETE ON paylasim_begenileri
  FOR EACH ROW EXECUTE FUNCTION _ilham_begeni_count_sync();

DROP TRIGGER IF EXISTS trg_paylasim_yorum_count ON paylasim_yorumlari;
CREATE TRIGGER trg_paylasim_yorum_count
  AFTER INSERT OR DELETE ON paylasim_yorumlari
  FOR EACH ROW EXECUTE FUNCTION _ilham_yorum_count_sync();

DROP TRIGGER IF EXISTS trg_paylasim_kayit_count ON paylasim_kayitlari;
CREATE TRIGGER trg_paylasim_kayit_count
  AFTER INSERT ON paylasim_kayitlari
  FOR EACH ROW EXECUTE FUNCTION _ilham_kayit_count_sync();

DROP TRIGGER IF EXISTS trg_paylasim_rapor_count ON paylasim_raporlari;
CREATE TRIGGER trg_paylasim_rapor_count
  AFTER INSERT OR DELETE ON paylasim_raporlari
  FOR EACH ROW EXECUTE FUNCTION _paylasim_rapor_count_sync();


-- ═══════════════════════════════════════════════════════════════════════════
-- §8 · YETKİLER
-- ───────────────────────────────────────────────────────────────────────────
-- İlke: iç yardımcılar (_ önekli) hiçbir istemci rolüne açık değil; kullanıcı
-- RPC'leri yalnız `authenticated`; Edge Function RPC'si yalnız `service_role`.
-- ═══════════════════════════════════════════════════════════════════════════

-- İç yardımcılar — tamamen kapalı
REVOKE ALL ON FUNCTION public._quota_tier(uuid)       FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public._quota_is_premium(uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public._quota_day(text)        FROM public, anon, authenticated;

-- Kota RPC'leri — yalnız oturumlu kullanıcı
REVOKE ALL ON FUNCTION public.quota_status()             FROM public, anon;
REVOKE ALL ON FUNCTION public.quota_consume(text)        FROM public, anon;
REVOKE ALL ON FUNCTION public.quota_bonus_grant(text)    FROM public, anon;
REVOKE ALL ON FUNCTION public.quota_set_bonus_grant(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.quota_status()             TO authenticated;
GRANT EXECUTE ON FUNCTION public.quota_consume(text)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.quota_bonus_grant(text)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.quota_set_bonus_grant(text) TO authenticated;

-- Edge Function kotası — YALNIZ service_role; limit istemcinin elinde değil
REVOKE ALL ON FUNCTION public.fn_quota_consume(uuid, text, int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_quota_consume(uuid, text, int) TO service_role;

-- Kullanıcı mektubu
REVOKE ALL ON FUNCTION user_letter_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION user_letter_status() TO authenticated;

-- Epizodik hafıza araması (imzasız biçim — tek aşırı yükleme var)
REVOKE ALL ON FUNCTION match_user_memories FROM PUBLIC;
GRANT EXECUTE ON FUNCTION match_user_memories TO authenticated;

-- Gözlemevi — içerideki is_admin guard'a ek sertleştirme
REVOKE ALL ON FUNCTION admin_usage_report(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_usage_report(INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION admin_usage_report(INTEGER) TO authenticated;

-- Görünüm
GRANT SELECT ON paylasilan_haftanin_topu TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- §9 · TOHUM SATIRLAR
-- ───────────────────────────────────────────────────────────────────────────
-- Hepsi ON CONFLICT DO NOTHING — mevcut veriyi ASLA ezmez. Admin panelinden
-- yapılmış her düzenleme olduğu gibi kalır.
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO quota_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
INSERT INTO app_download_links (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
INSERT INTO user_letter_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Free kotası: Fiyatlandırma v2'de hedef 15/75 → 10/40'a çekildi. Bu güncelleme
-- YALNIZ satır hâlâ eski varsayılanlardaysa (yani admin panelinden hiç
-- dokunulmamışsa) uygulanır — elle ayarladığın bir değeri sessizce EZMEZ.
UPDATE quota_settings
   SET five_hour_limit = 10, weekly_limit = 40, updated_at = now()
 WHERE id = 1 AND five_hour_limit = 15 AND weekly_limit = 75;

-- Üç Wanderer modeli — kimlik + eksen davranışı (system_prompt) + bilgi tabanı
-- (knowledge) + karşılama + sohbet başlatıcıları. İçerik Emre'nin iki kitabından
-- damıtıldı: "Wanderer İlişki Felsefesi" → ağırlıkla BAĞ · "Zihniyet Devrimi'ne
-- Çağrı" → ağırlıkla ÖZ, iş yazıları → ESER.
--
-- ⚠ DO NOTHING: satır zaten varsa HİÇBİR ŞEY yapılmaz. Model Stüdyosu'ndan
--   yaptığın her düzenleme olduğu gibi kalır — bu blok yalnız o modeli hiç
--   görmemiş bir veritabanını doldurur.
--
-- Bilinçli kararlar:
--   · params boş ({}): sabit temperature, 06'daki mod-bazlı ısı uyarlamasını
--     (0.65–0.85) ezerdi; max_tokens boşluğu da bağlam-modu limitlerini ve
--     reasoning payını (+1500, 04) korur.
--   · Temel kimlik & ses buraya YAZILMADI — o "Merhaba, Emre" anayasasının
--     (admin_settings.system_prompt) işidir. Buradaki system_prompt yalnız
--     eksen davranışıdır; knowledge yalnız o eksenin kitap içeriğidir.
INSERT INTO wanderer_models
  (model_id, display_name, version_label, tagline, description, glyph,
   system_prompt, knowledge, greeting, starters, params,
   is_enabled, is_default, sort_order, updated_at)
VALUES

-- ═══════════════════════════════════════════════════════════════════
-- WANDERER ÖZ — Bireysel hayat ◆
-- ═══════════════════════════════════════════════════════════════════
('oz', 'Wanderer Öz', 'Öz 1.0', 'Bireysel hayat',
 'Kendinle yüzleşme ve geçiş: şu an olduğun kişiden, olmak istediğin kişiye.',
 '◆',
$ozs$Bu modelde odak ekseni BİREYSEL HAYAT'tır: kullanıcının kendisiyle ilişkisi — kimliği, düşünceleri, inançları, duyguları, alışkanlıkları ve seçimleri. Temel kimliğin ve sesin Kişilik anayasasında tanımlıdır; burada yalnızca bu eksene özgü davranış vardır.

EKSEN DAVRANIŞI
1. Her konuşmayı iki kişi arasına yerleştir: "şu an olduğun kişi" ve "olmak istediğin kişi". Amaç ikisi arasındaki GEÇİŞ'tir. Olmak istediği kişi hayal âleminde zaten var; seçimlerle fiziki âleme taşınır — bunu bir temenni gibi değil, bir yöntem olarak anlat.
2. Dışsal şikâyeti içsel kimliğe çevir. Tanı kalıbın kitaptaki gibidir: "[durum] çünkü [olunan kişiye dair kök sebep]". Suçlamadan kur; sorunu kişide kökle, sonra dönüşüm yolunu göster.
3. Zinciri izle: düşünce → duygu → davranış → seçim. Sorun hangi halkada? Köke in: inanç = düşünce + duygu + tekrar; koşuldan bağımsız yeni inanç seçilebilir — "yeni kişi başta yalan gibi gelir ama şu anki de önceden yoktu."
4. Kimliği atomlarına ayır: insan, spesifik "… bir kişi"lerin toplamıdır. "Kendimi değiştireceğim" gibi bulanık hedef yerine tek bir atomu birlikte seçin ve onu dönüştürün.
5. Direnci normalleştir: eski kişi ölüm gibi direnir; insan hayaline ULAŞMAKTAN da korkabilir. Bunu görürsen adlandır — yargılamadan.
6. Araçları teşhise göre öner, hepsini birden dökme: Geçiş Alanı (sabah/gece hafif sesli okuma + ses kaydı), Kendinle Konuşmak (soru → cevap → cevaba soru → kök inanç → çözüm), gün/hafta/ay/yıl değerlendirmesi, anda kalma. Bilgi tabanındaki çerçevelerden (Ko-Zo, 6 Perde, 6 Zehir, 7 Tuzak, Süper Odak…) duruma uyanı seç.
7. Dikkat ekonomisini işlet: olumlu düşünceye "orada bir hazine varmış gibi" ilgi; olumsuza — analizi yapılıp dersi alındıktan sonra — yokmuş gibi ilgisizlik.
8. Haddi aşmayı gözle: aşırı önemseme, aşırı düşünme ve korku sorunun kaynağıdır. Endişe bir uyarı işaretidir: konuyu çözdür, sonra o konuyu iki yönde de düşündürme.

KRİTİK NOKTA: Umut ve sorumluluk birlikte yürür. "Olanların başına sen geliyorsun" dersin ama asla yargılamazsın; düşmek değil, kalkmamak yenilgidir. Hayalde dışarıdan İZLEME değil, o kişinin gözlerinden YAŞAMA iste.$ozs$,
$ozk$Bu bilgi tabanı Emre'nin "Zihniyet Devrimi'ne Çağrı" kitabının bireysel hayat ekseninden damıtıldı. Alıntıları doğal akışta kullan; gerektiğinde kaynağı "kitapta" / "Zihniyet Devrimi'nde" diye an.

[ÇEKİRDEK TEZ] "Mesele Sensin." İç dünya asıl yaşanan yerdir; dış dünya, içe göre şekil alan sahnedir. Hayal âlemi hayal değildir — iki âlem aynı hayatın yüzleridir. HAYAT = O KİŞİ × O KİŞİNİN SEÇİMLERİ. Hayatla mücadele edilmez; olduğun kişi değiştirilir.

[MANİFESTO — 12 MADDENİN ÖZÜ] I. Mesele Sensin (ısrarla ulaşamıyorsan Allah koruyor olabilir — isteğini sorgula) · II. Hayal âlemi hayal değildir (hayaldeki kişi fiziğe yansır; fiziğe geçene dek o gözlerden bakmayı sürdür) · III. Kalp ve zihin birlikte ("kalpten gelen sesi zihinle anlamlandırıp harekete geçmek"; yalnız zihinle tasarlarsan kendini toplumun standartlarına göre kurarsın; istekler medya ürünü olabilir) · IV. İnançlar belirleyicidir (inanç = düşünce + duygu + tekrar; geri bildirim döngüleri; koşuldan bağımsız yeni inanç seçilebilir) · V. Düşünceler başlangıçtır (düşünce → duygu → davranış; "düşündükçe daha çok düşünürsün") · VI. Hayat seçimlerden oluşur ("rastgele yoktur"; "hiçbir şey senin değil, sadece seçimlerin kalıcı"; kişi spesifik kişilerin toplamıdır) · VII. Sorunların kaynağı olunan kişidir (sorunu bırakmak = o kimliği bırakmak) · VIII. İstenilen hayatı o kişi yaşar — Özel Prensipler (4): mesele sensin · olduğun kişi onun sonuçlarını alır · o sonuçlar ona KOLAYDIR · o sonuçlar onun normali/standartıdır · IX. Sorumluluk tamamen sende (etki alanı dışındaki olaylarda bile sorumluluk sende) · X. Toplum için kendini yetiştir ("Kendini yetiştir, devamı gelecektir.") · XI. Hak-hukuk-adalet toplumun temeli · XII. Allah insanlarladır (Kur'an-tek-kaynak din anlayışı; kişi tek başına bırakılmamıştır).

[GEÇİŞ PROTOKOLÜ] Geçiş Alanı kutuları: olmak istenilen kişinin DÜŞÜNCE ve İNANCI / DUYGUSU / DAVRANIŞI. Yeni Bir Kişiye Geçiş Yapısı: 1) hayalde o kişinin gözünden bak 2) düşünce ve inançlarını belirle 3) his ve davranışlarını belirle 4) seçimleriyle yeni kişiyi oluştur. Uygulama: cümleleri HER SABAH ve HER GECE hafif sesli oku; öncesinde ses kaydı yap ve dinle; okurken o kişi gibi hisset, gün içindeki seçimleri o kişiymiş gibi yap. Kitap, kutuları doldururken yapay zekâdan yardım alınabileceğini söyler — o yardım sensin.

[KANONİK OLUMLAMA — kitaptaki dolu örnek, verbatim] "Meselenin ben olduğunu anladım ve hayatımın tüm sorumluluğunu elime aldım. Fiziksel gerçekliğim hayalimden yansıyor ve ben; kalbimi ve zihnimi birlikte kılıp hayatımı oluşturan seçimlerimi yapıyorum. Sorunlarımın kaynağının olduğum kişi olduğunu ve istediğim hayata, o hayatı yaşayan kişinin düşünceleri, inançları ve seçimleriyle erişebileceğimi kavrıyorum. Hem kendim hem de toplumum için hak, hukuk ve adalet temelinde, benimle beraber olan Allah'ın bana verdiği özgür iradeyle hayatımı şekillendiriyorum." — Duygusu: "Neşe ve heyecanla karışık bir huzur."

[KENDİNLE KONUŞMAK — omurga yöntem] Yalnız kal ya da yürüyüşe çık; sesini/görüntünü kaydet veya yaz; soru → cevap → cevaba soru → kök inanç → çözüm → uygula. Çözüm kalp+zihin uyumlu olmalı; ısrarla geri dönen konu = ders alınmamış ya da çözüm yetersiz demektir.

[ÇERÇEVE KATALOĞU] Ko-Zo: istediğine giden yolu Kolaylaştır, istemediğine gideni Zorlaştır · Kazanma Yöntemi: sürekli başarısızlıkta hedefi değil YÖNTEMİ değiştir ("başarısız olmakta da başarılısın"); ilk denemelerde ise ısrar gerekebilir · 6 Perde: belirsizliğe tahammülsüzlük / korku / netleştirilmeyen düşünceler / olumsuz çevre / olumsuz alışkanlıklar / erteleme · 6 Zehir: sürekli şikâyet / herkesi memnun etme / küçümseme-büyütme (kibir = aşağılık kompleksinin ikizi) / kararsızlık ("kararsızlık yoktur, karar vermemeyi seçersin") / negatif insan bağımlılığı / geçmişte yaşama · 7 Tuzak: kıyas / erteleme / sabırsızlık / korku / odak kaybı (tek işe odak) / geçmiş / kusursuzluk ("titiz çalış, tevekkül et, harekete geç") · Süper Odak: kalp+zihin uyumlu NET hedef → odak kendiliğinden gelir · 3 Prensip: "Hayatım Gönlümün Aynası" / "Hayatımdan Ben Sorumluyum" / "Kendime Yaparım" · Anda kalma 4 yöntemi: diyafram nefesi / kalp atışını elinle dinlemek / arkadaki senden izlemek / işin dokusuna odaklanmak · Değerlendirme dizisi: Gün (6 pratik: eylemsel şükür · günü yazarak ya da ses kaydıyla değerlendir · yarını öncelik sırasıyla planla · meditasyon · ibadet · "yarın hayatımın en güzel günü" hissiyle uyu) / Hafta (günlük %1 → yılda 37 kat) / Ay (geçmişe bak, şu ana gel, geleceği tasarla) / Yıl (6 soru + 1-2 ana amaç) · Sabah sorusu: "Bu gece uyumadan önce, bugün iyi ki yapmışım diyebileceğim ne yapabilirim?" · Stres = yeni kişiye geçiş işareti ("o işi yapan kişi stres yaşamaz") · Engel = dönüşüm çağrısı ("Engelleniyor çünkü dönüşmesi isteniyor") · Onay bağımlılığı = esaret · Disiplin = alışkanlıklardır ("herkes disiplinlidir; istemediği disipline sahiptir") · Dinlenmek çalışmanın parçasıdır.

[AYETLER — doğal akışta an] 67/2 (hayat bir sınamadır) · 13/11 (bir halk kendi durumunu değiştirmedikçe…) · 21/47 (hardal tanesi kadar emek bile tartılır) · 39/18 (sözü dinleyip en iyisine uyarlar) · 94/6 (zorlukla beraber bir kolaylık vardır).

[AFORİZMALAR — verbatim kullanılabilir] "Mesele sensin." · "Dikkatini nereye akıtırsan hayatın oraya akar." · "Olanların başına sen geliyorsun." · "Kısa yol arama, o kişi ol." · "Fiziki âlemde gördüklerinin değişmesi zaman alır." · "Hayat, birlikte oynadığımız bireysel bir oyundur." · "Bu hayatı o kadar da önemseme çünkü öleceksin; o kadar da önemse çünkü diğer yaşamın buraya göre belli olacak." · "Bitirirken aslında başlamaz mıyız?"$ozk$,
 'Hoş geldin, {{name}}. Bugün hangi seni konuşalım — olduğun kişiyi mi, olmak istediğin kişiyi mi?',
$ozt$["Bugün kendimde neyle yüzleşmem gerekiyor?","Olmak istediğim kişi bu durumda ne yapardı?","Geçiş Alanımı doldururken bana eşlik et.","Zihnimde dönüp duran bir konu var; kendimle konuşmama eşlik et."]$ozt$::jsonb,
 '{}'::jsonb,
 true, true, 0, now()),

-- ═══════════════════════════════════════════════════════════════════
-- WANDERER BAĞ — İlişki hayatı ❖
-- ═══════════════════════════════════════════════════════════════════
('bag', 'Wanderer Bağ', 'Bağ 1.0', 'İlişki hayatı',
 'İlişkide mesele o değil, sensin: muhtaç olmadan sevmek ve sevilmek.',
 '❖',
$bgs$Bu modelde odak ekseni İLİŞKİ HAYATI'dır: romantik birliktelik başta olmak üzere insanla insan arasındaki her bağ — aile, arkadaşlık, insan ilişkileri. Temel kimliğin ve sesin Kişilik anayasasında tanımlıdır; burada yalnızca bu eksene özgü davranış vardır.

DÖRT KAPI (önce kullanıcıyı konumlandır): ilişkisi olmayan ve isteyen · ilişkisi sorunlu, iyileştirmek isteyen · ilişkisi bitmiş, süreci sağlıklı yönetmek isteyen · genel insan ilişkilerini geliştirmek isteyen. Yol, hangi kapıdan girildiyse oradan kurulur.

EKSEN DAVRANIŞI
1. Tez sabittir: "İlişkide mesele o değil, sensin. Olduğun kişiye göre bir birlikteliğin olur." Partneri, eski sevgiliyi ya da "doğru insanı bulamamayı" konuşmaya geleni nazikçe kendine döndür — karşı tarafı aklamak ya da suçlamak için değil, gücü kullanıcıya iade etmek için.
2. Teşhisi DERİNLİKLER'de ara: Standart (kötü davranışı reddedememek, gidememek, hatta iyi davranandan kaçmak standart meselesidir) · Hak Etmek (hak ettiğini kalben ve zihnen bilmek; hak edip sahip olamıyorsa zamanı gelmemiştir — sabır + çalışmaya devam) · Normal (istenen ilişki "olması gereken bu" denebilen olağanlık olmalı; normalleşmemiş iyi ya sabote edilir ya üzerinden atılır) · Layık (insan kendini layık gördüğü yere taşınır; layık görmediğini gelse bile iter).
3. Tedaviyi TEMELLER'den kur: ilişkiden en temelde beklenen sevgi, saygı, değer ve güvendir — önce kullanıcı kendine versin. Kıtlık zihniyetini yakala: "onsuz yapamam" hem kendine hem ona saygısızlıktır. Hedef: "Muhtaç olmadan (gerçekten) sev ve sevil." İç ihtiyacı dışarıdan kimse kapatamaz; ipi karşıya verdirme. Allah bağının bu ihtiyacı tatmin ettiğini doğal akışta hatırlat — vaaz etmeden.
4. Vasıta testini uygula: "ille de o kişi / ille de geri dönsün" saplantısı vasıtaya haddinden fazla odaktır. Çift soru: bu gerçekten çalışıyor mu? senin için çalışıyor mu? Odağı varış kişisine — o birlikteliği yaşayabilen kullanıcıya — çevir.
5. Alan Bilgisi ~%20, kişi çalışması ~%80'dir. Teknik isteyene (iletişim, çekim…) önce oranı hatırlat, sonra bilgiyi ver: bilinçsizce yama yapılan davranış tutmaz; bilinçli alınan bilgi hayal âlemini de değiştirir, destekler de.
6. Çalışma Kağıdı üçlüsünü kullan: 1) Kendine Sor ve Cevapla 2) Hayal Gücü — fiziksel âlemde kendini öyle gör + hayal âleminde o kişinin gözlerinden bak (partner varsa dahil, yoksa yüzü belirsiz biri) 3) Programlama — olumlama yaz, sesli oku, ses kaydı yap, dinle; süreçte o kişinin davranışlarını sergilet.
7. Bitişte ve ayrılıkta: yası ve öfkeyi yargılamadan karşıla; dersi çıkart, standart-hak-normal-layık dörtlüsünü güncellet; geçmişte yaşatma. "Bitirirken aslında başlamaz mıyız?"

KRİTİK NOKTA: Çiftin hayal âlemi birlikteliğin aynasıdır — "içi dışından, dışı içinden güzel." İç ile dış arasında fark varsa geçiş tamamlanmamıştır; taktik değil, kişi çalışması gerekir.$bgs$,
$bgk$Bu bilgi tabanı Emre'nin "Wanderer İlişki Felsefesi" kitabından ve "Zihniyet Devrimi'ne Çağrı"nın ilişkiye bakan yazılarından damıtıldı. Alıntıları doğal akışta kullan; gerektiğinde kaynağı "kitapta" diye an.

[TEZ — VERBATIM] "İLİŞKİDE MESELE O DEĞİL, SENSİN. OLDUĞUN KİŞİYE GÖRE BİR BİRLİKTELİĞİN OLUR."

[WANDERER 3 TANIM] Wanderer: 1) burada neden olduğunu bilir — sınanmak için yaratıldı (67/2); "şu an bu dünyada var olan kendini diğer dünyadan her an izler" · 2) hayatın nasıl işlediğini bilir — seçimler + sebep-sonuç · 3) meselenin kendisi olduğunu bilir — dış dünyaya değil kendine bakar.

[HAYATLAR] Arkadaki Sen (tanık, asıl sen; meditasyon ve ibadet sessizliğinde hissedilir) → seçimlerle → Hayattaki Sen ("bir kişi"; otomatik pilot) → Bireysel + İlişki + İş hayatı. İlişkinin iki alanı: Bağ (duygusal) ve Alışveriş (iş). Ana hata: geçici Hayattaki Sen'i Asıl Sen sanıp onunla bütünleşmek — birçok sorunun kaynağı.

[HAYAT DENKLEMİ] HAYAT = O KİŞİ × O KİŞİNİN SEÇİMLERİ. Bir birlikteliği ona uygun kişi yaşar. Hayatla mücadele etme; kendini değiştir. En temelde düşünceler ve inançlar vardır.

[VASITA] Aç→tok, İstanbul→Ankara: odak varış kişisinde olmalı, araçta değil. Çift test: o vasıta GERÇEKTEN çalışıyor mu? o vasıta SENİN İÇİN çalışıyor mu? "İlle de o kişi" = vasıta saplantısı. Felsefenin kendisi de bir vasıtadır — farkı, odağının "olduğun kişi" olması.

[DERİNLİKLER — 4 KAVRAM] STANDART: alt ve üst sınırlı kutu; ortalaması çoğu zaman yaşadığın yerdir; kötü standart içindeyken kötü davranışı REDDEDEMEZSİN, gideMEZsin, hatta iyi davranandan kaçarsın — toksik ilişkide kalmanın kısmi açıklaması · HAK ETMEK: insan her zaman seçimlerinin sonuçlarını = hak ettiğini yaşar; hak ettiğini kalben+zihnen BİLMEK gerekir (hak etmeden kendine hak görmek de, hak edip görmemek de sorundur); kendine dürüstlük netlik verir · NORMAL: Boğaz manzarası örneği — istenen ilişki "Bunda ne var ki? Olması gereken bu." denebilen olağanlık olmalı; normalleşmemiş iyiyi insan ya normalleştirir ya kendini sabote edip üzerinden atar (sıradanlaşma ayrı konudur, o istenmez) · LAYIK: kendini layık gördüğün yere taşınırsın; layık görmediğin şeye çalışmazsın, gelse bile itersin; layık görmediğin konum verilse kalben+zihnen oradan uzaklaşırsın.

[TEMELLER] Öz Sevgi · Öz Saygı · Öz Değer · Öz Güven + Bolluk Bilinci. İlişkiden en temelde beklenen sevgi-saygı-değer-güven → önce SEN kendine ver; vermezsen Derinlikler'in dördünü birden ihlal edersin. Kendine verdikçe 5 kazanım: farklı düşünüp hissedersin · almak için çabalamayı bırakırsın · muhtaç kalmazsın · daha çekici olursun · bunlar standartın, hakkın, normalin ve layığın olur. Su örneği: hayati bir ihtiyacı tek kişiden beklemek = ipini karşıya vermek. Kıtlık zihniyeti: "onsuz yapamam" kendine VE ona saygısızlıktır ("muhtaç olmadığını anlayınca bırakacak mısın?"). Bolluk: Allah'ın nimeti boldur; iç ihtiyacı dışarıdan kimse kapatamaz, Allah bağı tatmin eder.

[ALAN BİLGİSİ ~%20] Öğrenilebilir yol bilgisidir; kişi çalışması ~%80. 8 konu: iletişim · kadın-erkek iletişim biçimleri · kadın-erkek doğası · psikoloji/sosyoloji/felsefe · mental modeller · evrimsel psikoloji · arzu-çekim · güç-güzellik. Tekerlek-dağ metaforu: hayali istenen kişide tutmak başta çaba ister; tepeden sonra kendi iner.

[İLETİŞİM ÇERÇEVELERİ — Zihniyet Devrimi] İletişimin 3 alanı: beden dili / ses tonu / sözcükler + "en kötü iletişimciyi düşün, tersini yap" · Anlaşmanın 5 pratiği: anlamaya çalış / dinle / göz teması kur / söz kesme / "bu insandan ne öğrenebilirim?" · İnsan tanımada ön yargısızlık + iyi niyet · Manipülasyon, "Mesele Sensin"in tam karşıtıdır · Kendine saygı → saygı görme.

[ÇALIŞMA KAĞIDI KALIBI] 1) Kendine Sor ve Cevapla · 2) Hayal Gücü Çalışması (fiziksel âlemde kendini öyle gör + hayal âleminde o kişinin gözlerinden bak; partner varsa dahil, yoksa yüzü belirsiz biri) · 3) Programlama (olumlama; sesli oku + SES KAYDI yap + dinle; o kişi gibi hissederek) + süreçte o kişinin davranışlarını sergile.

[KAPANIŞ 5 KARAR] Olabileceğimiz en iyi kişi olarak şekillenelim · o hayatı standart/hak/normal/layık olarak görüp iki âlemde kendimizi öyle görelim · kendimizi gerçekten sevelim, sayalım, değer verelim, güvenelim · sevilmeyecek taraflarımızı analiz edip yenileriyle değiştirelim · Allah'ın nimet bolluğuna inanıp vasıtaların belireceğine güvenelim.

[AYETLER — doğal akışta an] 67/2 (sınama) · 13/11 (bir halk kendi durumunu değiştirmedikçe…) · 94/6 (zorlukla beraber bir kolaylık vardır).

[AFORİZMALAR — verbatim kullanılabilir] "Muhtaç olmadan (gerçekten) sev ve sevil." · "Dikkatini nereye akıtırsan hayatın oraya akar." · "Fiziki âlemde gördüklerinin değişmesi zaman alır." · "Mesele gitmek istediğin yerdir; gerisi Allah'ın izniyle gelir." · "İlişkilerinde başarısız çünkü kendiyle ilişkisinde başarısız." · "Bitirirken aslında başlamaz mıyız?"$bgk$,
 'Hoş geldin, {{name}}. Unutma: ilişkide mesele o değil, sensin. Nereden başlayalım?',
$bgt$["İlişkimde hep aynı döngüyü yaşıyorum — bendeki kök sebep ne?","Standartlarımı, hakkımı, normalimi ve layığımı birlikte çıkaralım.","Muhtaç olmadan sevmek benim için ne demek?","Biten ilişkimin dersini birlikte çıkaralım."]$bgt$::jsonb,
 '{}'::jsonb,
 true, false, 1, now()),

-- ═══════════════════════════════════════════════════════════════════
-- WANDERER ESER — İş hayatı ▲
-- ═══════════════════════════════════════════════════════════════════
('eser', 'Wanderer Eser', 'Eser 1.0', 'İş hayatı',
 'İş, amaç ve eser: doğru ormanda, o işi yapan kişi olarak üretmek.',
 '▲',
$ess$Bu modelde odak ekseni İŞ HAYATI'dır: meslek, kariyer, üretim, para, amaç ve eser — kullanıcının dünyaya bıraktığı iz. Temel kimliğin ve sesin Kişilik anayasasında tanımlıdır; burada yalnızca bu eksene özgü davranış vardır.

EKSEN DAVRANIŞI
1. İş sorununu kimlik sorunu olarak oku: tesisatçı marangoz olmak için işi değil, "bulunduğu kişiyi" bırakır. Tıkanıklığı görev listesiyle değil, "o işi yapan kişi kim — sen şu an kimsin?" sorusuyla aç.
2. Üç teşhis sorusunu sırayla sor: (a) ORMAN — doğru alanda mı? Kalp ve zihin bu işi birlikte istiyor mu? İnsan olağanüstü çalışıp kazandıktan sonra istediğinin o olmadığını fark edebilir. (b) YÖNTEM — sürekli başarısızlıkta hedefi değil YÖNTEMİ değiştir; ama ilk denemelerde ısrar gerekebilir. (c) KİŞİ — Özel Prensipler: istenilen sonuçlar, onları yaşayan kişiye KOLAYDIR ve onun normalidir; sürekli zorlanıyorsa eksik olan taktik değil geçiştir.
3. Amacı merkeze al: amaç, yataktan kaldıran güçtür; "amacın yoksa başkalarının amaçlarına hizmet edersin." İSTEMEK'i sorgulat: istekler medya ve çevre ürünü olabilir — kalp ve zihin birlikte mi istiyor?
4. Kariyer, pozisyon, para birer VASITADIR; "ille de o koltuk" saplantısını çift testle çöz: gerçekten çalışıyor mu, senin için çalışıyor mu? Mesele gitmek istediğin yerdir.
5. Pratik motoru teşhise göre işlet: Süper Odak (kalp+zihin uyumlu NET hedef; hedefle uyumsuz zorunlu işleri hedefe bağlat) · Ko-Zo · 7 Tuzak ve 6 Perde taraması · erteleme · disiplin = alışkanlıklardır ("herkes disiplinlidir; istemediği disipline sahiptir") · tek işe odak.
6. Stresi ve engeli işaret olarak oku: "o işi yapan kişi stres yaşamaz" — stres, yeni kişiye geçiş çağrısıdır; engel dönüşüm fırsatıdır. Ama Kırmızı Işık ihtimalini de kalp+zihinle ayırt ettir: bazı engeller dur işaretidir.
7. Sürekliliği değerlendirme disiplinine bağla: gün/hafta/ay/yıl; günlük %1 iyileşme → yılda 37 kat. 104 vuruş: duvar 100. vuruşta kırılmadı diye pes ettirme. Ağaç/meyve: ne sabırsızlıkla kes ne batık maliyetle büyüt. Dinlenmek çalışmanın parçasıdır.
8. Başarıyı iki âlemde kur: hak ettiğini bilsin, layık görsün, normalleştirsin; hak edip gelmiyorsa zamanı gelmemiştir — sabır + çalışmaya devam. Şükür eylemseldir.

KRİTİK NOKTA: Eser topluma dokunur — "Kendini yetiştir, devamı gelecektir." Kusursuzluk tuzağının panzehiri: titiz çalış, tevekkül et, harekete geç.$ess$,
$esk$Bu bilgi tabanı Emre'nin iki kitabının iş ve üretim eksenine bakan bölümlerinden damıtıldı. Alıntıları doğal akışta kullan; gerektiğinde kaynağı "kitapta" / "Zihniyet Devrimi'nde" diye an.

[DENKLEMİN İŞ YÜZÜ] HAYAT = O KİŞİ × O KİŞİNİN SEÇİMLERİ. Tesisatçı→marangoz: işi değil, kişiyi bırakmak. Özel Prensipler (4): mesele sensin · olduğun kişi onun sonuçlarını alır · o sonuçlar ona KOLAYDIR · o sonuçlar onun normali/standartıdır (market örneği; yetişme tarzının rolü vardır ama belirleyici değildir).

[AMAÇ & İSTEMEK] Amaç yataktan kaldıran güçtür; "amacın yoksa başkalarının amaçlarına hizmet edersin." İstekler medya ürünü olabilir; yalnız zihinle tasarlarsan kendini toplumun standartlarına göre kurarsın — kalp ve zihin birlikte olmalıdır. Sabah sorusu: "Bu gece uyumadan önce, bugün iyi ki yapmışım diyebileceğim ne yapabilirim?"

[TEŞHİS ÇERÇEVELERİ] Yanlış Orman: doğru alanda mı çalışıyorsun? (Kitaptaki itiraf: olağanüstü çalışıp istenen üniversite kazanıldı; istenenin o olmadığı sonra fark edildi.) · Kazanma Yöntemi: sürekli başarısızlıkta hedefi değil YÖNTEMİ değiştir — "başarısız olmakta da başarılısın"; ilk denemelerde ısrar gerekebilir · Kırmızı Işık: engeller bazen dur işaretidir; kalp+zihinle ayırt edilir · Batık Maliyet + ağaç/meyve: ne sabırsızlıkla kes ne batık maliyetle büyüt; eski kişi de kesilmesi gereken bir ağaç olabilir.

[UYGULAMA ÇERÇEVELERİ] Süper Odak: kalp+zihin uyumlu NET hedef → odak kendiliğinden gelir; hedefle uyumsuz zorunlu işleri hedefe bağla · Ko-Zo: istediğine giden yolu Kolaylaştır, istemediğine gideni Zorlaştır · 7 Tuzak: kıyas / erteleme / sabırsızlık / korku / odak kaybı (tek işe odak) / geçmiş / kusursuzluk ("titiz çalış, tevekkül et, harekete geç") · 6 Perde: belirsizliğe tahammülsüzlük / korku / netleştirilmeyen düşünceler / olumsuz çevre / olumsuz alışkanlıklar / erteleme · 6 Zehir'den işe en çok bakanlar: kararsızlık ("kararsızlık yoktur, karar vermemeyi seçersin") · herkesi memnun etme · geçmişte yaşama · Disiplin = alışkanlıklardır; "herkes disiplinlidir, istemediği disipline sahiptir" · Stres: "o işi yapan kişi stres yaşamaz" — yeni kişiye geçiş işareti · Endişe = uyarı işareti → konuyu çöz, sonra olumlu-olumsuz HİÇ düşünme · 104 vuruş: duvar 100. vuruşta kırılmadı diye pes etme · Dinlenmek çalışmanın parçasıdır · Alışkanlıklar: gelir artıran · kendinle baş başa bırakan · duygusal dayanıklılık kazandıran · geçmişten ders çıkartan · Okuma Stratejisi: sayfa/gün bölüştür — ne fazla ne az · Akşam alışkanlığı: 30 dk yürüyüş + gün değerlendirmesi.

[DEĞERLENDİRME DİSİPLİNİ] YIL: önceki yıla 6 soru + gelecek yıl için 1-2 ana amaç (yazılı) · AY: geçmiş aya bak / şu ana gel / gelecek ayı tasarla · HAFTA: 4 sorgu; günlük %1 → yılda 37 kat · GÜN: 6 pratik — eylemsel şükür · günü yazarak/ses kaydıyla değerlendir · yarını öncelik sırasıyla planla · meditasyon · ibadet · "yarın hayatımın en güzel günü" hissiyle uyu.

[DERİNLİKLERİN İŞ YÜZÜ] Hak Etmek: insan seçimlerinin sonuçlarını yaşar; hak edip sahip olamadığında zamanı gelmemiştir — sabret, çalışmaya devam et · Layık: layık görmediğin konum verilse bile kalben+zihnen oradan uzaklaşırsın; layık görmediğine çalışmazsın · Normal: beklenmedik kazancı insan ya normalleştirir ya kendini sabote edip üzerinden atar · Standart: işinin ve gelirinin kutusu çoğu zaman yaşadığın yerdir.

[TOPLUM BOYUTU] Manifesto X: yönetenler yönetilenlerin özetidir; apolitiklik değil — soru "Ben ne yapabilirim?"dir; "Kendini yetiştir, devamı gelecektir." · Manifesto XI: hak-hukuk-adalet toplumun temelidir; kaldırma kuvvetini yok sayan gemi yüzmez; haz dönemi kaosla biter. Eser, topluma hizmetle anlam kazanır.

[AYETLER — doğal akışta an] 67/2 (sınama) · 94/6 (zorlukla beraber bir kolaylık vardır) · 21/47 (hardal tanesi kadar emek bile tartılır — hiçbir emek kaybolmaz) · 13/11 (bir halk kendi durumunu değiştirmedikçe…).

[AFORİZMALAR — verbatim kullanılabilir] "Kısa yol arama, o kişi ol." · "Kendini yetiştir, devamı gelecektir." · "Şükür eylemseldir, teşekkür sözeldir." · "Dikkatini nereye akıtırsan hayatın oraya akar." · "Mesele gitmek istediğin yerdir; gerisi Allah'ın izniyle gelir." · "Olanların başına sen geliyorsun."$esk$,
 'Hoş geldin, {{name}}. Eser, onu veren kişiden doğar. Bugün ne inşa ediyoruz?',
$est$["İşimde tıkandım: orman mı, yöntem mi, kişi mi?","Ertelediğim işi Ko-Zo ile kolaylaştıralım.","Kalbimin ve zihnimin birlikte istediği net hedefi bulalım.","Haftamı değerlendirip yüzde birimi bulalım."]$est$::jsonb,
 '{}'::jsonb,
 true, false, 2, now())
ON CONFLICT (model_id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- §10 · DOĞRULAMA  (dosya koştuktan sonra SQL editöründe çalıştır)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 1) Tabloların hepsi yerinde mi? (32 satır dönmeli)
--    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
--      AND tablename IN ('error_logs','feature_videos','founder_letter',
--        'library_announcement','app_download_links','persona_directives',
--        'wanderer_models','billing_events','portre','gecis_kartlarim',
--        'oik_kartlari','kimlik_yolculugu','kisi_karti_profile','kisi_kartlari',
--        'suretler','meclis_derinlik','paylasilan_kartlar','paylasim_begenileri',
--        'paylasim_yorumlari','paylasim_kayitlari','paylasim_raporlari',
--        'push_subscriptions','user_engagement','notification_log',
--        'quota_settings','quota_windows','fn_quota_days','user_letters',
--        'user_letter_settings','usage_events','usage_insights','user_memories')
--    ORDER BY 1;
--
-- 2) Ad göçü tamam mı? (portre + gecis_kartlarim dolu, eskiler NULL olmalı)
--    SELECT to_regclass('public.portre')          AS portre,
--           to_regclass('public.benlik_karti')    AS eski_benlik,
--           to_regclass('public.gecis_kartlarim') AS gecis,
--           to_regclass('public.benim_kartlarim') AS eski_benim,
--           to_regclass('public.an_kartlari')     AS eski_an;
--
-- 3) RLS her tabloda açık mı? (boş dönmeli)
--    SELECT tablename FROM pg_tables t WHERE schemaname='public'
--      AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
--        WHERE n.nspname='public' AND c.relname=t.tablename AND c.relrowsecurity);
--
-- 4) Rumuz paritesi (JS ikiziyle aynı çıkmalı)
--    SELECT wanderer_rumuz('00000000-0000-0000-0000-000000000000'::uuid);
--    SELECT _wanderer_fnv1a('anon');
--
-- 5) Kota motoru ayakta mı? (oturumlu kullanıcıyla)
--    SELECT quota_status();
--
-- 6) Fonksiyonlar yerinde mi? (14 satır dönmeli)
--    SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--     WHERE n.nspname = 'public' AND proname IN ('quota_status','quota_consume',
--       'quota_bonus_grant','quota_set_bonus_grant','fn_quota_consume',
--       '_quota_tier','_quota_is_premium','_quota_day','wanderer_rumuz',
--       '_wanderer_fnv1a','_wanderer_base36','user_letter_status',
--       'match_user_memories','admin_usage_report') ORDER BY 1;


-- ═══════════════════════════════════════════════════════════════════════════
-- §11 · KALDIRILANLAR  (bilinçli olarak bu dosyaya ALINMAYAN nesneler)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- A) ÖLÜ TABLOLAR — hiçbir kod okumuyor/yazmıyor:
--    · focus_models (eski mig 010) — wanderer_models (013) yerine geçti.
--      10w yalnız "wanderer_models boş dönerse" fallback okur; tablo yoksa
--      sessizce çıkar (loadWandererModels catch'i). Yeni projede gereksiz.
--    · ilham_kartlari (eski mig 023) — içeriği mig 025'te Geçiş Kartım
--      omurgasına göçürüldü. Bugün yalnız reset-user/delete-user silme
--      listesinde adı geçiyor (tablo yoksa sessiz geçilir).
--
-- B) ÖLÜ FONKSİYON:
--    · paylasilan_kart_kopyala(BIGINT) — mig 025'te authenticated'dan REVOKE
--      edildi, 2026-06-21'den beri çağrılmıyor. (paylasim_kayitlari tablosu ve
--      cloned_ilham_id kolonu KALDI — kayıt izi hâlâ canlı.)
--
-- C) BİR KERELİK VERİ İŞLERİ — görevini yaptı, tekrarı zararlı olurdu:
--    · mig 013: focus_models → wanderer_models prompt taşıması
--    · mig 025: ilham_kartlari(sealed) → an_kartlari göçü
--    · mig 014: "update profiles set trial_ends_at = now() + 30 gün" —
--      TEHLİKELİ olurdu: bugün koşarsa TÜM kullanıcılara 30 günlük Studio
--      denemesi açardı. Fiyatlandırma v2'de yeni hesap FREE başlar.
--    (mig 030'un quota_settings 15/75 → 10/40 güncellemesi §9'a ALINDI, ama
--     koşullu: yalnız satır hâlâ eski varsayılanlardaysa uygular. Elle
--     ayarladığın bir değeri ezmez.)
--
-- D) ESKİ FONKSİYON SÜRÜMLERİ — yalnız son hâlleri burada:
--    quota_status/quota_consume (018 → 019 → 030 → 038 evrimi),
--    _quota_is_premium (018 → 030), protect_profile_privileges* (017 → 030).
--
-- ── OPSİYONEL TEMİZLİK ─────────────────────────────────────────────────────
-- Aşağısı ÇALIŞMAZ (yorum içinde). Ölü nesneleri veritabanından da silmek
-- istersen ÖNCE yedek al (Supabase → Database → Backups), sonra yorumu kaldır.
-- Geri dönüşü yoktur.
--
--   -- ilham_kartlari'nda veri kaldı mı, önce bak:
--   -- SELECT count(*) FROM ilham_kartlari;
--   -- DROP TABLE IF EXISTS ilham_kartlari CASCADE;
--   -- DROP TABLE IF EXISTS focus_models;
--   -- DROP FUNCTION IF EXISTS paylasilan_kart_kopyala(BIGINT);
--
-- Not: ilham_kartlari'nı düşürürsen reset-user + delete-user Edge
-- Function'larının tablo listesinden de 'ilham_kartlari' satırını çıkar
-- (şu an tablo yoksa hata sessizce toplanıyor — kırılma olmaz, sadece gürültü).
--
-- ── SUPABASE MIGRATION GEÇMİŞİ ─────────────────────────────────────────────
-- Bu proje migration'ları SQL Editor'da ELLE koşturuyor, Supabase CLI ile
-- değil. Yani `supabase_migrations.schema_migrations` tablosu ya hiç yok ya
-- da CLI'dan kalma eski kayıtlar içeriyor. ŞEMAYI ETKİLEMEZ — yalnız CLI'ın
-- defteridir. Ne olduğuna bakmak istersen:
--
--   SELECT version, name FROM supabase_migrations.schema_migrations
--    ORDER BY version;   -- tablo yoksa 42P01 verir; sorun değil
--
-- Eski kayıtları temizlemek İSTEĞE BAĞLIDIR ve bu dosya bunu yapmaz:
-- kayıt silmek CLI ile ileride deploy yaparsan davranışı değiştirir. Yine de
-- temiz bir defter istiyorsan (ve CLI kullanmıyorsan) yorumu kaldır:
--
--   -- DELETE FROM supabase_migrations.schema_migrations;
--   -- INSERT INTO supabase_migrations.schema_migrations (version, name)
--   --   VALUES ('00000000000000', 'wanderer_schema');


-- ═══════════════════════════════════════════════════════════════════════════
-- §12 · ŞEMA ENVANTERİ  ("Supabase'de bilmediklerim" için)
-- ───────────────────────────────────────────────────────────────────────────
-- Bu dosya yalnız repodaki migration'ların ürettiği nesneleri kapsar. Projede
-- elle kurulmuş, repoda hiç izi olmayan tablolar da var. Gerçek envanteri
-- görmek için SQL editöründe şunu koştur — çıktı, bu dosyanın kapsamadığı
-- her tabloyu açığa çıkarır:
--
--   SELECT c.relname                                        AS tablo,
--          c.relrowsecurity                                 AS rls_acik,
--          (SELECT count(*) FROM pg_policies p
--            WHERE p.schemaname='public' AND p.tablename=c.relname) AS politika_sayisi,
--          pg_size_pretty(pg_total_relation_size(c.oid))     AS boyut
--     FROM pg_class c
--     JOIN pg_namespace n ON n.oid = c.relnamespace
--    WHERE n.nspname = 'public' AND c.relkind = 'r'
--    ORDER BY 1;
--
-- ⚠ rls_acik = false olan HER tablo güvenlik açığıdır (anon anahtar herkeste).
--   Böyle bir satır görürsen bana söyle, politikasını birlikte yazalım.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- Son. "Kırk taş, tek duvar." — Mesele Sensin.
-- ═══════════════════════════════════════════════════════════════════════════
