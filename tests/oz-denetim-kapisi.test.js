// @vitest-environment node
// Dosya sistemiyle çalışır, DOM'a hiç dokunmaz — jsdom kurulumunu boşa ödemez.

/**
 * OPUS ÖZ-DENETİMİ KAPISI — "kapanmış plan, kaydını taşımıyor" sınıfının
 * bekçisi (PROTOKOL-FABLE.md §3.7, Emre'nin kuralı 2026-09-03).
 *
 * KURAL: kapanmış bir plan dosyası, §3.7'nin öz-denetim kaydını
 * (`## Opus öz-denetimi — <tarih>`) taşımak zorundadır. Kayıt yoksa tur ya
 * koşulmamıştır ya raporlanmamıştır — ikisi de aynı sonucu verir (§6.2).
 *
 * NEDEN KAPI GEREKİYOR: §4.4'ün devir kuralı da kağıtta doğruydu, ölçüde
 * yoktu — yirmi dokuz günde öldü çünkü kimse saymadı (149 🅢 faza karşı 11
 * `uygulayici` çağrısı, `.claude/plans/opus-oz-denetimi.md` K2). Dördüncü bir
 * denetim turu (§3.7) kapısı olmadan aynı akıbete uğrar: raporun bir
 * başlığına döner, kimse koşup koşmadığını bilmez. Bu dosya o kapıdır —
 * kalıp `tests/referans-butunlugu-kapisi.test.js`'in birebir aynısı: tarama
 * motoru + TABAN listesi + kapının kendi self-test'i.
 *
 * TARAMA ALANI: `.claude/plans/` altındaki `*.md` dosyaları — YALNIZ o
 * dizin, recursive DEĞİL. `README.md` hariç (o bir envanter, plan değil).
 *
 * "KAPANMIŞ" TESPİTİ — iki işaretten biri yeterli: bir başlık satırı
 * `/^#{2,3}\s*kapanış/i`e uyuyor (`## Kapanış — …`, `## KAPANIŞ — …`), ya da
 * dosya metni harf-duyarsız `sprint kapandı` ifadesini içeriyor. `## Durum`
 * TEK BAŞINA kapanış SAYILMAZ — §3.6 o başlığı faz kayıt noktası için de
 * kullanır; kapanış saymak açık planlarda yanlış kırmızı üretirdi.
 *
 * TABAN — bugünkü borç, bilerek tolere edilir: kural bugün (2026-09-03)
 * doğdu ve repoda üç plan ondan ÖNCE kapandı (`denetim-onarimi.md`,
 * `devir-altyapisi.md`, `hafiza-borcu-odemesi.md`). Geriye dönük ihlal
 * üretmek dürüst olmaz — TABAN o üçünü adıyla listeler. Küçülmek
 * serbesttir: TABAN'daki bir plana kayıt sonradan yazılırsa test kırılmaz.
 * TABAN'da olmayan her yeni kapalı-kayıtsız plan testi KIRAR.
 *
 * KAPININ KENDİ KÖR NOKTASI (gizlenmez, adlandırılır): bu kapı yalnız
 * *kapanış işareti taşıyan* planı görür. Bir plan bu iki işaretin (başlık ya
 * da ifade) HİÇBİRİNİ kullanmadan — ör. son cümlesi "iş bitti" diye biterek —
 * kapanırsa kapı onu "açık" sanır ve öz-denetim kaydı istemeden sessizce
 * geçer. Bu, [[kapi-sessiz-gec]]'in K4 dersiyle aynı ailedendir: kapı yalnız
 * KENDİ tanıdığı deseni arar, planın gerçek durumunu değil. Bu yüzden
 * körlüğün İKİNCİ hâli de sınanır: tarama hiç plan dosyası görmezse YA DA
 * hiçbir planı kapanmış bulamazsa (ki bu, tespit deseninin kırıldığının
 * işareti de olabilir) test KIRMIZI kapanır — boş bulgu listesi tek başına
 * bir sonuç değildir.
 *
 * İKİNCİ describe kapının KENDİSİNİ sınar: yeşil kalmak için ihlali
 * yakalayabildiğini de kanıtlamalı. Yakalamayan bir kapı, kapı değildir.
 * Fixture'lar `os.tmpdir()` altında kurulur, repo ağacına HİÇ yazılmaz —
 * repo köküne yazan bir test, `js/` gezen denetçilerle yarışır
 * ([[kapi-tarama-yarisi]]).
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, statSync, readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/* ─── 1. TARAMA MOTORU ─── */

