// @vitest-environment node
// Kaynak taraması — DOM'a hiç dokunmaz, jsdom kurulumunu boşa ödemez.

/**
 * ALARM EŞİĞİ KAPISI — K6'nın kabul ettiği borcun ölçüsü.
 * İç Çalışma 17·F2 (FAZ 13b) · 2026-09-06
 *
 * Emre 2026-09-06'da "şerit + SQL alarm RPC'si + push" yolunu seçti. O
 * seçeneğin metni borcu adıyla söylüyordu: **eşikler artık İKİ yerde
 * yaşar** — istemcinin `if`'i (`13q-gozlemevi.js`) ve motorun `WHERE`'i
 * (`migrations/056_esik_alarmlari.sql`). Borç saklanmadı; iki şeyle
 * küçültüldü ve ölçülebilir kılındı:
 *
 *   1. SQL aynası 14 alanın hepsini değil, yalnız PUSH ATABİLEN ikisini
 *      hesaplar — ayrışabilecek eşik sayısı 14'ten 2'ye indi.
 *   2. Bu dosya o iki sayıyı İKİ KAYNAKTAN ayrıştırır ve eşleşmelerini
 *      şart koşar. Grep'lenemeyen bir borç sessizce ayrışır (§6.6:
 *      "kapısı olmayan kural, zamanla tavsiyeye döner").
 *
 * Bu sprintte sessiz ayrışma en pahalı sınıftı: bir plan cümlesi 8b'nin
 * kilidini "çözülmüş" ilan etti, kod o çağrıyı hiç almadı. Aynı sınıfın
 * burada doğmasına izin verilmiyor.
 *
 * Emsal: `tests/tik-atifi-kapisi.test.js` — o da bir istemci sözleşmesini
 * bir edge function'a karşı ölçer. Yeni bir kapı türü icat edilmedi.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const oku = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const SQL   = oku('migrations/056_esik_alarmlari.sql');
/* Yorumsuz gövde. Bu ayrım kapının kendi ilk koşusunda ÖDENDİ: başlıktaki
   açıklama `error_message`'ı ADIYLA anıyordu (neden seçilmediğini anlatmak
   için) ve kapı onu bir KULLANIM sandı. Bir yasak sütunun adını yazmak,
   onu seçmek değildir — ölçü koda bakmalı, düzyazıya değil. */
const SQL_GOVDE = SQL.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
const MOTOR = oku('supabase/functions/send-push/index.ts');
const KADRAN = oku('js/parts/13q-gozlemevi.js');

describe('K6 — iki kaynak aynı eşiği söylüyor mu', () => {
  it('hata eşiği (%40) SQL ile kadranda BİREBİR aynı', () => {
    /* Kadran tarafı `_hataNabzi`'nin kendi koşuludur: en sık etiketin payı
       %40'ı aşarsa hatalar tek bir kırıkta toplanıyordur. SQL tarafı aynı
       cümleyi `WHERE ... >= 40` olarak kurar. Biri değişip öteki kalırsa
       kadran bir şey der, telefon başka bir şey — ve hangisinin doğru
       olduğunu kimse bilmez. */
    /* İstemci tarafı DAĞINIK bir `if` sabitinden değil, adlandırılmış
       `GZ_ALARM_ESIK` bloğundan okunur — K6'nın şartı buydu: grep'lenemeyen
       bir borç sessizce ayrışır. `_hataNabzi` de aynı bloğu kullanır, yani
       istemcinin KENDİ içinde de tek kaynak var. */
    const blok = KADRAN.match(/const GZ_ALARM_ESIK = \{([\s\S]*?)\};/);
    expect(blok, '13q `GZ_ALARM_ESIK` bloğu bulunamadı').toBeTruthy();
    const kadranEsik = blok[1].match(/hata:\s*\{[^}]*esik:\s*(\d+)/);
    expect(kadranEsik, 'GZ_ALARM_ESIK.hata.esik okunamadı').toBeTruthy();

    // Kartın kendisi de o bloğa bağlı olmalı — sabiti geri kaçırmasın.
    expect(KADRAN, '`_hataNabzi` eşiği tablodan değil çıplak sayıdan okuyor')
      .toMatch(/pay >= GZ_ALARM_ESIK\.hata\.esik/);

    const sqlEsik = SQL.match(/>=\s*(\d+)\s*\n\s*\$err\$/);
    expect(sqlEsik, '056 içindeki hata eşiği bulunamadı').toBeTruthy();

    expect(sqlEsik[1], 'SQL eşiği kadranınkinden ayrışmış').toBe(kadranEsik[1]);
  });

  it('emniyet alarmı iki tarafta da AYNI yapıyı sorar: sinyal var, kart yok', () => {
    /* Bu eşik bir orana değil bir YOKLUĞA bağlıdır — tek bir kaçırma bile
       ürünün en kırılgan anıdır. İki taraf da "sinyal>0 ve kart=0" der. */
    expect(KADRAN, 'kadran `sinyal && !kart` koşulunu kaybetmiş').toMatch(/if\s*\(\s*sinyal\s*&&\s*!kart\s*\)/);
    expect(SQL, '056 emniyet koşulu "sinyal>0 ve kart=0" değil')
      .toMatch(/v_sinyal,\s*0\)\s*>\s*0\s*AND\s*COALESCE\(v_kart,\s*0\)\s*=\s*0/);
  });
});

