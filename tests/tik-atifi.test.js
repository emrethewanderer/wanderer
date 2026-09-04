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