/** JS'in `/i` bayrağı büyük Türkçe "I"yı (noktasız, ASCII 'I' ile aynı kod
 *  noktası U+0049) küçük "ı"ya (U+0131) DEĞİL, standart Unicode kuralıyla
 *  küçük "i"ye (U+0069) çevirir — bu Türkçe kuralı değildir. Sonuç:
 *  `/kapanış/i.test('KAPANIŞ')` YANLIŞ döner ve repoda tam olarak bu satır
 *  var: `devir-altyapisi.md:538` → "## KAPANIŞ — 2026-09-02". Naif bir
 *  `/i` kapısı bu gerçek kapanışı görmezdi (TABAN'da olduğu için aggregate
 *  sonucu değiştirmez, ama tespitin kendisini yanlış kılardı — bkz. altta
 *  "büyük harfli KAPANIŞ" self-test'i). Bu yüzden desenler ham metne değil,
 *  ÖNCE Türkçe kuralıyla küçültülmüş metne uygulanır.
 *
 *  Motor elle YAZILMAZ: repo bu işi zaten `toLocaleLowerCase('tr')` ile
 *  yapıyor ve yirmiden fazla çağrısı var (`js/parts/12d-kart-uretim.js:158`,
 *  `js/parts/09a-personalization-engine.js:1210`, …). Elle harf haritası
 *  yazmak o motorun ikizini kurmak olurdu (§1.3) — ilk yazımında öyle
 *  yazılmıştı, Opus öz-denetimi (§3.7, kod ekseni) bunu buldu. */
const trKucult = (s) => String(s).toLocaleLowerCase('tr');

/** `.claude/plans/` dizinini (yalnız o dizin, recursive DEĞİL) tarar;
 *  `.md` uzantılı ve `README.md` olmayan dosyaların tam yollarını döndürür.
 *  Dizin yoksa (fixture'da olmayabilir) sessizce boş döner — [[kapi-tarama-yarisi]]
 *  kalıbı: listelenmiş ama anlık olarak yok olan bir girdi repo'nun kalıcı
 *  parçası değildir. */
function planDosyalari(kok) {
  const dizin = join(kok, '.claude/plans');
  let girdiler;
  try { girdiler = readdirSync(dizin); }
  catch (_) { return []; }
  const sonuc = [];
  for (const ad of girdiler) {
    if (!ad.endsWith('.md') || ad === 'README.md') continue;
    const tam = join(dizin, ad);
    let st;
    try { st = statSync(tam); } catch (_) { continue; }
    if (st.isFile()) sonuc.push(tam);
  }
  return sonuc.sort();
}

const KAPANIS_BASLIK_RE = /^#{2,3}\s*kapanış/; // trKucult sonrası metne uygulanır
const KAPANIS_IFADE_RE = /sprint kapandı/; // trKucult sonrası, tüm metinde
// Tam olarak İKİ diyez: `^##\s+` üçüncü karakter '#' ise \s+ orada başarısız
// olur (H3'ü eler); tek diyezli başlık zaten "##" ile başlamaz (H1'i eler).
const KAYIT_RE = /^##\s+opus öz-denetimi/;

/** Fenced kod bloklarının DIŞINDAKİ satırlar. §3.7'nin kayıt şablonu
 *  protokolde ``` içinde duruyor; bir plan onu örnek diye alıntılarsa satır
 *  başındaki başlık gerçek bir kayıt gibi görünür ve kapı SAHTE YEŞİL basar.
 *  Aynı tuzağın ters yönü de var: alıntılanan bir `## Kapanış` örneği AÇIK
 *  bir planı kapanmış sayar ve yanlış kırmızı üretir. Ölçüm (2026-09-03):
 *  bugün repoda iki vakadan da yok — kapı vakayı beklemiyor, yolu kapatıyor. */
