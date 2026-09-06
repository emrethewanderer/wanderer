/**
 * SAKLAMA VAADİ KAPISI — İç Çalışma 17·F3 (FAZ 6 · 8b) · 2026-09-06
 *
 * Bu kapı bir DAVRANIŞI değil, bir VAADİ mekanizmasına bağlar.
 *
 * Kırığın hikâyesi kısadır ve tekrar etmeye çok müsaittir: FAZ 6
 * `usage_events_prune(90)` fonksiyonunu yazdı, FAZ 8b gizlilik metnine
 * "ham kullanım kaydı 90 gün sonra silinir" cümlesini yazacaktı — ve
 * arada, fonksiyonu ÇAĞIRAN hiç kimse yoktu. Plan 2026-09-06'da kilidin
 * "çözüldüğünü" yazdı (`send-push` günde bir kez çağırsın), kod ise o
 * çağrıyı hiç almadı. İki kayıt ayrıştı; kimse yalan söylemedi
 * ([[rapor-bayatligi]]).
 *
 * Sonucu ölçülebilir bir yalandır: uygulama silmeyen bir silmeyi vaat eder
 * (§6.2 · §6.10). Bu yüzden kapı üç şeyi BİRLİKTE tutar — biri düşerse
 * öteki ikisi de anlamsızdır:
 *
 *   1. `usage_events_prune` `service_role`'a açık olmalı (motorun kimliği).
 *   2. `send-push` motoru onu GERÇEKTEN çağırmalı (mekanizma).
 *   3. Gizlilik metni saklama cümlesini taşıyorsa, (1) ve (2) şart.
 *
 * Üçüncüsü kapının kalbidir: cümle yazılmadan da yeşil yanar (bugünkü
 * hâl), ama cümle yazıldığı an mekanizmayı zorunlu kılar. Yani FAZ 8b'yi
 * mekanizmasız açmak MÜMKÜN DEĞİLDİR.
 *
 * NOT — `send-push/index.ts` bir Deno Edge Function'dır; vitest onu import
 * edip koşturamaz (`tik-atifi-kapisi.test.js`'in aynı gerekçesi). Bu yüzden ölçü
 * KAYNAK TARAMASIDIR: zincirin varlığını statik olarak kanıtlar.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const oku = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** Prune'u tanımlayan migration'ın en güncel hâli — "en yüksek numara"
 *  kuralı (`tests/migration-blok-tasima.test.js` ile aynı ölçü). */
function pruneMigrationKaynagi() {
  const dosyalar = readdirSync(join(ROOT, 'migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const tasiyanlar = dosyalar.filter((f) =>
    oku(`migrations/${f}`).includes('FUNCTION public.usage_events_prune'));
  expect(tasiyanlar.length, 'usage_events_prune hiçbir migration\'da tanımlı değil').toBeGreaterThan(0);
  return oku(`migrations/${tasiyanlar[tasiyanlar.length - 1]}`);
}

describe('saklama vaadi — cümle ile mekanizma tek zincirdir', () => {
  it('1) prune service_role\'a açıktır — motorun onu çağırabilmesinin şartı', () => {
    const sql = pruneMigrationKaynagi();
    expect(sql).toMatch(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.usage_events_prune\(INT\)\s+TO\s+service_role/i);
    // Ve genel erişime KAPALI: gizlilik fonksiyonu herkesin çağırabileceği
    // bir şey değildir (silme yetkisi, okuma yetkisinden ağırdır).
    expect(sql).toMatch(/REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.usage_events_prune\(INT\)\s+FROM\s+PUBLIC/i);
  });

  it('2) send-push motoru prune\'u gerçekten çağırır — yazılı bir niyet değil, bir çağrı', () => {
    const src = oku('supabase/functions/send-push/index.ts');
    expect(src, 'motor usage_events_prune\'u hiç çağırmıyor').toMatch(
      /\.rpc\(\s*['"]usage_events_prune['"]/);
    // Çağrı ENGINE yolunda olmalı: test/broadcast yolunda duran bir temizlik
    // kullanıcı bir düğmeye basmadan hiç koşmaz.
    const engineIdx = src.indexOf('async function runEngine');
    expect(engineIdx, 'runEngine bulunamadı').toBeGreaterThan(-1);
    const engineGovde = src.slice(engineIdx, engineIdx + 900);
    expect(engineGovde, 'prune çağrısı ENGINE yolunda değil').toMatch(/prune/i);
  });

  it('2b) çağrı hata yutar — temizliğin düşmesi bildirimleri durdurmaz (§5.2)', () => {
    const src = oku('supabase/functions/send-push/index.ts');
    /* Çağrının KENDİSİNİ bul, adı GEÇEN ilk satırı değil: bu dosyada adın
       ilk geçtiği yer bir yorum bloğudur ve pencereyi oraya kurmak testi
       yorumun içinde `try` aramaya gönderir. Sınav, sınadığını sınamalı —
       bu ders bu repoda bir kez daha ödendi (FAZ 2c, `dgNabiz` cümlesi). */
    const i = src.search(/\.rpc\(\s*['"]usage_events_prune['"]/);
    expect(i, 'prune RPC çağrısı bulunamadı').toBeGreaterThan(-1);
    const pencere = src.slice(Math.max(0, i - 700), i + 400);
    expect(pencere, 'prune çağrısı try/catch içinde değil').toMatch(/try\s*\{/);
    expect(pencere).toMatch(/catch/);
  });

  it('3) gizlilik metni saklama süresi vaat ediyorsa mekanizma ZORUNLUDUR', () => {
    const metin = oku('js/parts/13p2-hukuk-metin.js');
    /* Vaadin imzası: ham kullanım kaydının SÜRELİ saklanması. Cümlenin
       kelimeleri değişebilir, taşıdığı sayı ve nesne değişemez — desen
       bu yüzden "90 gün" + kullanım kaydı ikilisini arar, tek bir cümle
       kalıbını değil. */
    const vaatVar = /90\s*gün/i.test(metin) || /90\s*days/i.test(metin);
    if (!vaatVar) {
      // FAZ 8b henüz açılmadıysa kapı sessizdir — ve bu bir muafiyet değil,
      // kapının tasarımıdır: vaat yoksa tutulacak bir şey de yoktur.
      expect(vaatVar).toBe(false);
      return;
    }
    const src = oku('supabase/functions/send-push/index.ts');
    expect(src,
      'gizlilik metni 90 günlük saklama vaat ediyor ama motor prune\'u çağırmıyor — ' +
      'uygulama tutmayacağı bir silmeyi söz veriyor (§6.2)')
      .toMatch(/\.rpc\(\s*['"]usage_events_prune['"]/);
  });

  it('4) HK_VERSION ile vaat aynı turda hareket eder', () => {
    /* K4: saklama cümlesi ve rıza defteri aynı hukuk metnine dokunur, sürüm
       TEK artışta artar. Burada ölçülen şey sürümün DEĞERİ değil (o Emre'nin
       kararı), sürümün bir yerde TEK KAYNAK olduğudur: metin sürümü kendi
       başına ilan ederse iki kayıt ayrışır. */
    const hukuk = oku('js/parts/13p-hukuk.js');
    const m = hukuk.match(/export const HK_VERSION = '([\d.]+)'/);
    expect(m, 'HK_VERSION tek kaynakta değil').toBeTruthy();
    const metin = oku('js/parts/13p2-hukuk-metin.js');
    expect(metin, 'hukuk metni kendi sürüm numarasını yazıyor — ikinci gerçek kaynak')
      .not.toMatch(/Sürüm\s+\d+\.\d+/);
  });
});
