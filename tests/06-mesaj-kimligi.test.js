/**
 * FAZ 1 — Mesaj kimliği (İç Çalışma 01 · boşluk A)
 *
 * Bir mesaj üç yerde birden yaşar: S.chatHistory, S.allSessions ve DOM balonu.
 * Kimliği ancak veritabanı verir; _persistMesaj o kimliği üçüne birden
 * iliştirir. Kimlik gelmezse kayıt id'siz yaşar ve çağıran taraf eski
 * içerik-eşleşmeli yola düşer — bu testler o iki yolu da mühürler.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// insert(...).select('id').single() zincirinin gerçekten kurulduğunu
// doğrulayabilmek için çağrıları kaydeden bir sb stub'ı.
let _sonInsert = null;
let _selectCagrildi = false;
let _sonuc = { data: { id: 42 }, error: null };
let _varOlanSatirlar = [];   // _zatenYazilmis sorgusunun döneceği
let _sonUpdate = null;
let _updateSonuc = { error: null };

function _kurucu() {
  return {
    insert: (satirlar) => {
      _sonInsert = Array.isArray(satirlar) ? satirlar[0] : satirlar;
      return {
        select: (alan) => { _selectCagrildi = alan; return { single: () => Promise.resolve(_sonuc) }; },
      };
    },
    // update({decorations}).eq().eq() — deko-ledger yazımı
    update: (yama) => {
      _sonUpdate = yama;
      const z = { eq: () => z, then: (ok, hata) => Promise.resolve(_updateSonuc).then(ok, hata) };
      return z;
    },
    // from().select('id').eq()…limit() — kuyruğun çift yazma kontrolü
    select: () => {
      const zincir = { eq: () => zincir, limit: () => Promise.resolve({ data: _varOlanSatirlar, error: null }) };
      return zincir;
    },
  };
}

vi.mock('../js/config.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, sb: { from: () => _kurucu() } };
});

import { S } from '../js/state.js';
import {
  _persistMesaj, retryPersist,
  chatKuyruguBosalt, chatKuyrukInit,
  _pencereSec, _sahneTuru, dekoTanit, dekoYaz, dekoCiz, startStreamingMsg,
  _rollSumState, _rollSumPersist, _alintiCiz, _akisMaskesi,
} from '../js/parts/06-summary-chat.js';
import { SafeStorage, localISODate } from '../js/parts/00a-infrastructure.js';

describe('_persistMesaj — kimlik üç yüze birden yazılır', () => {
  let chatKaydi, sessKaydi, balon;

  beforeEach(() => {
    _sonInsert = null;
    _selectCagrildi = false;
    _sonuc = { data: { id: 42 }, error: null };
    chatKaydi = { role: 'user', content: 'Merhaba', mode: '' };
    sessKaydi = { role: 'user', content: 'Merhaba', created_at: '2026-08-18T10:00:00Z' };
    balon = document.createElement('div');
  });

  it('id dönünce chatKaydi, sessKaydi ve balon aynı kimliği taşır', async () => {
    const id = await _persistMesaj({ role: 'user', content: 'Merhaba' }, { chatKaydi, sessKaydi, balon });
    expect(id).toBe(42);
    expect(chatKaydi.id).toBe(42);
    expect(sessKaydi.id).toBe(42);
    expect(balon.dataset.msgId).toBe('42');
  });

  it("insert zinciri select('id').single() ile kurulur", async () => {
    await _persistMesaj({ role: 'user', content: 'Merhaba' }, { chatKaydi });
    expect(_selectCagrildi).toBe('id');
  });

  it('gönderilen satır olduğu gibi insert edilir', async () => {
    await _persistMesaj({ user_id: 'u1', role: 'assistant', content: 'Yanıt', mode: 'mode-soft' }, {});
    expect(_sonInsert).toEqual({ user_id: 'u1', role: 'assistant', content: 'Yanıt', mode: 'mode-soft' });
  });

  it('hata dönerse null döner ve kayıtlar kimlikle kirlenmez', async () => {
    _sonuc = { data: null, error: { message: 'RLS' } };
    const id = await _persistMesaj({ role: 'user', content: 'Merhaba' }, { chatKaydi, sessKaydi, balon });
    expect(id).toBeNull();
    expect(chatKaydi.id).toBeUndefined();
    expect(sessKaydi.id).toBeUndefined();
    expect(balon.dataset.msgId).toBeUndefined();
  });

  it('SELECT izni yoksa (data boş) sessizce id\'siz devam eder', async () => {
    _sonuc = { data: null, error: null };
    const id = await _persistMesaj({ role: 'user', content: 'Merhaba' }, { chatKaydi, balon });
    expect(id).toBeNull();
    expect(chatKaydi.id).toBeUndefined();
    expect(balon.dataset.msgId).toBeUndefined();
  });

  it('hedef verilmese de patlamaz — kimlik yine döner', async () => {
    const id = await _persistMesaj({ role: 'user', content: 'Merhaba' });
    expect(id).toBe(42);
  });
});

/* ── FAZ 2 — Dürüst kalıcılık (boşluk G) ─────────────────────────────────────
   Yazma reddedilirse mesaj ekranda kalır ama veritabanında yoktur; yenilenince
   kaybolur. Bu testler kaybın SESSİZ olmadığını mühürler. */
