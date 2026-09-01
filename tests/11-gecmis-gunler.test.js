/**
 * Geçmiş Günler — boş liste teşhisi (2026-08-19)
 *
 * Ekranda "Henüz özet bulunmuyor" yazarken veritabanında özet DURUYOR olabilir.
 * Üç ayrı yol aynı boşluğu üretiyordu; bu testler üçünü de mühürler:
 *   1) w3GenerateDeepSummary iki insert de patlarken ok:true diyordu (§6.2),
 *   2) w2LoadSummariesCache hata durumunda cache'i BOŞ Map'le mühürlüyordu,
 *   3) drawer listesi cache null iken hiç yüklemeden "özet yok" basıyordu.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

/* ─── Supabase stub'ı — tablo bazlı, çağrıları kaydeder ─── */
let _insertSonuc = { error: null };
let _selectSonuc = { data: [], error: null };
let _insertSayaci = 0;
let _silinen = 0;

function _zincir() {
  const z = {
    select: () => z,
    eq: () => z,
    gte: () => z,
    lt: () => z,
    in: () => z,
    not: () => z,
    limit: () => Promise.resolve(_selectSonuc),
    order: () => Promise.resolve(_selectSonuc),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    upsert: () => Promise.resolve({ error: null }),
    delete: () => { _silinen++; return z; },
    insert: () => { _insertSayaci++; return Promise.resolve(_insertSonuc); },
    then: (ok, hata) => Promise.resolve(_selectSonuc).then(ok, hata),
  };
  return z;
}

vi.mock('../js/config.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, sb: { from: () => _zincir(), auth: { getSession: () => Promise.resolve({ data: { session: { access_token: 'tk' } } }) } } };
});

/* callLLM modül mock'u bu dosyada tutmuyor (12 → 11 → 04 dairesel importu
   gerçek referansı kapıyor); LLM fetch seviyesinden kesilir — böylece gerçek
   callLLM zinciri de sınanmış olur. */
let _llmIcerik = '{}';
globalThis.fetch = vi.fn(() => Promise.resolve({
  ok: true,
  status: 200,
  headers: { get: () => null },
  json: () => Promise.resolve({ choices: [{ message: { content: _llmIcerik } }] }),
}));

import { S } from '../js/state.js';
import { SafeStorage } from '../js/parts/00a-infrastructure.js';
import { w2LoadSummariesCache, chDrawerBackToList, chDrawerOpenDay, chDrawerOpen, chDrawerViewFull } from '../js/parts/11-w2-chat-cal.js';
import { w3GenerateDeepSummary, w2CheckAndSummarizeYesterday, w3MaybeRunMigration } from '../js/parts/12-w3-journey.js';

const BUGUN = new Date();
const GUN_KEY = `${BUGUN.getFullYear()}-${BUGUN.getMonth()}-${BUGUN.getDate()}`;

/* Özet üretimine yetecek kadar konuşma — eşik: 2 kullanıcı mesajı + 100 karakter */
function _konusmaKur() {
  const iso = new Date(BUGUN.getFullYear(), BUGUN.getMonth(), BUGUN.getDate(), 12, 0, 0).toISOString();
  S.allSessions = {
    ['day_' + GUN_KEY]: [
      { role: 'user', content: 'Bugün kendimi uzun süredir olmadığım kadar açık hissettim, sanki bir kapı aralandı.', created_at: iso },
      { role: 'assistant', content: 'O aralık neye benziyordu?', created_at: iso },
      { role: 'user', content: 'Korkumun altında aslında bir merak olduğunu fark ettim ve bu beni şaşırttı.', created_at: iso },
    ],
  };
}

describe('w3GenerateDeepSummary — yazılamayan özet "üretildi" sayılmaz', () => {
  beforeEach(() => {
    S.currentUser = { id: 'u1' };
    S._w2SummariesCache = null;
    _insertSayaci = 0;
    _selectSonuc = { data: [], error: null };
    _llmIcerik = JSON.stringify({
      title: 'Aralanan Kapı', tone: 'açık', opening: 'a', theme: 'b',
      insight: 'c', pattern: 'd', next: 'e', note: 'f',
    });
    _konusmaKur();
  });

  it('her iki insert de patlarsa ok:false + reason:"db" döner', async () => {
    _insertSonuc = { error: { message: 'new row violates row-level security policy' } };
    const r = await w3GenerateDeepSummary(GUN_KEY);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('db');
    expect(_insertSayaci).toBe(2); // tam kayıt + flat fallback denendi
  });

  it('insert başarılıysa ok:true döner', async () => {
    _insertSonuc = { error: null };
    const r = await w3GenerateDeepSummary(GUN_KEY);
    expect(r.ok).toBe(true);
    expect(r.data.title).toBe('Aralanan Kapı');
  });

  it('konuşma eşiğin altındaysa reason:"insufficient" — bu bir hata değildir', async () => {
    S.allSessions = {};
    const r = await w3GenerateDeepSummary(GUN_KEY);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('insufficient');
  });
});

