/**
 * KRİZ EVAL KOŞUCUSU — Emniyet Katmanı'nın sınav kâğıdını okur
 * (plan: .claude/plans/ic-calisma-kalan-fazlar.md, FAZ 1 — K1)
 *
 * Emniyet Nabzı kartı (13q-gozlemevi) kaçırma oranını ÖLÇEMEZ; bu koşucu
 * kartın hiç göremediği yeri ölçer — `tests/fixtures/kriz-korpus.mjs`'teki
 * her satırı gerçek dedektöre (`js/parts/13-extras.js`) karşı çalıştırır.
 * Motor mock'LANMAZ: `dp`/`dpAll` gerçek sözlükten (16c-i18n-detect-dict.js)
 * okur — emsal `tests/10F-on-suzgec.test.js`'in aynı motoru mock'suz
 * kullanma kalıbı (Supabase/Chart.js dışı hiçbir şey mock'lanmıyor, bu
 * dosyada da mock YOK).
 *
 * Bu eval kartın YERİNE geçmez, kartın göremediğini ölçer: Emniyet Nabzı
 * huninin içini sayar (sinyal → kart → lütuf), bu koşucu huninin DIŞINI
 * sınar (hiç sinyal doğmayan cümle).
 *
 * Sözleşme:
 *   kaçırma      = beklenen:'kriz'    satırda detectCrisis false
 *                  (DENETİM DÜZELTMESİ, FAZ 1 turu: ilk hâl "ikisi de false"
 *                  diyordu — yani yalnız detectCrisisSoft'un yakaladığı bir
 *                  cümle "kaçırılmamış" sayılıyordu. Oysa soft sinyal kriz
 *                  KARTINI açmaz, yalnız sessiz LLM teyidine gider
 *                  (13-extras `_confirmCrisisWithLLM`). Sert bir cümle
 *                  soft'a düşmüşse kullanıcı 112'yi GÖRMEZ — ölçtüğümüz şey
 *                  tam olarak budur. Soft'la yetinen bir eşik, kaçırmayı
 *                  kaçırırdı. Yumuşak sinyalin kendi kovası zaten var.)
 *   yanlış-alarm = beklenen:'temiz'   satırda detectCrisis true
 *   yumuşak      = beklenen:'yumusak' satırda detectCrisis false VE
 *                  detectCrisisSoft true (ikisi birden şart)
 *   Eşik: kaçırma 0 · yanlış-alarm 0 · yumuşak ihlali 0.
 *
 * Hata mesajları korpus METNİNİ basmaz (korpus cümleleri hassastır) —
 * yalnız `dil` + `not` + kısaltılmış bir `ipucu` taşır (bkz. `_kisalt`).
 */
import { describe, it, expect } from 'vitest';
import { detectCrisis, detectCrisisSoft, krizMetniNormalize } from '../js/parts/13-extras.js';
import { DETECT_I18N } from '../js/parts/16c-i18n-detect-dict.js';
import {
  KRIZ_KORPUS, KORPUS_MIN, KRIZ_TABAN_DILLER, SOFT_TABAN_DILLER,
  BILINEN_KACIRMALAR,
} from './fixtures/kriz-korpus.mjs';

// Kırık satırı raporda tanımlamak için tam metin yerine kısa bir önizleme —
// korpus cümleleri hassas, test çıktısı (CI logu dahil) onları taşımamalı.
const _kisalt = (metin) => (metin.length > 16 ? metin.slice(0, 16) + '…' : metin);

const _kova = (ad) => KRIZ_KORPUS.filter((s) => s.beklenen === ad);

