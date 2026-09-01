/**
 * DUYGU MOTORU — YANILMA KAPISI (13D §8, FAZ 13)
 *
 * `dgKapi(yuzey, ctx)` K10 tablosunun dört kadranını uygular: tanık sayısı,
 * tazelik yarı-ömrü, ayrışma sükûtu, ehliyet dikiş yeri (K11, FAZ 14 henüz
 * yok). Yedi yüzeyin her biri için eşik altında `null`, eşik üstünde okuma
 * beklenir — `sohbet` tek istisnadır (K6: kanıtsızsa tanıklık, ASLA null).
 *
 * Son describe bloğu kapının KENDİSİNİ sınar: 13D dışında `dgKarsilama(`
 * çağıran kalmadığını — `dgNabiz(` ÖLÇÜM çağrıları ise BİLEREK muaftır,
 * gerekçesi kendi describe'ında yazılı.
 *
 * Kırmızıya dönerlerse .claude/plans/duygu-motoru.md § FAZ 13'e bak.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { dgNabiz, dgKapi, DG_KAPI_YUZEYLER } from '../js/parts/13D-duygu-motoru.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const _oncekiDetectCrisis = window.detectCrisis;
beforeEach(() => { window.detectCrisis = () => false; });
afterEach(() => { window.detectCrisis = _oncekiDetectCrisis; });

describe('window kontratı', () => {
  it('window.dgKapi fonksiyon, DG_KAPI_YUZEYLER sekiz yüzey (FAZ 19 davet dahil)', () => {
    expect(typeof window.dgKapi).toBe('function');
    expect(DG_KAPI_YUZEYLER).toEqual(['sohbet', 'atmosfer', 'esik', 'toren', 'davet', 'secici', 'push', 'kart']);
  });

  it('tanımsız bir yüzey sessizce null döner (§5.2 — asla bloklama)', () => {
    expect(dgKapi('uydurma-yuzey', {})).toBeNull();
    expect(dgKapi()).toBeNull();
  });
});

/* Gerçek cümlelerden gerçek nabız üretmek — 13D-karsilama-tablosu.test.js
   ile aynı desen: sözlük fixture'ı elle icat etmek yerine dgNabiz'in kendi
   ölçümü kullanılır. */
const NABIZ_KIZGIN = () => dgNabiz('çok kızgınım!'); // ofke, kuvvetMutlak 4

describe('sohbet — eşiksizdir, ASLA null (K6)', () => {
  it('kanıtsız turda bile bir karar döner: tanıklık', () => {
    const r = dgKapi('sohbet', { metin: 'tamam', nabiz: null, iklim: null, akis: null });
    expect(r).not.toBeNull();
    expect(r.eksen).toBe('taniklik');
  });

  it('kanıtlı turda dgKarsilama ile AYNI kararı verir', () => {
    const nabiz = NABIZ_KIZGIN();
    const r = dgKapi('sohbet', { metin: 'çok kızgınım!', nabiz, iklim: null, akis: { yon: 'yukselen' } });
    expect(r.eksen).toBe('yatistirma'); // kural 2: kuvvet>=3 ∧ yükselen ∧ değer<=0
  });

  it('ayrışma sohbeti SUSTURMAZ (K10: "sohbette ayrışma merak sebebidir")', () => {
    const nabiz = NABIZ_KIZGIN();
    const r = dgKapi('sohbet', { metin: 'çok kızgınım!', nabiz, iklim: null, akis: { yon: 'yukselen' }, ayristi: true });
    expect(r).not.toBeNull();
    expect(r.eksen).toBe('yatistirma');
  });

  /* REGRESYON — ilk yazımda dgKapi'nin dış try/catch'i HER yüzeyde
     istisnayı null'a çeviriyordu. 'sohbet' null dönerse çağıran
     (01-prompts-modes.js:306) `karsilama.eksen` okurken TypeError'a
     çarpardı — dış try/catch'in beklediği "güvenli tanıklık" varsayılanı
     iç istisnada da korunmalı. Kanıt: window.detectCrisis'i BİLEREK
     patlat, dgKarsilama'nın kendisi bu çağrıyı sarmıyor. */
  it('dgKarsilama içeride patlarsa bile null DEĞİL, güvenli tanıklık döner', () => {
    window.detectCrisis = () => { throw new Error('kasıtlı patlama'); };
    const r = dgKapi('sohbet', { metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), iklim: null, akis: null });
    expect(r).not.toBeNull();
    expect(r.eksen).toBe('taniklik');
  });
});

