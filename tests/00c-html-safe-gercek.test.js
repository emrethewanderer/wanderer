/**
 * HTML SAFE — GERÇEK SANİTİZASYON KAPISI (denetim C3)
 *
 * `tests/setup.js:96` DOMPurify'ı GLOBAL olarak passthrough mock'lar
 * (`sanitize: (s) => String(s)`). Bu, ağır bir bağımlılığı testten uzak
 * tutmak için makul bir karardır — ama sonucu şuydu: repo'nun XSS
 * savunmasının son katmanı hiçbir yerde ÖLÇÜLMÜYORDU.
 * `00c-html-safe.test.js`'in kendi başlığı bunu itiraf ediyor:
 * "Real XSS sanitization is verified in production via DOMPurify itself."
 * Yani üretimde doğrulandığı VARSAYILIYORDU.
 *
 * Bu dosya o varsayımı kapıya çevirir: mock'u söker, GERÇEK DOMPurify ile
 * gerçek saldırı vektörlerini geçirir. Sanitizasyon bir gün sessizce
 * devre dışı kalırsa (yanlış config, sürüm kayması, hook kazası) burası
 * kırmızıya döner.
 *
 * Not: `vi.unmock` yalnız bu dosyanın modül kaydını etkiler; diğer testler
 * hızlı passthrough mock'la koşmaya devam eder.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';

vi.unmock('dompurify');

let safeHTML, setHTML, safeMarkdownHTML, setText;

beforeAll(async () => {
  vi.resetModules();
  const mod = await import('../js/parts/00c-html-safe.js');
  ({ safeHTML, setHTML, safeMarkdownHTML, setText } = mod);
});

describe('safeHTML — gerçek DOMPurify saldırı vektörlerini keser', () => {
  it('script etiketi hiç geçmez', () => {
    const cikti = safeHTML('<p>merhaba</p><script>alert(1)</script>');
    expect(cikti).not.toContain('<script');
    expect(cikti).not.toContain('alert(1)');
    expect(cikti).toContain('merhaba');           // zararsız içerik korunur
  });

  it('img onerror gibi olay işleyicileri düşer', () => {
    const cikti = safeHTML('<img src="x" onerror="alert(1)">');
    expect(cikti.toLowerCase()).not.toContain('onerror');
  });

  it('javascript: URI şeması geçmez', () => {
    const cikti = safeHTML('<a href="javascript:alert(1)">tık</a>');
    expect(cikti.toLowerCase()).not.toContain('javascript:');
  });

  it('iframe ve object gömülemez', () => {
    const cikti = safeHTML('<iframe src="https://evil.example"></iframe><object data="x"></object>');
    expect(cikti).not.toContain('<iframe');
    expect(cikti).not.toContain('<object');
  });

  it('svg içine gizlenmiş script de düşer', () => {
    const cikti = safeHTML('<svg><script>alert(1)</script></svg>');
    expect(cikti).not.toContain('alert(1)');
  });

  it('form ve input yüzeyi açılmaz — kimlik avı vektörü', () => {
    const cikti = safeHTML('<form action="https://evil.example"><input name="sifre"></form>');
    expect(cikti).not.toContain('<form');
    expect(cikti).not.toContain('<input');
  });

  it('null/undefined boş string döner (gerçek DOMPurify ile de)', () => {
    expect(safeHTML(null)).toBe('');
    expect(safeHTML(undefined)).toBe('');
  });

  it('güvenli biçimlendirme korunur — sanitizer içeriği yutmuyor', () => {
    const cikti = safeHTML('<p><strong>kalın</strong> ve <em>eğik</em></p>');
    expect(cikti).toContain('<strong>');
    expect(cikti).toContain('<em>');
  });
});

describe('safeMarkdownHTML — LLM çıktısı için sıkı kapı', () => {
  it('onclick markdown yolunda YASAKTIR (safeHTML aksine)', () => {
    // Bilinçli asimetri: uygulamanın kendi template'leri onclick kullanır,
    // ama modelin ürettiği HTML asla. Bu ayrım kayarsa burası kırılır.
    const cikti = safeMarkdownHTML('<button onclick="alert(1)">bas</button>');
    expect(cikti.toLowerCase()).not.toContain('onclick');
  });

  it('style attribute da düşer — görsel enjeksiyon kapalı', () => {
    const cikti = safeMarkdownHTML('<p style="position:fixed;inset:0">kapla</p>');
    expect(cikti.toLowerCase()).not.toContain('style=');
  });

  it('script yine geçmez', () => {
    expect(safeMarkdownHTML('<script>alert(1)</script>')).not.toContain('alert(1)');
  });
});

describe('setHTML / setText — DOM yazarken de koruma sürüyor', () => {
  it('setHTML sanitize edilmiş içerik yazar', () => {
    const el = document.createElement('div');
    setHTML(el, '<img src="x" onerror="alert(1)"><b>kalan</b>');
    expect(el.innerHTML.toLowerCase()).not.toContain('onerror');
    expect(el.querySelector('b')?.textContent).toBe('kalan');
  });

  it('setText HTML yorumlamaz — düz metin kalır', () => {
    const el = document.createElement('div');
    setText(el, '<script>alert(1)</script>');
    expect(el.querySelector('script')).toBeNull();
    expect(el.textContent).toBe('<script>alert(1)</script>');
  });
});
