/**
 * SUNUCU SESİ SÖZLEŞMESİ — panel ↔ edge fonksiyonu senkronu
 *
 * NEDEN BU TEST VAR:
 * "Persona talimatı hardcode edilmez" kuralı (§6.4) client'ta bir refleks;
 * sunucuda ise hiç kurulmamıştı ve boşluk sessizce doldu — soz-terzisi
 * (31 Tem) ve sohbet-baslaticilari (12 Ağu) kendi sistem prompt'larını
 * TypeScript içine yazdı. 2026-08-19'da ikisi de `pServer` okuma katmanına
 * bağlandı (`_shared/persona-directives.ts`).
 *
 * Bu bağın sessizce kopabileceği TEK yer anahtar adıdır: panel
 * `prompt.srv.baslatici.system`'e yazarken edge fonksiyonu başka bir ad
 * okuyorsa, Emre'nin yayınladığı metin hiçbir zaman kullanılmaz — ve hiçbir
 * hata görünmez, çünkü pServer sessizce fallback'e düşer (tasarım gereği).
 * Sessiz kırılma en pahalı kırılmadır; kapı burada duruyor.
 *
 * Ayrıca bundle diyeti sözleşmesi (§6.7): bu metinler sunucuda yaşar,
 * 16b/16e client sözlüğüne GİRMEZLER.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROMPT_I18N_CORE } from '../js/parts/16b-i18n-prompt-dict-core.js';
import { PROMPT_I18N_EN } from '../js/parts/16e-i18n-prompt-dict-en.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const oku = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/* Panelin bildiği sunucu anahtarları — 16d ES_SERVER_KEYS'ten kaynak
   okunarak çıkarılır (modül DOM'a bağlı olduğu için import edilmez). */
const SES_16D = oku('js/parts/16d-emre-sesi.js');
const PANEL_ANAHTARLARI = [
  ...SES_16D.slice(
    SES_16D.indexOf('const ES_SERVER_KEYS'),
    SES_16D.indexOf('const ES_SERVER_SET'),
  ).matchAll(/key: '([^']+)'/g),
].map((m) => m[1]);