describe('_persistMesaj — kaydedilemeyen mesaj kendi üstünde söyler', () => {
  let balon, chatKaydi;

  function balonKur() {
    const el = document.createElement('div');
    el.className = 'message user';
    el.innerHTML = '<div class="msg-body"><div class="msg-content">Merhaba</div></div>';
    document.body.appendChild(el);
    return el;
  }

  beforeEach(() => {
    document.body.innerHTML = '';
    _sonuc = { data: { id: 7 }, error: null };
    chatKaydi = { role: 'user', content: 'Merhaba', mode: '' };
    balon = balonKur();
  });

  it('yazma reddedilince balon işaretlenir ve uyarı görünür', async () => {
    _sonuc = { data: null, error: { message: 'RLS' } };
    await _persistMesaj({ role: 'user', content: 'Merhaba' }, { chatKaydi, balon });
    expect(balon.dataset.persistFailed).toBe('1');
    const uyari = balon.querySelector('.msg-persist-warn');
    expect(uyari).not.toBeNull();
    expect(uyari.textContent).toContain('kaydedilmedi');
  });

  it('başarılı yazmada uyarı basılmaz', async () => {
    await _persistMesaj({ role: 'user', content: 'Merhaba' }, { chatKaydi, balon });
    expect(balon.dataset.persistFailed).toBeUndefined();
    expect(balon.querySelector('.msg-persist-warn')).toBeNull();
  });

  it('id gelmemesi (SELECT izni yok) uyarı SAYILMAZ — satır yazılmış olabilir', async () => {
    _sonuc = { data: null, error: null };
    await _persistMesaj({ role: 'user', content: 'Merhaba' }, { chatKaydi, balon });
    expect(balon.dataset.persistFailed).toBeUndefined();
    expect(balon.querySelector('.msg-persist-warn')).toBeNull();
  });

  it('iki kez başarısız olsa da tek uyarı durur', async () => {
    _sonuc = { data: null, error: { message: 'RLS' } };
    await _persistMesaj({ role: 'user', content: 'Merhaba' }, { chatKaydi, balon });
    await _persistMesaj({ role: 'user', content: 'Merhaba' }, { chatKaydi, balon });
    expect(balon.querySelectorAll('.msg-persist-warn').length).toBe(1);
  });

  it('retryPersist başarılı olunca işaret ve uyarı kalkar, kimlik iliştirilir', async () => {
    _sonuc = { data: null, error: { message: 'ağ' } };
    await _persistMesaj({ role: 'user', content: 'Merhaba' }, { chatKaydi, balon });
    const uyari = balon.querySelector('.msg-persist-warn');
    _sonuc = { data: { id: 99 }, error: null };
    const id = await retryPersist(uyari);
    expect(id).toBe(99);
    expect(balon.dataset.persistFailed).toBeUndefined();
    expect(balon.querySelector('.msg-persist-warn')).toBeNull();
    expect(chatKaydi.id).toBe(99);
    expect(balon.dataset.msgId).toBe('99');
  });

  it('retryPersist yine başarısızsa uyarı kalır ve buton yeniden tıklanabilir olur', async () => {
    _sonuc = { data: null, error: { message: 'ağ' } };
    await _persistMesaj({ role: 'user', content: 'Merhaba' }, { chatKaydi, balon });
    const uyari = balon.querySelector('.msg-persist-warn');
    const id = await retryPersist(uyari);
    expect(id).toBeNull();
    expect(balon.querySelector('.msg-persist-warn')).not.toBeNull();
    expect(balon.querySelector('.msg-persist-warn').disabled).toBe(false);
  });

  it('uyarı düğmesine tıklamak yeniden denemeyi tetikler', async () => {
    _sonuc = { data: null, error: { message: 'ağ' } };
    await _persistMesaj({ role: 'user', content: 'Merhaba' }, { chatKaydi, balon });
    _sonuc = { data: { id: 5 }, error: null };
    balon.querySelector('.msg-persist-warn').click();
    await new Promise(r => setTimeout(r, 0));
    expect(balon.dataset.msgId).toBe('5');
  });

  it('işaretsiz balonda retryPersist sessizce döner', async () => {
    const id = await retryPersist(balon.querySelector('.msg-content'));
    expect(id).toBeNull();
  });
});