/* FAZ 19: atmosferin tazeliği 'anlik' → 'dk90'. Gerekçe kodda (DG_KAPI_ESIK
   üstündeki blok): şerit sohbetin dışında yaşar ve saatlik zamanlayıcıyla
   tazelenir, yani "aynı turda çağrılır" varsayımı onun için hiç doğru
   değildi — okuma eskimiyordu, donuyordu. Damga artık ŞART (dk90 damgasız
   okumayı taze saymaz) ve bu bilinçli: damgayı geçirmeyen tüketici susar. */
describe('atmosfer — 1 tanık, dk90 tazeliği (FAZ 19)', () => {
  it('kanıt yoksa null (varsayılan sessizlik)', () => {
    expect(dgKapi('atmosfer', { nabiz: null })).toBeNull();
  });
  it('bu turun ölçümü + TAZE damga tek başına yeter', () => {
    const simdi = Date.now();
    const r = dgKapi('atmosfer', { metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), zaman: simdi, simdi });
    expect(r).not.toBeNull();
  });
  it('DAMGASIZ okuma taze SAYILMAZ — tüketici zamanı geçirmezse şerit susar', () => {
    const r = dgKapi('atmosfer', { metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN() });
    expect(r).toBeNull();
  });
  it('90 dakikadan eski ölçüm YOK OLUR (kadran 2) — şerit donmaz, zincire düşer', () => {
    const simdi = Date.now();
    const r = dgKapi('atmosfer', {
      metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(),
      zaman: simdi - 91 * 60 * 1000, simdi,
    });
    expect(r).toBeNull();
  });
  it('ayrışma UCUZ yüzeyi susturmaz — kadran 3 pahalı yüzeylere aittir (faz denetimi)', () => {
    // K10: "çelişkide PAHALI yüzey susar… sohbette ayrışma merak sebebidir".
    // Atmosfer "kendiliğinden" geri alınır — sohbetin "sonraki tur"undan bile
    // ucuz. Sohbet konuşurken en ucuz yüzeyi susturmak tutarsız olurdu.
    const simdi = Date.now();
    const r = dgKapi('atmosfer', {
      metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), zaman: simdi, simdi, ayristi: true,
    });
    expect(r).not.toBeNull();
  });
});

/* DAVET (FAZ 19) — 13o'nun sessizlik daveti. `push` ile aynı hücrede
   DEĞİLDİR: davet kullanıcı ekrandayken konuşur, bildirim o başka bir
   yerdeyken. İstenmeden geldiği için bir cevaptan çok kanıt ister (iki
   tanık), dakikalarla ölçülen bir sessizlikten doğduğu için taze olmalı
   (dk90) ve istenmeden konuşan çelişkide susar (ayrışma). Ehliyet
   ARANMAZ — hatası tek turda geri alınır. */