/* Edge fonksiyonlarının gerçekten okuduğu anahtarlar. */
const EDGE_DOSYALARI = [
  'supabase/functions/soz-terzisi/index.ts',
  'supabase/functions/sohbet-baslaticilari/index.ts',
];
const SUNUCU_ANAHTARLARI = EDGE_DOSYALARI.flatMap((f) =>
  [...oku(f).matchAll(/pServer\(\s*\w+\s*,\s*'([^']+)'/g)].map((m) => m[1]),
);

describe('Sunucu sesi — panel ↔ edge fonksiyonu senkronu', () => {
  it('panel iki sunucu anahtarı tanır', () => {
    expect(PANEL_ANAHTARLARI).toHaveLength(2);
  });

  it('her edge fonksiyonu pServer üzerinden bir anahtar okur', () => {
    expect(SUNUCU_ANAHTARLARI).toHaveLength(2);
  });

  it('panelin yazdığı anahtar ile sunucunun okuduğu anahtar AYNI', () => {
    // Kopmanın sessiz olduğu tek yer burası.
    expect([...SUNUCU_ANAHTARLARI].sort()).toEqual([...PANEL_ANAHTARLARI].sort());
  });

  it('anahtarlar prompt.srv. önekini taşır (panelde kendi odasına düşsün)', () => {
    for (const k of PANEL_ANAHTARLARI) expect(k).toMatch(/^prompt\.srv\./);
  });

  it('16d SUNUCU SESLERİ grubu bu öneki yakalar', () => {
    expect(SES_16D).toMatch(/label: 'SUNUCU SESLERİ',\s*re: \/\^prompt\\\.srv\\\.\//);
  });
});

describe('Sunucu sesi — bundle diyeti sözleşmesi (§6.7)', () => {
  it('sunucu anahtarları client TR sözlüğünde YOK', () => {
    for (const k of PANEL_ANAHTARLARI) {
      expect(PROMPT_I18N_CORE.tr[k]).toBeUndefined();
    }
  });

  it('sunucu anahtarları client EN sözlüğünde YOK', () => {
    for (const k of PANEL_ANAHTARLARI) {
      expect(PROMPT_I18N_EN[k]).toBeUndefined();
    }
  });
});

describe('Sunucu sesi — pServer emniyet sözleşmesi', () => {
  const PSERVER = oku('supabase/functions/_shared/persona-directives.ts');

  it('fallback zinciri TR override üzerinden geçer (client p() aynası)', () => {
    expect(PSERVER).toMatch(/if \(dil !== 'tr'\)/);
  });

  it('boş içerik override sayılmaz — fonksiyonun kendi metnine düşer', () => {
    // Panelde yanlışlıkla boşaltılmış bir satır sunucuyu susturmamalı.
    expect(PSERVER).toMatch(/data\.content\.trim\(\)/);
  });

  it('okuma hatası throw etmez (asla bloklama)', () => {
    expect(PSERVER).toMatch(/catch \(e\)/);
    expect(PSERVER).toMatch(/console\.warn/);
  });

  it('her iki edge fonksiyonu da kendi varsayılanını fallback olarak geçirir', () => {
    for (const f of EDGE_DOSYALARI) {
      expect(oku(f)).toMatch(/pServer\([^)]*_sistemPromptu\(dil\)\)/);
    }
  });

  it('edge fonksiyonlarında ham sistem prompt çağrısı kalmadı', () => {
    // Eski hâl: { role: 'system', content: _sistemPromptu(dil) }
    for (const f of EDGE_DOSYALARI) {
      expect(oku(f)).not.toMatch(/role: 'system', content: _sistemPromptu\(dil\)/);
    }
  });
});

/* ═══════════════════════════════════════════════════════════════════
   DIRECTIVE GEÇMİŞİ (FAZ 6) — defteri trigger yazar, panel okur
   ═══════════════════════════════════════════════════════════════════ */

describe('Directive geçmişi — migration sözleşmesi', () => {
  const SQL = oku('migrations/043_persona_directives_history.sql');

  it('geçmiş AFTER UPDATE OR DELETE trigger ile yazılır (uygulama katmanı değil)', () => {
    // K4: persona_directives'e yazan taraf tek değil; uygulamaya bağlanan
    // bir geçmiş, SQL Editor'dan gelen değişikliği sessizce kaçırır.
    expect(SQL).toMatch(/AFTER UPDATE OR DELETE ON persona_directives/);
  });

  it('aynı içerik yeniden yayınlanırsa geçmişe yazılmaz', () => {
    // Yoksa defter aynı metnin kopyalarıyla dolar ve liste işe yaramaz.
    expect(SQL).toMatch(/NEW\.content IS DISTINCT FROM OLD\.content/);
  });

  it('trigger fonksiyonu SECURITY DEFINER (RLS yazmayı engellememeli)', () => {
    expect(SQL).toMatch(/SECURITY DEFINER/);
  });

  it('defter yalnız admin tarafından okunur, yazma politikası yok', () => {
    expect(SQL).toMatch(/CREATE POLICY "pdh admin read"[\s\S]*?FOR SELECT/);
    expect(SQL).not.toMatch(/FOR (INSERT|ALL) [\s\S]*?persona_directives_history/);
  });

  it('idempotent — tekrar çalıştırmak güvenli', () => {
    expect(SQL).toMatch(/CREATE TABLE IF NOT EXISTS persona_directives_history/);
    expect(SQL).toMatch(/CREATE OR REPLACE FUNCTION _persona_directives_gecmis/);
    expect(SQL).toMatch(/DROP TRIGGER IF EXISTS trg_persona_directives_gecmis/);
  });
});

describe('Directive geçmişi — panel sözleşmesi', () => {
  it('esGecmis ve esGeriYukle window\'a açılır (inline onclick bunlara bağlı)', () => {
    expect(SES_16D).toMatch(/window\.esGecmis = esGecmis/);
    expect(SES_16D).toMatch(/window\.esGeriYukle = esGeriYukle/);
  });

  it('geri yükleme YAYINLAMAZ — yalnız kutuya yazar', () => {
    // Yayın bilinçli bir hamle olarak kalmalı; tek tıkla canlıya inmemeli.
    const fn = SES_16D.slice(
      SES_16D.indexOf('export function esGeriYukle'),
      SES_16D.indexOf('/* ── window expose ── */'),
    );
    expect(fn).toMatch(/alan\.value = row\.content_old/);
    expect(fn).not.toMatch(/upsert|esSave/);
  });

  it('migration uygulanmamışsa panel kırılmaz, sebebini söyler (§6.5)', () => {
    expect(SES_16D).toMatch(/Geçmiş defteri henüz kurulmamış/);
    expect(SES_16D).toMatch(/relation\.\*does not exist\|could not find the table/);
  });

  it('geçmiş en yeni önce, sınırlı sayıda okunur', () => {
    expect(SES_16D).toMatch(/order\('changed_at', \{ ascending: false \}\)/);
    expect(SES_16D).toMatch(/\.limit\(20\)/);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   PROVA SAHNESİ YÜZEYİ (FAZ 8) — sahne kaydetmez
   ═══════════════════════════════════════════════════════════════════ */

describe('Prova sahnesi — panel sözleşmesi', () => {
  it('esProva ve esProvaKos window\'a açılır (inline onclick bunlara bağlı)', () => {
    expect(SES_16D).toMatch(/window\.esProva = esProva/);
    expect(SES_16D).toMatch(/window\.esProvaKos = esProvaKos/);
  });

  it('taslak KUTUDAKİ metinden kurulur — DB\'den değil', () => {
    // Provanın anlamı bu: yayınlanmamış hâli duymak.
    expect(SES_16D).toMatch(/const taslak = ctx\.text\.trim\(\)/);
  });

  it('motor lazy import edilir (panel açılmadan 16g yüklenmesin)', () => {
    expect(SES_16D).toMatch(/await import\('\.\/16g-prova-sahnesi\.js'\)/);
  });

  it('yanıt yalnız sahnede gösterilir — kaydeden bir çağrı yok', () => {
    const fn = SES_16D.slice(
      SES_16D.indexOf('export async function esProvaKos'),
      SES_16D.indexOf('/* ── window expose ── */'),
    );
    expect(fn).toMatch(/yanit\.innerHTML/);
    expect(fn).not.toMatch(/upsert|\.insert\(|SafeStorage\.set/);
  });

  it('yanıt escapeHTML\'den geçer (LLM çıktısı innerHTML\'e giriyor)', () => {
    const fn = SES_16D.slice(
      SES_16D.indexOf('export async function esProvaKos'),
      SES_16D.indexOf('/* ── window expose ── */'),
    );
    expect(fn).toMatch(/escapeHTML\(sonuc\.metin/);
  });

  it('kota hatası kendi diliyle karşılanır (prova gerçek çağrıdır)', () => {
    expect(SES_16D).toMatch(/e\?\.quota/);
  });

  it('prova önerisi anahtarın türüne göre değişir', () => {
    // Kriz anahtarını "Selam" ile sınamak boş bir prova olurdu.
    expect(SES_16D).toMatch(/function _esProvaOneri/);
    expect(SES_16D).toMatch(/crisis\|kriz/);
  });
});

describe('Prova motoru — 16g sözleşmesi', () => {
  const PRV = oku('js/parts/16g-prova-sahnesi.js');

  it('canlı harita finally içinde geri yazılır', () => {
    expect(PRV).toMatch(/\} finally \{[\s\S]*?setPromptOverrides\(yedek\)/);
  });

  it('eşzamanlı prova engellenir (ikinci finally birincinin yedeğini ezerdi)', () => {
    expect(PRV).toMatch(/let _prvKosuyor = false/);
    expect(PRV).toMatch(/if \(_prvKosuyor\) throw/);
  });

  it('persona kapatılmaz — prova gerçeğe yakın kalmalı', () => {
    expect(PRV).toMatch(/skipPersona: false/);
  });

  it('mod kılavuzu taslak yürürlükteyken kurulur (sıra kritik)', () => {
    const i = PRV.indexOf('setPromptOverrides(_prvBirlestir');
    const j = PRV.indexOf('buildModeSelectionGuide()');
    expect(i).toBeGreaterThan(0);
    expect(j).toBeGreaterThan(i);
  });
});