/* ── FAZ 3 — Gönderim kuyruğu (boşluk F) ─────────────────────────────────────
   Veritabanına ulaşamayan söz cihazda bekler ve bir sonraki açılışta taşınır.
   Composer taslağı burada DEĞİL: onu 13a-arac-motoru zaten tutuyor
   (etw_draft_chat) — bu sprintte yazılan ikiz denetimde kaldırıldı. */
describe('Kuyruk — veritabanına ulaşamayan söz cihazda bekler', () => {
  const satir = { user_id: 'u-1', session_id: 's-1', role: 'user', content: 'Merhaba' };

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    S.currentUser = { id: 'u-1' };
    _varOlanSatirlar = [];
    _sonuc = { data: { id: 42 }, error: null };
  });

  it('yazma reddedilince satır kuyruğa alınır', async () => {
    _sonuc = { data: null, error: { message: 'offline' } };
    await _persistMesaj(satir, {});
    const k = JSON.parse(localStorage.getItem('wn_chat_kuyruk_u-1'));
    expect(k).toHaveLength(1);
    expect(k[0].content).toBe('Merhaba');
  });

  it('aynı satır iki kez kuyruğa girmez', async () => {
    _sonuc = { data: null, error: { message: 'offline' } };
    await _persistMesaj(satir, {});
    await _persistMesaj(satir, {});
    expect(JSON.parse(localStorage.getItem('wn_chat_kuyruk_u-1'))).toHaveLength(1);
  });

  it('başarılı yazma satırı kuyruktan düşürür', async () => {
    _sonuc = { data: null, error: { message: 'offline' } };
    await _persistMesaj(satir, {});
    _sonuc = { data: { id: 9 }, error: null };
    await _persistMesaj(satir, {});
    expect(localStorage.getItem('wn_chat_kuyruk_u-1')).toBeNull();
  });

  it('chatKuyruguBosalt bekleyeni yazar ve kuyruğu temizler', async () => {
    localStorage.setItem('wn_chat_kuyruk_u-1', JSON.stringify([satir]));
    const yazilan = await chatKuyruguBosalt();
    expect(yazilan).toBe(1);
    expect(localStorage.getItem('wn_chat_kuyruk_u-1')).toBeNull();
  });

  it('zaten yazılmış satır ikinci kez yazılmaz — çift cümle olmaz', async () => {
    localStorage.setItem('wn_chat_kuyruk_u-1', JSON.stringify([satir]));
    _varOlanSatirlar = [{ id: 3 }];   // sunucuda duruyor
    _sonInsert = null;
    const yazilan = await chatKuyruguBosalt();
    expect(yazilan).toBe(0);
    expect(_sonInsert).toBeNull();          // insert HİÇ denenmedi
    expect(localStorage.getItem('wn_chat_kuyruk_u-1')).toBeNull();
  });

  it('yazılamayan satır kuyrukta kalır — sonraki açılışta yeniden denenir', async () => {
    localStorage.setItem('wn_chat_kuyruk_u-1', JSON.stringify([satir]));
    _sonuc = { data: null, error: { message: 'hâlâ offline' } };
    const yazilan = await chatKuyruguBosalt();
    expect(yazilan).toBe(0);
    expect(JSON.parse(localStorage.getItem('wn_chat_kuyruk_u-1'))).toHaveLength(1);
  });

  it('oturum yoksa kuyruk boşaltılmaz', async () => {
    S.currentUser = null;
    localStorage.setItem('wn_chat_kuyruk_anon', JSON.stringify([satir]));
    expect(await chatKuyruguBosalt()).toBe(0);
  });
});

