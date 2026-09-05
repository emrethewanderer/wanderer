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

/* showToast mock'lanır: "araç çalıştırılamadı" ARTIK bir sözleşmedir
   (FAZ 10 · _ac) — köprü yokken sessizce başarı raporlanmadığını ancak
   kullanıcıya bir şey söylendiğini görerek kanıtlayabiliriz. */
vi.mock('../js/parts/00a-infrastructure.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, showToast: vi.fn() };
});

vi.mock('../js/parts/07-settings-knowledge.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, saveNoteDirect: vi.fn() };
});

import { S } from '../js/state.js';
import { aracExtract, aracRunTool, aracDismiss, takipAsk, aracAfterReply } from '../js/parts/13a-arac-motoru.js';
import { showToast } from '../js/parts/00a-infrastructure.js';
import { cleanHistoryText } from '../js/parts/00-config-tracking.js';
import { saveNoteDirect } from '../js/parts/07-settings-knowledge.js';

beforeEach(() => {
  saveNoteDirect.mockReset();
  showToast.mockReset();
  document.body.innerHTML = '';
  delete window.glGiveSozNow;
  delete window.oikOpenReading;
  ['gorOpen', 'gorDayWindow', 'usGetTodayVision', 'yolOpenSabir', 'ayOpen',
   'ypGetHipotezler', 'wtLogArac'].forEach(k => { delete window[k]; });
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
   FAZ 10 — HAZIRLIK KAPISI ve DÜRÜST BAŞARISIZLIK

   İki sözleşme sınanır ve ikisi de aynı cümleden doğar: bir chip VAATTİR.
     1. `hazir()` false ise chip HİÇ çizilmez — odası boş kapıya davet
        edilmez (§1.1 kart değil kaldıraç).
     2. Köprü yüklü değilse `run` başarı RAPORLAMAZ — kullanıcı bir şey
        olmasını bekleyip hiçbir şey olmamasıyla baş başa bırakılmaz (§6.2).
   İkincisi bu turdan ÖNCE kırıktı: `window.glGiveSozNow?.(); return true;`
   köprü yokken sessizce `true` dönüyordu. Aşağıdaki "köprü yokken" testi
   dün KIRMIZI olurdu — bir kapının değerini gösteren tek ölçü budur.
═══════════════════════════════════════════════════════════════════════ */
describe('FAZ 10 — hazırlık kapısı: odası boş olan kapı çizilmez', () => {
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

  it('ayna: aday hipotez varsa çizilir, yoksa ÇİZİLMEZ', () => {
    window.ypGetHipotezler = () => [{ durum: 'aday' }];
    expect(ciz('ayna')).not.toBeNull();
    window.ypGetHipotezler = () => [{ durum: 'soruldu' }];
    expect(ciz('ayna')).toBeNull();
  });

  it('ayna: köprü hiç yüklenmemişse ÇİZİLMEZ (doğrulanamayan oda açılmaz)', () => {
    expect(ciz('ayna')).toBeNull();
  });

  /* Bu testin yokluğu gerçek bir kırık sakladı (kendi diff okumasında
     bulundu): `gordun`'un ilk `hazir`'i `(window.gorDayWindow?.() || {})
     .source !== 'empty'` yazıyordu ve 10E yüklü değilken `undefined !==
     'empty'` DOĞRU dönüyordu — kapı, tam olarak engellemek için var olduğu
     şeyi geçiriyordu. `ayna`nın aynı hâli tesadüfen doğruydu; simetri
     sınanmadığı için görünmedi. Sınav, sınadığını sınamalıdır. */
  it('gordun: köprü hiç yüklenmemişse ÇİZİLMEZ (ayna ile simetrik)', () => {
    expect(ciz('gordun')).toBeNull();
  });

  it('hazir() throw ederse chip ÇİZİLMEZ (sessiz düşüş, §5.2)', () => {
    window.ypGetHipotezler = () => { throw new Error('portre yüklenmedi'); };
    expect(ciz('ayna')).toBeNull();
  });

  it('sabir: ön koşulu YOK — hiçbir köprü yokken bile çizilir', () => {
    expect(ciz('sabir')).not.toBeNull();
  });

  it('eski dört araç hazir() taşımaz — davranışları değişmedi', () => {
    ['soz', 'gecis', 'imge'].forEach(tool => {
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

describe('FAZ 10 — üç yeni araç kendi törenini açar, yeni motor kurmaz', () => {
  function chip(tool) {
    const el = document.createElement('div');
    el.className = 'arac-chip';
    el.dataset.tool = tool;
    const btn = document.createElement('button');
    el.appendChild(btn);
    document.body.appendChild(el);
    return btn;
  }

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

  it('ayna → window.ayOpen', async () => {
    const spy = vi.fn();
    window.ayOpen = spy;
    window.ypGetHipotezler = () => [{ durum: 'aday' }];
    await aracRunTool(chip('ayna'));
    expect(spy).toHaveBeenCalled();
  });

  it('BAYAT CHIP: çizildikten sonra oda boşaldıysa tören AÇILMAZ', async () => {
    const spy = vi.fn();
    window.gorOpen = spy;
    // Chip çizilirken hazırdı; kullanıcı başka bir sekmede bugünkü bakışı yaptı.
    window.gorDayWindow = () => ({ source: 'oik' });
    window.usGetTodayVision = () => ({ text: 'başka sekmede yapıldı' });
    await aracRunTool(chip('gordun'));
    expect(spy).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalled();          // sessizce yutulmadı
  });

  it('KÖPRÜ YOKKEN başarı raporlanmaz — dün bu test KIRMIZI olurdu (§6.2)', async () => {
    delete window.glGiveSozNow;                    // modül yüklenmemiş
    await aracRunTool(chip('soz'));
    expect(showToast).toHaveBeenCalled();
  });

  it('onay yine de sayılır — nabız bayat chip\'te de "onayla" yazar', async () => {
    const nabiz = vi.fn();
    window.wtLogArac = nabiz;
    window.ypGetHipotezler = () => [];             // aday yok → hazır değil
    await aracRunTool(chip('ayna'));
    expect(nabiz).toHaveBeenCalledWith('onayla', { arac: 'ayna' });
  });
});
