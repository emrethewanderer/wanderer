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