/* ── FAZ 5 — Token-bütçeli pencere (boşluk E) ────────────────────────────────
   Pencere mesaj saymaz, yük ölçer: 16 mesaj tek cümlelik de olabilir, on
   sayfalık dökülme de. Üst sınır 16 kalır, alt sınır 4 — prompt ne kadar
   şişerse şişsin sohbet hafızasız kalmaz. */
describe('_pencereSec — pencere yük ölçer', () => {
  const mesaj = (uzunluk, role = 'user') => ({ role, content: 'x'.repeat(uzunluk) });

  it('kısa mesajlarda üst sınır (16) uygulanır', () => {
    const gecmis = Array.from({ length: 40 }, () => mesaj(50));
    expect(_pencereSec(gecmis, 0)).toHaveLength(16);
  });

  it('uzun mesajlarda bütçe pencereyi daraltır', () => {
    const gecmis = Array.from({ length: 20 }, () => mesaj(6000));  // 20 × 6K
    const secilen = _pencereSec(gecmis, 0);
    expect(secilen.length).toBeLessThan(16);
    expect(secilen.length).toBeGreaterThanOrEqual(4);
  });

  it('system prompt uzunluğu aynı keseden harcar', () => {
    const gecmis = Array.from({ length: 16 }, () => mesaj(1200));
    const bos = _pencereSec(gecmis, 0).length;
    const sisik = _pencereSec(gecmis, 20000).length;   // prompt şişmiş
    expect(sisik).toBeLessThan(bos);
  });

  it('taban korunur — prompt bütçeyi tamamen yese bile 4 mesaj gider', () => {
    const gecmis = Array.from({ length: 10 }, () => mesaj(9000));
    expect(_pencereSec(gecmis, 999999)).toHaveLength(4);
  });

  it('en yeni mesajlar seçilir, sıra korunur', () => {
    const gecmis = [
      { role: 'user', content: 'bir' }, { role: 'assistant', content: 'iki' },
      { role: 'user', content: 'üç' },
    ];
    const secilen = _pencereSec(gecmis, 0);
    expect(secilen.map(m => m.content)).toEqual(['bir', 'iki', 'üç']);
  });

  it("role:'system' satırları elenir — rol eşlemesi bozulmasın", () => {
    const gecmis = [
      { role: 'user', content: 'a' },
      { role: 'system', content: 'odak modeli değişti' },
      { role: 'assistant', content: 'b' },
    ];
    expect(_pencereSec(gecmis, 0).map(m => m.role)).toEqual(['user', 'assistant']);
  });

  it('boş/eksik geçmişte patlamaz', () => {
    expect(_pencereSec([], 0)).toEqual([]);
    expect(_pencereSec(null, 0)).toEqual([]);
    expect(_pencereSec([{ role: 'user' }], 0)).toHaveLength(1);  // content yok
  });
});

/* ── FAZ 7 — Turun töresi (boşluk H) ─────────────────────────────────────────
   Dört tüketici sohbete bir şey indirmek ister ve hiçbiri diğerini bilmez.
   Kartın anlamı seyrekliğinden gelir: bir turda tek davet iner. */