describe('seviye — yalnız `kritik` push atabilir', () => {
  it('056\'nın ürettiği her alan kadranda da `kritik` işaretli', () => {
    /* Push atabilen alarmlar SQL'de tanımlıdır; kadran onları `uyari`
       sayarsa şerit "bak buna" der, telefon "şimdi bak" — iki kayıt ayrışır.
       İki taraf da aynı iki alanı `kritik` saymalı. */
    const alanlar = [...new Set([...SQL.matchAll(/'alan',\s*'([a-z_]+)'/g)].map((m) => m[1]))];
    const blok = KADRAN.match(/const GZ_ALARM_ESIK = \{([\s\S]*?)\};/);
    expect(blok).toBeTruthy();
    for (const alan of alanlar) {
      expect(blok[1], `056 '${alan}' için push üretiyor ama kadran onu kritik saymıyor`)
        .toMatch(new RegExp(`${alan}:\\s*\\{[^}]*seviye:\\s*'kritik'`));
    }
  });

  it('SQL yalnız `kritik` üretir — uyarı/bilgi seviyesi push kanalına hiç girmez', () => {
    const seviyeler = [...new Set([...SQL.matchAll(/'seviye',\s*'([a-z]+)'/g)].map((m) => m[1]))];
    expect(seviyeler.length).toBeGreaterThan(0);
    expect(seviyeler, `056 push kanalına '${seviyeler.join("/")}' sokuyor`).toEqual(['kritik']);
  });
});

describe('teslim zinciri — tanınan her alanın metni VAR', () => {
  it('056\'nın üretebildiği her `alan` için motorda bir `case` var', () => {
    /* FAZ 11'in dersinin genellenmiş hâli: bir kanalın TANIDIĞI ama
       BESLEMEDİĞİ basamak sessizce boş kalır — ve boşluk, kırıktan uzun
       yaşar. Liste elle yazılmıyor, SQL'den TÜRETİLİYOR: 056'ya yeni bir
       alarm eklendiğinde kapı kendiliğinden büyür. */
    const alanlar = [...SQL.matchAll(/'alan',\s*'([a-z_]+)'/g)].map((m) => m[1]);
    expect(alanlar.length, '056 hiç alarm alanı üretmiyor').toBeGreaterThan(0);
    for (const alan of new Set(alanlar)) {
      expect(MOTOR, `056 '${alan}' alarmı üretebiliyor ama alarmMetni'nde karşılığı yok`)
        .toMatch(new RegExp(`case\\s+'${alan}':`));
    }
  });

  it('tanımadığı alan için SESSİZ kalır — kapsamı olmayan tetik hiçbir şey göndermez', () => {
    const i = MOTOR.indexOf('function alarmMetni');
    expect(i).toBeGreaterThan(-1);
    const govde = MOTOR.slice(i, MOTOR.indexOf('async function alarmGonder'));
    expect(govde).toMatch(/default:[\s\S]{0,400}return null;/);
  });
});

describe('`admin` merdivene GİRMEZ — ve bu bilinçli bir sapmadır', () => {
  it('pickTrigger hiçbir dalında `admin` döndürmez', () => {
    /* Merdiven KULLANICI satırları üzerinde döner ve her basamak
       altındakileri susturur (`sosyal`'in bir kez yaptığı tam buydu).
       Bir admin alarmının alıcısı tek kişidir, tetiği kullanıcının
       davranışı değil sistemin hâlidir. Oraya konsaydı, ona hiç ait
       olmayan bir riski satın alırdık. */
    const i = MOTOR.indexOf('function pickTrigger');
    expect(i).toBeGreaterThan(-1);
    const govde = MOTOR.slice(i, MOTOR.indexOf('loadSosyalAdaylar'));
    expect(govde, 'pickTrigger `admin` döndürüyor — merdiven riski geri geldi')
      .not.toMatch(/return\s+'admin'/);
  });

  it('METNI_HAZIR kümesine de girmez — merdivende işi olmayan bir tip', () => {
    const m = MOTOR.match(/const METNI_HAZIR = new Set\(\[([^\]]*)\]\)/);
    expect(m).toBeTruthy();
    expect(m[1]).not.toMatch(/'admin'/);
  });

  it('alarm koşu başına BİR KEZ, kullanıcı döngüsünün DIŞINDA değerlendirilir', () => {
    const i = MOTOR.indexOf('async function runEngine');
    const govde = MOTOR.slice(i, i + 900);
    expect(govde, 'alarmGonder runEngine\'de çağrılmıyor').toMatch(/await alarmGonder\(\)/);
    // Döngüden önce: `for (const row of ...)` satırından yukarıda olmalı.
    const alarmIdx = govde.indexOf('await alarmGonder()');
    const donguIdx = govde.indexOf('for (const row of');
    expect(donguIdx).toBeGreaterThan(-1);
    expect(alarmIdx, 'alarm kullanıcı döngüsünün İÇİNDE koşuyor').toBeLessThan(donguIdx);
  });
});