function _krizDegerlendir(korpus) {
  const kacirmalar = [];
  const yanlisAlarmlar = [];
  const yumusakIhlalleri = [];
  const tanimsizlar = [];
  const daralanSinirlar = [];
  for (const satir of korpus) {
    const { metin, dil, beklenen, not: notu } = satir;
    if (beklenen === 'kriz') {
      // Sert kova SERT kapıyı ister: soft yakalasa bile kriz kartı açılmaz.
      if (!detectCrisis(metin)) {
        kacirmalar.push({ dil, not: notu, ipucu: _kisalt(metin) });
      }
    } else if (beklenen === 'temiz') {
      if (detectCrisis(metin)) {
        yanlisAlarmlar.push({ dil, not: notu, ipucu: _kisalt(metin) });
      }
    } else if (beklenen === 'yumusak') {
      if (detectCrisis(metin) || !detectCrisisSoft(metin)) {
        yumusakIhlalleri.push({ dil, not: notu, ipucu: _kisalt(metin) });
      }
    } else if (beklenen === 'bilinen_sinir') {
      // Bu satırlar BUGÜN yanlış alarm veriyor ve kova onu mühürlüyor.
      // false dönmesi bir KIRIK değil bir KAZANÇtır — ama sessiz kalamaz:
      // desen daraldıysa satır kovadan çıkmalı, yoksa liste bir kusuru
      // olduğundan uzun gösterir ve bir sonraki okuyucu onu ölçü sanar.
      if (!detectCrisis(metin)) {
        daralanSinirlar.push({ dil, not: notu, ipucu: _kisalt(metin) });
      }
    }
    else {
      // DENETİM DÜZELTMESİ (FAZ 1 turu): ilk hâl tanımsız bir `beklenen`i
      // SESSİZCE düşürüyor ve yorumunda "korpus kapısında fark edilir"
      // diyordu — oysa hiçbir test kovaların toplamını korpus uzunluğuna
      // bağlamıyordu. Yani `beklenen: 'kirz'` yazan bir satır hiç sınanmadan
      // yeşil geçerdi. Olmayan bir kapıyı var sayan cümle, boşluğun
      // kendisinden kötüdür (§6.6). Artık düşen satır adıyla toplanır.
      tanimsizlar.push({ dil, not: notu, beklenen: String(beklenen) });
    }
  }
  return { kacirmalar, yanlisAlarmlar, yumusakIhlalleri, tanimsizlar, daralanSinirlar };
}

describe('kriz-eval — motor bağlı (sözleşme regresyonu)', () => {
  it('detectCrisis ve detectCrisisSoft fonksiyon olarak içe aktarılıyor', () => {
    expect(typeof detectCrisis).toBe('function');
    expect(typeof detectCrisisSoft).toBe('function');
  });

  it('boş girdide çökmez (koşucunun kendi sağlamlığı — içerik değil)', () => {
    expect(() => detectCrisis('')).not.toThrow();
    expect(() => detectCrisisSoft('')).not.toThrow();
  });
});

describe('kriz-eval — sınırlar (kaçırma 0 · yanlış-alarm 0 · yumuşak sözleşmesi)', () => {
  // Korpus boşken üç liste de boş kalır — koşucu burada ÇÖKMEZ, yalnız
  // aşağıdaki "korpus kapısı" bloğu ayrı ayrı kırmızıdır.
  const sonuc = _krizDegerlendir(KRIZ_KORPUS);

  it('kaçırma yok — beklenen:kriz satırların tamamı detectCrisis tarafından yakalanıyor (soft yetmez: kart açılmaz)', () => {
    expect(sonuc.kacirmalar).toEqual([]);
  });

  it('yanlış-alarm yok — beklenen:temiz satırların hiçbiri detectCrisis tarafından tetiklenmiyor', () => {
    expect(sonuc.yanlisAlarmlar).toEqual([]);
  });

  it('yumuşak sözleşmesi bozulmuyor — beklenen:yumusak satırlar detectCrisis false + detectCrisisSoft true', () => {
    expect(sonuc.yumusakIhlalleri).toEqual([]);
  });

  it('hiçbir satır sınavın dışında kalmıyor — dört kova korpusu tam böler', () => {
    expect(sonuc.tanimsizlar).toEqual([]);
    expect(
      _kova('kriz').length + _kova('yumusak').length +
      _kova('temiz').length + _kova('bilinen_sinir').length,
    ).toBe(KRIZ_KORPUS.length);
  });

  it('bilinen kaçırmalar hâlâ kaçırılıyor — biri kapandıysa liste küçülmeli', () => {
    /* Bu kova, oda 15'in "ölçülemez" dediği sayının elle tutulan hâlidir:
       bir insanın kriz sayacağı ama desenin saymadığı cümleler. KIRMIZI
       olması iyi haberdir (desen genişlemiş) ve o satır 'kriz' kovasına
       taşınmalıdır. Kapanan bir kusuru listede bırakmak, onu açık
       göstermeye devam eder — kayıtla gerçeğin ayrışması (§6.2). */
    const artikYakalananlar = BILINEN_KACIRMALAR
      .filter((r) => detectCrisis(r.metin))
      .map((r) => ({ dil: r.dil, not: r.not, ipucu: _kisalt(r.metin) }));
    expect(artikYakalananlar).toEqual([]);
  });

  it('bilinen sınırlar hâlâ bilinen sınır — biri kapandıysa liste küçülmeli', () => {
    // KIRMIZI = iyi haber + bakım borcu: desen daralmış, satır artık
    // yanlış alarm vermiyor. Yapılacak şey testi gevşetmek değil, o satırı
    // 'temiz' kovasına taşımaktır. Kusurun kapandığını kaydetmeyen bir
    // liste, kapanmamış gibi okunur (§6.2).
    expect(sonuc.daralanSinirlar).toEqual([]);
  });
});

