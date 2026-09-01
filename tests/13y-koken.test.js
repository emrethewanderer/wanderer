/**
 * KÖKEN MOTORU (13y) — "her sayının bir kaynağı vardır"
 *
 * Bu testler mimarinin çekirdek sözleşmesini kilitler: kanıtsız değer
 * ASLA bir sayıya düşmez. Kırmızıya dönerlerse sahte veri kapısı açılmış
 * demektir — eşiği gevşetmeden önce .claude/plans/gerceklik-mimarisi.md'ye bak.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  KOKEN_ESIK,
  kokenBeyan, kokenOlc, kokenYorum, kokenVar, kokenAlinti,
  kokenSozBlok, kokenAlintiCoz,
  kokenKullaniciSozleri, kokenTemizlik,
} from '../js/parts/13y-koken.js';
import { S } from '../js/state.js';
import { SafeStorage } from '../js/parts/00a-infrastructure.js';

describe('kokenOlc — kanıt eşiğin altındaysa değer YOKTUR', () => {
  it('n < eşik: değer null\'a düşer, kaynak "yok" olur', () => {
    const r = kokenOlc(72, 2);
    expect(r.v).toBeNull();
    expect(r.kaynak).toBe('yok');
    expect(r.n).toBe(2); // "2 kanıt vardı ama 3 gerekiyordu" bilgisi korunur
  });

  it('n >= eşik: değer geçer, kaynak "olcum" olur', () => {
    const r = kokenOlc(72, KOKEN_ESIK);
    expect(r.v).toBe(72);
    expect(r.kaynak).toBe('olcum');
  });

  it('hiç kanıt yoksa 50 gibi bir varsayılana DÜŞMEZ', () => {
    expect(kokenOlc(50, 0).v).toBeNull();
    expect(kokenOlc(undefined, 0).v).toBeNull();
  });

  it('kanıt yeterli ama değer sayı değilse yine yok', () => {
    expect(kokenOlc(NaN, 5).kaynak).toBe('yok');
    expect(kokenOlc(null, 5).kaynak).toBe('yok');
    expect(kokenOlc('72', 5).kaynak).toBe('yok');
  });

  it('eşik çağrı başına gevşetilebilir (ama varsayılan 3\'tür)', () => {
    expect(KOKEN_ESIK).toBe(3);
    expect(kokenOlc(72, 1, 1).v).toBe(72);
  });
});

describe('kokenBeyan — kullanıcının kendi eli', () => {
  it('değer varsa beyan olur ve doğrulama istemez', () => {
    const r = kokenBeyan('sabırlı olmak');
    expect(r.kaynak).toBe('beyan');
    expect(r.n).toBe(1);
  });

  it('boş beyan beyan değildir', () => {
    expect(kokenBeyan('').kaynak).toBe('yok');
    expect(kokenBeyan(null).kaynak).toBe('yok');
    expect(kokenBeyan(undefined).kaynak).toBe('yok');
  });

  it('0 geçerli bir beyandır (boş değil)', () => {
    expect(kokenBeyan(0).kaynak).toBe('beyan');
  });
});

describe('kokenVar — UI ve prompt kapısının tek sorusu', () => {
  it('kökensiz olan hiçbir şey geçmez', () => {
    expect(kokenVar(kokenOlc(50, 0))).toBe(false);
    expect(kokenVar(null)).toBe(false);
    expect(kokenVar(undefined)).toBe(false);
    expect(kokenVar({})).toBe(false);
    expect(kokenVar({ v: null, kaynak: 'olcum', n: 9 })).toBe(false);
  });

  it('kökeni olan geçer', () => {
    expect(kokenVar(kokenOlc(72, 4))).toBe(true);
    expect(kokenVar(kokenBeyan('x'))).toBe(true);
  });
});

describe('kokenAlinti — LLM\'in kanıtı gerçekten kullanıcının mı?', () => {
  const kaynak = [
    'Bugün yine erteledim, başlamak bana çok zor geliyor.',
    'Kendime söz verdim ama tutamadım.',
  ];

  it('kullanıcının gerçek cümlesi geçer', () => {
    expect(kokenAlinti('başlamak bana çok zor geliyor', kaynak)).toBe(true);
  });

  it('model BİTİŞİK bir parça kısaltmışsa geçer', () => {
    expect(kokenAlinti('kendime söz verdim', kaynak)).toBe(true);
  });

  it('kelime atlayarak "kısaltma" GEÇMEZ — o artık alıntı değil, yeniden yazımdır', () => {
    // kaynakta "söz verdim AMA tutamadım" var; aradaki kelimeyi atlayan
    // cümle kullanıcının kurduğu cümle değildir. Doğru kanıt yolu kanit_ref'tir.
    expect(kokenAlinti('kendime söz verdim tutamadım', kaynak)).toBe(false);
  });

  it('UYDURULMUŞ alıntı geçmez — kapının asıl işi budur', () => {
    expect(kokenAlinti('annemle ilişkim çocukluğumdan beri mesafeli', kaynak)).toBe(false);
  });

  it('tek kelimelik "kanıt" geçmez (tesadüfi örtüşme %100 üretirdi)', () => {
    expect(kokenAlinti('erteledim', kaynak)).toBe(false);
  });

  it('boş kanıt ya da boş kaynak geçmez', () => {
    expect(kokenAlinti('', kaynak)).toBe(false);
    expect(kokenAlinti('başlamak zor geliyor', [])).toBe(false);
    expect(kokenAlinti(null, null)).toBe(false);
  });

  it('TR küçültme tuzağı: İ/I kayması eşleşmeyi bozmaz', () => {
    // 'I'.toLowerCase() → 'i' (yanlış), 'I'.toLocaleLowerCase('tr') → 'ı' (doğru)
    expect(kokenAlinti('IRAK KALDIM', ['ırak kaldım kendimden'])).toBe(true);
    expect(kokenAlinti('İSTEDİM ama olmadı', ['istedim ama olmadı gerçekten'])).toBe(true);
  });

  it('noktalama farkı eşleşmeyi bozmaz', () => {
    expect(kokenAlinti('"başlamak" bana... çok zor geliyor!', kaynak)).toBe(true);
  });

  it('tek metin de dizi kadar geçerli girdidir', () => {
    expect(kokenAlinti('kendime söz verdim', 'Kendime söz verdim ama tutamadım.')).toBe(true);
  });
});

describe('kokenAlinti — KESİN kapı (eşik yok, 2026-08-02)', () => {
  /* Bu blok kapının eşiksizliğinin bekçisidir. Buraya bir oran, bir yüzde
     ya da bir "kalibre" sabiti geri gelirse mimari kırılmış demektir:
     Wanderer "ara sıra doğru"ya göre inşa edilmez. Doğru alıntının yolu
     eşiği gevşetmek DEĞİL, kanit_ref'tir (kokenAlintiCoz). */
  const kaynak = [
    'Kendime söz verdim ama tutamadım, sabah kalkamıyorum.',
    'Annemle konuşurken hep savunmaya geçiyorum.',
  ];

  it('YARI ÇALINTI klinik teşhis geçmez', () => {
    // yarısı kullanıcının cümlesi, yarısı modelin uydurduğu klinik iddia
    expect(kokenAlinti('sabah kalkamıyorsun çünkü depresyondasın', kaynak)).toBe(false);
    expect(kokenAlinti('annemle aramdaki mesafe babamdan geliyor', kaynak)).toBe(false);
  });

  it('PARAFRAZ geçmez — eski 0.6 kapısı bunu geçiriyordu', () => {
    /* Kullanıcı "sabah kalkamıyorum" yazdı; model "sabahları kalkmakta
       zorlanıyorum" diye YENİDEN YAZDI. Bulanık kapı bunu kök eşleşmesiyle
       geçiriyordu — ama bu cümleyi kullanıcı kurmadı. Kullanıcıya kendi
       sözü diye gösterilemez. */
    expect(kokenAlinti('sabahları kalkmakta zorlanıyorum', kaynak)).toBe(false);
    expect(kokenAlinti('annemle konuşmalarda savunmadayım', kaynak)).toBe(false);
  });

  it('kelime kökü yanlış eşleşmesi artık imkânsız', () => {
    expect(kokenAlinti('kar yağdı bugün', ['karanlık bir gündü bugün'])).toBe(false);
  });

  it('BİREBİR geçen parça geçer — kayıp yok', () => {
    expect(kokenAlinti('sabah kalkamıyorum', kaynak)).toBe(true);
    expect(kokenAlinti('hep savunmaya geçiyorum', kaynak)).toBe(true);
  });
});

