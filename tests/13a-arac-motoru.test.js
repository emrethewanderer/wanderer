/**
 * Tests for js/parts/13a-arac-motoru.js — Araç Motoru (Wanderer'ın Elleri).
 *
 * Kapsam: aracExtract() blok ayrıştırma ([ARAC:*]/[KAGIT]/[TAKIP], bozuk JSON
 * toleransı, çoklu-işaretçi sıralaması), "ASLA SESSİZ YÜRÜTME YOK" güvencesi
 * (extract yalnız veri çıkarır — hiçbir aksiyonu ÇALIŞTIRMAZ; aracRunTool
 * yalnız kullanıcı onayıyla/dismiss ise hiç çalıştırmadan chip'i kaldırır),
 * takipAsk() composer'a soru yazma davranışı.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../js/parts/07-settings-knowledge.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, saveNoteDirect: vi.fn() };
});

import { S } from '../js/state.js';
import { aracExtract, aracRunTool, aracDismiss, takipAsk, aracAfterReply } from '../js/parts/13a-arac-motoru.js';
import { cleanHistoryText } from '../js/parts/00-config-tracking.js';
import { saveNoteDirect } from '../js/parts/07-settings-knowledge.js';

beforeEach(() => {
  saveNoteDirect.mockReset();
  document.body.innerHTML = '';
  delete window.glGiveSozNow;
  delete window.oikOpenReading;
  ['gorOpen', 'gorDayWindow', 'usGetTodayVision', 'yolOpenSabir', 'wtLogArac',
   'igOpenKapi', 'gyStart', 'gyOpenToday', 'skOpen', 'skSelectSet', 'engOpen',
  ].forEach(k => { delete window[k]; });
});

describe('aracExtract — blok ayrıştırma', () => {
  it('işaretçi yoksa null döner', () => {
    expect(aracExtract('Merhaba, bugün nasılsın?')).toBeNull();
  });

  it('boş/undefined metinde null döner', () => {
    expect(aracExtract('')).toBeNull();
    expect(aracExtract(undefined)).toBeNull();
  });

  it('[ARAC:soz] bloğunu çıkarır, öncesindeki metni ayrı tutar', () => {
    const r = aracExtract('Bugün sözünü tutabilirsin.[ARAC:soz]');
    expect(r.text).toBe('Bugün sözünü tutabilirsin.');
    expect(r.tools).toEqual([{ tool: 'soz', args: null }]);
  });

  it('[ARAC:not]{json} argümanlı bloğu çıkarır', () => {
    const r = aracExtract('Bunu not alalım.[ARAC:not]{"metin":"kaydedilecek düşünce"}');
    expect(r.tools[0].tool).toBe('not');
    expect(r.tools[0].args).toEqual({ metin: 'kaydedilecek düşünce' });
  });

  it('bozuk JSON argümanında sessizce null args döner (throw etmez)', () => {
    const r = aracExtract('metin[ARAC:not]{bozuk json burada');
    expect(r.tools[0].tool).toBe('not');
    expect(r.tools[0].args).toBeNull();
  });

  it('[KAGIT]{"kavram":...} bloğunu çıkarır', () => {
    const r = aracExtract('İşte kağıt.[KAGIT]{"kavram":"öz-şefkat"}');
    expect(r.kagit).toEqual({ kavram: 'öz-şefkat' });
  });

  it('kavram alanı olmayan KAGIT JSON\'u yok sayar', () => {
    const r = aracExtract('metin[KAGIT]{"baska":"deger"}');
    expect(r.kagit).toBeNull();
  });

  it('[TAKIP]a|b[/TAKIP] iki soruyu ayırır', () => {
    const r = aracExtract('metin[TAKIP]Bugün ne hissettin?|Yarın ne yapacaksın?[/TAKIP]');
    expect(r.takip).toEqual(['Bugün ne hissettin?', 'Yarın ne yapacaksın?']);
  });

  it('TAKIP en fazla 2 soruyla sınırlanır', () => {
    const r = aracExtract('metin[TAKIP]a|b|c|d[/TAKIP]');
    expect(r.takip.length).toBe(2);
  });

  it('kapanış etiketi olmayan TAKIP metnin sonuna kadar okunur', () => {
    const r = aracExtract('metin[TAKIP]soru1|soru2');
    expect(r.takip).toEqual(['soru1', 'soru2']);
  });

  it('birden çok işaretçi varsa metin EN ERKEN olandan kesilir', () => {
    const r = aracExtract('gövde metni[ARAC:soz][KAGIT]{"kavram":"x"}');
    expect(r.text).toBe('gövde metni');
    expect(r.tools[0].tool).toBe('soz');
    expect(r.kagit).toEqual({ kavram: 'x' });
  });

  it('[TAKİP] (noktalı İ) — model TR yanıtta etiketi kendi yazımıyla yazıyor', () => {
    // Gerçek vaka: blok ham metin olarak ekrana, geçmişe ve DB'ye sızıyordu
    const r = aracExtract(
      'Gerisi Allah\'ın izniyle gelir.\n\n[TAKİP]Sabah ilk ne düşünür?|O kişi bunu nasıl taşır[/TAKİP]'
    );
    expect(r.text).toBe('Gerisi Allah\'ın izniyle gelir.');
    expect(r.takip).toEqual(['Sabah ilk ne düşünür?', 'O kişi bunu nasıl taşır']);
  });

  it('[ARAÇ:] ve [KAĞIT] Türkçe yazımlarını da tanır', () => {
    expect(aracExtract('metin[ARAÇ:soz]').tools[0].tool).toBe('soz');
    expect(aracExtract('metin[KAĞIT]{"kavram":"bolluk"}').kagit).toEqual({ kavram: 'bolluk' });
  });

  it('yalnız etiket ADI toleranslı — yakalanan içerik normalize EDİLMEZ', () => {
    const r = aracExtract('metin[TAKİP]Işığı gördün mü?|Sığınağın neresi[/TAKİP]');
    expect(r.takip[0]).toBe('Işığı gördün mü?');
    expect(r.takip[1]).toBe('Sığınağın neresi');
  });

  it('karışık yazım: açılış Türkçe, kapanış kanonik', () => {
    const r = aracExtract('metin[TAKİP]a|b[/TAKIP]');
    expect(r.takip).toEqual(['a', 'b']);
  });

  it('yalnızca VERİ çıkarır — hiçbir global aksiyonu ÇAĞIRMAZ (sessiz yürütme yok)', () => {
    const glSpy = vi.fn();
    window.glGiveSozNow = glSpy;
    aracExtract('metin[ARAC:soz]');
    expect(glSpy).not.toHaveBeenCalled();
  });
});

describe('aracRunTool / aracDismiss — onay olmadan aksiyon yok', () => {
  function makeChip(tool, args) {
    const chip = document.createElement('div');
    chip.className = 'arac-chip';
    chip.dataset.tool = tool;
    if (args) chip.dataset.args = JSON.stringify(args);
    const btn = document.createElement('button');
    chip.appendChild(btn);
    document.body.appendChild(chip);
    return btn;
  }

  it('aracDismiss: hiçbir tool çalıştırmadan chip\'i kaldırır', async () => {
    const glSpy = vi.fn();
    window.glGiveSozNow = glSpy;
    const btn = makeChip('soz');
    aracDismiss(btn);
    expect(document.querySelector('.arac-chip')).toBeNull();
    expect(glSpy).not.toHaveBeenCalled();
  });

  // Tanıma Motoru (FAZ 2, İ2) — vazgeçiş artık görünmez değil.
  it('aracDismiss: 09d negatif defterine hangi araç türü geçildiğini yazar', async () => {
    const omSpy = vi.fn();
    window.omKaydetAracGec = omSpy;
    const btn = makeChip('takip');
    aracDismiss(btn);
    expect(omSpy).toHaveBeenCalledWith('takip');
    delete window.omKaydetAracGec;
  });

  it('aracDismiss: 09d köprüsü yoksa (henüz yüklenmedi) sessizce çalışır', async () => {
    delete window.omKaydetAracGec;
    const btn = makeChip('soz');
    expect(() => aracDismiss(btn)).not.toThrow();
  });

  it('aracRunTool: onay sonrası soz aracı window.glGiveSozNow\'u çağırır', async () => {
    const glSpy = vi.fn();
    window.glGiveSozNow = glSpy;
    const btn = makeChip('soz');
    await aracRunTool(btn);
    expect(glSpy).toHaveBeenCalledTimes(1);
  });

  it('aracRunTool: gecis aracı window.oikOpenReading\'i çağırır', async () => {
    const oikSpy = vi.fn();
    window.oikOpenReading = oikSpy;
    const btn = makeChip('gecis');
    await aracRunTool(btn);
    expect(oikSpy).toHaveBeenCalledTimes(1);
  });

  it('aracRunTool: not aracı saveNoteDirect\'i doğru metinle çağırır', async () => {
    saveNoteDirect.mockResolvedValue(true);
    const btn = makeChip('not', { metin: 'kaydedilecek not' });
    await aracRunTool(btn);
    expect(saveNoteDirect).toHaveBeenCalledWith('kaydedilecek not');
  });

  it('aracRunTool: metin yoksa saveNoteDirect hiç çağrılmaz', async () => {
    const btn = makeChip('not', {});
    await aracRunTool(btn);
    expect(saveNoteDirect).not.toHaveBeenCalled();
  });

  it('aracRunTool: çalıştırma sonrası chip DOM\'dan kalkar', async () => {
    window.glGiveSozNow = vi.fn();
    const btn = makeChip('soz');
    await aracRunTool(btn);
    expect(document.querySelector('.arac-chip')).toBeNull();
  });

  it('aracRunTool: bilinmeyen tool sessizce no-op (throw etmez)', async () => {
    const btn = makeChip('bilinmeyen-arac');
    await expect(aracRunTool(btn)).resolves.not.toThrow();
  });

  it('aracRunTool: run() throw ederse hata yakalanır, chip yine kalkmış olur', async () => {
    window.glGiveSozNow = () => { throw new Error('patladı'); };
    const btn = makeChip('soz');
    await expect(aracRunTool(btn)).resolves.not.toThrow();
  });
});

describe('takipAsk — composer\'a soru yazma', () => {
  it('chat-input varsa soruyu value\'ya yazar ve odaklanır', () => {
    document.body.innerHTML = '<input id="chat-input" />';
    const btn = document.createElement('button');
    btn.dataset.q = 'Bugün neye odaklanmak istersin?';
    const row = document.createElement('div');
    row.className = 'takip-row';
    row.appendChild(btn);
    document.body.appendChild(row);
    document.getElementById('chat-input').scrollIntoView = vi.fn(); // jsdom'da yok

    takipAsk(btn);

    expect(document.getElementById('chat-input').value).toBe('Bugün neye odaklanmak istersin?');
    expect(document.querySelector('.takip-row')).toBeNull();
  });

  it('data-q yoksa no-op (input dokunulmaz)', () => {
    document.body.innerHTML = '<input id="chat-input" value="mevcut" />';
    const btn = document.createElement('button');
    takipAsk(btn);
    expect(document.getElementById('chat-input').value).toBe('mevcut');
  });
});

describe('cleanHistoryText — eski kirli kayıtların geri-okuma temizliği', () => {
  beforeEach(() => { window.aracExtract = aracExtract; });

  it('filigran + ham [TAKİP] bloğu taşıyan eski kaydı tek geçişte temizler', () => {
    const kirli = '[bu yanıt "tasarla" modunda yazıldı]\n' +
                  '[bu yanıt "tasarla" modunda yazıldı]\n' +
                  'Gerisi Allah\'ın izniyle gelir.\n\n[TAKİP]a|b[/TAKİP]';
    expect(cleanHistoryText(kirli)).toBe('Gerisi Allah\'ın izniyle gelir.');
  });

  it('temiz kayda dokunmaz', () => {
    expect(cleanHistoryText('Merhaba, bugün nasılsın?')).toBe('Merhaba, bugün nasılsın?');
  });

  it('kayıt yalnız bloktan ibaretse boş balon yerine sessiz iz bırakır', () => {
    expect(cleanHistoryText('[TAKİP]a|b[/TAKİP]')).toBe('✦');
  });

  it('13a henüz yüklenmemişse filigranı yine de soyar (sessiz düşüş)', () => {
    delete window.aracExtract;
    expect(cleanHistoryText('[bu yanıt "tasarla" modunda yazıldı]\nMerhaba')).toBe('Merhaba');
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   HAZIRLIK KAPISI — odası boş olan kapı çizilmez

   `hazir()` false ise chip HİÇ çizilmez: chip bir VAATTİR ve tutulamayan
   vaat kart olur, kaldıraç olmaz (§1.1). Bu, `_acRitual`'ın köprü
   yoklamasından AYRI bir sorudur — o köprünün VARLIĞINI, bu odanın
   DOLULUĞUNU ölçer; ikisi de gerekir.

   BİRLEŞME NOTU (2026-09-06): bu blok üç araç için yazılmıştı; `ayna`
   birleşmede DÜŞTÜ (09h Studio-gate — ücretsiz kullanıcıya önerilen chip
   paywall'a çıkarsa huni olur) ve testleri de onunla gitti. Kalan tek
   `hazir()` taşıyıcısı `gordun`; `sabir` ve main'den gelen ikisi bilerek
   ön koşulsuzdur. Toast artık GERÇEK DOM'dan okunur — main'in kapısı
   showToast'ı mock'lamıyordu ve gerekçesi doğruydu (§10.5: ölçen alet de
   ölçülür), o yaklaşım benimkinin yerine geçti.
═══════════════════════════════════════════════════════════════════════ */
describe('hazırlık kapısı — odası boş olan kapı çizilmez', () => {
  function ciz(tool) {
    document.body.innerHTML = '<div id="messages-area"><div id="msg"></div></div>';
    aracAfterReply(document.getElementById('msg'), { tools: [{ tool, args: null }], kagit: null, takip: [] });
    return document.querySelector('.arac-chip');
  }

  it('gordun: OİK penceresi doluysa ve bugün bakılmadıysa chip çizilir', () => {
    window.gorDayWindow = () => ({ source: 'oik' });
    window.usGetTodayVision = () => null;
    expect(ciz('gordun')).not.toBeNull();
  });

  it('gordun: OİK kartı yoksa (source:empty) chip ÇİZİLMEZ', () => {
    window.gorDayWindow = () => ({ source: 'empty' });
    window.usGetTodayVision = () => null;
    expect(ciz('gordun')).toBeNull();
  });

  it('gordun: bugün zaten bakıldıysa chip ÇİZİLMEZ (mühür düştü)', () => {
    window.gorDayWindow = () => ({ source: 'oik' });
    window.usGetTodayVision = () => ({ text: 'bugünkü bakış' });
    expect(ciz('gordun')).toBeNull();
  });

  /* Bu testin yokluğu gerçek bir kırık sakladı: `gordun`'un ilk `hazir`'i
     `(window.gorDayWindow?.() || {}).source !== 'empty'` yazıyordu ve 10E
     yüklü değilken `undefined !== 'empty'` DOĞRU dönüyordu — kapı, tam
     olarak engellemek için var olduğu şeyi geçiriyordu. */
  it('gordun: köprü hiç yüklenmemişse ÇİZİLMEZ (doğrulanamayan oda açılmaz)', () => {
    expect(ciz('gordun')).toBeNull();
  });

  it('hazir() throw ederse chip ÇİZİLMEZ (sessiz düşüş, §5.2)', () => {
    window.gorDayWindow = () => { throw new Error('10E yüklenmedi'); };
    expect(ciz('gordun')).toBeNull();
  });

  it('ön koşulsuz araçlar hazir() taşımaz — hiçbir köprü yokken bile çizilir', () => {
    ['soz', 'gecis', 'imge', 'sabir', 'inanc', 'engel'].forEach(tool => {
      expect(ciz(tool), `${tool} chip'i çizilmedi`).not.toBeNull();
    });
  });

  it('çizilmeyen chip ÖNERİLMİŞ SAYILMAZ — Araç Nabzı susar (09·D ölçüsü)', () => {
    const nabiz = vi.fn();
    window.wtLogArac = nabiz;
    window.gorDayWindow = () => ({ source: 'empty' });
    ciz('gordun');
    expect(nabiz).not.toHaveBeenCalled();
    window.gorDayWindow = () => ({ source: 'oik' });
    ciz('gordun');
    expect(nabiz).toHaveBeenCalledWith('oner', { arac: 'gordun' });
  });
});

