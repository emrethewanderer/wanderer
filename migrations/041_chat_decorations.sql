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