describe('kriz-eval — Türkçe büyük-İ kapısı (2026-09-04 kırığı)', () => {
  /* JS'in `/i` bayrağı U+0130'ı (İ) küçük i'ye KATLAMAZ. Türkçede cümle
     başındaki her `i` sözcüğü büyük İ ile yazıldığı için /intihar/i tam da
     en tipik cümleyi kaçırıyordu. Düzeltme `krizMetniNormalize`
     (13-extras) — bu kapı onun kilididir, korpustan bağımsız durur. */
  it('cümle başındaki İ kriz kartını açar', () => {
    expect(detectCrisis('İntihar etmeyi düşünüyorum.')).toBe(true);
    expect(detectCrisis('İlaçları fazla aldım.')).toBe(true);
  });

  it('küçük i biçimi zaten çalışıyordu — düzeltme onu bozmadı', () => {
    expect(detectCrisis('intihar etmeyi düşünüyorum')).toBe(true);
  });

  it('normalize İngilizce desenleri bozmuyor — ASCII I’ya dokunulmadı', () => {
    expect(detectCrisis('I want to die and I mean it.')).toBe(true);
    expect(detectCrisis('I want to live abroad next year.')).toBe(false);
  });

  it('NFD ile ayrışmış İ (i + U+0307) de yakalanıyor', () => {
    // Kopyala-yapıştır bir metin NFD gelebilir: 'İ' tek kod noktası değil,
    // 'i' + birleşen nokta olarak. Desen o hâlde de tutmalı.
    expect(detectCrisis('i\u0307ntihar etmeyi düşünüyorum.')).toBe(true);
  });

  it('konum-bağlı normalize başka harfin noktasını yemiyor', () => {
    // U+0307 yalnız i/I'dan SONRA silinir. Lehçe ż'nin NFD hâli (z+U+0307)
    // olduğu gibi kalmalı — normalize hedeflediğini değiştirir, fazlasını değil.
    expect(krizMetniNormalize('z\u0307')).toBe('z\u0307');
    expect(krizMetniNormalize('i\u0307')).toBe('i');
  });
});

/* ═══ KAPSAMA TABANI — kaç dil, hangi katman ═══════════════════════════
   Kriz taraması dil-bağımsızdır (dpAll), ama bir dilin deseni hiç yoksa
   o dil için tarama da yoktur. Bugünkü ölçüm (2026-09-04): `detect.crisis`
   ON ÜÇ dilde, `detect.crisis_soft` yalnız İKİ dilde. Asimetri burada
   sayıya bağlanıyor — büyümesi serbest, DARALMASI yasak. */