describe('davet — 2 tanık, dk90, ayrışma sustur, ehliyet YOK (FAZ 19)', () => {
  const simdi = Date.now();
  it('tek tanık yetmez', () => {
    expect(dgKapi('davet', { metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), zaman: simdi, simdi })).toBeNull();
  });
  it('iki ayrı turun ölçümü + taze damga → okuma', () => {
    const r = dgKapi('davet', {
      metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), oncekiNabiz: NABIZ_KIZGIN(),
      zaman: simdi, simdi,
    });
    expect(r).not.toBeNull();
    expect(r.eksen).toBeTruthy();
  });
  it('eskimiş okuma yok olur (dk90)', () => {
    const r = dgKapi('davet', {
      metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), oncekiNabiz: NABIZ_KIZGIN(),
      zaman: simdi - 91 * 60 * 1000, simdi,
    });
    expect(r).toBeNull();
  });
  it('ayrışma susturur — istenmeden konuşan, çelişkide konuşmaz', () => {
    const r = dgKapi('davet', {
      metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), oncekiNabiz: NABIZ_KIZGIN(),
      zaman: simdi, simdi, ayristi: true,
    });
    expect(r).toBeNull();
  });
  it('EHLİYET aranmaz — iklim boşken bile (secici/push ile farkı budur)', () => {
    const r = dgKapi('davet', {
      metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), oncekiNabiz: NABIZ_KIZGIN(),
      iklim: null, zaman: simdi, simdi,
    });
    expect(r).not.toBeNull();
  });
});

describe('esik — 1 tanık, GÜN tazeliği, metin yok yalnız ışık', () => {
  it('kanıt yoksa null', () => {
    expect(dgKapi('esik', { nabiz: null })).toBeNull();
  });
  it('bugünün ölçümüyle dolu okuma — ama METİN yok, yalnız sunum (faz denetimi)', () => {
    const simdi = Date.now();
    const r = dgKapi('esik', { metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), zaman: simdi, simdi });
    expect(r).not.toBeNull();
    expect(r.sunum).toBeTruthy();
    // K10 tablosu eşik satırında "metin YOK, yalnız ışık" der. Bu kısıt
    // tüketici disiplinine bırakılırsa zamanla tavsiyeye döner (§6.6) —
    // kapının kendisi indirger, gerekçe/kanıt alanları hiç görünmez.
    expect(r.metin).toBeNull();
    expect(r.gerekce).toBeUndefined();
    expect(r.kanit).toBeUndefined();
  });

  it('ayrışma eşiği susturmaz — ışık bir İDDİA taşımaz, geri alınacak şey yoktur', () => {
    const simdi = Date.now();
    const r = dgKapi('esik', { metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), zaman: simdi, simdi, ayristi: true });
    expect(r).not.toBeNull();
  });
  it('dünün ölçümü GÜN penceresini aşınca eskimez, YOK OLUR', () => {
    const simdi = Date.now();
    const dun = simdi - 26 * 60 * 60 * 1000; // 26 saat önce — kesin farklı gün
    const r = dgKapi('esik', { metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), zaman: dun, simdi });
    expect(r).toBeNull();
  });
});

describe('toren — 2 bağımsız tanık, aynı gün (doğrulama maddesi 11)', () => {
  it('tek tanıkla null', () => {
    const r = dgKapi('toren', { metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN() });
    expect(r).toBeNull();
  });
  it('iki ayrı turun ölçümüyle (ÖLÇÜM+ÖLÇÜM) dolu', () => {
    const r = dgKapi('toren', {
      metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), oncekiNabiz: NABIZ_KIZGIN(),
    });
    expect(r).not.toBeNull();
  });
  it('ÖLÇÜM+BEYAN da 2 tanıktır', () => {
    const r = dgKapi('toren', { metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), beyanKaniti: true });
    expect(r).not.toBeNull();
  });
  it('2 tanık ama DÜN ölçülmüş — aynı gün değilse null', () => {
    const simdi = Date.now();
    const dun = simdi - 26 * 60 * 60 * 1000;
    const r = dgKapi('toren', {
      metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), oncekiNabiz: NABIZ_KIZGIN(), zaman: dun, simdi,
    });
    expect(r).toBeNull();
  });
});