describe('_sahneTuru — bir turda tek davet', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="messages-area"></div>';
  });

  const indir = () => document.getElementById('messages-area')
    .appendChild(document.createElement('div'));

  it('ilk inen turu kapatır — sonraki adaylar hiç çağrılmaz', () => {
    const cagrilar = [];
    const sonuc = _sahneTuru([
      { ad: 'muhur',  calistir: () => { cagrilar.push('muhur'); indir(); } },
      { ad: 'odev',   calistir: () => { cagrilar.push('odev'); indir(); } },
      { ad: 'ders',   calistir: () => { cagrilar.push('ders'); indir(); } },
    ]);
    expect(sonuc).toBe('muhur');
    expect(cagrilar).toEqual(['muhur']);
    expect(document.getElementById('messages-area').childElementCount).toBe(1);
  });

  it('koşulu tutmayan aday sırayı sonrakine bırakır', () => {
    const cagrilar = [];
    const sonuc = _sahneTuru([
      { ad: 'muhur', calistir: () => { cagrilar.push('muhur'); /* koşul yok, inmez */ } },
      { ad: 'odev',  calistir: () => { cagrilar.push('odev'); indir(); } },
      { ad: 'ders',  calistir: () => { cagrilar.push('ders'); indir(); } },
    ]);
    expect(sonuc).toBe('odev');
    expect(cagrilar).toEqual(['muhur', 'odev']);
  });

  it('hiçbiri inmezse hepsi denenir ve null döner', () => {
    const cagrilar = [];
    const sonuc = _sahneTuru([
      { ad: 'a', calistir: () => cagrilar.push('a') },
      { ad: 'b', calistir: () => cagrilar.push('b') },
    ]);
    expect(sonuc).toBeNull();
    expect(cagrilar).toEqual(['a', 'b']);
  });

  it('patlayan aday turu kırmaz — sıra sonrakine geçer', () => {
    const sonuc = _sahneTuru([
      { ad: 'kirik', calistir: () => { throw new Error('bozuk tüketici'); } },
      { ad: 'saglam', calistir: () => indir() },
    ]);
    expect(sonuc).toBe('saglam');
  });

  it('messages-area yokken patlamaz', () => {
    document.body.innerHTML = '';
    expect(() => _sahneTuru([{ ad: 'a', calistir: () => {} }])).not.toThrow();
  });

  it('bozuk aday atlanır', () => {
    const sonuc = _sahneTuru([null, { ad: 'x' }, { ad: 'iyi', calistir: () => indir() }]);
    expect(sonuc).toBe('iyi');
  });
});

/* ── FAZ 6 — Deko-ledger (boşluk C) ──────────────────────────────────────────
   Süsler canlı kancalarda doğuyor, DB'de yaşamıyordu: sayfa yenilenince
   alıntı kartı, araç çipleri, takip pilleri ve kaynakça gidiyordu. Ledger
   onları mesajın KİMLİĞİNE bağlar — Faz 1 olmadan yazılamazdı. */
