import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  esbuild: {
    // Prod bundle'dan console.log/warn/debug at; console.error/info kalsın (telemetri için).
    drop: process.env.NODE_ENV === 'production' ? ['debugger'] : [],
    pure: process.env.NODE_ENV === 'production'
      ? ['console.log', 'console.warn', 'console.debug']
      : []
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
    // CSS'i JS bundle'ından ÇIKAR (assets/style-<hash>.css). Varsayılan davranış
    // burada bir tuzaktı: format:'iife' + inlineDynamicImports ile vite,
    // _src.html'deki 35 stylesheet link'ini (741KB kaynak) JS'in İÇİNE gömüyordu
    // — ölçüldü: bundle'ın gzip'inin ~%14'ü stylesheet'ti, yani "JS bütçesi"
    // diye ölçtüğümüz sayının o kadarı hiç JS değildi. Ayırınca 649→558KB gzip
    // (CSS 90KB ayrı asset olarak), raw 2356→1835KB.
    // Kazanç muhasebe değil: CSS JS'ten bağımsız cache'lenir (JS değişince CSS
    // yeniden inmez) ve 532KB metin JS parse'ından düşer. Kural kaybı YOK —
    // @keyframes 223=223, @media 80=80, cascade sırası korunur (base.css :root
    // en başta); ayrılan CSS'in kural sayısı `esbuild --minify`'ın tek başına
    // ürettiğiyle birebir aynı (5146). NOT: "CSS paralel iner" beklentisi
    // preview'da doğrulanamadı — python http.server tek threadli ve istekleri
    // sıraya alıyor; gerçek hosting'de ölçülmeli.
    cssCodeSplit: false,
    rollupOptions: {
      input: '_src.html',
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        name: 'WandererApp',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  server: {
    port: 3000,
    open: true
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['js/parts/**/*.js', 'js/state.js'],
      exclude: ['js/main.js'],
    },
    include: ['tests/**/*.test.js'],
    // Varsayılan 5000 ms yük altında yalan söylüyordu: jsdom'da ağır modül
    // grafiğini ısıtan ilk testler (02c onboarding, 09d örüntü, 09e portre,
    // 10q kart töreni, 12f hazine) yüksüz makinede ~2 sn iken paralel CPU
    // baskısı altında sınırı aşıp kırmızıya dönüyordu — kodda bir kusur
    // olmadan. Zaman aşımı asılı kalmış işi yakalamak içindir, yavaş makineyi
    // cezalandırmak için değil; 20 sn'yi aşan test hâlâ gerçekten bozuktur.
    testTimeout: 20000,
    hookTimeout: 20000,

    // ─── Havuz: bu makineye kalibre edildi (2026-08-07, ölçüldü) ───────────
    // Vitest'in varsayılanı 'forks' (her dosya ayrı süreç). Bu repoda testin
    // en pahalı kalemi işin kendisi değil, ORTAM kurulumuydu: 10 dosyalık
    // kıyas kümesinde 83.01 sn'nin 57.92'si environment'tı — tek bir
    // state.test.js'te testler 18 ms, jsdom kurulumu 3.04 sn (160 katı).
    // worker_threads süreç çatallamaktan ucuzdur; izolasyon aynen korunur.
    //   forks (taban) 83.01 sn → threads 48.12 sn → threads+3 worker 44.24 sn
    // maxWorkers=3: makinede 2 fiziksel çekirdek (i5-5350U) + 8 GB var;
    // varsayılan 8 worker swap'e sokuyordu (Pageins 1.9M). 2 worker ise fazla
    // kısıyor (52.37 sn) — 3 ölçülen en iyi nokta, tahmin değil.
    //
    // isolate:false DENENDİ ve REDDEDİLDİ: 28.70 sn'ye iniyordu ama testler
    // modül state'ini paylaşıp sıraya bağımlı hale geliyor — 10q2'nin "boş
    // deste" testi önceki dosyadan sızan kartı görüp kırıldı. Kapının değeri
    // kırmızı olması gerektiğinde kırmızı olmasıdır; 15 sn için satılmaz.
    pool: 'threads',
    maxWorkers: 3,
  },
});
