// 10B Sohbet Köprüsü — saf-mantık testleri
// (Eski "İlham Kartı" sınıfı 2026-06-21'de 10A Geçiş Kartım omurgasına gömüldü.
//  Burada yalnız sohbet→Atölye köprüsü için korunan üç yardımcı ve
//  anonim rumuz üretimi test edilir.)
import { describe, it, expect, beforeEach, vi } from 'vitest';
// Yan-etki: [KART] etiketinin regex/parse'ı artık 13a'nın registry'sinde
// (İç Çalışma 09 · K5) ve 10B'ye 13a1'in saf yaprak çözücüleri
// köprüsüyle gelir (10B-ilham-karti.js'in döngü gerekçesine bkz.) —
// bu import olmadan window köprüsü kurulmaz, _extractKartTag hep null döner.
import {
  _excerptForDisplay, _chatContextForSeed, _messageSuggestsPerson,
  _extractKartTag, _onEmreMessageFinalized, ilhamRumuz,
} from '../js/parts/10B-ilham-karti.js';
import { S } from '../js/state.js';

beforeEach(() => {
  if (typeof globalThis.requestAnimationFrame !== 'function') {
    globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  }
  document.body.innerHTML = '';
  S._ilhamRumuz    = null;
  S.currentUser    = { id: 'test-user-id-12345' };
  S.chatHistory    = [];
});

describe('_excerptForDisplay', () => {
  it('kısa cümleyi olduğu gibi döner', () => {
    expect(_excerptForDisplay('Bir kişi var ki, hiç kızmaz.')).toBe('Bir kişi var ki, hiç kızmaz.');
  });

  it('uzun cümleyi 280 karakter sınırında biter', () => {
    const long = 'a'.repeat(500);
    expect(_excerptForDisplay(long).length).toBeLessThanOrEqual(280);
  });

  it('birden çok cümleli mesajdan ilk anlamlı parçayı çıkarır', () => {
    const t = 'Birinci kısa cümle. İkincisi de var burada ve daha uzun bir tane geliyor şu an. Üçüncüsü uzar gider.';
    const out = _excerptForDisplay(t);
    expect(out.startsWith('Birinci kısa cümle')).toBe(true);
    expect(out.length).toBeGreaterThanOrEqual(60);
  });

  it('boş/null güvenli', () => {
    expect(_excerptForDisplay('')).toBe('');
    expect(_excerptForDisplay(null)).toBe('');
  });
});

describe('_chatContextForSeed', () => {
  it('boş geçmişte sessiz — kanıtı olmayan bağlam üretmez', () => {
    expect(_chatContextForSeed()).toBe('');
    S.chatHistory = [{ role: 'assistant', content: 'Wanderer konuştu.' }];
    expect(_chatContextForSeed()).toBe('');
  });

  it('yalnız kullanıcının SON 2 mesajını alır (asistan sözleri girmez)', () => {
    S.chatHistory = [
      { role: 'user',      content: 'Birinci' },
      { role: 'assistant', content: 'Wanderer cevabı' },
      { role: 'user',      content: 'İkinci' },
      { role: 'assistant', content: 'Başka cevap' },
      { role: 'user',      content: 'Üçüncü' },
    ];
    const out = _chatContextForSeed();
    expect(out).toBe('İkinci\n---\nÜçüncü');
    expect(out).not.toContain('Wanderer');
    expect(out).not.toContain('Birinci');
  });

  it('uzun mesajı maxLen sınırında keser', () => {
    S.chatHistory = [{ role: 'user', content: 'a'.repeat(3000) }];
    expect(_chatContextForSeed(900).length).toBeLessThanOrEqual(900);
  });

  it('bozuk geçmişte patlamaz', () => {
    S.chatHistory = null;
    expect(_chatContextForSeed()).toBe('');
    S.chatHistory = [{ role: 'user' }, { role: 'user', content: '   ' }];
    expect(_chatContextForSeed()).toBe('');
  });
});