describe('w2LoadSummariesCache — hata boş Map ile mühürlenmez', () => {
  beforeEach(() => {
    S.currentUser = { id: 'u1' };
    S._w2SummariesCache = null;
  });

  it('sorgu hata dönerse cache null kalır (sonraki açılış yeniden dener)', async () => {
    _selectSonuc = { data: null, error: { message: 'permission denied for table chat_summaries' } };
    const map = await w2LoadSummariesCache();
    expect(map.size).toBe(0);
    expect(S._w2SummariesCache).toBe(null);
  });

  it('sorgu başarılıysa cache günlere bölünmüş olarak dolar', async () => {
    _selectSonuc = { data: [{ session_id: 'day_2026-08-18', title: 'Dün', summary: 's', created_at: '2026-08-18T20:00:00.000Z' }], error: null };
    const map = await w2LoadSummariesCache();
    expect(map.get('2026-7-18')?.[0]?.title).toBe('Dün');
    expect(S._w2SummariesCache).toBe(map);
  });
});

describe('Drawer listesi — cache boşsa yüklemeden "özet yok" demez', () => {
  beforeEach(() => {
    S.currentUser = { id: 'u1' };
    S._w2SummariesCache = null;
    document.body.innerHTML = '<div id="ch-list"></div>';
  });

  it('cache null iken önce yükler, dönen özeti listeye çizer', async () => {
    _selectSonuc = { data: [{ session_id: 'day_2026-08-18', title: 'Aralanan Kapı', summary: 'gövde', created_at: '2026-08-18T20:00:00.000Z' }], error: null };

    chDrawerBackToList();
    // İlk kare: yükleme daveti — "hiç özet yok" DEĞİL
    expect(document.getElementById('ch-list').innerHTML).not.toContain('Henüz özet bulunmuyor');

    await vi.waitFor(() => {
      expect(document.getElementById('ch-list').innerHTML).toContain('Aralanan Kapı');
    });
  });
});

describe('Gece yarısı kontrolü — mühür kalıcı sonuca vurulur, deneme sonsuz değildir', () => {
  const YKEY = (() => { const d = new Date(Date.now() - 86400000); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; })();
  const MUHUR = 'w2_lastdaysummary_check_u1';
  const SAYAC = 'w2_daysummary_try_u1_' + YKEY;

  beforeEach(() => {
    S.currentUser = { id: 'u1' };
    S._w2SummariesCache = null;
    SafeStorage.remove(MUHUR);   // bellek-içi _kvCache testler arası taşınır
    SafeStorage.remove(SAYAC);
    _selectSonuc = { data: [], error: null };
    _llmIcerik = JSON.stringify({ title: 'Dünkü Kapı', tone: 'açık', opening: 'a', theme: 'b', insight: 'c', pattern: 'd', next: 'e', note: 'f' });
    const d = new Date(Date.now() - 86400000);
    const iso = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0).toISOString();
    S.allSessions = {
      dun: [
        { role: 'user', content: 'Dün kendimi uzun süredir olmadığım kadar açık hissettim, bir kapı aralandı.', created_at: iso },
        { role: 'assistant', content: 'O aralık neye benziyordu?', created_at: iso },
        { role: 'user', content: 'Korkumun altında bir merak olduğunu fark ettim, bu beni şaşırttı.', created_at: iso },
      ],
    };
  });

  it('yazma patlarsa günü MÜHÜRLEMEZ — ertesi açılış yeniden dener', async () => {
    _insertSonuc = { error: { message: 'permission denied' } };
    await w2CheckAndSummarizeYesterday();
    expect(SafeStorage.getRaw(MUHUR)).toBeFalsy();
    expect(SafeStorage.getRaw(SAYAC)).toBe('1');
  });

  it('üçüncü başarısız denemeden sonra mühürler — kalıcı hata kotayı yemez', async () => {
    _insertSonuc = { error: { message: 'permission denied' } };
    await w2CheckAndSummarizeYesterday();
    SafeStorage.remove(MUHUR);
    await w2CheckAndSummarizeYesterday();
    SafeStorage.remove(MUHUR);
    await w2CheckAndSummarizeYesterday();
    expect(SafeStorage.getRaw(SAYAC)).toBe('3');
    expect(SafeStorage.getRaw(MUHUR)).toBe(YKEY);
  });

  it('yazma başarılıysa mühürler ve sayacı hiç açmaz', async () => {
    _insertSonuc = { error: null };
    await w2CheckAndSummarizeYesterday();
    expect(SafeStorage.getRaw(MUHUR)).toBe(YKEY);
    expect(SafeStorage.getRaw(SAYAC)).toBeFalsy();
  });
});

