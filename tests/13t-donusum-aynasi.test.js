// Dönüşüm Aynası (13t) — 90 günlük Geçiş Belgeseli saf-fonksiyon testleri
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S } from '../js/state.js';
import { localISODate } from '../js/parts/00a-infrastructure.js';
import {
  gbInit,
  gbAccountAgeDays,
  gbShouldShow,
  gbDaysUntilReady,
  gbCompose,
  gbOpen,
  gbPaylasimKarti,
} from '../js/parts/13t-donusum-aynasi.js';

describe('Dönüşüm Aynası — 90 günlük tören', () => {
  beforeEach(() => {
    // SafeStorage testler arası paylaşılan önbellek kullanır — benzersiz uid.
    S.currentUser = { id: 'test-uid-gb-' + Date.now() + '-' + Math.random(), created_at: null };
    S._gecisAyna = undefined;
    S._portre = undefined;
    gbInit();
  });

  it('gbAccountAgeDays() hiçbir veri yoksa 0 döner', () => {
    expect(gbAccountAgeDays()).toBe(0);
  });

  it('gbAccountAgeDays() created_at\'ten doğru gün sayar', () => {
    S.currentUser.created_at = new Date(Date.now() - 100 * 86400000).toISOString();
    expect(gbAccountAgeDays()).toBe(100);
  });

  it('gbAccountAgeDays() created_at yoksa Portre ilk versiyonuna düşer', () => {
    S._portre = { history: [{ at: new Date(Date.now() - 95 * 86400000).toISOString() }] };
    expect(gbAccountAgeDays()).toBe(95);
  });

  it('gbShouldShow() 90 günden az hesapta false döner', () => {
    S.currentUser.created_at = new Date(Date.now() - 10 * 86400000).toISOString();
    expect(gbShouldShow()).toBe(false);
  });

  it('gbShouldShow() 90+ gün ve hiç gösterilmemişse true döner', () => {
    S.currentUser.created_at = new Date(Date.now() - 95 * 86400000).toISOString();
    expect(gbShouldShow()).toBe(true);
  });

  it('gbShouldShow() son gösterimden 90 gün geçmemişse false döner', () => {
    S.currentUser.created_at = new Date(Date.now() - 200 * 86400000).toISOString();
    S._gecisAyna.lastShownAt = localISODate(new Date(Date.now() - 5 * 86400000));
    expect(gbShouldShow()).toBe(false);
  });

  it('gbDaysUntilReady() 90 günden geriye doğru sayar', () => {
    S.currentUser.created_at = new Date(Date.now() - 30 * 86400000).toISOString();
    expect(gbDaysUntilReady()).toBe(60);
  });

  it('gbDaysUntilReady() 90 günü aşınca 0\'da kalır (negatif olmaz)', () => {
    S.currentUser.created_at = new Date(Date.now() - 150 * 86400000).toISOString();
    expect(gbDaysUntilReady()).toBe(0);
  });

  it('gbCompose() Portre yokken boş ama crash etmeyen bir obje döner', async () => {
    const data = await gbCompose();
    expect(data.firstBaslik).toBe('');
    expect(data.currentBaslik).toBe('');
    expect(data.mesafe).toEqual([]);
    expect(data.soz).toBeNull();
  });

  it('gbCompose() Portre history\'sinden ilk↔güncel başlığı ayırır', async () => {
    S._portre = {
      baslik: 'Güncel Kişi',
      version: 3,
      history: [{ baslik: 'İlk Kişi', at: new Date().toISOString() }],
    };
    const data = await gbCompose();
    expect(data.firstBaslik).toBe('İlk Kişi');
    expect(data.currentBaslik).toBe('Güncel Kişi');
    expect(data.version).toBe(3);
  });

  it('gbCompose() window.imVirtueNow/omGetTopPatterns yoksa crash etmez', async () => {
    await expect(gbCompose()).resolves.toBeTruthy();
  });

  it('gbCompose() ölçü getter\'ları yoksa da crash etmez — hepsi boşa düşer', async () => {
    const data = await gbCompose();
    expect(data.sonen).toEqual([]);
    expect(data.kartlar).toEqual([]);
    expect(data.profil).toBeNull();
    expect(data.temeller).toBeNull();
  });

  it('gbCompose() omGetTopPatterns\'i ARTIK ÇAĞIRMAZ — o metin LLM talimatıdır', async () => {
    // Regresyon kapısı: 09d'nin çıktısı ("yeri gelirse kutla", "teşhis: …")
    // prompt'a yazılmıştır; bir UI ona bakamaz (09d:887). Aynaya giren her
    // satır kullanıcıya YAZILMIŞ olmalıdır.
    window.omGetTopPatterns = vi.fn(() => '• SÖNEN ÖRÜNTÜ (ilerleme — yeri gelirse kutla): X');
    const data = await gbCompose();
    expect(window.omGetTopPatterns).not.toHaveBeenCalled();
    expect(JSON.stringify(data)).not.toContain('yeri gelirse kutla');
    delete window.omGetTopPatterns;
  });

  it('gbOpen() 90 gün dolmadan portal AÇMAZ — ayna iki uç ister', async () => {
    // Kapı YAŞ kapısıdır: yeni hesap belgeseli açamaz, davet görür.
    document.body.innerHTML = '';
    S.currentUser.created_at = new Date(Date.now() - 10 * 86400000).toISOString();
    await gbOpen();
    expect(document.getElementById('gb-portal')).toBeNull();
    document.body.innerHTML = '';
  });

  it('gbOpen() belgeseli GÖRDÜKTEN SONRA da açılır — kapı gösterim değil yaştır', async () => {
    // gbShouldShow() bir kez görüldükten sonra false döner; kapıyı onunla
    // kursaydık kullanıcı kendi belgeselini ikinci kez açamazdı.
    document.body.innerHTML = '';
    S.currentUser.created_at = new Date(Date.now() - 200 * 86400000).toISOString();
    S._gecisAyna.lastShownAt = localISODate();
    expect(gbShouldShow()).toBe(false);
    await gbOpen();
    expect(document.getElementById('gb-portal')).not.toBeNull();
    document.body.innerHTML = '';
  });

  it('gbOpen() DOM\'a portal ekler ve lastShownAt\'i günceller', async () => {
    document.body.innerHTML = '';
    S.currentUser.created_at = new Date(Date.now() - 95 * 86400000).toISOString();
    await gbOpen();
    expect(document.getElementById('gb-portal')).not.toBeNull();
    expect(S._gecisAyna.lastShownAt).toBe(localISODate());
    document.body.innerHTML = '';
  });

  it('gbOpen() zaten açık bir portal varsa ikincisini eklemez', async () => {
    document.body.innerHTML = '';
    S.currentUser.created_at = new Date(Date.now() - 95 * 86400000).toISOString();
    await gbOpen();
    await gbOpen();
    expect(document.querySelectorAll('#gb-portal').length).toBe(1);
    document.body.innerHTML = '';
  });

  it('gbOpen() kapat butonu portalı DOM\'dan kaldırır', async () => {
    document.body.innerHTML = '';
    S.currentUser.created_at = new Date(Date.now() - 95 * 86400000).toISOString();
    await gbOpen();
    document.getElementById('gb-close').click();
    expect(document.getElementById('gb-portal')).toBeNull();
    document.body.innerHTML = '';
  });

  it('gbOpen() gbInit() hiç çağrılmamışsa (S._gecisAyna undefined) crash etmez', async () => {
    // gbInit() asenkron post-auth zincirinde çalışır; kullanıcı Studio odasına
    // init tamamlanmadan tıklarsa bu durum gerçekleşir (preview'da yakalandı).
    document.body.innerHTML = '';
    S.currentUser.created_at = new Date(Date.now() - 95 * 86400000).toISOString();
    S._gecisAyna = undefined;
    await expect(gbOpen()).resolves.toBeUndefined();
    expect(document.getElementById('gb-portal')).not.toBeNull();
    document.body.innerHTML = '';
  });
});

