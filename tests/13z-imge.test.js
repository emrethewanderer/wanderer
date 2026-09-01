// İmge Kapısı (13z) — veri + köken katmanı testleri (plan FAZ 1)
// ════════════════════════════════════════════════════════════════════════
// Bu dosyanın koruduğu sözleşme: imge daima BEYANdır. Boş "neden" ya da
// bilinmeyen id hiçbir şeyi kaydetmez (kısmi/mühürsüz kayıt YOK); aktif
// imge kokenVar/kokenKayitVar kapılarından ancak gerçek bir seçim varsa
// geçer (.claude/plans/gorunmeyen-doksan-bes.md K1).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  IG_IMGELER, igSec, igGetAktif, igGetImge, igLoad, igInit, igMotifSVG,
  igDerinles, igMerdivenTuket, igZirveKaydet, igGetZirve, igOpenKapi,
} from '../js/parts/13z-imge-kapisi.js';
import { kokenVar, kokenKayitVar, kokenSozBlok, kokenAlintiCoz } from '../js/parts/13y-koken.js';
import { SafeStorage, localISODate } from '../js/parts/00a-infrastructure.js';
import { S } from '../js/state.js';
// LLM damarı (FAZ 3) — 13z'nin `window.ig*`'ini 09a'dan TÜKETEN köprü.
// Modül 13z zaten üstte import edildiği için window.igGetAktif/igGetImge
// bu noktada canlıdır (13z dosya sonu window expose bloğu, top-level çalışır).
import { _buildImgeContext } from '../js/parts/09a-personalization-engine.js';

const UID = 'u-imge-test';
const KEY = `etw_imge_v1_${UID}`;

beforeEach(() => {
  S.currentUser = { id: UID };
  S._imge = { aktif: null, gecmis: [], zirve: null };
  SafeStorage.remove(KEY);
});

describe('IG_IMGELER — 12 arketip tablosu', () => {
  it('12 imge, her biri id + i18nKey taşır (hardcoded ad YOK)', () => {
    expect(IG_IMGELER.length).toBe(12);
    for (const imge of IG_IMGELER) {
      expect(typeof imge.id).toBe('string');
      expect(imge.i18nKey).toBe(`imge.ad.${imge.id}`);
    }
  });

  it('kumru kitap-köklü arketip listede var', () => {
    expect(IG_IMGELER.some((x) => x.id === 'kumru')).toBe(true);
  });
});

describe('igGetImge — katalog okuma', () => {
  it('geçerli id → kayıt döner', () => {
    expect(igGetImge('fener')).toEqual({ id: 'fener', i18nKey: 'imge.ad.fener' });
  });

  it('bilinmeyen id → null (varsayılan imgeye DÜŞMEZ)', () => {
    expect(igGetImge('yok-boyle-bir-imge')).toBeNull();
  });
});