describe('kokenYorum — kanıtsız yorum veri değildir', () => {
  const kaynak = ['Bugün yine erteledim, başlamak bana çok zor geliyor.'];

  it('kanıt bağlanırsa yorum kaydedilebilir', () => {
    const r = kokenYorum('erteleme örüntüsü', 'başlamak bana çok zor geliyor', kaynak);
    expect(r.kaynak).toBe('yorum');
    expect(r.v).toBe('erteleme örüntüsü');
  });

  it('kanıt bağlanamazsa değer YOKTUR (model uydurmuş olabilir)', () => {
    const r = kokenYorum('babanla çözülmemiş bir mesele var', 'baban seni hep eleştirdi', kaynak);
    expect(r.v).toBeNull();
    expect(r.kaynak).toBe('yok');
  });

  it('kanıt hiç verilmemişse değer YOKTUR', () => {
    expect(kokenYorum('bir yargı', '', kaynak).kaynak).toBe('yok');
    expect(kokenYorum('bir yargı', null, kaynak).kaynak).toBe('yok');
  });
});

describe('kokenTemizlik — geri alınamaz silmenin korumaları', () => {
  const UID = 'koken-temiz-user';
  const KEY = `etw_koken_temiz_v3_${UID}`;

  beforeEach(() => {
    // SafeStorage bellek-içi _kvCache kullanır — remove() şart (bkz. hafıza)
    try { SafeStorage.remove(KEY); } catch (_) {}
    S.currentUser = null;
    S.allSessions = {};
    S.chatHistory = [];
  });

  it('kullanıcı yoksa hiç koşmaz', () => {
    expect(kokenTemizlik()).toBeNull();
  });

  it('kanıt havuzu YETERSİZKEN ertelenir ve bayrak YAKILMAZ', () => {
    /* En kritik koruma: yeni cihazda geçmiş sohbetler henüz hidre olmamışken
       temizlik koşsaydı kullanıcının bütün portresini "kanıtsız" sayıp
       silerdi — ve bayrak yandığı için bir daha asla düzelemezdi. */
    S.currentUser = { id: UID };
    S.chatHistory = [{ role: 'user', content: 'tek bir cümle' }];

    expect(kokenTemizlik()).toBeNull();
    expect(SafeStorage.get(KEY)).toBeFalsy(); // bayrak yanmadı → sonra tekrar denenir
  });

  it('havuz yeterliyken koşar, rapor döner ve bayrağı yakar; ikinci kez koşmaz', () => {
    S.currentUser = { id: UID };
    S.chatHistory = Array.from({ length: 25 }, (_, i) => ({
      role: 'user', content: `bugün kendimle ilgili bir şey fark ettim numara ${i}`,
    }));

    const r1 = kokenTemizlik();
    expect(r1).not.toBeNull();
    expect(SafeStorage.get(KEY)).toBeTruthy();

    expect(kokenTemizlik()).toBeNull(); // idempotent
  });

  /* Zincirin üçüncü halkası (2026-08-02): 09a yaşam hafızası. Havuza
     SORULMAZ — kapısı damganın kendisidir; alan adları da 09e/09d ile
     çakışmamalı, yoksa Object.assign biri diğerinin sayısını siler. */
  it('09a köprüsünü çağırır ve raporunu çakışmadan birleştirir', () => {
    S.currentUser = { id: UID };
    S.chatHistory = Array.from({ length: 25 }, (_, i) => ({
      role: 'user', content: `bugün kendimle ilgili bir şey fark ettim numara ${i}`,
    }));
    window.ypKokenTemizlik = () => ({ deger: 2, kisi: 7 });
    window.p6KokenTemizlik = () => ({ fact: 3, loop: 1, date: 0, lmKisi: 4 });

    const r = kokenTemizlik();
    expect(r.fact).toBe(3);
    expect(r.lmKisi).toBe(4);
    expect(r.kisi).toBe(7);   // 09e'nin sayısı P6 tarafından EZİLMEDİ
    expect(r.deger).toBe(2);

    delete window.ypKokenTemizlik;
    delete window.p6KokenTemizlik;
  });

  it('kokenKullaniciSozleri yalnız KULLANICI mesajlarını toplar', () => {
    S.currentUser = { id: UID };
    S.chatHistory = [
      { role: 'user', content: 'benim cümlem' },
      { role: 'assistant', content: 'modelin cümlesi' },
    ];
    const sozler = kokenKullaniciSozleri();
    expect(sozler).toContain('benim cümlem');
    expect(sozler).not.toContain('modelin cümlesi');
  });
});