/* ═══════════════════════════════════════════════════════════
   BELGESEL 2.0 — sekiz bölüm, her biri kanıt kapılı
   ───────────────────────────────────────────────────────────
   Merkez kural: ölçüsü olmayan bölüm ÇİZİLMEZ (§6.10). Boş kullanıcıda
   belgesel bir tablo değil, bir davettir.
═══════════════════════════════════════════════════════════ */
describe('Belgesel 2.0 — kanıt kapıları', () => {
  const OLGUN = () => { S.currentUser.created_at = new Date(Date.now() - 200 * 86400000).toISOString(); };
  const temizle = () => {
    for (const k of ['msIzSeri', 'sdOranKiyas', 'omCozulmusArsiv', 'kkKazanimAylik',
                     'p1TemporalYapisal', 'rvTanikSon', 'rvTanikVaktiGeldi', 'rvTanikKaydet',
                     'onbTemelKiyas', 'moodPencereKiyas', 'kirilmaUclari', 'imVirtueNow']) {
      delete window[k];
    }
  };

  beforeEach(() => { document.body.innerHTML = ''; temizle(); OLGUN(); });

  it('hiç kanıt yokken tek bir sayı BASMAZ — davet gösterir', async () => {
    await gbOpen();
    const metin = document.getElementById('gb-portal').textContent;
    expect(metin).toContain('yürümeye devam');
    expect(metin).not.toMatch(/%\s*0|\bNaN\b/);
    // Bölüm başlıkları hiç çizilmemeli
    expect(metin).not.toContain('SÖZÜN SINANDI');
    expect(metin).not.toContain('ARTIK SENDE OLMAYANLAR');
  });

  it('tek noktalı seri EĞRİ DEĞİLDİR — sparkline çizilmez', async () => {
    window.msIzSeri = () => [{ gun: '2026-08-21', pct: 42, tur: 'gun' }];
    await gbOpen();
    expect(document.querySelector('.gb-spark')).toBeNull();
  });

  it('iki noktadan itibaren eğri çizilir ve iki ucu söyler', async () => {
    window.msIzSeri = () => [
      { gun: '2026-03-02', pct: 18, tur: 'hafta' },
      { gun: '2026-06-01', pct: 35, tur: 'hafta' },
      { gun: '2026-08-21', pct: 61, tur: 'gun' },
    ];
    await gbOpen();
    expect(document.querySelector('.gb-spark')).not.toBeNull();
    const metin = document.getElementById('gb-portal').textContent;
    expect(metin).toContain('%18');
    expect(metin).toContain('%61');
  });

  it('eğri İNİŞİ de çizer — çizgi yorum yapmaz, gösterir', async () => {
    window.msIzSeri = () => [
      { gun: '2026-06-01', pct: 70, tur: 'hafta' },
      { gun: '2026-08-21', pct: 44, tur: 'gun' },
    ];
    await gbOpen();
    const poly = document.querySelector('.gb-spark polyline');
    expect(poly).not.toBeNull();
    const [ilk, son] = poly.getAttribute('points').split(' ').map(pt => Number(pt.split(',')[1]));
    expect(son).toBeGreaterThan(ilk);        // SVG'de y büyür = aşağı iner
  });

  it('söz kıyası kanıtsızsa bölüm yok; kanıtlıysa iki satır', async () => {
    window.sdOranKiyas = () => null;
    await gbOpen();
    expect(document.getElementById('gb-portal').textContent).not.toContain('SÖZÜN SINANDI');
    document.body.innerHTML = '';

    window.sdOranKiyas = () => ({
      ilk: { ay: '2026-03', verilen: 8, tutulan: 2, oran: 0.25 },
      son: { ay: '2026-08', verilen: 8, tutulan: 6, oran: 0.75 },
    });
    await gbOpen();
    const metin = document.getElementById('gb-portal').textContent;
    expect(metin).toContain('SÖZÜN SINANDI');
    expect(metin).toContain('8 sözden 2');
    expect(metin).toContain('8 sözden 6');
  });

  it('sönen örüntüler arşivi listelenir (yalnız bu hafta değil)', async () => {
    window.omCozulmusArsiv = () => [
      { kok: 'kacis', baslik: 'Kaçış', hafta_sayisi: 2, sondu_wk: '2026-W33' },
      { kok: 'erteleme', baslik: 'Erteleme', hafta_sayisi: 5, sondu_wk: '2026-W12' },
    ];
    await gbOpen();
    const metin = document.getElementById('gb-portal').textContent;
    expect(metin).toContain('ARTIK SENDE OLMAYANLAR');
    expect(metin).toContain('Kaçış');
    expect(metin).toContain('Erteleme');
    expect(metin).toContain('5 hafta');
  });

  it('kart kazanımı toplamı insan diliyle söylenir', async () => {
    window.kkKazanimAylik = () => [
      { ay: '2026-05', n: 2, kartlar: ['a', 'b'] },
      { ay: '2026-07', n: 1, kartlar: ['c'] },
    ];
    await gbOpen();
    expect(document.getElementById('gb-portal').textContent).toContain('3 kişi oldun');
  });

  it('alıntılar kullanıcının KENDİ cümleleridir — model üretmez', async () => {
    window.kirilmaUclari = async () => ({
      ilk: { metin: 'hep erteliyorum', tarih: '2026-02-10T00:00:00Z' },
      son: { metin: 'bugün oturdum ve yaptım', tarih: '2026-08-01T00:00:00Z' },
    });
    await gbOpen();
    const metin = document.getElementById('gb-portal').textContent;
    expect(metin).toContain('hep erteliyorum');
    expect(metin).toContain('bugün oturdum ve yaptım');
  });

  it('prompt metni HİÇBİR bölümde görünmez (13t sızıntısının kapısı)', async () => {
    window.omGetTopPatterns = () => '• SÖNEN ÖRÜNTÜ (ilerleme — yeri gelirse kutla): X';
    window.omCozulmusArsiv = () => [{ kok: 'x', baslik: 'X', hafta_sayisi: 3, sondu_wk: '2026-W20' }];
    await gbOpen();
    const metin = document.getElementById('gb-portal').textContent;
    expect(metin).not.toMatch(/yeri gelirse kutla|teşhis:|yol: konusma|HAFTADIR/);
    delete window.omGetTopPatterns;
  });
});

