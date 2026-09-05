/**
 * TIK ATIFI — İç Çalışma 11 · boşluk B'nin yarısı (FAZ 5).
 *
 * Zincir: send-push (insert → id al → nid'li payload gönder → sent===0 sil)
 * → sw.js (push → data.nid ; notificationclick → postMessage/hash) → 10x
 * `_markNotifClicked` (RPC `notif_mark_clicked`) → 13q Davetin Nabzı (koşullu
 * not). Bu dosya üç ayrı yüzeyi tek yerde sınar; her biri kendi katmanının
 * testidir, birleştirilmiş bir "entegrasyon" değil.
 *
 * NOT — send-push/index.ts bir Deno Edge Function'dır (Deno.serve, `npm:` /
 * `https://esm.sh/` import şeması); vitest Node ortamında bu dosyayı ASLA
 * import edip koşturamaz. Bu yüzden send-push'un davranışı burada KAYNAK
 * TARAMASIYLA sınanır (13g-paylasim.js FAZ 3 denetiminin kabul ettiği
 * yöntemle aynı gerekçe: biçim değişirse sahte kırmızı verebilir, ama
 * zincirin SIRASINI statik olarak kanıtlar — hiç sınamamaktan iyidir).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/* ═══ 1. 10x `_markNotifClicked` — K2'nin kilidi: nid yoksa hiçbir şey ═══ */

/** config.js'in sb'sini mock'lu rpc ile değiştirir (13m-kota.test.js kalıbı). */
async function mockSb(rpcImpl) {
  vi.doMock('../js/config.js', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, sb: { rpc: vi.fn((name, params) => Promise.resolve(rpcImpl(name, params))) } };
  });
  const { sb } = await import('../js/config.js');
  return sb;
}

beforeEach(() => {
  vi.resetModules();
  vi.doUnmock('../js/config.js');
});

describe('_markNotifClicked — K2 kilidi (nid yoksa hiçbir şey yazılmaz)', () => {
  it('nid null/undefined ise RPC hiç çağrılmaz', async () => {
    const sb = await mockSb(() => ({ data: true, error: null }));
    const { _markNotifClicked } = await import('../js/parts/10x-w2-bildirimler.js');
    _markNotifClicked(null);
    _markNotifClicked(undefined);
    expect(sb.rpc).not.toHaveBeenCalled();
  });

  it('nid sayıya çevrilemiyorsa (bozuk veri) RPC çağrılmaz', async () => {
    const sb = await mockSb(() => ({ data: true, error: null }));
    const { _markNotifClicked } = await import('../js/parts/10x-w2-bildirimler.js');
    _markNotifClicked('abc');
    expect(sb.rpc).not.toHaveBeenCalled();
  });

  it('geçerli sayısal nid ile notif_mark_clicked doğru p_id argümanıyla çağrılır', async () => {
    const sb = await mockSb(() => ({ data: true, error: null }));
    const { _markNotifClicked } = await import('../js/parts/10x-w2-bildirimler.js');
    _markNotifClicked(42);
    expect(sb.rpc).toHaveBeenCalledTimes(1);
    expect(sb.rpc).toHaveBeenCalledWith('notif_mark_clicked', { p_id: 42 });
  });

  // hash/postMessage taşıması nid'i her zaman sayı bırakmaz (decodeURIComponent
  // string döner); Number(nid) dönüşümü _markNotifClicked İÇİNDE olur.
  it('hash\'ten gelen STRING sayı nid de doğru p_id ile çağrılır', async () => {
    const sb = await mockSb(() => ({ data: true, error: null }));
    const { _markNotifClicked } = await import('../js/parts/10x-w2-bildirimler.js');
    _markNotifClicked('42');
    expect(sb.rpc).toHaveBeenCalledWith('notif_mark_clicked', { p_id: 42 });
  });

  it('RPC hata dönerse sessizce düşer — throw etmez (migration ELLE deploy edilmemiş olabilir)', async () => {
    const sb = await mockSb(() => ({ data: null, error: { message: 'could not find the function' } }));
    const { _markNotifClicked } = await import('../js/parts/10x-w2-bildirimler.js');
    expect(() => _markNotifClicked(1)).not.toThrow();
    expect(sb.rpc).toHaveBeenCalledWith('notif_mark_clicked', { p_id: 1 });
  });

  it('sb.rpc kendisi senkron throw ederse bile fonksiyon patlamaz (savunmacı stil)', async () => {
    vi.doMock('../js/config.js', async (importOriginal) => {
      const actual = await importOriginal();
      return { ...actual, sb: { rpc: () => { throw new Error('boom'); } } };
    });
    const { _markNotifClicked } = await import('../js/parts/10x-w2-bildirimler.js');
    expect(() => _markNotifClicked(1)).not.toThrow();
  });
});

