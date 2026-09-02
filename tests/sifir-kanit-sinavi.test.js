/**
 * SIFIR KANIT SINAVI — gerçeklik mimarisinin DAVRANIŞSAL kapısı.
 *
 * FELSEFE (Emre):
 *   "Mesele Sensin" bir veri kuralı doğurur: uygulama senin hakkında bir şey
 *   söylüyorsa kaynağı SEN olmak zorundasın. Hiç konuşmamış bir kullanıcı
 *   hakkında söylenecek hiçbir şey yoktur — o hâlde uygulamanın yüzeyleri
 *   o an SESSİZ kalmalıdır. Bir sayı ya da bir teşhis düşüyorsa, uydurmadır.
 *
 * NEDEN STATİK DENETÇİ YETMEZ (scripts/gerceklik-denetci.mjs):
 *   O denetçi AVLAR — bilinen desenleri (`?? 50`, ternary, `guven >=`) bir
 *   SÖZCÜK LİSTESİYLE arar. Körlüğü biçimden değil listeden gelir: listede
 *   olmayan her kavram adı ona yeni bir kör nokta açar. Bu sınav yazılırken
 *   kanıtı çıktı — `alliance_strength: 50` ve `optimal_challenge_level: 0.5`
 *   aylardır state'te duruyordu, ikisi de kullanıcı hakkında ölçülmemiş bir
 *   iddiaydı, ikisi de dört kuralın hiçbirine görünmüyordu.
 *
 *   Bu sınav avlamaz, ZORUNLU KILAR: envanteri koddan türetir (yeni modül
 *   otomatik denetlenir) ve ÇIKTIYA bakar. Kavramın adı ne olursa olsun,
 *   kanıtsız bir değer yüzeye çıktığı an kırmızı yanar.
 *
 * Kapsam (Emre'nin kararı, 2026-08-02): prompt + UI yüzeyleri.
 * Ayrıntı: .claude/plans/koken-kor-noktalar.md
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PARTS = join(ROOT, 'js/parts');

/* ════════════════════════════════════════════════════════════════════
   BLOK 1 — STATE: kanıtsız sayısal varsayılan yok
   Denetçinin K2'si aynı soruyu SÖZCÜK listesiyle sorar (`score|skor|guven`);
   burada soru alan adına değil DEĞERE sorulur, o yüzden `alliance_strength`
   ve `optimal_challenge_level` gibi listede olmayan adlar da yakalanır.
════════════════════════════════════════════════════════════════════ */

/** Sıfır olmayan sayısal varsayılanlar meşru olabilir — ama yalnız
 *  GEREKÇEYLE. Gerekçesiz muafiyet, denetçide olduğu gibi burada da ihlaldir. */
const STATE_MUAF = {
  'settings.monthly_price': 'ürün fiyatı — kullanıcı hakkında bir ölçüm değil, bir ayar',
  'settings.free_message_limit': 'kota tavanı — ürünün kuralı, kullanıcının ölçüsü değil',
  '_yasayanPortre.v': 'şema sürümü — verinin biçim numarası, kullanıcıya dair bir iddia değil',
  '_portre.version': 'şema sürümü — aynı gerekçe',
};

function sayisalVarsayilanlar(obj, yol = '', out = []) {
  for (const [k, v] of Object.entries(obj || {})) {
    const p = yol ? `${yol}.${k}` : k;
    if (typeof v === 'number' && v !== 0) out.push({ yol: p, deger: v });
    else if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Set) && !(v instanceof Map)) {
      sayisalVarsayilanlar(v, p, out);
    }
  }
  return out;
}

describe('Sıfır Kanıt Sınavı — state kanıtsız sayı taşımaz', () => {
  it('sıfır olmayan her sayısal varsayılan gerekçeli muafiyete bağlı', async () => {
    const { S } = await import('../js/state.js');
    const kacaklar = sayisalVarsayilanlar(S).filter(x => !STATE_MUAF[x.yol]);
    expect(
      kacaklar.map(x => `${x.yol} = ${x.deger}`),
      'Ölçülmemiş sayısal varsayılan (null yap ya da STATE_MUAF\'a gerekçe yaz):'
    ).toEqual([]);
  });

  it('muafiyetlerin hepsi gerekçelidir', () => {
    const gerekcesiz = Object.entries(STATE_MUAF).filter(([, g]) => !g || g.trim().length < 8);
    expect(gerekcesiz.map(([k]) => k), 'Gerekçesiz muafiyet de ihlaldir:').toEqual([]);
  });
});

/* ════════════════════════════════════════════════════════════════════
   BLOK 2 — PROMPT: boş kullanıcıda yüzeyler susar
   Envanter koddan türetilir; elle yazılan bir liste, eklenmesi unutulan
   modülü hiç görmez ve "bilinmeyen bilinmeyen" tam orada yaşar.
════════════════════════════════════════════════════════════════════ */