describe('_messageSuggestsPerson', () => {
  it('kişi/karakter/oluş tarif eden mesajda true', () => {
    expect(_messageSuggestsPerson('Hiç kızmadan dinleyen bir kişi düşün.')).toBe(true);
    expect(_messageSuggestsPerson('Böyle bir insan olmak istersen...')).toBe(true);
    expect(_messageSuggestsPerson('O kişi senin içinde zaten var.')).toBe(true);
    expect(_messageSuggestsPerson('Affedebilen biri olmak bir seçimdir.')).toBe(true);
  });

  it('alakasız mesajda false', () => {
    expect(_messageSuggestsPerson('Bugün hava çok güzel, dışarı çık.')).toBe(false);
    expect(_messageSuggestsPerson('Su içmeyi unutma.')).toBe(false);
  });

  it('2.0 sıkılaştırma: TEK zayıf ipucu chip düşürmez', () => {
    // 'olmak' tek başına — eski listede chip düşerdi, artık düşmez
    expect(_messageSuggestsPerson('Olmak istediğin şeye odaklanmalısın bugün.')).toBe(false);
    // 'kişi' tek başına, sıradan bahis
    expect(_messageSuggestsPerson('Bu kişi hakkında ne hissettiğini yaz.')).toBe(false);
  });

  it('boş/null güvenli', () => {
    expect(_messageSuggestsPerson('')).toBe(false);
    expect(_messageSuggestsPerson(null)).toBe(false);
  });

  it('TR büyük/küçük harf duyarsız (locale)', () => {
    expect(_messageSuggestsPerson('BÖYLE BİR KİŞİ OL')).toBe(true);
  });
});

describe('_extractKartTag — [KART] protokol etiketi', () => {
  it('mesaj sonundaki etiketi tohum olarak çıkarır', () => {
    const out = _extractKartTag(
      'Öfke geldiğinde durabilen biri var içinde.\n[KART: öfkesine ara verip nefes alan sabırlı kişi]');
    expect(out).not.toBeNull();
    expect(out.seed).toBe('öfkesine ara verip nefes alan sabırlı kişi');
    expect(out.tag).toContain('[KART:');
  });

  it('etiket yoksa null', () => {
    expect(_extractKartTag('Sadece normal bir Emre mesajı.')).toBeNull();
    expect(_extractKartTag('')).toBeNull();
    expect(_extractKartTag(null)).toBeNull();
  });

  it('çok kısa tohumu reddeder, boşlukları normalize eder', () => {
    expect(_extractKartTag('x [KART: ab] y')).toBeNull();
    const out = _extractKartTag('[KART:   sabırla   dinleyen   kişi  ]');
    expect(out.seed).toBe('sabırla dinleyen kişi');
  });
});

/* SESSİZ OCAK — davet, ancak demir tuttuysa gelir (Emre'nin kararı 2026-08-02).
   Bu blok tam olarak Keynote'taki kırığı mühürler: tasarım kurulamamışken
   kullanıcıya bir davet (ve arkasından sahte bir kart) gösterilmesi. */