describe('Belgesel 2.0 — tanıklık: hükmü kullanıcı verir', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    S.currentUser.created_at = new Date(Date.now() - 200 * 86400000).toISOString();
    delete window.rvTanikSon;
  });

  it('vakti geldiyse soru sorulur, üç kapı çizilir', async () => {
    window.rvTanikVaktiGeldi = () => true;
    await gbOpen();
    const btns = document.querySelectorAll('.gb-witness-btn');
    expect(btns.length).toBe(3);
    expect([...btns].map(b => b.dataset.durum)).toEqual(['yol', 'yerinde', 'degil']);
  });

  it('beyan tek dokunuşla deftere düşer ve soru YERİNE teşekkür kalır', async () => {
    window.rvTanikVaktiGeldi = () => true;
    const yazilan = [];
    window.rvTanikKaydet = (durum, t0) => { yazilan.push({ durum, t0 }); return { durum }; };
    await gbOpen();
    document.querySelector('.gb-witness-btn[data-durum="degil"]').click();
    expect(yazilan[0].durum).toBe('degil');
    expect(document.querySelector('.gb-witness-btn')).toBeNull();
    const metin = document.getElementById('gb-portal').textContent;
    expect(metin).toContain('Yazıldı');
    // Cevaplanmış SORU da gider: ekranda kalırsa kullanıcı yeniden
    // cevaplaması gerektiğini sanır (canlı denemede yakalandı).
    expect(metin).not.toContain('Bugün neresinde?');
  });

  it('vakti gelmediyse soru sorulmaz — geçen mevsimin sözü hatırlatılır', async () => {
    window.rvTanikVaktiGeldi = () => false;
    window.rvTanikSon = () => ({ durum: 'yol', created_at: '2026-06-01T00:00:00Z' });
    await gbOpen();
    expect(document.querySelector('.gb-witness-btn')).toBeNull();
    expect(document.getElementById('gb-portal').textContent).toContain('Geçen mevsim');
  });

  it('hiç beyan yoksa ve vakti de gelmediyse bölüm HİÇ çizilmez', async () => {
    window.rvTanikVaktiGeldi = () => false;
    await gbOpen();
    expect(document.getElementById('gb-portal').textContent).not.toContain('TANIKLIĞIN');
  });
});