/* ═══ 2. Migration 052 — admin_usage_report zincirine dokunmaz (K3) ═══ */

describe('migrations/052_tik_atifi.sql — K2 sözleşmesi + K3 sınırı', () => {
  const sql = readFileSync(join(ROOT, 'migrations/052_tik_atifi.sql'), 'utf8');

  it('admin_usage_report HİÇ geçmez — 051 blok zincirine dokunmaz, taşıma borcu doğmaz', () => {
    expect((sql.match(/admin_usage_report/g) || []).length).toBe(0);
  });

  it('notif_mark_clicked üç koşulu da taşır: sahiplik, ilk-tık-kazanır, satır kimliği', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.notif_mark_clicked(p_id BIGINT)');
    expect(sql).toContain('SECURITY DEFINER');
    expect(sql).toContain('user_id = auth.uid()');
    expect(sql).toContain('clicked_at IS NULL');
    expect(sql).toContain('id = p_id');
  });

  it('yalnız authenticated\'a EXECUTE verir — anon/public reddedilir', () => {
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.notif_mark_clicked(BIGINT) FROM PUBLIC');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.notif_mark_clicked(BIGINT) TO authenticated');
  });

  it('notification_log üzerinde kullanıcıya UPDATE yetkisi VERMEZ (RLS bugünkü hâliyle kalır)', () => {
    expect(sql).not.toMatch(/GRANT\s+UPDATE\s+ON\s+notification_log/i);
    expect(sql).not.toMatch(/CREATE POLICY[^;]*notification_log[^;]*FOR UPDATE/is);
  });
});

/* ═══ 3. send-push/index.ts — sıra tersine çevrildi (kaynak taraması) ═══ */

describe('send-push/index.ts — insert → id → gönder → sent===0 sil (FAZ 5 sıra çevirmesi)', () => {
  const src = readFileSync(join(ROOT, 'supabase/functions/send-push/index.ts'), 'utf8');

  it('payloadFor imzası opsiyonel nid parametresi alır', () => {
    expect(src).toContain(
      "function payloadFor(trigger: string, title: string, body: string, nid?: number | null) {",
    );
    expect(src).toContain('icon: EMRE_IMG, nid };');
  });

  it('runEngine: notification_log insert, sendToUser çağrısından ÖNCE gelir (satır kimliği payload\'dan önce gerekir)', () => {
    const engineIdx = src.indexOf('async function runEngine');
    expect(engineIdx).toBeGreaterThan(-1);
    const body = src.slice(engineIdx);
    const insertIdx = body.indexOf(".from('notification_log')\n        .insert(");
    const sendIdx = body.indexOf('await sendToUser(row.user_id, payloadFor(trigger, title, body, nid))');
    expect(insertIdx).toBeGreaterThan(-1);
    expect(sendIdx).toBeGreaterThan(-1);
    expect(insertIdx).toBeLessThan(sendIdx);
  });

  it('insert .select(\'id\').single() ile satır kimliğini geri okur — nid buradan gelir', () => {
    expect(src).toContain(".select('id')\n        .single();");
    expect(src).toContain('const nid = logRow?.id ?? null;');
  });

  it('sent === 0 dalında satır SİLİNİR — "denendi" değil "gönderildi" sözleşmesi korunur', () => {
    expect(src).toMatch(/if \(sent > 0\) \{\s*delivered\+\+;\s*\} else if \(logRow\) \{\s*await admin\.from\('notification_log'\)\.delete\(\)\.eq\('id', logRow\.id\);\s*\}/);
  });

  it('test/broadcast dallarına dokunulmadı — hâlâ eski (yalnız başarılı gönderimde insert) sözleşmeyi taşıyorlar', () => {
    // FAZ 5 kapsamı yalnız runEngine'dir (plan K2) — test/broadcast zaten
    // "yalnız teslim edilen loglanır" sözleşmesini insert-after-send ile
    // koruyordu, sıra çevirmeye ihtiyaçları yok.
    expect(src).toContain("if (sent > 0) {\n      await admin.from('notification_log').insert({ user_id: user.id, type: 'test', title: 'test', body: sample.body });\n    }");
  });
});