describe('igSec — seçim + mühürleme (K1: boş beyan beyan değildir)', () => {
  it('geçerli id + neden → true, aktif kullanıcının cümlesini BİREBİR taşır', () => {
    const ok = igSec('kapi', 'Çünkü hep yeni bir başlangıcı hatırlatıyor bana.');
    expect(ok).toBe(true);
    expect(S._imge.aktif).toEqual({
      id: 'kapi',
      neden: 'Çünkü hep yeni bir başlangıcı hatırlatıyor bana.',
      tarih: localISODate(),
    });
  });

  it('boş neden → false, state DEĞİŞMEZ, storage yazılmaz', () => {
    const ok = igSec('kapi', '');
    expect(ok).toBe(false);
    expect(S._imge.aktif).toBeNull();
    expect(SafeStorage.get(KEY)).toBeNull();
  });

  it('yalnız boşluktan oluşan neden → false (kokenKirp trim eder)', () => {
    const ok = igSec('deniz', '    \n\t  ');
    expect(ok).toBe(false);
    expect(S._imge.aktif).toBeNull();
  });

  it('nedensiz (undefined) çağrı → false', () => {
    expect(igSec('dag', undefined)).toBe(false);
    expect(S._imge.aktif).toBeNull();
  });

  it('bilinmeyen id → false, geçerli neden verilse bile kaydedilmez', () => {
    const ok = igSec('boyle-bir-imge-yok', 'Bu bir neden cümlesi.');
    expect(ok).toBe(false);
    expect(S._imge.aktif).toBeNull();
  });

  it('ikinci seçim öncekini gecmis\'e düşürür', () => {
    igSec('kapi', 'İlk imge nedeni.');
    igSec('deniz', 'İkinci imge nedeni.');
    expect(S._imge.aktif.id).toBe('deniz');
    expect(S._imge.gecmis.length).toBe(1);
    expect(S._imge.gecmis[0].id).toBe('kapi');
  });

  it('gecmis en çok 12 kayıt tutar (taşınca en eskisi düşer)', () => {
    const idler = IG_IMGELER.map((x) => x.id); // 12 farklı id
    idler.forEach((id, i) => igSec(id, `Neden ${i}`));
    // 12 ardışık seçim → ilk seçimde önceki yoktu, 11 kayıt gecmis'e düştü
    expect(S._imge.gecmis.length).toBe(11);

    // 13. seçim: tavan (12) burada tam doldurulur, taşma henüz yok
    igSec(idler[0], 'Yeniden seçim'); // onceki = kumru (idler[11])
    expect(S._imge.gecmis.length).toBe(12);
    expect(S._imge.gecmis[0].id).toBe(idler[11]);

    // 14. seçim: tavan taşar — en eski kayıt (ilk 'kapi', "Neden 0") düşmeli
    igSec(idler[1], 'Üçüncü tur'); // onceki = kapi (az önce yeniden seçilen)
    expect(S._imge.gecmis.length).toBe(12); // tavan hâlâ 12, artmadı
    expect(S._imge.gecmis[0].id).toBe(idler[0]); // en yeni önceki başta
    expect(S._imge.gecmis.some((x) => x.neden === 'Neden 0')).toBe(false);
  });
});

describe('kalıcılık — igSec → igLoad → geri okuma', () => {
  it('mühürlenen imge yeniden yüklemede geri gelir', () => {
    igSec('fener', 'Karanlıkta yol gösteren tek şey bu.');
    // Bellek-içi state'i sıfırla (sayfa yenilemesini taklit eder) — SafeStorage
    // testlerde localStorage DEĞİL bellek-içi _kvCache kullanır, o yüzden veri
    // hâlâ SafeStorage'da durur (bkz. hafıza: safestorage-testlerde-kvcache).
    S._imge = { aktif: null, gecmis: [], zirve: null };
    igLoad();
    expect(S._imge.aktif.id).toBe('fener');
    expect(S._imge.aktif.neden).toBe('Karanlıkta yol gösteren tek şey bu.');
  });

  it('igInit hiç kayıt yokken varsayılan şekli kurar, çökmez', () => {
    SafeStorage.remove(KEY);
    S._imge = undefined;
    igInit();
    expect(S._imge).toEqual({ aktif: null, gecmis: [], zirve: null });
  });

  it('igSave çağrılmadan igSec sonrası storage doludur (igSec kendi kaydeder)', () => {
    igSec('kok', 'Ait olduğum yeri hatırlatıyor.');
    const raw = SafeStorage.get(KEY);
    expect(raw).not.toBeNull();
    expect(raw.aktif.id).toBe('kok');
  });
});