function kodDisiSatirlar(metin) {
  const out = [];
  let fence = false;
  for (const satir of metin.split('\n')) {
    if (/^\s{0,3}(```|~~~)/.test(satir)) { fence = !fence; continue; }
    if (!fence) out.push(satir);
  }
  return out;
}

/** Metin "kapanmış" mı — iki işaretten biri: başlık satırı ya da ifade.
 *  İkisi de yalnız kod bloğu DIŞINDA aranır. */
function kapanmisMi(metin) {
  const satirlar = kodDisiSatirlar(trKucult(metin));
  if (satirlar.some((satir) => KAPANIS_BASLIK_RE.test(satir))) return true;
  return KAPANIS_IFADE_RE.test(satirlar.join('\n'));
}

/** Metin §3.7'nin öz-denetim kaydını (tam H2 başlık) taşıyor mu. */
function kayitVarMi(metin) {
  return kodDisiSatirlar(trKucult(metin)).some((satir) => KAYIT_RE.test(satir));
}

/** Kök dizinden `.claude/plans/*.md` dosyalarını okur, her biri için
 *  {ad, kapanmis, kayitli} döndürür. Saf — yan etkisi yok. */
function planlariTara(kok) {
  return planDosyalari(kok).map((tam) => {
    const metin = readFileSync(tam, 'utf8');
    return { ad: basename(tam), kapanmis: kapanmisMi(metin), kayitli: kayitVarMi(metin) };
  });
}

/** Kapının ana sorgusu. Önce körlüğü sınar (K4 — [[kapi-sessiz-gec]]): sıfır
 *  plan dosyası ya da sıfır kapanmış plan, "ihlal yok" demek DEĞİLDİR —
 *  taramanın kendisi kör demektir, bu yüzden burada FIRLATILIR (throw), boş
 *  bir sonuç dizisiyle sessizce dönülmez. Tarama sağlamsa TABAN dışı
 *  kapalı+kayıtsız planların listesini döner. */
function kapiSonucu(kok, taban) {
  const planlar = planlariTara(kok);
  if (planlar.length === 0) {
    throw new Error(
      'Tarama sıfır plan dosyası gördü (.claude/plans altında .md yok ya da ' +
      'dizin yok). Bu bir "ihlal yok" sonucu DEĞİL — taramanın kendisi kör.'
    );
  }
  const kapanmislar = planlar.filter((p) => p.kapanmis);
  if (kapanmislar.length === 0) {
    throw new Error(
      `Tarama ${planlar.length} plan dosyası gördü ama hiçbirini kapanmış ` +
      'bulamadı. Bu, tüm planların açık olduğu anlamına gelmeyebilir — ' +
      'kapanış tespit deseninin (başlık/ifade) kırıldığının belirtisi de ' +
      'olabilir; ikisi ayırt edilemediği için tarama kör sayılır.'
    );
  }
  const ihlaller = kapanmislar.filter((p) => !p.kayitli && !taban.has(p.ad));
  return { toplamPlan: planlar.length, kapanmisSayisi: kapanmislar.length, ihlaller };
}

/* ─── 2. TABAN — 2026-09-03, üç ad (K3) ───
   Kural bu tarihte doğdu; bu üç plan ondan ÖNCE kapandı ve geriye dönük
   ihlal üretmek dürüst olmaz (§7: hafıza geçmişin fotoğrafıdır, kural
   geleceğin). `devir-altyapisi.md` özellikle "## KAPANIŞ" başlığını BÜYÜK
   harfle taşır (bkz. trKucult yorumu) — TABAN'da olduğu için bu, tespitin
   yanlış çalışması hâlinde bile aggregate sonucu değiştirmez; ama gerçek
   tespit doğruluğu ayrıca aşağıda (birinci describe, üçüncü it) sınanır. */
const TABAN = new Set([
  'denetim-onarimi.md',
  'devir-altyapisi.md',
  'hafiza-borcu-odemesi.md',
]);

/* ─── 3. ANA KAPI — gerçek repo ─── */

describe('Opus öz-denetimi kapısı — kapanmış plan kaydını taşıyor mu (§3.7)', () => {
  it('TABAN dışında kapalı+kayıtsız plan yok (büyümek yasak, küçülmek serbest)', () => {
    const { ihlaller } = kapiSonucu(ROOT, TABAN);
    if (ihlaller.length) {
      const detay = ihlaller.map((p) => `  ${p.ad}`).join('\n');
      throw new Error(
        `${ihlaller.length} plan kapandı ama '## Opus öz-denetimi — <tarih>' ` +
        `kaydı yok:\n${detay}\n\nKaydı §3.7'nin biçimiyle plana ekle, ya da ` +
        `gerçekten hâlâ ödenemeyen bir borçsa TABAN'a gerekçeyle koy.`
      );
    }
    expect(ihlaller).toEqual([]);
  });

  it('tarama sağlam — en az bir plan dosyası ve en az bir kapanış işareti görüldü', () => {
    const planlar = planlariTara(ROOT);
    expect(planlar.length).toBeGreaterThan(0);
    expect(planlar.some((p) => p.kapanmis)).toBe(true);
  });

  it('devir-altyapisi.md büyük harfli "## KAPANIŞ" başlığına rağmen kapanmış sayılıyor', () => {
    // trKucult'un varlık gerekçesi: naif `/i` burada YANLIŞ ("kapanmamış")
    // derdi. TABAN'da olduğu için aggregate sonucu değişmezdi, ama tespitin
    // kendisi yanlış olurdu — bu satır o farkı doğrudan sınar.
    const planlar = planlariTara(ROOT);
    const p = planlar.find((x) => x.ad === 'devir-altyapisi.md');
    expect(p).toBeTruthy();
    expect(p.kapanmis).toBe(true);
  });
});

/* ─── 4. KAPININ KENDİSİ ─── */

describe('Opus öz-denetimi kapısı — kapının kendisi çalışıyor', () => {
  /** Verilen {dosyaAdı: içerik} eşlemesini `os.tmpdir()` altında geçici bir
   *  `.claude/plans/` ağacına yazar. Repo köküne HİÇ dokunmaz. */
  function fixtureKur(dosyalar) {
    const dizin = mkdtempSync(join(tmpdir(), 'oz-denetim-kapi-'));
    mkdirSync(join(dizin, '.claude/plans'), { recursive: true });
    for (const [ad, icerik] of Object.entries(dosyalar)) {
      writeFileSync(join(dizin, '.claude/plans', ad), icerik);
    }
    return dizin;
  }

  it('(a) kapalı + kayıtsız plan → ihlal yakalanır', () => {
    const dizin = fixtureKur({
      'ornek-kapali.md': '# Örnek Plan\n\n## Durum\n\nİş bitti.\n\n## Kapanış — 2026-09-05\n\nDetaylar.\n',
    });
    try {
      const { ihlaller } = kapiSonucu(dizin, new Set());
      expect(ihlaller.map((p) => p.ad)).toContain('ornek-kapali.md');
    } finally {
      rmSync(dizin, { recursive: true, force: true });
    }
  });

  it('(b) kapalı + `##` Opus öz-denetimi kaydı olan plan → sessiz', () => {
    const dizin = fixtureKur({
      'ornek-kayitli.md':
        '# Örnek Plan\n\n## Kapanış — 2026-09-05\n\nDetaylar.\n\n' +
        '## Opus öz-denetimi — 2026-09-05\n**Plana karşı.** Vaat ↔ teslim tutarlı.\n',
    });
    try {
      const { ihlaller } = kapiSonucu(dizin, new Set());
      expect(ihlaller.map((p) => p.ad)).not.toContain('ornek-kayitli.md');
    } finally {
      rmSync(dizin, { recursive: true, force: true });
    }
  });

  it('(c) açık plan (`## Durum` var, kapanış işareti yok) → sessiz', () => {
    const dizin = fixtureKur({
      // Körlük guard'ı yanlışlıkla tetiklenmesin diye en az bir kapalı+kayıtlı
      // dosya eşlik eder — bu test yalnız "açık plan" davranışını sınar.
      'guvenlik-kapatilmis.md':
        '# Güvenlik\n\n## Kapanış — 2026-09-01\n\n## Opus öz-denetimi — 2026-09-01\nTamam.\n',
      'ornek-acik.md': '# Örnek Plan\n\n## Durum\n\nFAZ 2 sürüyor, kapanmadı.\n',
    });
    try {
      const { ihlaller } = kapiSonucu(dizin, new Set());
      expect(ihlaller.map((p) => p.ad)).not.toContain('ornek-acik.md');
    } finally {
      rmSync(dizin, { recursive: true, force: true });
    }
  });

  it('(d) tek diyezli "# Opus Öz-Denetimi" başlığı kayıt SAYILMAZ — kapalıysa ihlal yakalanır', () => {
    // Bu sprintin kendi plan dosyasının (opus-oz-denetimi.md) H1 başlığıyla
    // aynı tuzak: "Opus Öz-Denetimi" kelimeleri geçiyor ama bu bir PLAN
    // BAŞLIĞI, §3.7'nin kaydı değil — kayıt tam olarak `##` (H2) olmalı.
    const dizin = fixtureKur({
      'guvenlik-kapatilmis.md':
        '# Güvenlik\n\n## Kapanış — 2026-09-01\n\n## Opus öz-denetimi — 2026-09-01\nTamam.\n',
      'sahte-kayit.md':
        '# Opus Öz-Denetimi — dikiş turu işin içine bakar; bu tur işin kendisine\n\n' +
        '## Kapanış — 2026-09-05\n\nDetaylar.\n',
    });
    try {
      const { ihlaller } = kapiSonucu(dizin, new Set());
      expect(ihlaller.map((p) => p.ad)).toContain('sahte-kayit.md');
    } finally {
      rmSync(dizin, { recursive: true, force: true });
    }
  });

  it('(e) boş dizin → körlük sınavının birinci hâli, "temiz" demeyen bir gerekçeyle kırmızı', () => {
    const dizin = mkdtempSync(join(tmpdir(), 'oz-denetim-bos-'));
    try {
      let hata = null;
      try { kapiSonucu(dizin, new Set()); } catch (e) { hata = e; }
      expect(hata).toBeTruthy();
      expect(hata.message).not.toMatch(/temiz/i);
      expect(hata.message.length).toBeGreaterThan(0);
    } finally {
      rmSync(dizin, { recursive: true, force: true });
    }
  });

  it('(f) planlar var ama hiçbiri kapanmamış → körlük sınavının ikinci hâli, "temiz" demeyen bir gerekçeyle kırmızı', () => {
    const dizin = fixtureKur({
      'acik-1.md': '# Açık Plan 1\n\n## Durum\n\nFAZ 1 sürüyor.\n',
      'acik-2.md': '# Açık Plan 2\n\n## Durum\n\nFAZ 3 sürüyor.\n',
    });
    try {
      let hata = null;
      try { kapiSonucu(dizin, new Set()); } catch (e) { hata = e; }
      expect(hata).toBeTruthy();
      expect(hata.message).not.toMatch(/temiz/i);
    } finally {
      rmSync(dizin, { recursive: true, force: true });
    }
  });

  it('(g) büyük harfli "## KAPANIŞ" başlığı da kapanış sayılır (Türkçe büyük I sorunu, trKucult)', () => {
    const dizin = fixtureKur({
      'buyuk-harf.md': '# Büyük Harf Testi\n\n## KAPANIŞ — 2026-09-05\n\nDetaylar.\n',
    });
    try {
      const planlar = planlariTara(dizin);
      const p = planlar.find((x) => x.ad === 'buyuk-harf.md');
      expect(p.kapanmis).toBe(true);
    } finally {
      rmSync(dizin, { recursive: true, force: true });
    }
  });

  it('(h) TABAN\'daki kapalı+kayıtsız plan ihlal SAYILMAZ — bugünkü borç tolere edilir', () => {
    // K3'ün birinci yarısı. Kural 2026-09-03'te doğdu; ondan önce kapanmış
    // planları geriye dönük ihlal saymak dürüst olmaz.
    const dizin = fixtureKur({
      'eski-borc.md': '# Eski Plan\n\n## Kapanış — 2026-08-01\n\nDetaylar.\n',
    });
    try {
      const { ihlaller } = kapiSonucu(dizin, new Set(['eski-borc.md']));
      expect(ihlaller).toEqual([]);
    } finally {
      rmSync(dizin, { recursive: true, force: true });
    }
  });

  it('(i) TABAN\'daki plana kayıt sonradan yazılırsa test KIRILMAZ — küçülmek serbest', () => {
    // K3'ün ikinci yarısı ve emsalin (referans-butunlugu-kapisi) aynı kuralı:
    // TABAN büyüyemez, ama borcunu ödeyen bir dosya ceza görmez.
    const dizin = fixtureKur({
      'eski-borc.md':
        '# Eski Plan\n\n## Kapanış — 2026-08-01\n\n' +
        '## Opus öz-denetimi — 2026-09-03\nSonradan yazıldı.\n',
    });
    try {
      const { ihlaller } = kapiSonucu(dizin, new Set(['eski-borc.md']));
      expect(ihlaller).toEqual([]);
    } finally {
      rmSync(dizin, { recursive: true, force: true });
    }
  });

  it('(j) kod bloğu İÇİNDEKİ kayıt başlığı kayıt SAYILMAZ — sahte yeşil yolu kapalı', () => {
    // §3.7'nin kayıt şablonu protokolde ``` içinde duruyor. Bir plan onu
    // örnek diye alıntılarsa, satır başındaki başlık gerçek bir kayıt gibi
    // görünürdü ve kapı hiç koşulmamış bir turu "koşuldu" sayardı (§6.2).
    const dizin = fixtureKur({
      'sablon-alintilayan.md':
        '# Örnek Plan\n\n## Kapanış — 2026-09-05\n\nBiçim şudur:\n\n' +
        '```\n## Opus öz-denetimi — <tarih>\n**Plana karşı.** …\n```\n',
    });
    try {
      const { ihlaller } = kapiSonucu(dizin, new Set());
      expect(ihlaller.map((p) => p.ad)).toContain('sablon-alintilayan.md');
    } finally {
      rmSync(dizin, { recursive: true, force: true });
    }
  });

  it('(k) kod bloğu İÇİNDEKİ "## Kapanış" örneği planı kapanmış SAYMAZ — yanlış kırmızı yolu kapalı', () => {
    // Aynı tuzağın ters yönü: şablonu alıntılayan AÇIK bir plan kapanmış
    // sayılsaydı, kapı hiç kapanmamış bir plandan kayıt isterdi.
    const dizin = fixtureKur({
      'guvenlik-kapatilmis.md':
        '# Güvenlik\n\n## Kapanış — 2026-09-01\n\n## Opus öz-denetimi — 2026-09-01\nTamam.\n',
      'sablon-acik.md':
        '# Açık Plan\n\n## Durum\n\nFAZ 2 sürüyor. Kapanınca şu blok girecek:\n\n' +
        '```\n## Kapanış — <tarih>\n```\n',
    });
    try {
      const planlar = planlariTara(dizin);
      const p = planlar.find((x) => x.ad === 'sablon-acik.md');
      expect(p.kapanmis).toBe(false);
    } finally {
      rmSync(dizin, { recursive: true, force: true });
    }
  });

  it('boş/olmayan .claude/plans dizininde tarama sessizce boş döner (planDosyalari savunmacı)', () => {
    const dizin = mkdtempSync(join(tmpdir(), 'oz-denetim-yok-'));
    try {
      expect(planDosyalari(dizin)).toEqual([]);
      expect(planDosyalari(join(dizin, 'hic-yok'))).toEqual([]);
    } finally {
      rmSync(dizin, { recursive: true, force: true });
    }
  });
});