describe('secici — 2 tanık + ehliyet (K11, FAZ 14 dikiş yeri)', () => {
  it('2 tanık ama ehliyet YOKSA null (FAZ 14 gelene dek yapısal kapalı)', () => {
    const r = dgKapi('secici', { metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), oncekiNabiz: NABIZ_KIZGIN() });
    expect(r).toBeNull();
  });
  it('2 tanık + ehliyetVar:true → dolu (mekanizma doğru kurulu, seam sonradan açılır)', () => {
    const r = dgKapi('secici', {
      metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), oncekiNabiz: NABIZ_KIZGIN(), ehliyetVar: true,
    });
    expect(r).not.toBeNull();
  });
  it('doğrulama maddesi 13 — ayrışmada null, ehliyet olsa bile', () => {
    const r = dgKapi('secici', {
      metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), oncekiNabiz: NABIZ_KIZGIN(),
      ehliyetVar: true, ayristi: true,
    });
    expect(r).toBeNull();
  });
});

describe('push — BEYAN + ehliyet + ≤90dk tazelik (doğrulama maddesi 12)', () => {
  it('ÖLÇÜM tek başına yetmez — BEYAN şart', () => {
    const r = dgKapi('push', { metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), ehliyetVar: true });
    expect(r).toBeNull();
  });
  it('BEYAN var ama ehliyet YOKSA null (FAZ 14 dikiş yeri)', () => {
    const r = dgKapi('push', { metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), beyanKaniti: true });
    expect(r).toBeNull();
  });
  it('BEYAN + ehliyet + TAZE (10 dk önce) → dolu', () => {
    const simdi = Date.now();
    const r = dgKapi('push', {
      metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), beyanKaniti: true, ehliyetVar: true,
      zaman: simdi - 10 * 60 * 1000, simdi,
    });
    expect(r).not.toBeNull();
  });
  it('DAMGASIZ okuma taze sayılmaz — zaman yoksa push susar (faz denetimi)', () => {
    // Eskiden `zaman` eksikken "şimdi ölçülmüş" varsayılıyordu: FAZ 19'un
    // çağıranı damgayı unutursa üç saatlik bir okuma taze diye teslim
    // edilirdi — kapının tek işinin sessizce iptali. Kanıtın yokluğu
    // tazelik kanıtı değildir (§6.10).
    const r = dgKapi('push', {
      metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), beyanKaniti: true, ehliyetVar: true,
    });
    expect(r).toBeNull();
  });

  it('3 saat önce ölçülmüş okuma — eskimez, YOK OLUR', () => {
    const simdi = Date.now();
    const r = dgKapi('push', {
      metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), beyanKaniti: true, ehliyetVar: true,
      zaman: simdi - 3 * 60 * 60 * 1000, simdi,
    });
    expect(r).toBeNull();
  });
});

describe('kart — K12: metin YASAK, yalnız sunum', () => {
  it('kanıt yoksa null', () => {
    expect(dgKapi('kart', { nabiz: null })).toBeNull();
  });
  it('kanıtlı turda sunum dolar ama metin DAİMA null', () => {
    const r = dgKapi('kart', { metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN() });
    expect(r).not.toBeNull();
    expect(r.metin).toBeNull();
    expect(r.sunum).toBeTruthy();
  });
  it('ayrışma kartta da durak işaretidir — susar', () => {
    const r = dgKapi('kart', { metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), ayristi: true });
    expect(r).toBeNull();
  });
});

/* ─── Kapının kendisi — 13D dışında ikinci bir giriş kalmamalı ─── */

/** js/ altındaki her .js dosyasını (13D-duygu-motoru.js hariç) tarar. */
function _jsDosyalari(dizin, sonuc = []) {
  for (const ad of readdirSync(dizin, { withFileTypes: true })) {
    const yol = join(dizin, ad.name);
    if (ad.isDirectory()) _jsDosyalari(yol, sonuc);
    else if (ad.name.endsWith('.js') && ad.name !== '13D-duygu-motoru.js') sonuc.push(yol);
  }
  return sonuc;
}