describe('Deko-ledger — sohbetin izleri kalıcı', () => {
  let balon;

  beforeEach(() => {
    document.body.innerHTML = '';
    balon = document.createElement('div');
    balon.className = 'message emre';
    balon.innerHTML = '<div class="msg-body"><div class="msg-content">yanıt</div></div>';
    document.body.appendChild(balon);
    S.currentUser = { id: 'u-1' };
    _sonUpdate = null;
    _updateSonuc = { error: null };
  });

  it('kimliği olan balonun süsü kaydedilir', async () => {
    balon.dataset.msgId = '42';
    const ok = await dekoYaz(balon, 'arac', { tools: ['x'], takip: [] });
    expect(ok).toBe(true);
    expect(_sonUpdate.decorations).toEqual({ arac: { tools: ['x'], takip: [] } });
  });

  it('kimliksiz balona yazılmaz — süs kime ait olduğunu bilemez', async () => {
    const ok = await dekoYaz(balon, 'arac', { tools: [] });
    expect(ok).toBe(false);
    expect(_sonUpdate).toBeNull();
  });

  it('kolon yoksa sessizce düşer — ürün bugünkü davranışına devam eder', async () => {
    balon.dataset.msgId = '42';
    _updateSonuc = { error: { message: 'column "decorations" does not exist' } };
    expect(await dekoYaz(balon, 'arac', {})).toBe(false);
  });

  it('ikinci süs öncekini silmez — defter birikir', async () => {
    balon.dataset.msgId = '42';
    await dekoYaz(balon, 'arac', { tools: ['a'] });
    await dekoYaz(balon, 'alinti', { kitap: 'İlişki Felsefesi' });
    expect(Object.keys(_sonUpdate.decorations)).toEqual(['arac', 'alinti']);
  });

  it('replay tanıtılmış tipi çizer, tanınmayanı sessizce atlar', () => {
    const cizilenler = [];
    dekoTanit('test-tip', (b, veri) => cizilenler.push(veri));
    const cizilen = dekoCiz(balon, { 'test-tip': { a: 1 }, 'bilinmeyen': { b: 2 } });
    expect(cizilen).toBe(1);
    expect(cizilenler).toEqual([{ a: 1 }]);
  });

  it('çizici patlarsa replay durmaz', () => {
    const cizilenler = [];
    dekoTanit('kirik', () => { throw new Error('bozuk'); });
    dekoTanit('saglam', (b, v) => cizilenler.push(v));
    expect(() => dekoCiz(balon, { kirik: {}, saglam: { x: 1 } })).not.toThrow();
    expect(cizilenler).toEqual([{ x: 1 }]);
  });

  it('bozuk defterde patlamaz', () => {
    expect(dekoCiz(balon, null)).toBe(0);
    expect(dekoCiz(null, { a: 1 })).toBe(0);
  });

  it("araç tipi kutudan tanıtılmış gelir — 13a'nın çıktısı geri çizilir", () => {
    const cagrilar = [];
    window.aracAfterReply = (b, veri) => cagrilar.push(veri);
    dekoCiz(balon, { arac: { tools: [], takip: ['soru?'] } });
    delete window.aracAfterReply;
    expect(cagrilar).toEqual([{ tools: [], takip: ['soru?'] }]);
  });
});


/* ═══ Kayan özet kalıcılığı (2026-08-24) ═══
   Eskiden yalnız bellekteydi: uzun bir günün ortasında reload, modelin o
   sabahı unutması demekti — c.ai'ın "20 mesajda unutuyor" şikâyetinin bizdeki
   sessiz hâli. Anahtar sessId taşır, gün dönünce kayıt kendiliğinden düşer. */
describe('_rollSumState — kayan özet reload\'dan sağ çıkar', () => {
  const KEY = 'etw_rollsum_v1_u1';

  beforeEach(() => {
    S.currentUser = { id: 'u1' };
    S.currentSessId = 'day_2026-08-24';
    S._rollSum = null;
    SafeStorage.remove(KEY);   // bellek-içi _kvCache testler arasında taşınır
  });

  it('bellek boşken diskteki özeti aynı gün için geri yükler', () => {
    SafeStorage.set(KEY, { sessId: 'day_2026-08-24', text: 'Sabah babasını anlattı.', covered: 12 });
    S._rollSum = null;
    const rs = _rollSumState();
    expect(rs.text).toBe('Sabah babasını anlattı.');
    expect(rs.covered).toBe(12);
  });

  it('gün dönünce diskteki kayıt kullanılmaz — taze başlar', () => {
    SafeStorage.set(KEY, { sessId: 'day_2026-08-23', text: 'Dünkü özet.', covered: 9 });
    S._rollSum = null;
    const rs = _rollSumState();
    expect(rs.text).toBe('');
    expect(rs.covered).toBe(0);
    expect(rs.sessId).toBe('day_2026-08-24');
  });

  it('busy bayrağı diskten GERİ GELMEZ (yarım kalan çağrı kilit bırakmasın)', () => {
    SafeStorage.set(KEY, { sessId: 'day_2026-08-24', text: 'x', covered: 3, busy: true });
    S._rollSum = null;
    expect(_rollSumState().busy).toBe(false);
  });

  it('disk boşken bellekteki durumu bozmaz', () => {
    const ilk = _rollSumState();
    ilk.text = 'oturum içi özet';
    expect(_rollSumState().text).toBe('oturum içi özet');
  });
});

