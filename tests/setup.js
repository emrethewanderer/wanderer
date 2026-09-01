/**
 * Vitest global test setup
 *
 * Runs before every test file. Sets up the minimal DOM environment
 * and mocks external dependencies that are not under test.
 */

import { vi } from 'vitest';

// ─── Supabase mock ────────────────────────────────────────────────────────────
// All modules import { sb } from '../config.js'.  We stub it out so tests
// never hit the network.
vi.mock('@supabase/supabase-js', () => {
  /* Zincirlenebilir sorgu stub'ı — PostgREST builder'ı gibi davranır:
     .eq()/.select()/.order()/.limit() kendini döndürür, .single() ve await
     sonucu çözer. vi.mock factory'si hoist edildiği için bu yardımcı DIŞARIDA
     değil, factory'nin İÇİNDE durmak zorunda (dış değişken TDZ'ye düşer). */
  const _sorguZinciri = (sonuc = { data: null, error: null }) => {
    const zincir = {
      eq:     () => zincir,
      select: () => zincir,
      order:  () => zincir,
      limit:  () => zincir,
      single: () => Promise.resolve(sonuc),
      then:   (ok, hata) => Promise.resolve(sonuc).then(ok, hata),
    };
    return zincir;
  };
  return {
  createClient: () => ({
    // .rpc BİLİNÇLİ yok — rpc kullanan modülün testi (ör. 09f
    // match_user_memories) kendi sb stub'unu kurar; buraya eklemek
    // o tuzağı görünmez kılardı.
    from: () => ({
      select:  () => ({ eq: () => ({ data: [], error: null }) }),
      // insert/delete ZİNCİRLENEBİLİR: gerçek çağrılar .select('id').single()
      // ve .eq().eq().eq() gibi zincirler kurar. Düz obje döndüren eski stub
      // bu zincirlerde "is not a function" ile patlıyordu — yani testler o
      // kod yollarına hiç giremiyordu.
      insert:  () => _sorguZinciri({ data: null, error: null }),
      upsert:  () => Promise.resolve({ data: null, error: null }),
      update:  () => ({ eq: () => ({ data: null, error: null }) }),
      delete:  () => _sorguZinciri({ data: null, error: null }),
    }),
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signUp:             vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithOAuth:    vi.fn().mockResolvedValue({ data: { url: null, provider: null }, error: null }),
      // Kod kapısı: kod iste → kod doğrula. Stub'da yoksa testler o yola
      // hiç giremez, "is not a function" ile düşer.
      signInWithOtp:      vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      verifyOtp:          vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      updateUser:         vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getUser:            vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      // Native OAuth dönüşü: PKCE kodu takası + örtük akışın token'ları
      exchangeCodeForSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      setSession:         vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signOut:            vi.fn().mockResolvedValue({ error: null }),
      getSession:         vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      refreshSession:     vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange:  vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  }),
  };
});

// ─── Chart.js mock ────────────────────────────────────────────────────────────
vi.mock('chart.js', () => {
  class MockChart {
    constructor() {}
    destroy() {}
    update() {}
    static register() {}
  }
  const stub = function MockComponent() {};
  return {
    Chart:        MockChart,
    registerables: [],
    // Controllers
    LineController: stub, BarController: stub, DoughnutController: stub,
    // Elements
    LineElement: stub, BarElement: stub, ArcElement: stub, PointElement: stub,
    // Scales
    LinearScale: stub, CategoryScale: stub,
    // Plugins
    Tooltip: stub, Legend: stub, Filler: stub, Title: stub,
  };
});

// ─── marked / DOMPurify mocks ─────────────────────────────────────────────────
vi.mock('marked', () => ({
  marked:      { setOptions: vi.fn(), parse: (s) => s },
  default:     { setOptions: vi.fn(), parse: (s) => s },
}));

vi.mock('dompurify', () => ({
  default: {
    sanitize: (s) => s == null ? '' : String(s),
    addHook: vi.fn(),
    removeHook: vi.fn(),
    removeHooks: vi.fn(),
    setConfig: vi.fn(),
    clearConfig: vi.fn(),
  },
}));

// ─── Capacitor (native shell) mock ────────────────────────────────────────────
globalThis.window = globalThis.window || {};
globalThis.window.Capacitor = { isNativePlatform: () => false };

// ─── Test dili: TR ────────────────────────────────────────────────────────────
// initI18n (15-i18n, modül-load) kayıtlı dil yoksa navigator.language'e düşer;
// jsdom'da bu 'en-US'tur. Testlerin TR beklentisi tesadüfe kalmasın diye dil
// açıkça yazılır. (Eskiden SafeStorage.getRaw'ın boot'ta fırlatması bu yolu
// kazara TR'de tutuyordu — o hata giderilince gerçek davranış ortaya çıktı.)
try { localStorage.setItem('etw_lang', 'tr'); } catch (_) {}

// ─── localStorage / sessionStorage — jsdom already provides these ─────────────
// Make sure they survive module re-imports across tests
beforeEach(() => {
  // DOM'a dokunmayan testler `@vitest-environment node` ile koşar (jsdom kurulumu
  // testin en pahalı kalemiydi — ölçüldü). Node'da localStorage/sessionStorage
  // global'leri YOKTUR; guard olmadan bu satır setup'ta ReferenceError atar ve
  // dosya daha ilk testine varmadan kırmızıya döner. jsdom tarafında davranış aynı.
  try { localStorage.clear(); } catch (_) {}
  try { sessionStorage.clear(); } catch (_) {}
  // clear() test dilini de siler; freshModule kalıbıyla taze grafikte yeniden
  // yüklenen 15-i18n, dil kaydı yoksa jsdom navigator'ından EN çözerdi.
  try { localStorage.setItem('etw_lang', 'tr'); } catch (_) {}
});