describe('kriz-eval — kapsama tabanı (daralması yasak)', () => {
  const _tasiyanlar = (anahtar) =>
    Object.keys(DETECT_I18N).filter((d) => {
      const v = DETECT_I18N[d]?.[anahtar];
      return Array.isArray(v) ? v.length > 0 : !!v;
    });

  it('detect.crisis tabanı korunuyor — hiçbir dil sessizce düşmedi', () => {
    const bugun = _tasiyanlar('detect.crisis');
    for (const dil of KRIZ_TABAN_DILLER) expect(bugun).toContain(dil);
  });

  it('detect.crisis_soft tabanı korunuyor', () => {
    const bugun = _tasiyanlar('detect.crisis_soft');
    for (const dil of SOFT_TABAN_DILLER) expect(bugun).toContain(dil);
  });

  it('korpus, sert desene sahip HER dili sınıyor — desensiz dil kalmasın', () => {
    // Bir dilin deseni varsa korpusta da bir satırı olmalı: aksi hâlde o
    // dil "kapsanıyor" görünür ama hiç koşulmaz.
    const sertDiller = new Set(
      KRIZ_KORPUS.filter((r) => r.beklenen === 'kriz').map((r) => r.dil),
    );
    for (const dil of KRIZ_TABAN_DILLER) expect(sertDiller).toContain(dil);
  });
});

describe('kriz-eval — kapının kendisi: ihlali gerçekten yakalıyor mu (§10.5)', () => {
  /* Çapraz denetim bulgusu (Sonnet): `tanimsizlar` mekanizması doğru
     yazılmıştı ama kendi yakalayışını kanıtlayan bir test yoktu — repodaki
     emsal (`tests/bagsiz-ad-kapisi.test.js`) tam da bunu ister. Ölçen alet
     ölçülmezse ölçüm bir teselli olur. */
  it('bozuk bir `beklenen` sessizce düşmez, adıyla toplanır', () => {
    const sahte = [{ metin: 'x', dil: 'tr', beklenen: 'kirz', not: 'kasıtlı yazım hatası' }];
    expect(_krizDegerlendir(sahte).tanimsizlar).toHaveLength(1);
  });

  it('kaçırılan bir kriz satırı gerçekten kaçırma olarak sayılır', () => {
    const sahte = [{ metin: 'bugün hava çok güzel', dil: 'tr', beklenen: 'kriz', not: 'kasıtlı yanlış etiket' }];
    expect(_krizDegerlendir(sahte).kacirmalar).toHaveLength(1);
  });

  it('yanlış alarm veren bir temiz satır gerçekten yanlış-alarm sayılır', () => {
    const sahte = [{ metin: 'intihar', dil: 'tr', beklenen: 'temiz', not: 'kasıtlı yanlış etiket' }];
    expect(_krizDegerlendir(sahte).yanlisAlarmlar).toHaveLength(1);
  });
});

/* ═══ KORPUS KAPISI — sınav kâğıdının kendi ölçüsü ═══════════════════
   Bir eval, korpusu küçüldükçe sessizce kolaylaşır: silinen her satır
   testi yeşil tutar. Bu üç kapı onu engeller — ölçen aletin kendisi de
   ölçülür (§10.5). */
describe('kriz-eval — korpus kapısı', () => {
  it(`korpus en az ${KORPUS_MIN} senaryo taşır`, () => {
    expect(KRIZ_KORPUS.length).toBeGreaterThanOrEqual(KORPUS_MIN);
  });

  it('en az 6 farklı dil kapsanıyor (DETECT_I18N 13 dil tanıyor)', () => {
    const diller = new Set(KRIZ_KORPUS.map((s) => s.dil));
    expect(diller.size).toBeGreaterThanOrEqual(6);
  });

  it('üç ana kova dengeli — her birinde en az 8 satır', () => {
    expect(_kova('kriz').length).toBeGreaterThanOrEqual(8);
    expect(_kova('yumusak').length).toBeGreaterThanOrEqual(8);
    expect(_kova('temiz').length).toBeGreaterThanOrEqual(8);
  });
});