describe('056 — yetki ve mahremiyet', () => {
  it('yalnız service_role çağırabilir; PUBLIC/anon/authenticated tamamen kapalı', () => {
    /* Kapı kimlikte değil YETKİDE: çağıran motorun JWT'si yoktur, yani
       `auth.uid()` gate'i burada kurulamaz (`admin_usage_report`'un tersine).
       Bu bir gevşetme değil, kilidin başka yere taşınmasıdır. */
    expect(SQL).toMatch(/REVOKE ALL ON FUNCTION public\.admin_alarms\(INT\) FROM PUBLIC/);
    expect(SQL).toMatch(/REVOKE ALL ON FUNCTION public\.admin_alarms\(INT\) FROM anon/);
    expect(SQL).toMatch(/REVOKE ALL ON FUNCTION public\.admin_alarms\(INT\) FROM authenticated/);
    expect(SQL).toMatch(/GRANT EXECUTE ON FUNCTION public\.admin_alarms\(INT\) TO service_role/);
    expect(SQL).toMatch(/SECURITY DEFINER/);
    expect(SQL).toMatch(/SET search_path = public/);
  });

  it('serbest metin DÖNDÜRMEZ — error_logs\'un içerik sütunları hiç seçilmez', () => {
    for (const sutun of ['error_message', 'error_stack', 'context', 'user_agent']) {
      expect(SQL_GOVDE, `056 '${sutun}' sütununa dokunuyor — alarm bir ölçüdür, bir içerik değil`)
        .not.toMatch(new RegExp(sutun));
    }
  });

  it('error_logs yoksa fonksiyon yine kurulur ve çalışır (055\'in RİSK 3 kalıbı)', () => {
    expect(SQL).toMatch(/to_regclass\('public\.error_logs'\) IS NOT NULL/);
  });

  it('admin_usage_report\'u YENİDEN TANIMLAMAZ — blok taşıma borcu doğmaz', () => {
    /* Ölçüt `tests/migration-blok-tasima.test.js`'in ölçütüyle AYNI olmalı:
       o kapı zinciri `CREATE OR REPLACE FUNCTION admin_usage_report` deyimine
       göre kurar. Adı bir yorumda anmak dosyayı o zincire sokmaz — ve iki
       kapı aynı şeyi farklı ölçerse, biri ötekini yanlış yere çağırır. */
    expect(SQL_GOVDE).not.toMatch(/CREATE OR REPLACE FUNCTION admin_usage_report/);
  });
});

describe('motor 056\'sız da ayakta kalır', () => {
  it('alarm sorgusu hata yutar — bildirimlerin geri kalanı çalışır (§5.2)', () => {
    /* 056 ELLE bir iştir (§6.5) ve koşulmamış olabilir. O gün RPC hata
       döner; alarm susar ama winback/soz/morning akmaya devam eder.
       Deploy edilmiş VARSAYILMAZ. */
    const i = MOTOR.indexOf('async function alarmGonder');
    const govde = MOTOR.slice(i, MOTOR.indexOf('/* ───────────────────────── ENGINE (cron)'));
    expect(govde).toMatch(/try\s*\{/);
    expect(govde).toMatch(/catch[\s\S]{0,200}console\.warn/);
  });

  it('yalnız TESLİM EDİLEN satır defterde kalır (FAZ 5\'in sözleşmesi)', () => {
    const i = MOTOR.indexOf('async function alarmGonder');
    const govde = MOTOR.slice(i, MOTOR.indexOf('/* ───────────────────────── ENGINE (cron)'));
    expect(govde, 'teslim edilmeyen alarm satırı silinmiyor')
      .toMatch(/sent === 0[\s\S]{0,160}\.delete\(\)/);
  });
});