/* ═══════════════════════════════════════════════════════════
   BELGESEL 2.0 — PAYLAŞIM ÇIKIŞI (K8)
   ───────────────────────────────────────────────────────────
   İki kural sınanır: (1) kart ancak sayılabilir bir kanıt varken doğar —
   gün sayısı tek başına bir takvimdir, dönüşüm değil; (2) belgeselin içi
   dışarı çıkmaz — kullanıcının kendi cümleleri ve tanıklık beyanı karta
   girmez.
═══════════════════════════════════════════════════════════ */
describe('Belgesel 2.0 — paylaşım çıkışı', () => {
  const OLGUN = () => { S.currentUser.created_at = new Date(Date.now() - 200 * 86400000).toISOString(); };
  const temizle = () => {
    for (const k of ['msIzSeri', 'sdOranKiyas', 'omCozulmusArsiv', 'kkKazanimAylik',
                     'p1TemporalYapisal', 'rvTanikSon', 'rvTanikVaktiGeldi', 'rvTanikKaydet',
                     'onbTemelKiyas', 'moodPencereKiyas', 'kirilmaUclari', 'shrShareStory']) {
      delete window[k];
    }
  };
  const KISI = () => { window.kkKazanimAylik = () => [{ ay: '2026-06', n: 2 }, { ay: '2026-07', n: 3 }]; };
  const SOZ = () => {
    window.sdOranKiyas = () => ({
      ilk: { ay: '2026-03', verilen: 4, tutulan: 1, oran: 0.25 },
      son: { ay: '2026-08', verilen: 9, tutulan: 7, oran: 0.78 },
    });
  };

  beforeEach(() => { document.body.innerHTML = ''; temizle(); OLGUN(); });

  it('kanıt yokken buton ÇİZİLMEZ — doksan gün bir takvimdir, dönüşüm değil', async () => {
    await gbOpen();
    expect(document.getElementById('gb-share')).toBeNull();
    expect(gbPaylasimKarti({ ageDays: 200 })).toBeNull();
  });

  it('kişi kanıtı varsa kart doğar: gün BÜYÜK sayı, kişi alt satır', async () => {
    KISI();
    await gbOpen();
    expect(document.getElementById('gb-share')).not.toBeNull();
    const d = await gbCompose();
    const kart = gbPaylasimKarti(d);
    expect(kart.big).toBe(200);
    expect(kart.sub).toContain('5 kişi');
    expect(kart.note).toBe('');
  });

  it('söz kanıtı TEK BAŞINA da yeter — kişi yokken kart yine doğar', async () => {
    SOZ();
    await gbOpen();
    expect(document.getElementById('gb-share')).not.toBeNull();
    const kart = gbPaylasimKarti(await gbCompose());
    expect(kart.sub).toBe('');
    expect(kart.note).toContain('9 sözden 7 tutuldu');
  });

  it('butona basınca 13g tek girişi çağrılır ve payload sözleşmeye uyar', async () => {
    KISI(); SOZ();
    const cagri = [];
    window.shrShareStory = (p) => { cagri.push(p); return true; };
    await gbOpen();
    document.getElementById('gb-share').click();
    expect(cagri.length).toBe(1);
    const p = cagri[0];
    expect(p.big).toBe(200);
    expect(p.bigLabel).toBeTruthy();
    expect(p.title).toBeTruthy();
    expect(p.tier).toBe(4);
    expect(p.accent).toBe('gold');
    // Sayı basılan her alan gerçek bir ölçüden gelir — NaN/undefined sızmaz.
    expect(JSON.stringify(p)).not.toMatch(/NaN|undefined/);
  });

  it('alıntı ve tanıklık karta GİRMEZ — belgeselin içi bu odada kalır (K8)', async () => {
    KISI();
    window.kirilmaUclari = () => ({
      ilk: { metin: 'GİZLİ CÜMLEM BİR', at: '2026-03-01T00:00:00Z' },
      son: { metin: 'GİZLİ CÜMLEM İKİ', at: '2026-08-01T00:00:00Z' },
    });
    window.rvTanikSon = () => ({ durum: 'degil', created_at: '2026-06-01T00:00:00Z' });
    const kart = gbPaylasimKarti(await gbCompose());
    const hepsi = JSON.stringify(kart);
    expect(hepsi).not.toContain('GİZLİ CÜMLEM');
    expect(hepsi).not.toContain('degil');
  });

  it('13g yüklü değilse buton sessizce düşer — belgesel kapanmaz', async () => {
    KISI();
    await gbOpen();
    expect(() => document.getElementById('gb-share').click()).not.toThrow();
    expect(document.getElementById('gb-portal')).not.toBeNull();
  });
});