/* DENETİM 2026-08-24 — kalıcılığın kör noktası: anahtar per-uid ama TEK slot.
   Geçmiş bir gün açıkken (openSummarySession) tur koşarsa persist BUGÜNÜN
   kaydını ezerdi; kullanıcı bugüne dönünce sessId uyuşmazlığı veriyi doğru
   reddeder ama günün ilerlemesi geri getirilemez şekilde kaybolmuştur —
   yani tam da bu fazın vaadi sessizce iptal olur. */
describe('_rollSumPersist — geçmiş gün bugünü ezmez', () => {
  const KEY = 'etw_rollsum_v1_u1';
  const BUGUN = 'day_' + localISODate();

  beforeEach(() => {
    S.currentUser = { id: 'u1' };
    S._rollSum = null;
    SafeStorage.remove(KEY);
  });

  it('bugünün özeti diske yazılır', () => {
    S.currentSessId = BUGUN;
    _rollSumPersist({ sessId: BUGUN, text: 'Bugünün özeti.', covered: 8 });
    expect(SafeStorage.get(KEY, null)?.text).toBe('Bugünün özeti.');
  });

  it('geçmiş gün görünümünde yazma diskteki bugünü BOZMAZ', () => {
    S.currentSessId = BUGUN;
    _rollSumPersist({ sessId: BUGUN, text: 'Bugünün özeti.', covered: 8 });
    S.currentSessId = 'day_2026-08-14';
    _rollSumPersist({ sessId: 'day_2026-08-14', text: 'Eski günün özeti.', covered: 3 });
    const disk = SafeStorage.get(KEY, null);
    expect(disk.text).toBe('Bugünün özeti.');
    expect(disk.covered).toBe(8);
  });
});

/* FAZ 3 — alıntı süsü ledger'a düşer ve reload'da geri çizilir. Ledger'a
   REFERANS değil METİN yazılır: havuz her turda yeniden kurulduğu için
   yarın aynı [S3] bambaşka bir söze denk gelirdi. */
describe('_alintiCiz — görünür kanıt balonda kalır', () => {
  function balon() {
    const el = document.createElement('div');
    el.innerHTML = '<div class="msg-content">Yanıt metni.</div>';
    return el;
  }

  beforeEach(() => {
    window.htAlintiHTML = (list) =>
      '<div class="ht-alinti-kume">' + list.map(a => `<blockquote class="ht-alinti">${a.alinti}</blockquote>`).join('') + '</div>';
  });

  it('alıntı bloğu yanıtın ÜSTÜNE girer', () => {
    const el = balon();
    _alintiCiz(el, [{ ref: 'S1', alinti: 'Kendi cümlem.', gun: '2026-08-24' }]);
    const govde = el.querySelector('.msg-content');
    expect(govde.firstElementChild.className).toBe('ht-alinti-kume');
    expect(govde.textContent).toContain('Kendi cümlem.');
  });

  it('replay aynı balonu iki kez süslemez', () => {
    const el = balon();
    const veri = [{ ref: 'S1', alinti: 'Tek kez.', gun: '' }];
    _alintiCiz(el, veri);
    _alintiCiz(el, veri);   // dekoCiz replay yolu
    expect(el.querySelectorAll('.ht-alinti-kume')).toHaveLength(1);
  });

  it('boş liste ya da bozuk balon sessizce düşer', () => {
    expect(() => _alintiCiz(null, [{ alinti: 'x' }])).not.toThrow();
    const el = balon();
    _alintiCiz(el, []);
    expect(el.querySelector('.ht-alinti-kume')).toBeNull();
  });

  it('çizici tanıtıldı — dekoCiz "alinti" tipini tanır', () => {
    const el = balon();
    el.dataset.msgId = '7';
    const cizilen = dekoCiz(el, { alinti: [{ ref: 'S1', alinti: 'Ledgerdan geldi.', gun: '' }] });
    expect(cizilen).toBe(1);
    expect(el.textContent).toContain('Ledgerdan geldi.');
  });
});