describe('gordun · sabir — kendi törenini açar, yeni motor kurmaz', () => {
  function chip(tool) {
    const el = document.createElement('div');
    el.className = 'arac-chip';
    el.dataset.tool = tool;
    const btn = document.createElement('button');
    el.appendChild(btn);
    document.body.appendChild(el);
    return btn;
  }
  function kurToastHost() {
    const el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  const toastGorundu = () => {
    const el = document.getElementById('toast');
    return !!el && el.classList.contains('show') && el.classList.contains('err');
  };

  it('[ARAC:gordun] · [ARAC:sabir] blokları çıkarılır', () => {
    expect(aracExtract('metin[ARAC:gordun]').tools[0].tool).toBe('gordun');
    expect(aracExtract('metin[ARAC:sabir]').tools[0].tool).toBe('sabir');
  });

  it('gordun → window.gorOpen', async () => {
    const spy = vi.fn();
    window.gorOpen = spy;
    window.gorDayWindow = () => ({ source: 'oik' });
    window.usGetTodayVision = () => null;
    await aracRunTool(chip('gordun'));
    expect(spy).toHaveBeenCalled();
  });

  it('sabir → window.yolOpenSabir', async () => {
    const spy = vi.fn();
    window.yolOpenSabir = spy;
    await aracRunTool(chip('sabir'));
    expect(spy).toHaveBeenCalled();
  });

  /* ayna chip olarak YOKTUR — 09h Studio-gate'lidir ve sohbette önerilen bir
     chip'in ücretsiz kullanıcıyı teaser'a bırakması onu huniye çevirir.
     Kapı burada: bir sonraki tur onu sessizce geri koyarsa kırmızı basar. */
  it('ayna: chip olarak YOKTUR — premium kapılı ritüel sohbetten önerilmez', async () => {
    const ay = vi.fn();
    window.ayOpen = ay;
    await aracRunTool(chip('ayna'));
    expect(ay, 'premium kapılı Ayna Anı sohbetten önerildi — chip huniye döndü')
      .not.toHaveBeenCalled();
  });

  it('BAYAT CHIP: çizildikten sonra oda boşaldıysa tören AÇILMAZ', async () => {
    kurToastHost();
    const spy = vi.fn();
    window.gorOpen = spy;
    // Chip çizilirken hazırdı; kullanıcı başka bir sekmede bugünkü bakışı yaptı.
    window.gorDayWindow = () => ({ source: 'oik' });
    window.usGetTodayVision = () => ({ text: 'başka sekmede yapıldı' });
    await aracRunTool(chip('gordun'));
    expect(spy).not.toHaveBeenCalled();
    expect(toastGorundu(), 'bayat chip sessizce yutuldu').toBe(true);
  });

  it('onay yine de sayılır — nabız bayat chip\'te de "onayla" yazar', async () => {
    const nabiz = vi.fn();
    window.wtLogArac = nabiz;
    window.gorDayWindow = () => ({ source: 'empty' });   // hazır değil
    await aracRunTool(chip('gordun'));
    expect(nabiz).toHaveBeenCalledWith('onayla', { arac: 'gordun' });
  });
});

/* ═══════════════════════════════════════════════════════════════════
   FAZ 10 — ÜÇ YENİ ARAÇ ve "sahte başarı" kapısı
   ───────────────────────────────────────────────────────────────────
   İki ayrı iddia sınanır ve ikincisi bir REGRESYON kapısıdır:

   1. yol · inanc · engel doğru ritüeli, doğru sırayla açar.
   2. Ritüel YÜKLÜ DEĞİLSE chip `false` döner ve kullanıcı `arac.fail`
      toast'ını görür. Eski kalıp `window.xOpen?.(); return true;` idi:
      chip kapanıyor, hiçbir şey açılmıyor, kullanıcı "oldu" sanıyordu —
      §6.2'nin sahte başarısı. aracRunTool `false`'u zaten toast'a
      çeviriyordu (13a:156), yani dürüst hâl hep bekleniyordu; kimse
      döndürmüyordu.
   Kapı bu yüzden yalnız yeni üçünü değil ESKİ üçünü de sınar — düzeltme
   onlarda yapıldı, regresyon da onlarda doğar.
═══════════════════════════════════════════════════════════════════ */
describe('FAZ 10 — üç yeni araç', () => {
  function makeChip(tool, args) {
    const chip = document.createElement('div');
    chip.className = 'arac-chip';
    chip.dataset.tool = tool;
    if (args) chip.dataset.args = JSON.stringify(args);
    const btn = document.createElement('button');
    chip.appendChild(btn);
    document.body.appendChild(chip);
    return btn;
  }

  it('[ARAC:inanc] · [ARAC:engel] blokları çıkarılır', () => {
    expect(aracExtract('metin[ARAC:inanc]').tools[0].tool).toBe('inanc');
    expect(aracExtract('metin[ARAC:engel]').tools[0].tool).toBe('engel');
  });

  /* 13s Geçiş Yolu SOHBETE AÇILMAZ — 13s:27-29 "Studio-only (Wanderer Studio
     kararı, 2026-07-19), Wanderer (LLM) ücretsiz yüzünde yolculuk
     başlatılmaz." Faz onu önce ekledi, çapraz denetim kısıtı buldu, geri
     alındı. Kapı burada: bir sonraki tur `yol`u sessizce geri koyarsa bu test
     kırmızı basar ve kısıtı hatırlatır. `gyStart` kendi başına yüzey kontrolü
     TAŞIMAZ (13s:97) — kısıt yalnız çağıranın disiplinidir, o yüzden ölçülür. */
  it('yol: chip olarak YOKTUR — Geçiş Yolu sohbet yüzeyinden başlatılmaz', async () => {
    const start = vi.fn();
    window.gyStart = start;
    await aracRunTool(makeChip('yol'));
    expect(start, 'Geçiş Yolu sohbetten başlatıldı — 13s:27-29 Studio-only kısıtı delindi').not.toHaveBeenCalled();
  });

  it('Türkçeleşmiş [ARAÇ:engel] de tanınır (RE_ARAC toleransı)', () => {
    expect(aracExtract('metin[ARAÇ:engel]').tools[0].tool).toBe('engel');
  });

  it('inanc: skOpen\'ı açar ve doğrudan İnanç Kazma setine geçirir', async () => {
    const open = vi.fn(); const select = vi.fn();
    window.skOpen = open; window.skSelectSet = select;
    await aracRunTool(makeChip('inanc'));
    expect(open).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenCalledWith('inanc');
  });

  it('engel: engOpen\'ı çağırır', async () => {
    const eng = vi.fn();
    window.engOpen = eng;
    await aracRunTool(makeChip('engel'));
    expect(eng).toHaveBeenCalledTimes(1);
  });
});

describe('sahte başarı kapısı — ritüel yüklü değilse chip "oldu" demez', () => {
  function makeChip(tool) {
    const chip = document.createElement('div');
    chip.className = 'arac-chip';
    chip.dataset.tool = tool;
    const btn = document.createElement('button');
    chip.appendChild(btn);
    document.body.appendChild(chip);
    return btn;
  }

  /* Toast'ı GERÇEK DOM'dan okuruz: 00a'nın showToast'ı mock DEĞİL —
     mock'lamak kapının kendisini kör ederdi (§10.5: ölçen alet de ölçülür).
     showToast `#toast` elementini arar ve yoksa SESSİZCE döner (00a:showToast),
     o yüzden host elementi burada kurulur; kapının ilk hâli tam bunu unuttu ve
     altı testin altısı da "toast çıkmadı" dedi — kırık koddaymış gibi. */
  function kurToastHost() {
    const el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
    return el;
  }
  function toastGorundu() {
    const el = document.getElementById('toast');
    return !!el && el.classList.contains('show') && el.classList.contains('err');
  }

  it.each(['soz', 'gecis', 'imge', 'inanc', 'engel'])(
    '%s: ritüel window\'da yokken kullanıcı bir hata görür',
    async (tool) => {
      kurToastHost();
      await aracRunTool(makeChip(tool));
      expect(toastGorundu(), `${tool}: ritüel yokken sessizce "başarılı" sayıldı`).toBe(true);
    },
  );

  /* ÇAPRAZ DENETİMİN DERSİ (Sonnet, 2026-09-05 · bulgu 2): iki adımlı bir
     araçta İLK köprü varken İKİNCİsinin eksik olduğu hâl, kapının kör
     noktasıydı — yukarıdaki it.each ikisini de silip sınadığı için ilk
     kontrol zaten `false` dönüyor ve kapı DOĞRU sonucu YANLIŞ sebeple
     veriyordu. Asıl kırık burada yaşar: chip "İnanç Kazma"yı vaat eder,
     kullanıcıyı set menüsünde bırakır ve yine "oldu" der. */
  it('inanc: skOpen VAR ama skSelectSet YOKken yarım açmaz — hata verir', async () => {
    kurToastHost();
    window.skOpen = vi.fn();
    await aracRunTool(makeChip('inanc'));
    expect(window.skOpen, 'ikinci köprü eksikken ritüel yarım açıldı').not.toHaveBeenCalled();
    expect(toastGorundu(), 'yarım açılan ritüel "başarılı" sayıldı').toBe(true);
  });

  it('ritüel YÜKLÜYSE hata toast\'ı çıkmaz', async () => {
    kurToastHost();
    window.engOpen = vi.fn();
    await aracRunTool(makeChip('engel'));
    expect(toastGorundu()).toBe(false);
  });
});