describe('kokenSozBlok — modelin parmakla gösterebilmesi', () => {
  const sozler = ['ilk cümlem', 'ikinci cümlem', 'üçüncü cümlem'];

  it('numaralı blok üretir ve haritası bloğa birebir uyar', () => {
    const { blok, harita } = kokenSozBlok(sozler);
    expect(blok).toContain('[S1] "ilk cümlem"');
    expect(blok).toContain('[S3] "üçüncü cümlem"');
    expect(harita.S2).toBe('ikinci cümlem');
  });

  it('tavan uygulanır ve SON cümleler tutulur (tazelik)', () => {
    const { blok, harita } = kokenSozBlok(sozler, { max: 2 });
    expect(Object.keys(harita)).toHaveLength(2);
    expect(harita.S1).toBe('ikinci cümlem');
    expect(blok).not.toContain('ilk cümlem');
  });

  it('haritadaki metin de KESİKtir — model neyi gördüyse kanıt odur', () => {
    const uzun = 'a'.repeat(300);
    const { harita } = kokenSozBlok([uzun], { maxLen: 50 });
    expect(harita.S1).toHaveLength(50);
  });

  it('boş girdi bloğu çökertmez', () => {
    expect(kokenSozBlok([]).blok).toBe('-');
    expect(kokenSozBlok(null).harita).toEqual({});
  });
});

