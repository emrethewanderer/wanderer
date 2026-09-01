/**
 * KANIT BEKLEYEN ALANLAR KAPISI — js/parts/00i-kanit-bekleyen.js
 *
 * Anayasa (§6.10) kanıtı olmayan değeri yasaklar ve bunun "`0` gibi masum
 * sayılara gizlenemeyeceğini" açıkça söyler. Bu dosya iki şeyi sınar:
 * ① katmanın kendisi (susma ve belirme mekaniği), ② REPO — yeni bir alan
 * statik sayıyla doğup işaretsiz kalırsa kapı kırmızı yanar.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { kbKur, kbSerbest, kbBekleyen } from '../js/parts/00i-kanit-bekleyen.js';

const _kok = dirname(fileURLToPath(import.meta.url));

describe('Kanıt Bekleyen · susma ve belirme', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('bekleyen alan sayılır, serbest bırakılınca sayı düşer', () => {
    document.body.innerHTML = '<span id="a" data-kb="1">0</span><span id="b" data-kb="1">0</span>';
    expect(kbBekleyen()).toBe(2);
    expect(kbSerbest()).toBe(2);
    expect(kbBekleyen()).toBe(0);
  });

  it('serbest kalan alan BELİRİR (kb-belirdi sınıfı)', () => {
    document.body.innerHTML = '<span id="a" data-kb="1">0</span>';
    kbSerbest();
    expect(document.getElementById('a').classList.contains('kb-belirdi')).toBe(true);
  });

  it('DOM METNİNE ASLA dokunmaz — textContent veri olarak okunuyor', () => {
    // 10-features-w2.js:119 `parseInt(topbar-streak-count.textContent)` yapıyor;
    // metni "—" ile değiştirmek NaN üretirdi. Katman yalnız görünürlüğü yönetir.
    document.body.innerHTML = '<span id="a" data-kb="1">0</span>';
    kbSerbest();
    expect(document.getElementById('a').textContent).toBe('0');
  });

  it('bekleyen alan ekran okuyucudan da gizlenir, serbest kalınca açılır', () => {
    document.body.innerHTML = '<span id="a" data-kb="1">0</span>';
    kbKur();
    expect(document.getElementById('a').getAttribute('aria-hidden')).toBe('true');
    kbSerbest();
    expect(document.getElementById('a').hasAttribute('aria-hidden')).toBe(false);
  });

  it('kendi eklemediği aria-hidden KORUNUR (dekoratif glyph geri açılmaz)', () => {
    document.body.innerHTML = '<span id="a" data-kb="1" aria-hidden="true">◆</span>';
    kbKur();
    kbSerbest();
    expect(document.getElementById('a').getAttribute('aria-hidden')).toBe('true');
  });

  it('içerik değişimi alanı kendiliğinden serbest bırakır (gözcü)', async () => {
    document.body.innerHTML = '<span id="a" data-kb="1">0</span>';
    kbKur();
    document.getElementById('a').textContent = '42';
    await new Promise((r) => setTimeout(r, 20));   // MutationObserver mikrotask sonrası
    expect(document.getElementById('a').hasAttribute('data-kb')).toBe(false);
  });
});

describe('Kanıt Bekleyen · REPO kapısı', () => {
  const html = readFileSync(join(_kok, '..', '_src.html'), 'utf8');
  const js = ['03-auth-shell', '10-features-w2', '10s-w2-gunluk-ritus', '10y-w2-llm-shell', '10w-w2-odak-modelleri']
    .map((f) => readFileSync(join(_kok, '..', 'js', 'parts', f + '.js'), 'utf8')).join('\n');

  /* Muaf alanlar — gerekçesi yazılmayan muafiyet de ihlaldir (§6.10 dili).
     Bunlar kullanıcı hakkında bir iddia taşımaz: */
  const MUAF = {
    'session-ring-count': 'oturumun mesaj sayacı — yeni oturumda 0 DOĞRU başlangıçtır, hidrasyon değeri değil',
    'kapi-aralik-days': 'teklif penceresinin sabit gün sayısı (30), kullanıcıya ait bir ölçüm değil',
  };

  it('statik sayı ile doğan ve hidrasyonla değişen her alan işaretlidir', () => {
    const kalip = /id="([a-zA-Z0-9_-]+)"([^>]*)>([^<>\n]{1,40})</g;
    const ihlaller = [];
    let m;
    while ((m = kalip.exec(html))) {
      const [, eid, oznitelikler, icerik] = m;
      const metin = icerik.trim();
      if (!/^[0-9]+([.,][0-9]+)?%?( [a-zçğıöşü]+)?$/i.test(metin)) continue; // yalnız sayı(+birim)
      if (MUAF[eid]) continue;
      if (oznitelikler.includes('data-kb')) continue;
      if (!new RegExp("getElementById\\('" + eid + "'\\)").test(js)) continue; // hidre edilmiyorsa serbest
      ihlaller.push(`#${eid} = "${metin}"`);
    }
    expect(ihlaller, 'Kanıtsız sayıyla doğan işaretsiz alan: data-kb="1" ekle ya da MUAF listesine gerekçesiyle yaz').toEqual([]);
  });

  it('LLM ana ekranının kişiselleşen yüzeyleri işaretli (sıçramanın kaynağıydı)', () => {
    for (const eid of ['llm-greeting', 'llm-greeting-sub', 'cl-model-name', 'cl-model-glyph']) {
      const par = new RegExp('id="' + eid + '"[^>]*data-kb="1"');
      expect(par.test(html), `#${eid} işaretsiz`).toBe(true);
    }
  });

  it('llmRenderHome kanıtsız ADI yazmaz (sıçramanın asıl kaynağıydı)', () => {
    const kabuk = readFileSync(join(_kok, '..', 'js', 'parts', '10y-w2-llm-shell.js'), 'utf8');
    // 'Gezgin' fallback'i bir kanıt değildir; selam ancak ad çözülünce yazılır.
    expect(kabuk).toContain('_userNameKanitli');
    expect(kabuk).toMatch(/const _ad = _userNameKanitli\(\);[\s\S]{0,200}greetEl && _ad/);
    // Yarım model (tagline yok) da yazılmaz — "Wanderer Öz · " diye asılı kalmasın.
    expect(kabuk).toMatch(/m && m\.name && m\.tagline/);
  });

  it('zincirin ucu kbSerbest ile mühürlenir', () => {
    const kabuk = readFileSync(join(_kok, '..', 'js', 'parts', '03-auth-shell.js'), 'utf8');
    expect(kabuk).toContain('kbSerbest()');
    expect(kabuk).toMatch(/bnHazir\(\);[\s\S]{0,300}kbSerbest\(\)/);
  });
});