describe('kapı — 13D dışında dgKarsilama( çağıran kalmamış olmalı', () => {
  it('grep: hiçbir dosya dgKarsilama( çağırmıyor', () => {
    const ihlaller = [];
    for (const dosya of _jsDosyalari(join(ROOT, 'js'))) {
      const icerik = readFileSync(dosya, 'utf8');
      if (/dgKarsilama\(/.test(icerik)) ihlaller.push(dosya);
    }
    expect(ihlaller).toEqual([]);
  });

  /* dgNabiz( ÖLÇÜM sınıfının KAYNAĞIDIR — kapı KAYNAKLA YÜZEY arasında
     durur, kaynağın kendisini yasaklamaz (plan FAZ 13 keşfi). Bu üç
     çağıran nabzı ÜRETİR (00-config-tracking `trackEmotionalFlow`,
     09a P2 delegasyonu + bir sonraki mesajın nabzı) — dgKapi'nin
     tükettiği S._dgNabiz'i BESLEYEN yerdir, tüketen değil. Set sabit
     tutulur: yeni bir dgNabiz( çağıranı burada bilerek fark edilsin diye. */
  it('dgNabiz( yalnız bilinen üç ÖLÇÜM kaynağında — muafiyet listesi sabit', () => {
    const MUAF = new Set([
      join(ROOT, 'js/parts/00-config-tracking.js'),
      join(ROOT, 'js/parts/09a-personalization-engine.js'),
    ]);
    const bulunanlar = new Set();
    for (const dosya of _jsDosyalari(join(ROOT, 'js'))) {
      const icerik = readFileSync(dosya, 'utf8');
      if (/dgNabiz\(/.test(icerik)) bulunanlar.add(dosya);
    }
    expect(bulunanlar).toEqual(MUAF);
  });
});

/* ─── KADRAN 1-2'nin OTURUM SINIRI (inceleme turu, 2026-08-30) ───
   `newSession()` (03-auth-shell) yeni günde oturum-ömürlü duygu alanlarını
   sıfırlar ve gerekçesini kendi yorumunda yazar: *"taşınırsa dünün son üç
   kararı bugünün penceresine girer — yani yeni gün, dünün gölgesiyle
   karşılanır."* FAZ 17 kapının ilk iki kadranını besleyen İKİ alan daha
   doğurdu (`_dgOncekiNabiz`, `_dgNabizZaman`) ama sıfırlama listesine
   eklenmediler. Sonuç ölçülebilir: yeni günün İLK mesajında `oncekiNabiz`
   hâlâ DÜNKÜ turun ölçümüdür, tanık sayısı 2'ye çıkar ve K10'un "2 bağımsız
   tanık, **aynı gün**" şartını taşıyan `toren` yüzeyi (Günün Sözü / Akşam
   Töreni) dünün gölgesiyle konuşur.
   Kapı statiktir çünkü ölçtüğü şey de statiktir: dört alan BİRLİKTE
   sıfırlanır. Yeni bir kadran alanı doğduğunda bu liste büyür. */
describe('kadran 1-2 — oturum sınırı: nabız alanları BİRLİKTE sıfırlanır', () => {
  const OTURUM_OMURLU = ['_dgNabiz', '_dgYay', '_dgSonKarsilama', '_dgOncekiNabiz', '_dgNabizZaman'];

  it('newSession() oturum-ömürlü duygu alanlarının HEPSİNİ sıfırlar', () => {
    const src = readFileSync(join(ROOT, 'js/parts/03-auth-shell.js'), 'utf8');
    const bas = src.indexOf('export async function newSession()');
    expect(bas).toBeGreaterThan(-1);
    const govde = src.slice(bas, src.indexOf('switchView(\'chat\')', bas));
    const eksik = OTURUM_OMURLU.filter(alan => !new RegExp(`S\\.${alan}\\s*=`).test(govde));
    expect(eksik).toEqual([]);
  });
});