describe('igMotifSVG — prosedürel motif (FAZ 2)', () => {
  it('12 arketipin her biri çizilir', () => {
    for (const imge of IG_IMGELER) {
      const svg = igMotifSVG(imge.id, 64);
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).toContain('<path');
    }
  });

  it('bilinmeyen id → BOŞ string (varsayılan motife DÜŞMEZ)', () => {
    // Gerçeklik Kuralı: kanıtsız/karşılığı olmayan girdi bir şey ÜRETMEZ.
    expect(igMotifSVG('boyle-bir-imge-yok')).toBe('');
  });

  it('aynı kullanıcı + aynı imge → birebir aynı SVG (deterministik seed)', () => {
    // Motif her açılışta değişirse "bu benim imgem" duygusu kırılır (§K5).
    const a = igMotifSVG('fener', 96);
    const b = igMotifSVG('fener', 96);
    expect(a).toBe(b);
  });

  it('kullanıcı değişince serpinti değişir (seed uid\'ye bağlı)', () => {
    const ilk = igMotifSVG('fener', 96);
    S.currentUser = { id: 'baska-bir-gezgin' };
    const ikinci = igMotifSVG('fener', 96);
    S.currentUser = { id: UID };
    expect(ikinci).not.toBe(ilk);
  });
});

describe('igGetAktif — köken kapısı (kokenVar / kokenKayitVar)', () => {
  it('kayıt yokken kanıtsız şekil döner — kokenVar/kokenKayitVar GEÇMEZ', () => {
    const r = igGetAktif();
    expect(r.v).toBeNull();
    expect(r.kaynak).toBe('yok');
    expect(kokenVar(r)).toBe(false);
    expect(kokenKayitVar(r)).toBe(false);
  });

  it('seçim sonrası kaynak "beyan"dır ve iki kapı da AÇILIR', () => {
    igSec('yildiz', 'Uzaktan da olsa hep aynı yerde duruyor.');
    const r = igGetAktif();
    expect(r.kaynak).toBe('beyan');
    expect(r.v).toEqual(S._imge.aktif);
    expect(r.v.neden).toBe('Uzaktan da olsa hep aynı yerde duruyor.');
    expect(r.kanit).toBe('Uzaktan da olsa hep aynı yerde duruyor.');
    expect(kokenVar(r)).toBe(true);
    expect(kokenKayitVar(r)).toBe(true);
  });
});

describe('_buildImgeContext — LLM damarı (09a köprüsü, plan FAZ 3)', () => {
  // Her testte taze bir "oturum" — 09a modülündeki bayrak S.currentSessId
  // değişince sıfırlanır (yeni sohbet = yeni yankı hakkı). Sabit bir id
  // kullanmak testleri birbirine sızdırır (modül-düzeyi bayrak dosya
  // boyunca tek nesnede yaşar).
  let sessCounter = 0;
  beforeEach(() => { S.currentSessId = `test-sess-${++sessCounter}`; });

  it('imge seçilmemişken hiçbir şey katmaz (Gerçeklik Kuralı: kanıtsız değer prompt\'a girmez)', () => {
    expect(_buildImgeContext()).toBe('');
  });

  it('imge seçiliyken kullanıcının "neden" cümlesi prompt metninde BİREBİR geçer', () => {
    igSec('fener', 'Karanlıkta yol gösteren tek şey bu.');
    const ctx = _buildImgeContext();
    expect(ctx).toContain('Karanlıkta yol gösteren tek şey bu.');
    expect(ctx).toContain('Fener'); // imge.ad.fener — gerçek TR sözlükten (t()), hardcode değil
  });

  it('oturum başına EN ÇOK BİR KEZ (K3): art arda iki çağrıda ikincisi boş döner', () => {
    igSec('kok', 'Ait olduğum yeri hatırlatıyor.');
    const ilk = _buildImgeContext();
    expect(ilk).not.toBe('');
    const ikinci = _buildImgeContext();
    expect(ikinci).toBe('');
  });

  it('yeni oturum (S.currentSessId değişimi) bayrağı sıfırlar — yankı hakkı yeniden doğar', () => {
    igSec('yol', 'Hep ileri gitmek istiyorum.');
    expect(_buildImgeContext()).not.toBe(''); // 1. çağrı: dolu
    expect(_buildImgeContext()).toBe('');      // 2. çağrı, AYNI oturum: boş
    S.currentSessId = `test-sess-${++sessCounter}`; // yeni sohbet
    expect(_buildImgeContext()).not.toBe(''); // yeni oturumda tekrar dolar
  });

  it('MERDİVEN (FAZ 4) doz kısıtını AŞAR — kullanıcının kendi talebi esirgenmez', () => {
    igSec('deniz', 'Çünkü dalgalar beni hep geri getiriyor.');
    expect(_buildImgeContext()).not.toBe('');  // oturumun tek yankısı harcandı
    expect(_buildImgeContext()).toBe('');       // normal yol artık kapalı
    igDerinles();                               // kullanıcı "bu imgeyle konuş" dedi
    const ctx = _buildImgeContext();
    expect(ctx).not.toBe('');                   // kapalı olmasına RAĞMEN dolar
    expect(ctx).toContain('Çünkü dalgalar beni hep geri getiriyor.');
    // ve tek turluktur: bir sonraki turda merdiven tükenmiş olmalı
    expect(_buildImgeContext()).toBe('');
  });
});

