// @vitest-environment node
// Bu dosya denetçiyi spawnSync ile ayrı süreçte koşar — DOM'a hiç dokunmaz.
// jsdom kurulumu dosya başına ~3 sn'dir (ölçüldü); burada bedava ödenirdi.

/**
 * İHTİMALSEL DİL KAPISI — "Wanderer bilir gibi değil, görebiliyor gibi
 * konuşur" mimarisinin vitest bekçisi.
 *
 * scripts/ihtimalsel-denetci.mjs'i koşar; beş sözlük dosyasından herhangi
 * biri TABAN ÇİZGİSİNİ (scripts/ihtimalsel-taban.json, K7) aşarsa bu test
 * KIRILIR. Kalıp emsaldir: tests/gerceklik-kapisi.test.js (spawnSync + exit
 * kodu) — çalışan kapı deseni ikinci kez kullanıldı, yenisi icat edilmedi.
 *
 * İkinci describe bloğu kapının KENDİSİNİ sınar: yeşil kalmak için her
 * kuralı, muafiyet mekanizmasını ve dizi-değeri (K4 dokunulmaz alanlar)
 * doğru anahtara bağladığını da kanıtlamalı. Yakalamayan bir kapı, kapı
 * değildir.
 *
 * Bilinçli istisna: ihlalin geçtiği satıra ya da hemen üstündeki yorum
 * bloğuna `/* IHTIMAL-MUAF: gerekçe *​/` yazılır. Gerekçesiz muafiyet de
 * ihlaldir. Ayrıntı: .claude/plans/ihtimalsel-dil-devrimi.md ·
 * scripts/i18n-style/tr.md
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DENETCI = join(ROOT, 'scripts/ihtimalsel-denetci.mjs');
const TABAN = join(ROOT, 'scripts/ihtimalsel-taban.json');

function kos(args = []) {
  return spawnSync('node', [DENETCI, ...args], { cwd: ROOT, encoding: 'utf8' });
}

describe('ihtimalsel dil kapısı — repo taban çizgisini aşmıyor', () => {
  it('ihtimalsel-denetci.mjs taban çizgisiyle geçer (regresyon yok)', () => {
    const res = kos();
    if (res.status !== 0) {
      throw new Error(
        `ihtimalsel-denetçi ${res.status} ile kırıldı — taban çizgisi aşıldı:\n${res.stdout}${res.stderr}`
      );
    }
    expect(res.status).toBe(0);
  });

  /* 16b/16e taramadan ÇIKARILDI (K5) — oradaki her değer modele verilen
     talimattır, kullanıcıya giden metin değil; modelin çıktı register'ı
     prompt.identity.core XI bloğunda kurulur. Gerekçe denetçinin
     TARAMA_DOSYALARI banner'ında. */
  it('taban dosyası üç kanonik dosyayı da kapsar', () => {
    const taban = JSON.parse(readFileSync(TABAN, 'utf8'));
    const beklenen = [
      'js/parts/15b-i18n-dict-core.js',
      'js/parts/15e-i18n-dict-en.js',
      'js/parts/12b2-deste-icerik.js',
    ];
    for (const dosya of beklenen) {
      expect(taban).toHaveProperty(dosya);
      expect(typeof taban[dosya]).toBe('number');
    }
    expect(typeof taban._aciklama).toBe('string');
    expect(taban._aciklama.length).toBeGreaterThan(10);
  });
});