const YUZEY_RE = /export\s+(?:async\s+)?function\s+(\w*(?:Context|Ozet)\w*)\s*\(/g;

function envanter() {
  const out = [];
  for (const ad of readdirSync(PARTS)) {
    if (!ad.endsWith('.js')) continue;
    // Liste alındıktan SONRA dosya silinmiş olabilir (paralel koşu) — envanter
    // o dosyayı yok saymalı, sınavı çökertmemeli.
    let icerik;
    try { icerik = readFileSync(join(PARTS, ad), 'utf8'); } catch (e) { if (e && e.code === 'ENOENT') continue; throw e; }
    for (const m of icerik.matchAll(YUZEY_RE)) {
      if (m[1].startsWith('_')) continue;   // `_` önekli = private, dış yüzey değil
      out.push({ dosya: ad, fn: m[1] });
    }
  }
  return out;
}

/** Boş kullanıcıda KONUŞMASI meşru olan yüzeyler — her biri gerekçeli.
 *  Ölçütü şudur: çıktı kullanıcı HAKKINDA bir iddia mı, yoksa modele
 *  verilen sabit bir talimat/öğreti mi? İkincisi her zaman basılabilir;
 *  birincisi kanıt ister. Bu liste bir GOLDEN'dır: yeni bir yüzey boş
 *  kullanıcıda konuşmaya başlarsa test kırılır ve karar yeniden verilir. */
const PROMPT_MUAF = {
  buildDepthModeContext: 'sabit öğreti metni (dört derinlik kavramı) — kullanıcıya dair veri taşımıyor; aktif hedef kanıtsızsa zaten null döner',
  buildContextPrompt: 'bağlam iskeleti + protokol sürümü — içindeki bölümler kendi kapılarından geçer',
  getContextualNotificationBody: 'nötr davet ("Bugün de buradayım") — seri iddiası yalnız kanıtla basılır',
  getHomeworkContext: 'yokluğu BEYAN eden metin ("hiçbir ödev verilmedi") — iddia değil, yokluğun kendisi',
  dfGetPersonTransitionContext: 'boş başlıklı iskelet — kişi/hedef alanları kanıtsızken boş kalır',
  dfGetPhilosophyLayersContext: 'kitaptan sabit alıntı katmanları (sayfa numarası dahil) — kullanıcı ölçümü değil',
  isikGetContext: 'nişan kataloğu (sabit id + fısıltı listesi) — kullanıcının yazdığı nişanlar ayrı alanda ve boşken "—" gelir',
};

describe('Sıfır Kanıt Sınavı — boş kullanıcı sessizdir', () => {
  let sonuc;

  beforeAll(async () => {
    const { S } = await import('../js/state.js');
    // Hiçbir seed YOK: state varsayılan hâliyle sınanır — uygulamayı ilk kez
    // açan kullanıcının tam olarak gördüğü durum.
    S.currentUser = null;

    sonuc = { konusan: [], patlayan: [] };
    for (const { dosya, fn } of envanter()) {
      let mod;
      try { mod = await import(join(PARTS, dosya)); } catch (_) { continue; }
      const f = mod[fn];
      if (typeof f !== 'function') continue;
      let cikti;
      try {
        cikti = f('');            // metin bekleyene boş metin; beklemeyen yok sayar
      } catch (e) {
        sonuc.patlayan.push(`${dosya} · ${fn}() → ${e?.message}`);
        continue;
      }
      if (cikti && typeof cikti.then === 'function') continue;   // async yüzey: kapsam dışı
      if (typeof cikti !== 'string' || !cikti.trim()) continue;  // sessiz → beklenen
      if (PROMPT_MUAF[fn]) continue;
      sonuc.konusan.push(`${dosya} · ${fn}() → ${cikti.trim().slice(0, 120).replace(/\n/g, ' ⏎ ')}`);
    }
  });

  it('koddan en az 40 prompt yüzeyi türetir', () => {
    // Sayı düşerse envanter regex'i kırılmıştır ve sınav sessizce boşa döner.
    expect(envanter().length).toBeGreaterThanOrEqual(40);
  });

  it('kanıtı olmayan kullanıcıda hiçbir yüzey konuşmaz', () => {
    expect(
      sonuc.konusan,
      'Boş kullanıcıda çıktı üreten yüzey — kullanıcıya dair bir iddiaysa kapı tak, sabit talimatsa PROMPT_MUAF\'a gerekçe yaz:'
    ).toEqual([]);
  });

  it('hiçbir yüzey boş kullanıcıda patlamaz', () => {
    expect(sonuc.patlayan, 'Boş kullanıcıda hata veren yüzeyler:').toEqual([]);
  });

  it('muafiyetlerin hepsi gerekçelidir', () => {
    const gerekcesiz = Object.entries(PROMPT_MUAF).filter(([, g]) => !g || g.trim().length < 8);
    expect(gerekcesiz.map(([k]) => k)).toEqual([]);
  });

  /* Muafiyet kör bir geçiş olmamalı: gerekçesi ne diyorsa o sınanır.
     `getContextualNotificationBody` boş kullanıcıda konuşur — ama söylediği
     şey nötr bir davet olmak zorunda. Eskiden "Seri kırıldı. Bugün başla."
     diyordu: hiç başlamamış bir seri kırılamaz, üstelik kaynağı ölü bir DOM
     id'siydi (`streak-val`) ve değer HER ZAMAN 0'a düşüyordu — yani bu
     bildirim, kullanıcının serisi kaç olursa olsun onu suçluyordu. */
  it('boş kullanıcıya olmamış bir olayı atfetmez (seri "kırılmadı")', async () => {
    const { S } = await import('../js/state.js');
    S.currentUser = null;
    const { getContextualNotificationBody } = await import('../js/parts/09-reports-tracks.js');
    const body = getContextualNotificationBody();
    expect(body).toBeTruthy();
    expect(body).not.toMatch(/kırıl|broken/i);
  });
});

/* ════════════════════════════════════════════════════════════════════
   BLOK 3 — UI: kanıtsız kullanıcıda kart yakınlığı yok
   Emre'nin dikiş turunda ELLE yaptığı ölçümün kalıcı hâli (2026-08-01):
   "sıfır kullanıcıda 112 kartın hepsinde hazirlik = 0" (o günün 112 kartlık
   destesinde; kesit 08-07'de 12'ye indi). O ölçüm bir kez
   yapılıp bir yorum satırına yazılmıştı; burada her koşuda yeniden yapılır.
   10q sc()'nin KOKEN-MUAF gerekçesi artık bir iddia değil, koşan bir test.
════════════════════════════════════════════════════════════════════ */

describe('Sıfır Kanıt Sınavı — UI: kanıtsız kullanıcıda kart yakınlığı yok', () => {
  let deste, kkMatchCard;

  beforeAll(async () => {
    const { S } = await import('../js/state.js');
    S.currentUser = null;
    ({ kkMatchCard } = await import('../js/parts/10q-w2-kisi-karti.js'));
    const d = await import('../js/parts/12b-kart-destesi.js');
    await d.deckReady();
    deste = d.getFullDeck();
  }, 30000);

  it('deste gerçekten yüklendi (yoksa bu blok hiçbir şey kanıtlamaz)', () => {
    expect(deste.length).toBe(12);
  });

  it('hiçbir kartta hazırlık üretmez', () => {
    const sifirDisi = deste
      .map(k => ({ ad: k.title || k.id, h: kkMatchCard(k, {}).hazirlik }))
      .filter(x => x.h > 0);
    expect(sifirDisi, `boş kullanıcıda ${sifirDisi.length} kartta hazırlık > 0`).toEqual([]);
  });

  it('hiçbir kartı kazanılmış saymaz', () => {
    const kazanilan = deste.filter(k => kkMatchCard(k, {}).earned);
    expect(kazanilan.map(k => k.title || k.id)).toEqual([]);
  });
});

/* ════════════════════════════════════════════════════════════════════
   BLOK 4 — SEÇİCİ (09i, Tanıma Motoru): kanıtsız/boş kullanıcıda aday
   listesi hiç doğmaz. Seçici 09e/09f/... gibi bir "yüzey" değil — konuşan
   bir prompt/UI bloğu üretmez, SIRALAR. Sınav burada "sessiz kalır mı"
   değil "hiç aday üretir mi" sorusunu sorar: kanıtsız girdi kokenOlc
   kapısından geçemez, secAday null döner, secSirala boş liste verir.
════════════════════════════════════════════════════════════════════ */

describe('Sıfır Kanıt Sınavı — SEÇİCİ: kanıtsız kullanıcıda aday listesi boş', () => {
  it('hiç sinyali olmayan aday (girdiler={}) hiç doğmaz', async () => {
    const { secAday } = await import('../js/parts/09i-secici.js');
    expect(secAday('kart', 'herhangi-bir-kart', {})).toBeNull();
  });

  it('kanıtsız adaylardan kurulu bir liste secSirala\'dan BOŞ çıkar', async () => {
    const { secAday, secSirala } = await import('../js/parts/09i-secici.js');
    const adaylar = ['a', 'b', 'c'].map((id) => secAday('kart', id, {})); // hiçbiri n taşımıyor
    expect(secSirala(adaylar)).toEqual([]);
  });

  it('boş/undefined girişte secSirala BOŞ liste döner', async () => {
    const { secSirala } = await import('../js/parts/09i-secici.js');
    expect(secSirala([])).toEqual([]);
    expect(secSirala(undefined)).toEqual([]);
  });
});