/* DENETİM 2026-08-24 — akış sızıntısı. [MOD:] etiketi için tam bu amaçla bir
   buffer var; [S#] için yoktu: model referansı yazdığı an ham etiket ekrana
   basılıyor, ancak finalize'da (saniyeler sonra) kayboluyordu. Kullanıcı
   uygulamanın iç konuşmasını görüyordu. */
describe('_akisMaskesi — [S#] akış sırasında ekrana sızmaz', () => {
  it('tam referans gizlenir', () => {
    expect(_akisMaskesi('Bunu demiştin. [S1] Bugün ne değişti?')).not.toContain('[S1]');
    expect(_akisMaskesi('Bunu demiştin. [S1]')).toContain('Bunu demiştin.');
  });

  it('yarım gelen kuyruk ("… [S" / "… [S1") beklenir, çöp basılmaz', () => {
    expect(_akisMaskesi('Bunu demiştin. [S')).toBe('Bunu demiştin.');
    expect(_akisMaskesi('Bunu demiştin. [S1')).toBe('Bunu demiştin.');
    expect(_akisMaskesi('Bunu demiştin. [')).toBe('Bunu demiştin.');
  });

  it('köşeli parantezli normal metin bozulmaz', () => {
    expect(_akisMaskesi('Kitapta [önemli] bir yer var.')).toBe('Kitapta [önemli] bir yer var.');
    expect(_akisMaskesi('Bir liste [1] ve [2].')).toBe('Bir liste [1] ve [2].');
  });

  it('markdown link kuyruğu ("[metin](" ) korunur', () => {
    expect(_akisMaskesi('Bak [şuraya](htt')).toContain('[şuraya](htt');
  });

  it('akış canlı balonda ham etiket göstermez', () => {
    // startStreamingMsg balonu #messages-area'ya takar ve scroll hesabı yapar
    document.body.innerHTML = '<div id="messages-area"></div>';
    const sm = startStreamingMsg('');
    sm.appendChunk('Bunu daha önce de söylemiştin. ');
    sm.appendChunk('[S1]');
    const gorunen = sm.element.textContent;
    expect(gorunen).not.toContain('[S1]');
    expect(gorunen).toContain('söylemiştin');
  });

  /* FAZ 9 (13D, K5) — [MOD:x|DG:eksen#S2] normalde createModeAwareChunkHandler
     tarafından raw'a hiç ulaşmadan sıyrılır; bu YEDEK katmandır (parser'ın
     regex'i beklenmedik bir biçimle kırılırsa S3 fallback'i ham arabelleği
     olduğu gibi basar). */
  it('DG uzantılı [MOD:] etiketi (tam) maskelenir', () => {
    expect(_akisMaskesi('[MOD:soft|DG:yatistirma#S2] Merhaba')).toBe('Merhaba');
    expect(_akisMaskesi('[MOD:soft|DUYGU:yatistirma] Merhaba')).toBe('Merhaba');
  });

  it('çıplak [MOD:xxx] de (DG bloğu olmadan) maskelenir — S3 fallback\'inin kaçırdığı hâl', () => {
    expect(_akisMaskesi('[MOD:soft] Merhaba')).toBe('Merhaba');
  });

  it('yarım gelen [MOD kuyruğu ("]" gelmeden) yutulur, çöp basılmaz', () => {
    expect(_akisMaskesi('[MOD:soft|DG:yatis')).toBe('');
    expect(_akisMaskesi('[MOD')).toBe('');
  });

  it('40 karakteri aşan kapanmamış "[MOD…" gerçek içerikse SINIRDA bırakılır (aşırı yutma yok)', () => {
    const uzun = '[MOD bu aslında normal bir cümle ve köşeli parantezle başlıyor olabilir kesinlikle kapanmayacak';
    expect(_akisMaskesi(uzun)).toBe(uzun);
  });

  it('"[MODern]" gibi MOD ile başlayan ama etiket OLMAYAN kelimeler bozulmaz', () => {
    expect(_akisMaskesi('Kitapta [MODern] bir konu var.')).toBe('Kitapta [MODern] bir konu var.');
  });
});