describe('ihtimalsel dil kapısı — kapının kendisi çalışıyor', () => {
  let dir;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'ihtimal-kapi-'));

    // 15b — TR sözlük: her kural için bir örnek + muaf kategoriler
    writeFileSync(join(dir, '15b-i18n-dict-core.js'), `
export const I18N_CORE = {
  tr: {
    // Çok satırlı şablon dizesi: ikinci satırdaki ihlal, satır başında hiçbir
    // anahtar olmamasına rağmen ŞABLONU AÇAN anahtarla raporlanmalı.
    'coksatirli.sablon': \`Bu şablonun ilk satırı yalnızca bir davettir.
İkinci satır kesin yargı ekiyle biter ve bir mühürdür.\`,
    'kk.sentez.hint': 'bu iki niteliği önce tek tek yaşamalısın',
    'sefer.erteleme.task.0': 'Bir kâğıt al. Üç madde yaz.',
    'sozver.ornek': 'Bu sözü yarın mutlaka tutacaksın ve asla unutmayacaksın.',
    'hayattaki_sen.no_data': 'Birkaç gün Emre ile konuş — sonra burası seni gösterecek.',
    'meclis.empty': 'yüzlerin burada belirmeye başlayacak.',
    'oik.design.s1_aph': 'Bu, kesinlikle iradenin apaçık kanıtıdır ve tartışılmazdır.',
    // MUAF kategoriler — hiçbiri ihlal ÜRETMEMELİ. 'prompt.identity.core'
    // bilerek son sırada DEĞİL: hemen ardından gerekçesiz-muaf satırı
    // gelseydi o ihlalin raporlanan "anahtar"ı (son bilinen anahtar
    // bağlamı) yanlışlıkla prompt.identity.core görünürdü — testin kendisi
    // yanlış pozitif üretmesin diye araya iki muaf-olmayan anahtar girer.
    'prompt.identity.core': 'Bu metin yalnız 16b/16e\\'de test edilir; burada yalnız anahtar adı sınanıyor.',
    'gl.soz.iliski.oz_sevgi.1': 'Bugün sevdiğim birine içtenlikle teşekkür edeceğim ve mühürleyeceğim.',
    'toast.network_error': 'Bağlantı kuramadık, yeniden deneyeceksin.',
    'mr.item.0.title': 'Bu ilkeyi her gün mutlaka uygulayacaksın.',
    // Tampon anahtar: gerekçesiz-muaf ihlali "son bilinen anahtar" bağlamıyla
    // raporlanır (bkz. denetçi: ihlalEkle(..., currentKey || …)) — yukarıdaki
    // muaf test anahtarlarından biri burada olsaydı MUAF grubu yanlışlıkla o
    // anahtarla görünür, testin negatif sınavlarını kirletirdi.
    'test.ara_anahtar': 'Bu satır yalnızca sonraki testin tamponu olarak durur.',
    // Satır muafiyeti — gerekçesiz (kendisi ihlaldir). Pencereler çakışmasın
    // diye gerekçeli örnekten (aşağıda) en az 6 satır önde durur.
    /* IHTIMAL-MUAF: */
    'sinama.bos_gerekce': 'Bu cümle de aynı kalıba düşer ve yakalanmalısın.',
    // ── ara satırlar — iki muafiyet penceresinin çakışmaması için ──
    // ── (MUAF_PENCERE = 6; aradaki boşluk bilerek geniş tutuldu) ──
    // ── ────────────────────────────────────────────────────── ──
    // ── ────────────────────────────────────────────────────── ──
    // Satır muafiyeti — gerekçeli:
    /* IHTIMAL-MUAF: sistem kısıtı, kanıt gerekmez */
    'gor.window.empty_body': 'Bu pencereden bakamazsın; önce tasarlamalısın.',
  },
};
`);

    // 15e — EN sözlük: will/must/have to/you are
    writeFileSync(join(dir, '15e-i18n-dict-en.js'), `
export const I18N_EN = {
    'settings.security.desc': 'A password reset link will be sent to your email address.',
    'onb.hint': 'You must complete this step before you can continue further.',
    'onb.hint2': 'You have to finish the onboarding flow before using the app.',
    'oik.design.present_verdict': 'You are avoiding this conversation on purpose.',
};
`);

    // 12b2 — kart destesi: `dusunceler` gibi dizi alanları ANAHTARINA
    // bağlanmalı, önceki (muaf OLMAYAN) alana SIZMAMALI. Bu, FAZ 1'in ilk
    // sürümünde bulunup düzeltilen bir hatanın regresyon testidir.
    writeFileSync(join(dir, '12b2-deste-icerik.js'), `
export function buildDeckData() {
  return {
    ornek: {
      portre: 'Kararlarını hep dışarıya göre alan; şimdi kendine sormayı öğrenen kişidir.',
      lesson: 'Bunu şimdi mutlaka yaşamalısın ve asla unutmayacaksın.',
      dusunceler: ['Bunu şimdi mutlaka yaşamalısın ve asla unutmayacaksın.', 'İkinci cümle de aynı kalıptadır.'],
      id: 'ornek-kart-mutlaka-yapmalisin-bunu-asla-unutmayacaksin',
      signals: [{ key: 'ornekMutlakaYapmalisinBunuAslaUnutmayacaksin', dim: 'davranislar', w: 1 }],
    },
  };
}
`);

    // 16b — prompt sözlüğü: backtick şablon + prompt.identity.core (tam
    // muaf) ve prompt.mode.* (muaf DEĞİL, çok satırlı şablon).
    writeFileSync(join(dir, '16b-i18n-prompt-dict-core.js'), `
export const PROMPT_I18N_CORE = {
tr: {
  'prompt.identity.core': \`Bu metin Manifesto 12 ilkesini taşır ve mutlaka aynen kalacaktır.
İkinci satır da kesin yargı ekiyle biter ve bir mühürdür.\`,
  'prompt.mode.protocol': \`Kullanıcıyı dinle ve doğrudan cevap ver.
Bu ipucu kesin bir yargı eki ile biten bir cümledir.\`,
},
};
`);

    // 16e — prompt sözlüğü EN.
    writeFileSync(join(dir, '16e-i18n-prompt-dict-en.js'), `
export const PROMPT_I18N_EN = {
  'prompt.mode.protocol': 'You must always answer directly and you will never deflect the question.',
};
`);

    // Tümüyle temiz bir dosya — 0 ile çıkmalı.
    writeFileSync(join(dir, '12b2-temiz.js'), `
export const X = { a: 1 };
`);
  });

  afterAll(() => { try { rmSync(dir, { recursive: true, force: true }); } catch (_) {} });

  it('buyruk kipini (-malısın/-melisin) yakalar', () => {
    const res = kos(['--dizin', dir, '--liste']);
    const cikti = res.stdout + res.stderr;
    expect(cikti).toContain('BUYRUK-MALI');
    expect(cikti).toContain('kk.sentez.hint');
  });

  it('çıplak emir fiilini (cümle sonunda) yakalar', () => {
    const res = kos(['--dizin', dir, '--liste']);
    const cikti = res.stdout + res.stderr;
    expect(cikti).toContain('BUYRUK-CIPLAK');
    expect(cikti).toContain('sefer.erteleme.task.0');
  });

  it('kesin geleceği (-acaksın/-eceksin VE çıplak -acak./-ecek.) yakalar', () => {
    const res = kos(['--dizin', dir, '--liste']);
    const cikti = res.stdout + res.stderr;
    expect(cikti).toContain('GELECEK-SIN');
    expect(cikti).toContain('sozver.ornek');
    expect(cikti).toContain('GELECEK-CIPLAK');
    expect(cikti).toContain('hayattaki_sen.no_data');
    expect(cikti).toContain('meclis.empty');
  });

  it('kesin yargı ekini (-dır/-dir/-dur/-dür/-tır/-tir/-tur/-tür) yakalar', () => {
    const res = kos(['--dizin', dir, '--liste']);
    const cikti = res.stdout + res.stderr;
    expect(cikti).toContain('YARGI-EKI');
    expect(cikti).toContain('oik.design.s1_aph');
  });

  it('İngilizce will/must/have to/you are kalıplarını yakalar', () => {
    const res = kos(['--dizin', dir, '--liste']);
    const cikti = res.stdout + res.stderr;
    expect(cikti).toContain('EN-WILL');
    expect(cikti).toContain('EN-MUST');
    expect(cikti).toContain('EN-HAVETO');
    expect(cikti).toContain('EN-BARE-ASSERT');
    expect(cikti).toContain('settings.security.desc');
    expect(cikti).toContain('onb.hint');
    expect(cikti).toContain('onb.hint2');
    expect(cikti).toContain('oik.design.present_verdict');
  });

  it('kategorik muafiyetleri (gl.soz/hata/mr.item.title/prompt.identity.core) yakalamaz', () => {
    const res = kos(['--dizin', dir, '--liste']);
    const cikti = res.stdout + res.stderr;
    expect(cikti).not.toContain('gl.soz.iliski.oz_sevgi.1');
    expect(cikti).not.toContain('toast.network_error');
    expect(cikti).not.toContain('[mr.item.0.title]');
    expect(cikti).not.toContain('[prompt.identity.core]');
  });

  it('12b2 dokunulmaz/donuk alanları (lesson/dusunceler/id/signals) yakalamaz — dizi değeri komşu anahtara SIZMAZ', () => {
    const res = kos(['--dizin', dir, '--liste']);
    const cikti = res.stdout + res.stderr;
    expect(cikti).not.toContain('[lesson]');
    expect(cikti).not.toContain('[dusunceler]');
    expect(cikti).not.toContain('[id]');
    expect(cikti).not.toContain('[signals]');
    // portre MUAF değildir — kendi ihlalini üretmeli (kural: kişidir. YARGI-EKI'ye düşmez
    // ama en azından dosya taranmış olmalı; asıl sınav yukarıdaki negatiflerdir).
  });

  it('çok satırlı şablon dizesini (backtick) doğru anahtara bağlar, prompt.identity.core\'u muaf sayar', () => {
    const res = kos(['--dizin', dir, '--liste']);
    const cikti = res.stdout + res.stderr;
    expect(cikti).not.toContain('[prompt.identity.core]');
    // Şablonun İKİNCİ satırındaki ihlal — satır başında anahtar yok — yine de
    // şablonu açan anahtarla raporlanır; bağlam kaymazsa test yeşil kalır.
    expect(cikti).toContain('[coksatirli.sablon]');
  });

  it('gerekçeli satır muafiyetini (IHTIMAL-MUAF) yakalamaz, gerekçesizi yakalar', () => {
    const res = kos(['--dizin', dir, '--liste']);
    const cikti = res.stdout + res.stderr;
    expect(cikti).not.toContain('gor.window.empty_body');
    expect(cikti).toContain('sinama.bos_gerekce');
    expect(cikti).toContain('MUAF');
  });

  it('taban dosyası yokken (--dizin) HERHANGİ bir ihlalde exit 1 verir — K7 self-hardening', () => {
    const res = kos(['--dizin', dir]);
    expect(res.status).toBe(1);
  });

  it('tümüyle temiz bir dizinde 0 ile çıkar', () => {
    const temiz = mkdtempSync(join(tmpdir(), 'ihtimal-temiz-'));
    writeFileSync(join(temiz, '15b-i18n-dict-core.js'), `
export const I18N_CORE = {
  tr: {
    'ok.deneme': 'Bu belki, çoğu zaman böyle görünen ve sana ait kalan bir cümle olabilir.',
  },
};
`);
    const res = kos(['--dizin', temiz]);
    try { rmSync(temiz, { recursive: true, force: true }); } catch (_) {}
    expect(res.status).toBe(0);
  });
});