describe('igMerdivenTuket — ZMET merdiveni bayrağı (FAZ 4)', () => {
  it('istenmeden false; igDerinles sonrası bir kez true, sonra tükenir', () => {
    expect(igMerdivenTuket()).toBe(false);
    igDerinles();
    expect(igMerdivenTuket()).toBe(true);
    expect(igMerdivenTuket()).toBe(false); // tek turluk
  });
});

describe('igZirveKaydet / igGetZirve — kanıtlı hatıra kapısı (FAZ 5 sözleşmesi)', () => {
  it('boş/whitespace alıntı reddedilir — kanıtsız zirve zirve değildir', () => {
    expect(igZirveKaydet('', 'S3')).toBe(false);
    expect(igZirveKaydet('   \n ', 'S3')).toBe(false);
    expect(S._imge.zirve).toBeNull();
  });

  it('gerçek alıntı kaydedilir ve köken kapısından geçer', () => {
    const cumle = 'Bugün ilk kez hayır diyebildim.';
    expect(igZirveKaydet(cumle, 'S7', '2026-08-04')).toBe(true);
    expect(S._imge.zirve).toEqual({ alinti: cumle, ref: 'S7', gun: '2026-08-04' });
    const z = igGetZirve();
    expect(z.kaynak).toBe('beyan');
    expect(z.kanit).toBe(cumle);
    expect(kokenKayitVar(z)).toBe(true);
  });

  it('zirve yokken kapı KAPALI (13h satırı / 13j sahnesi çizilmez)', () => {
    const z = igGetZirve();
    expect(z.kaynak).toBe('yok');
    expect(kokenKayitVar(z)).toBe(false);
  });
});

/* K2 — "alıntı yazılmaz, gösterilir". Bu blok 09a'nın zirve zincirini
   (kokenSozBlok → model kanit_ref → kokenAlintiCoz → igZirveKaydet)
   09a'yı çağırmadan, aynı köken fonksiyonlarıyla birebir taklit eder:
   09a'nın kendi zinciri ağ/LLM gerektirdiği için burada sözleşmenin
   KENDİSİ sınanır — modelin uydurduğu bir cümle asla zirve olamaz. */
