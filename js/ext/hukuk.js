/* ═══════════════════════════════════════════════════════════════
   SIDECAR GİRİŞİ — Hukuki belge metinleri (TR+EN)
   build.sh → assets/ext-hukuk.js → window.__EXT_HUKUK__
   Panel (13p hkOpen) ilk açıldığında iner; ana bundle'a girmez.
═══════════════════════════════════════════════════════════════ */
export { buildHukukDocs } from '../parts/13p2-hukuk-metin.js';