describe('Damga onarımı — "tamamlandı" bir beyandır, kanıt satırdır', () => {
  const MIG = 'w3_migration_done_u1';
  const MUHUR = 'w2_lastdaysummary_check_u1';
  const ONARIM = 'etw_ozet_damga_onarim_v1_u1';

  beforeEach(() => {
    S.currentUser = { id: 'u1' };
    S._w3MigrationRunning = false;
    S.allSessions = {};
    _silinen = 0;
    [MIG, MUHUR, ONARIM].forEach(k => SafeStorage.remove(k));
    // Kırık zincirin bıraktığı iki yalan damga
    SafeStorage.setRaw(MIG, '1');
    SafeStorage.setRaw(MUHUR, '2026-7-18');
  });

  it('derin özet YOKSA damgaları temizler — geçmiş yeniden özetlenebilir', async () => {
    _selectSonuc = { data: [], error: null };          // kanıt yok
    await w3MaybeRunMigration();
    expect(SafeStorage.getRaw(MIG)).toBeFalsy();
    expect(SafeStorage.getRaw(MUHUR)).toBeFalsy();
    expect(_silinen).toBeGreaterThan(0);               // Supabase damgası da düştü
    expect(SafeStorage.getRaw(ONARIM)).toBe('1');      // ömür boyu bir kez
  });

  it('derin özet VARSA damgalara dokunmaz', async () => {
    _selectSonuc = { data: [{ id: 1 }], error: null }; // kanıt var
    await w3MaybeRunMigration();
    expect(SafeStorage.getRaw(MIG)).toBe('1');
    expect(SafeStorage.getRaw(MUHUR)).toBe('2026-7-18');
    expect(_silinen).toBe(0);
  });

  it('okuma patlarsa damgaya dokunmaz ve onarım hakkını harcamaz', async () => {
    _selectSonuc = { data: null, error: { message: 'permission denied' } };
    await w3MaybeRunMigration();
    expect(SafeStorage.getRaw(MIG)).toBe('1');
    expect(SafeStorage.getRaw(ONARIM)).toBeFalsy();    // sonraki açılış yeniden dener
  });
});

/* ─── Altıncı kat: liste doldu, ama tıklama açmıyordu ───
   Liste artık gerçek günleri çiziyor; her satır `chDrawerOpenDay(key)` çağırır.
   O fonksiyon çıplak `_currentLang` okuyordu — modülde ne tanım ne import
   vardı, yani her tıklama ReferenceError ile ölüyor, panel hiç açılmıyordu
   (inline onclick hatası kullanıcıya sessiz görünür). [[yetim-kopru-denetcisi]]
   üçüncü sınıfı: çağrı değil, OKUMA. */
