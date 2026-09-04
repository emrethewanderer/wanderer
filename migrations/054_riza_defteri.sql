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
