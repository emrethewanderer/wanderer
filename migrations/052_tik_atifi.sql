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