describe('chDrawerOpenDay — dolu liste tıklanabilir olmalı', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="ch-list-panel"></div>
      <div id="ch-detail-panel" class="hidden"><div id="ch-detail-body"></div></div>`;
    S.currentUser = { id: 'u1' };
    S._currentLang = 'tr';
    S._w2SummariesCache = new Map([[GUN_KEY, [{
      title: 'Aralanan Kapı', tone: 'açık', summary: 'Bir kapı aralandı.',
      structured_summary: null, created_at: new Date().toISOString(),
    }]]]);
  });

  it('özeti detay gövdesine yazar ve detay panelini açar', () => {
    chDrawerOpenDay(GUN_KEY);
    expect(document.getElementById('ch-detail-panel').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('ch-detail-body').innerHTML).toContain('Aralanan Kapı');
  });

  it('dil EN iken de açılır — tarih yerelleştirmesi tıklamayı öldürmez', () => {
    S._currentLang = 'en';
    chDrawerOpenDay(GUN_KEY);
    expect(document.getElementById('ch-detail-body').innerHTML).toContain('Aralanan Kapı');
  });
});

/* ─── Yedinci kat: özeti olmayan gün de bir gündür ───
   Liste yalnız `chat_summaries` map'inden çiziyordu; üretimi patlamış ya da
   hiç kapanmamış bir günün sohbeti duruyorken satırı yoktu. Kullanıcı için
   o gün YOK'a eşitti. Artık listenin birimi gündür: özetsiz satır kullanıcının
   kendi ilk cümlesiyle görünür ve kapısı sohbete açılır. */
describe('Liste birimi gündür — özetsiz gün kaybolmaz', () => {
  const DUN = new Date(Date.now() - 86400000);
  const DUN_KEY = `${DUN.getFullYear()}-${DUN.getMonth()}-${DUN.getDate()}`;
  const DUN_SID = `day_${DUN.getFullYear()}-${String(DUN.getMonth() + 1).padStart(2, '0')}-${String(DUN.getDate()).padStart(2, '0')}`;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="ch-drawer"><div id="ch-list-panel"><div id="ch-list"></div></div>
      <div id="ch-detail-panel" class="hidden"><div id="ch-detail-body"></div></div></div>
      <div id="chat-view"><div id="messages-area"></div></div>`;
    S.currentUser = { id: 'u1' };
    S._currentLang = 'tr';
    S.allSessions = {};
    S._w2SummariesCache = new Map();
  });

  it('sohbeti olan ama özeti olmayan dünkü gün listede AYNI tasarımla görünür', () => {
    S.allSessions[DUN_SID] = [
      { role: 'user', content: 'Dün akşam neden o kadar savunmacı olduğumu düşündüm.', created_at: DUN.toISOString() },
      { role: 'assistant', content: 'Ne buldun?', created_at: DUN.toISOString() },
    ];
    chDrawerOpen();
    const html = document.getElementById('ch-list').innerHTML;
    expect(html).toContain('savunmacı');                     // kullanıcının KENDİ cümlesi
    expect(html).toContain(`chDrawerOpenDay('${DUN_KEY}')`); // kapı AYNI kapı
    expect(html).not.toContain('--ozetsiz');                 // ayrı görsel dil YOK
    expect(html).not.toContain('ch-list-item-tone');         // ton bir yorumdur, yorumlayan yok
  });

  it('bugünün açık sohbeti listeye girmez — o gün henüz kapanmadı', () => {
    const bugun = new Date();
    const sid = `day_${bugun.getFullYear()}-${String(bugun.getMonth() + 1).padStart(2, '0')}-${String(bugun.getDate()).padStart(2, '0')}`;
    S.allSessions[sid] = [{ role: 'user', content: 'Bugün konuştuklarımız.', created_at: bugun.toISOString() }];
    chDrawerOpen();
    expect(document.getElementById('ch-list').innerHTML).not.toContain('ch-list-item');
  });

  it('özeti olan gün özet satırı olarak çizilir — özetsiz kopyası oluşmaz', () => {
    S._w2SummariesCache = new Map([[DUN_KEY, [{ title: 'Aralanan Kapı', tone: 'açık', summary: 'x', session_id: DUN_SID }]]]);
    S.allSessions[DUN_SID] = [{ role: 'user', content: 'bir şey', created_at: DUN.toISOString() }];
    chDrawerOpen();
    const html = document.getElementById('ch-list').innerHTML;
    expect(html).toContain('Aralanan Kapı');
    expect((html.match(/class="ch-list-item[ "]/g) || []).length).toBe(1); // tek satır, ikiz yok
  });

  it('özetsiz güne tıklayınca AYNI sayfa açılır ve özetin yokluğunu söyler', () => {
    S.allSessions[DUN_SID] = [
      { role: 'user', content: 'Yorulduğunda ne yaparsın?', created_at: DUN.toISOString() },
      { role: 'assistant', content: 'Yorulmak bedenin değil ruhun molasıdır.', created_at: DUN.toISOString() },
    ];
    chDrawerOpen();
    chDrawerOpenDay(DUN_KEY);
    const body = document.getElementById('ch-detail-body');
    expect(document.getElementById('ch-detail-panel').classList.contains('hidden')).toBe(false);
    expect(body.innerHTML).toContain('ws-ozet-page-title');     // AYNI primitifler
    expect(body.textContent).toContain('Yorulduğunda');         // başlık kullanıcının cümlesi
    expect(body.textContent).toContain('Özet Yok');
  });

  it('özetsiz günde "tam sohbeti görüntüle" o güne gider, bugüne değil', () => {
    S.allSessions[DUN_SID] = [{ role: 'user', content: 'bir şey', created_at: DUN.toISOString() }];
    S.chatHistory = [];
    chDrawerOpen();
    chDrawerOpenDay(DUN_KEY);
    chDrawerViewFull();
    expect(S.currentSessId).toBe(DUN_SID);
  });
});
