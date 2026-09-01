/* ═══════════════════════════════════════════════════════════════
   SIDECAR GİRİŞİ — Chart.js grafik motoru
   build.sh → assets/ext-chart.js → window.__EXT_CHART__
   Ana bundle'a girmez: grafik yalnız GEÇMİŞ GÜNLER (04 moodChart) ve
   İç Meclis dağılımı (05 partsChart) açılınca gerekir; ~60KB gzip'i
   ilk yüklemeye bindirmek israftı. Register listesi js/config.js'ten
   buraya taşındı — kullanılan controller/element/scale bire bir aynı.
═══════════════════════════════════════════════════════════════ */
import {
  Chart,
  LineController, BarController, DoughnutController,
  LineElement, BarElement, ArcElement, PointElement,
  LinearScale, CategoryScale,
  Tooltip, Legend, Filler, Title
} from 'chart.js';

Chart.register(
  LineController, BarController, DoughnutController,
  LineElement, BarElement, ArcElement, PointElement,
  LinearScale, CategoryScale,
  Tooltip, Legend, Filler, Title
);

export { Chart };