describe('kokenAlintiCoz — alıntıyı model yazmaz, uygulama keser', () => {
  const sozler = [
    'Kendime söz verdim ama tutamadım, sabah kalkamıyorum.',
    'Annemle konuşurken hep savunmaya geçiyorum.',
  ];
  const { harita } = kokenSozBlok(sozler);

  it('geçerli ref → KAYNAK cümle kanıt olur', () => {
    const r = kokenAlintiCoz('S2', '', harita, sozler);
    expect(r.alinti).toBe('Annemle konuşurken hep savunmaya geçiyorum.');
    expect(r.ref).toBe('S2');
  });

  it('ref süslenmiş olsa da çözülür ([S2], s2, 2)', () => {
    expect(kokenAlintiCoz('[S2]', '', harita, sozler).ref).toBe('S2');
    expect(kokenAlintiCoz('s2', '', harita, sozler).ref).toBe('S2');
    expect(kokenAlintiCoz(2, '', harita, sozler).ref).toBe('S2');
  });

  it('model PARAFRAZ yazsa bile ref sayesinde kanıt KAYBOLMAZ', () => {
    /* Eski bulanık kapının "ara sıra doğruyu düşürme" kusurunun kapandığı
       yer burasıdır: model cümleyi yeniden yazmış olsa da parmağı doğru
       cümlededir ve kanıt kaynaktan kesilir. */
    const r = kokenAlintiCoz('S1', 'sabahları kalkmakta zorlanıyorum', harita, sozler);
    expect(r).not.toBeNull();
    expect(r.alinti).toContain('sabah kalkamıyorum');
  });

  it('ref YANLIŞ hedefi gösteriyorsa kırpma çapraz kontrolde yakalanır', () => {
    // S2 annemle ilgili; kırpma S1'den — ref güvenilmez, serbest arama devreye girer
    const r = kokenAlintiCoz('S2', 'sabah kalkamıyorum', harita, sozler);
    expect(r.alinti).toContain('sabah kalkamıyorum');
    expect(r.ref).toBe('');
  });

  it('ref yokken birebir geçen serbest metin kaynağına bağlanır', () => {
    const r = kokenAlintiCoz('', 'hep savunmaya geçiyorum', harita, sozler);
    expect(r.alinti).toBe('Annemle konuşurken hep savunmaya geçiyorum.');
  });

  it('UYDURULMUŞ kanıt hiçbir yoldan giremez', () => {
    expect(kokenAlintiCoz('', 'babanla çözülmemiş bir mesele var', harita, sozler)).toBeNull();
    expect(kokenAlintiCoz('S9', 'babanla çözülmemiş bir mesele var', harita, sozler)).toBeNull();
    expect(kokenAlintiCoz('', '', harita, sozler)).toBeNull();
  });

  it('tek kelimelik serbest kanıt bağlanmaz (tesadüfi eşleşme)', () => {
    expect(kokenAlintiCoz('', 'annemle', harita, sozler)).toBeNull();
  });
});