describe('_onEmreMessageFinalized — sessiz ocak', () => {
  /* Gerçek bir Wanderer cevabı uzunluğunda — ekrandaki alıntının kısaldığı,
     modele giden metnin ise kısalmadığı ancak burada görülür. */
  const KISI_MESAJI =
    'O döndüğünde karşısında görmek istediğin kişi kim? Şimdi o kişi olmaya başla. ' +
    'Böyle bir kişi olmak bir seçimdir; bugün tek bir seçim yap. ' +
    'Bir sporcu maça hazırlanırken "acaba gelir mi" diye beklemez. Her gün antrenman ' +
    'yapar, çünkü maç geldiğinde hazır olmak ister. Sen de öyle. Küçük bir egzersiz: ' +
    'onunla ilgili kaygılı bir düşünce geldiğinde, o düşünceyi fark et ve kendine şunu ' +
    'söyle: "Ben hazırlanan kişiyim, kaygılanan değil."';

  const DOLU_TASARIM = {
    golden: {
      baslik: 'Kaygıyla Bekleyen', whisper: 'Bu kalıbı tanıyorsun.',
      dusunceler: ['Ya dönmezse'], inanclar: ['Bekleyiş benim işim'],
      duygular: ['Tedirginlik'], davranislar: ['Telefona bakıyorum'],
    },
    lapis: { baslik: 'Hazırlanan Kişi', whisper: '', dusunceler: ['Ben hazırlanırım'], inanclar: [], duygular: [], davranislar: [] },
  };

  function mkEmreMsg(text) {
    const el = document.createElement('div');
    el.className = 'message emre';
    el.innerHTML = '<div class="msg-row"><div class="msg-body">' +
      '<div class="msg-content">' + text + '</div></div></div>';
    document.body.appendChild(el);
    return el;
  }
  // _armCardFrame async: await zinciri + rAF'in dönmesini bekle
  const settle = () => new Promise(r => setTimeout(r, 0));
  /* Seans sayacı (IK_DESIGN_MAX_PER_SESSION) modül seviyesindedir ve
     testler arasında taşınır — BAŞARISIZ deneme de sayılır, çünkü kota
     gerçekten harcanmıştır. Her testin kendi seansı olsun diye modül
     tazelenir. */
  async function tazeOcak() {
    vi.resetModules();
    return (await import('../js/parts/10B-ilham-karti.js'))._onEmreMessageFinalized;
  }

  beforeEach(() => {
    delete window.gkDesignForChat;
    delete window.gkOnboard;
  });

  it('tasarım tutmazsa HİÇBİR davet doğmaz', async () => {
    window.gkDesignForChat = async () => null;      // ocak soğuk
    const finalize = await tazeOcak();
    const el = mkEmreMsg(KISI_MESAJI);
    finalize(el, KISI_MESAJI);
    await settle();
    expect(el.querySelector('.ik-kart')).toBeNull();
    expect(el.querySelector('.ik-kart-sigil')).toBeNull();
  });

  it('tasarım tutarsa mesajın arkasında çerçeve + sigil belirir', async () => {
    window.gkDesignForChat = async () => DOLU_TASARIM;
    const finalize = await tazeOcak();
    const el = mkEmreMsg(KISI_MESAJI);
    finalize(el, KISI_MESAJI);
    await settle();
    const body = el.querySelector('.msg-body');
    expect(body.classList.contains('ik-kart')).toBe(true);
    expect(body.querySelector('.ik-kart-sigil')).not.toBeNull();
    // Çerçeve mesajın KENDİSİNİ düğmeye çevirmez (ekran okuyucu metni kaybetmesin)
    expect(body.getAttribute('role')).toBeNull();
  });

  it('sigile dokunmak Atölye\'yi HAZIR tasarımla açar (ağ beklenmez)', async () => {
    window.gkDesignForChat = async () => DOLU_TASARIM;
    let cagri = null;
    window.gkOnboard = (ihtiyac, opts) => { cagri = { ihtiyac, opts }; };
    const finalize = await tazeOcak();
    const el = mkEmreMsg(KISI_MESAJI);
    finalize(el, KISI_MESAJI);
    await settle();
    el.querySelector('.ik-kart-sigil').click();
    expect(cagri).not.toBeNull();
    expect(cagri.opts.source).toBe('sohbet');
    expect(cagri.opts.preDesigned).toEqual(DOLU_TASARIM);
    // Modele mesajın TAMAMI gitmiş olmalı — ekrandaki alıntı kısadır
    expect(cagri.opts.fullText).toBe(KISI_MESAJI);
    expect(cagri.ihtiyac.length).toBeLessThan(KISI_MESAJI.length);
  });

  it('kullanıcı metni seçmişken kart açılmaz (alıntı kopyalanıyor olabilir)', async () => {
    window.gkDesignForChat = async () => DOLU_TASARIM;
    let acildi = false;
    window.gkOnboard = () => { acildi = true; };
    const finalize = await tazeOcak();
    const el = mkEmreMsg(KISI_MESAJI);
    finalize(el, KISI_MESAJI);
    await settle();
    const origGetSelection = window.getSelection;
    window.getSelection = () => ({ isCollapsed: false });
    try {
      el.querySelector('.msg-content').click();
      expect(acildi).toBe(false);
    } finally { window.getSelection = origGetSelection; }
  });

  it('kişi tarif etmeyen mesajda ocak hiç yanmaz (kota harcanmaz)', async () => {
    let cagrildi = false;
    window.gkDesignForChat = async () => { cagrildi = true; return DOLU_TASARIM; };
    const duz = 'Bugün hava çok güzel, dışarı çıkıp biraz yürümeyi dene. Su içmeyi de unutma sakın.';
    const finalize = await tazeOcak();
    const el = mkEmreMsg(duz);
    finalize(el, duz);
    await settle();
    expect(cagrildi).toBe(false);
    expect(el.querySelector('.ik-kart-sigil')).toBeNull();
  });

  it('seans başına en çok 2 ocak yanar — başarısız deneme de sayılır', async () => {
    let deneme = 0;
    window.gkDesignForChat = async () => { deneme++; return null; };  // hep soğuk
    const finalize = await tazeOcak();
    for (let i = 0; i < 5; i++) {
      finalize(mkEmreMsg(KISI_MESAJI), KISI_MESAJI);
      await settle();
    }
    expect(deneme).toBe(2);
  });
});