/* ═══ SOSYAL DOKUNUŞ — İç Çalışma 12 · FAZ 11 (kaynak taraması) ═══════════
   Ölçü sınırı tik-atifi.test.js ile aynı gerekçe: send-push bir Deno Edge
   Function'dır, vitest onu import edip koşturamaz. Bu blok üç şeyi kanıtlar:
   'sosyal' winback'ten ÖNCE gelir, adaylar döngü dışında TEK sorguda
   hesaplanır, ve microcopy'si henüz yazılmamış bir tetik (bugün: 'sosyal')
   yanlış bağlamda bir metin basmak yerine sessizce hiçbir şey göndermez. */
describe('send-push/index.ts — sosyal tetik merdivende winback\'ten önce (FAZ 11)', () => {
  const src = readFileSync(join(ROOT, 'supabase/functions/send-push/index.ts'), 'utf8');

  it('pickTrigger sosyalVar parametresi alır ve sosyal dalı winback dalından ÖNCE gelir', () => {
    const idx = src.indexOf('function pickTrigger');
    expect(idx).toBeGreaterThan(-1);
    expect(src).toContain('function pickTrigger(row: any, dateStr: string, hour: number, sosyalVar: boolean): string | null {');
    const body = src.slice(idx);
    /* Dalın HARFİ değil YERİ sınanır. İlk hâl `if (sosyalVar) return 'sosyal';`
       satırını birebir arıyordu ve faz denetiminin açlık düzeltmesi
       (`&& METNI_HAZIR.has('sosyal')`) onu sahte kırmızıya çevirdi — oysa
       iddia ("sosyal winback'ten önce gelir") bozulmamıştı. Sınav, harfi
       değil iddiayı tutmalı. */
    const sosyalIdx = body.search(/if \(sosyalVar[\s\S]*?return 'sosyal';/);
    const winbackIdx = body.indexOf("return 'winback';");
    expect(sosyalIdx).toBeGreaterThan(-1);
    expect(winbackIdx).toBeGreaterThan(-1);
    expect(sosyalIdx).toBeLessThan(winbackIdx);
  });

  it('loadSosyalAdaylar kendi kartına kendi etkileşimini eler (owner === e.user_id hariç tutulur)', () => {
    expect(src).toContain('async function loadSosyalAdaylar(): Promise<Map<string, string>> {');
    expect(src).toContain("if (!owner || owner === e.user_id) continue;");
  });

  it('runEngine adayları döngü DIŞINDA tek kez hesaplar, pickTrigger\'a geçirir', () => {
    const engineIdx = src.indexOf('async function runEngine');
    const body = src.slice(engineIdx);
    const adaylarIdx = body.indexOf('const sosyalAdaylar = await loadSosyalAdaylar();');
    const forIdx = body.indexOf('for (const row of (rows || []))');
    expect(adaylarIdx).toBeGreaterThan(-1);
    expect(forIdx).toBeGreaterThan(-1);
    expect(adaylarIdx).toBeLessThan(forIdx); // döngüden önce — satır başına sorgu atılmaz
    expect(body).toContain('pickTrigger(row, dateStr, hour, sosyalAdaylar.has(row.user_id))');
  });

  it('fallbackCopy tanımsız bir tetikte null döner — "morning" metnini yanlış bağlamda basmaz', () => {
    const idx = src.indexOf('function fallbackCopy');
    const body = src.slice(idx, src.indexOf('async function generateCopy'));
    expect(body).toMatch(/default:\s*\n(\s*\/\/[^\n]*\n)*\s*return null;/);
  });

  it('generateCopy tanımsız niyet için LLM\'e generic bağlam vermez, doğrudan fallbackCopy\'ye düşer', () => {
    const idx = src.indexOf('async function generateCopy');
    const body = src.slice(idx, idx + 400);
    expect(body).toContain('const intent = TRIGGER_INTENT[trigger];');
    expect(body).toContain('if (!intent) return fallbackCopy(trigger, row, ctx);');
    expect(body).not.toContain('TRIGGER_INTENT[trigger] || TRIGGER_INTENT.morning');
  });

  it('runEngine kopyası olmayan bir tetikte (null) sessizce atlar — hiçbir şey loglanmaz/gönderilmez', () => {
    const engineIdx = src.indexOf('async function runEngine');
    const body = src.slice(engineIdx);
    const copyIdx = body.indexOf('const copy = await generateCopy(trigger, row, ctx);');
    const guardIdx = body.indexOf('if (!copy) continue;');
    const insertIdx = body.indexOf(".from('notification_log')\n        .insert(");
    expect(copyIdx).toBeGreaterThan(-1);
    expect(guardIdx).toBeGreaterThan(copyIdx);
    expect(guardIdx).toBeLessThan(insertIdx);
  });

  it('notification_log.type yorum listesi sosyal\'i taşıyor (belge tutarlılığı)', () => {
    const sql = readFileSync(join(ROOT, 'migrations/000_wanderer_schema.sql'), 'utf8');
    expect(sql).toMatch(/type\s+TEXT NOT NULL,\s+-- [^\n]*\bsosyal\b/);
  });
});

/* ═══ NATIVE YOL — faz denetiminde bulundu (2026-09-04) ═══════════════════
   Ajan web yolunu (sw.js) kurmuştu; native yol (Capacitor → FCM/APNs) HİÇ
   atıf yazmıyordu. Wanderer bir Capacitor uygulaması: yalnız web'i saymak
   "tık oranı" gibi görünen ama gerçekte WEB-ONLY bir oran üretirdi — kartın
   kaçınmak için düzeltildiği hatanın ta kendisi (§6.10). Zincirin üç halkası
   da burada mühürleniyor.
   ÖLÇÜ SINIRI: bu blok KAYNAK taramasıdır. Capacitor plugin dinleyicisi
   (`pushNotificationActionPerformed`) jsdom'da tetiklenemez; davranışsal
   kilit `_markNotifClicked`'in kendi testlerindedir (yukarıda) — K2 orada
   ölçülüyor, burada yalnız TELİN takılı olduğu. */
describe('tık atıfı — native yol (kaynak taraması)', () => {
  const oku = (rel) => readFileSync(join(ROOT, rel), 'utf8');

  it('send-push FCM data alanı nid taşıyor — ve yalnız varsa', () => {
    const src = oku('supabase/functions/send-push/index.ts');
    // FCM data alanları string olmak zorunda; nid yoksa anahtar HİÇ girmez
    // (undefined bir alan "0" ya da "null" diye gitmemeli).
    expect(src).toContain("...(payload.nid != null ? { nid: String(payload.nid) } : {})");
  });

  it('00e dokunuşta olayı duyuruyor — DB’ye kendisi yazmıyor (sorumluluk sınırı)', () => {
    const src = oku('js/parts/00e-native-push.js');
    expect(src).toContain("new CustomEvent('wndr-native-notif-click'");
    // 00e'nin başlığı sınırı yazıyor: DB yazımı 10x'in işi. İhlal ederse burada görünür.
    expect(src).not.toContain('notif_mark_clicked');
    expect(src).not.toMatch(/sb\.rpc\(/);
  });

  it('10x olayı dinliyor ve K2 kilidinden geçiriyor', () => {
    const src = oku('js/parts/10x-w2-bildirimler.js');
    expect(src).toContain("window.addEventListener('wndr-native-notif-click'");
    expect(src).toContain('_markNotifClicked(e?.detail?.nid)');
  });

  it('nid yokken 00e olay duyurmuyor — boş string de sayılmaz', () => {
    const src = oku('js/parts/00e-native-push.js');
    expect(src).toContain("data.nid != null && data.nid !== ''");
  });
});

/* Kartın teşhis cümlesi de bayatlayabilir — faz denetiminde tam bu oldu. */
describe('Davetin Nabzı — sıfır dalının cümlesi bugünü anlatıyor', () => {
  it('"atıfı takılı değil" iddiası EKRANDA hiçbir yerde kalmadı', () => {
    /* İKİ yerde vardı ve ilk düzeltmede biri gözden kaçtı: `notAlt` alt notu
       ve satır içi `tani` span'i. Testin ilk hâli bunu buldu — bu yüzden kapı
       tek bir cümleyi değil, İDDİANIN KENDİSİNİ arıyor.
       Ama YORUMLAR taranmaz ve bu bir gevşetme değil bir AYRIM: bir yorumun
       "eski cümle şunu diyordu" demesi tarihsel kayıttır, kullanıcıya (burada
       Emre'ye) gösterilen bir iddia değildir. Kapı ekrana basılanı ölçer;
       kaydı silmek, kaydın kendisini kaybettirirdi. */
    const ham = readFileSync(join(ROOT, 'js/parts/13q-gozlemevi.js'), 'utf8');
    const kodsuz = ham.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(kodsuz).not.toContain('atıfı takılı değil');
  });

  it('kapının kendisi çalışıyor — yorum sıyırma gerçek ihlali gizlemiyor (§10.5)', () => {
    const sahte = 'const x = "atıfı takılı değil"; /* atıfı takılı değil */';
    const kodsuz = sahte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(kodsuz).toContain('atıfı takılı değil'); // koddaki hâlâ görünür
  });

  it('sıfır dalı iki durumu AYIRT EDEMEDİĞİNİ söylüyor (§6.10)', () => {
    const src = readFileSync(join(ROOT, 'js/parts/13q-gozlemevi.js'), 'utf8');
    expect(src).toContain('AYIRT EDEMİYORUZ');
  });
});

/* ═══ 5. MERDİVEN AÇLIK KAPISI — teslim edilemeyen basamak altını susturur ═══
   FAZ 11 denetiminde (parent · Opus) ölçülen kırık: `sosyal` merdivenin EN
   ÜSTÜNE kondu, metni ise FAZ 12'ye bırakıldı. `generateCopy` null döndüğü
   için `runEngine` `continue` ediyordu — yani kartına bir beğeni düşen
   kullanıcı, o etkileşim 24 saatlik pencerede kaldığı sürece winback ·
   streak_risk · soz · milestone · morning bildirimlerinin HEPSİNİ
   kaybediyordu. Basamak yalnız kendini değil ALTINDAKİ HER ŞEYİ düşürür.

   Kural ölçülebilir: merdivenin KOŞULSUZ seçebildiği her tetiğin
   `fallbackCopy`'de bir `case`i olmalı. Metni olmayan bir tetik ancak
   `METNI_HAZIR.has(...)` kapısının arkasında durabilir — FAZ 12 metni
   yazınca kümeye ekler ve basamak kendiliğinden açılır. */
describe('send-push merdiveni — seçilebilen her tetiğin metni var', () => {
  const src = readFileSync(join(ROOT, 'supabase/functions/send-push/index.ts'), 'utf8');

  /** `pickTrigger` gövdesindeki `return 'x'` satırları — kapının arkasında
   *  olanlar (`METNI_HAZIR.has(`) ayrı işaretlenir. */
  const merdivenTetikleri = () => {
    const bas = src.indexOf('function pickTrigger');
    const govde = src.slice(bas, src.indexOf('\n}', bas));
    return [...govde.matchAll(/^(.*)return '([a-z_]+)';/gm)]
      .map(m => ({ ad: m[2], kapili: m[1].includes('METNI_HAZIR.has(') }));
  };
  const metniHazir = () => {
    const m = src.match(/METNI_HAZIR\s*=\s*new Set\(\[([^\]]*)\]\)/);
    return m ? [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]) : [];
  };
  const copyCaseleri = () => {
    const bas = src.indexOf('function fallbackCopy');
    const govde = src.slice(bas, src.indexOf('\n}', bas));
    return [...govde.matchAll(/case '([a-z_]+)':/g)].map(m => m[1]);
  };

  it('tarama gerçekten bir şey buldu — boş liste bir sonuç değildir', () => {
    expect(merdivenTetikleri().length).toBeGreaterThanOrEqual(6);
    expect(metniHazir().length).toBeGreaterThanOrEqual(5);
    expect(copyCaseleri().length).toBeGreaterThanOrEqual(5);
  });

  it('koşulsuz seçilen her tetik METNI_HAZIR kümesinde', () => {
    const hazir = metniHazir();
    const acliktakiler = merdivenTetikleri()
      .filter(t => !t.kapili && !hazir.includes(t.ad)).map(t => t.ad);
    expect(acliktakiler,
      `metni olmadan koşulsuz seçilen tetik(ler): ${acliktakiler.join(', ')} — ` +
      'altındaki basamakları susturur').toEqual([]);
  });

  it('METNI_HAZIR üyelerinin hepsinin fallbackCopy\'de bir case\'i var', () => {
    const caseler = copyCaseleri();
    const eksik = metniHazir().filter(t => !caseler.includes(t));
    expect(eksik, `fallbackCopy'de case'i olmayan tetik(ler): ${eksik.join(', ')}`)
      .toEqual([]);
  });

  it('sosyal bugün kapının ARKASINDA — FAZ 12 metni yazınca açılır', () => {
    const sosyal = merdivenTetikleri().find(t => t.ad === 'sosyal');
    expect(sosyal, 'sosyal basamağı merdivende bulunamadı').toBeTruthy();
    // Kapılı OLMASI ya da METNI_HAZIR'a girmiş olması — ikisi de geçerli hâl;
    // yasak olan, metni yokken KOŞULSUZ durması.
    expect(sosyal.kapili || metniHazir().includes('sosyal')).toBe(true);
  });

  /* ── FAZ 12 · sosyal microcopy'si (🅞) ──
     Basamak ancak metni yazıldığında açılır; metnin kendisi de Ton
     Rehberi'nin iki kuralını taşımak zorunda ve ikisi de ÖLÇÜLEBİLİR:
     (a) sayaç dili yok ("3 yeni yorum!" bu ürüne girmez),
     (b) dokunuşun TÜRÜ iddia edilmez — `loadSosyalAdaylar` beğeniyle yorumu
         tek kovada birleştirir, yani "yazmış/yorum geldi" demek motorun
         ölçmediği bir ayrıntıyı uydurmaktır (§6.10). Planın Ton Rehberi'nin
         verdiği örnek ("Kartına biri yazmış.") tam bu yüzden ÜRÜNDE
         daraltıldı — 🅞 fazın işi budur. */
  const sosyalMetni = () => {
    const bas = src.indexOf("case 'sosyal':");
    return bas < 0 ? '' : src.slice(bas, src.indexOf('case ', bas + 10));
  };

  it('FAZ 12: sosyal basamağı açık — metni yazıldı', () => {
    expect(metniHazir()).toContain('sosyal');
    expect(copyCaseleri()).toContain('sosyal');
    expect(src).toMatch(/^\s*sosyal:\s*'/m);   // TRIGGER_INTENT girdisi
  });

  it('sosyal metni SAYAÇ dili taşımaz — rakam yok', () => {
    const metin = sosyalMetni();
    expect(metin.length).toBeGreaterThan(40);        // tarama gerçekten buldu
    const govde = metin.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(govde, 'sosyal metninde rakam var — sayaç dili').not.toMatch(/\d/);
  });

  it('sosyal metni dokunuşun TÜRÜNÜ iddia etmez (beğeni mi yorum mu belli değil)', () => {
    const govde = sosyalMetni().replace(/\/\*[\s\S]*?\*\//g, '');
    expect(govde, 'metin "yazmış/yorum" diyor — bir beğeni yazmak değildir')
      .not.toMatch(/yaz(mış|dı)|yorum/i);
  });

  it('sosyal NİYETİ modele bilinmeyeni açıkça söyler (tür ve kimlik)', () => {
    const bas = src.indexOf('  sosyal:      ');
    const niyet = src.slice(bas, src.indexOf("',", bas));
    expect(niyet).toMatch(/BİLMİYORSUN/);
    expect(niyet).toMatch(/SAYI VERME/);
  });

  it('kapının kendisi çalışıyor — ihlali gerçekten yakalar (§10.5)', () => {
    const sahte = `function pickTrigger(row, dateStr, hour, sosyalVar) {
  if (sosyalVar) return 'sosyal';
  if (x) return 'winback';
}`;
    const govde = sahte.slice(sahte.indexOf('function pickTrigger'), sahte.indexOf('\n}'));
    const bulunan = [...govde.matchAll(/^(.*)return '([a-z_]+)';/gm)]
      .map(m => ({ ad: m[2], kapili: m[1].includes('METNI_HAZIR.has(') }));
    const hazir = ['winback'];
    expect(bulunan.filter(t => !t.kapili && !hazir.includes(t.ad)).map(t => t.ad))
      .toEqual(['sosyal']);   // ihlal görünür
  });
});