describe('Zirve zinciri — kanıt kaynaktan kesilir (K2)', () => {
  const sozler = [
    'Bugün toplantıda sustum yine.',
    'Aslında ilk kez fark ettim, susmak da bir seçim.',
    'Yarın konuşacağım.',
  ];

  it('geçerli ref → kullanıcının GERÇEK cümlesi kaydedilir', () => {
    const { blok, harita } = kokenSozBlok(sozler, { max: 24, maxLen: 180 });
    expect(blok).toContain('S2');
    const cozum = kokenAlintiCoz('S2', null, harita, sozler);
    expect(cozum).not.toBeNull();
    expect(igZirveKaydet(cozum.alinti, 'S2', '2026-08-04')).toBe(true);
    // Kaydedilen, havuzdaki cümlenin BİREBİR kendisi olmalı
    expect(sozler).toContain(igGetZirve().kanit);
  });

  it('havuzda olmayan ref → çözülmez, zirve YAZILMAZ (sessizce düşer)', () => {
    const { harita } = kokenSozBlok(sozler, { max: 24, maxLen: 180 });
    const cozum = kokenAlintiCoz('S99', null, harita, sozler);
    expect(cozum).toBeNull();
    // 09a bu durumda igZirveKaydet'i HİÇ çağırmaz → kayıt boş kalır
    expect(igGetZirve().kaynak).toBe('yok');
  });

  it('modelin uydurduğu cümle ref\'siz geçirilemez — kapı kanıttır', () => {
    const uydurma = 'Kullanıcı asla böyle bir cümle kurmadı.';
    const cozum = kokenAlintiCoz(null, uydurma, kokenSozBlok(sozler).harita, sozler);
    expect(cozum).toBeNull();      // havuzda birebir yok → bağlanamaz
    expect(igGetZirve().kaynak).toBe('yok');
  });
});

// ─── Tanıma Motoru (FAZ 1) — Gözlemevi sonuç raporu (00f wtOverlayClose) ────
describe('igOpenKapi töreni — sonuc muhur/kapat', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.matchMedia = () => ({
      matches: true, // reduced-motion: basılı-tut anında mühürler
      addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
    });
    window.wtOverlayOpen = () => {};
  });
  afterEach(() => {
    delete window.matchMedia;
    delete window.wtOverlayOpen;
    delete window.wtOverlayClose;
  });

  it('ızgarada × ile kapatmak sonuc=\'kapat\' taşır — hiçbir imge seçilmedi', () => {
    const spy = vi.fn();
    window.wtOverlayClose = spy;
    igOpenKapi();
    document.querySelector('.ig-x').click();
    expect(spy).toHaveBeenCalledWith('imge-kapisi', 'kapat');
  });

  it('imge seçilip vazgeçilirse (geri) sonuc=\'kapat\' — henüz mühürlenmedi', () => {
    const spy = vi.fn();
    window.wtOverlayClose = spy;
    igOpenKapi();
    document.querySelector('.ig-cell').click();
    document.querySelector('.ig-veil').click(); // neden sahnesinde backdrop
    expect(spy).toHaveBeenCalledWith('imge-kapisi', 'kapat');
  });

  it('basılı-tut mühürü tamamlanınca "ŞİMDİLİK YETER" sonuc=\'muhur\' taşır', () => {
    const spy = vi.fn();
    window.wtOverlayClose = spy;
    igOpenKapi();
    document.querySelector('.ig-cell').click();
    const input = document.querySelector('.ig-neden-in');
    input.value = 'Çünkü hep bu imgeye dönüyorum.';
    input.dispatchEvent(new Event('input'));
    document.querySelector('.ig-press').dispatchEvent(new Event('pointerdown'));
    expect(S._imge.aktif).toBeTruthy(); // mühür gerçekten basıldı (igSec)
    document.querySelector('.ig-bitir').click();
    expect(spy).toHaveBeenCalledWith('imge-kapisi', 'muhur');
  });

  it('igDerinles (BU İMGEYLE KONUŞ) de \'muhur\' taşır — yalnız mühür sonrası erişilir', () => {
    const spy = vi.fn();
    window.wtOverlayClose = spy;
    window.switchView = () => {};
    igOpenKapi();
    document.querySelector('.ig-cell').click();
    const input = document.querySelector('.ig-neden-in');
    input.value = 'Çünkü hep bu imgeye dönüyorum.';
    input.dispatchEvent(new Event('input'));
    document.querySelector('.ig-press').dispatchEvent(new Event('pointerdown'));
    document.querySelector('.ig-derin').click();
    expect(spy).toHaveBeenCalledWith('imge-kapisi', 'muhur');
    delete window.switchView;
  });
});