describe('ilhamRumuz', () => {
  it('aynı kullanıcı için sabit rumuz üretir', () => {
    S._ilhamRumuz = null;
    S.currentUser = { id: 'sabit-id-1' };
    const r1 = ilhamRumuz();
    S._ilhamRumuz = null;
    const r2 = ilhamRumuz();
    expect(r1.name).toBe(r2.name);
    expect(r1.color).toBe(r2.color);
    expect(r1.name).toMatch(/^GEZGİN_/);
  });

  it('farklı kullanıcılar farklı rumuz alır', () => {
    S._ilhamRumuz = null; S.currentUser = { id: 'user-a' };
    const a = ilhamRumuz();
    S._ilhamRumuz = null; S.currentUser = { id: 'user-b' };
    const b = ilhamRumuz();
    expect(a.name).not.toBe(b.name);
  });

  // ── SQL PARİTE KİLİDİ (mig 025 wanderer_rumuz) ─────────────────────
  // Sunucu artık rumuzu BEFORE INSERT trigger'ında aynı FNV-1a ile türetir.
  // Bu fikstürler migration'daki plpgsql çıktısıyla bire bir (node ile
  // 2026-07-02'de doğrulandı — SETUP-GECIS-KARTIM.md §2). JS tarafı
  // değişirse bu test kırılır → SQL de birlikte değişmeli.
  it('SQL parite fikstürleri — uuid girdileri sabit rumuz/renk üretir', () => {
    const fixtures = [
      { id: '00000000-0000-0000-0000-000000000000', name: 'GEZGİN_1GSN', color: '#F0D9A8' },
      { id: 'a1b2c3d4-e5f6-4a3b-8c9d-0e1f2a3b4c5d', name: 'GEZGİN_II36', color: '#7FA6E4' },
      { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', name: 'GEZGİN_PCX1', color: '#5A8AD8' },
    ];
    for (const f of fixtures) {
      S._ilhamRumuz = null;
      S.currentUser = { id: f.id };
      const r = ilhamRumuz();
      expect(r.name).toBe(f.name);
      expect(r.color).toBe(f.color);
    }
  });
});
