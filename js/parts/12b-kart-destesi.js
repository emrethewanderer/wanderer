// Wanderer AI — KART DESTESİ (Kişilerim koleksiyonunun veri kaynağı)
// ════════════════════════════════════════════════════════════════════════════
// Emre'nin iki kitabının (İlişki Felsefesi · Zihniyet Devrimi) çerçevelerinden
// türetilmiş "kişi" kartları. YAYINLANAN KESİT 12 KARTTIR (2026-08-07 kararı):
// 3 çekirdek · 6 temel (iki evrim hattı) · 2 gölge · 1 bileşik — kesit
// rastgele değil MEKANİĞE göre seçildi, 10q'nun dört motoru da malzemesiz
// kalmasın diye. Sözleşme testle mühürlü: tests/12b-kesit-mekanikleri.test.js
// (EN karşılığı: tests/12b-deste-en.test.js — parite + donuk alan kapısı).
// Kart eklemek serbesttir; bir motoru malzemesiz bırakmak değil.
// Her kart, 12a'nın arketip veri şemasıyla
// UYUMLU şekildedir (aynı alanlar: id/roman/name/sub/whisper/glyph/sigil/lesson +
// dusunceler/inanclar/hisler/davranislar) — ARTI yeni meta: category/rarity/recipe.
//
// recipe = { signals:[{key,op,value,weight,dim}], threshold, minEvidence }
//   key      → 10q `kkComputeSignals()` çıktısındaki düz sinyal anahtarı
//   dim      → bu sinyal hangi boyutu besler (canlı Kişi Kartı gösterimi)
//   op/value → 'gte' eşiği; match = ağırlıklı kısmi-doyum 0-100
//   threshold→ kazanım eşiği; minEvidence → erken/ucuz kazanımı engeller
//
// Deste LAZY kurulur (getFullDeck) — 12a eval sırasına bağımlı değil.
// Durum (state) tüm kartlar için S._archetypes[id] altında paylaşılır → motor
// hem bu yeni kartları hem de 12a'nın 12 çekirdek arketipini otomatik sürer.
// ════════════════════════════════════════════════════════════════════════════

import { S } from '../state.js';
import { getAllArchetypeData } from './12a-archetypes.js';
import { kumHeuristicSpec } from './12d-kart-uretim.js';
import { ikvNormSpec } from './12c-kart-gorsel.js';
import { ensureExt } from './00-ext-loader.js';

/* ── Nadirlik kademeleri (foil yoğunluğu + zorluk) ───────────────────────── */
export const RARITIES = {
  yaygin: { id: 'yaygin', label: 'YAYGIN',  order: 0, color: '#9a8f7a', foil: 0.10, scale: 56, threshold: 58, minEvidence: 3 },
  nadir:  { id: 'nadir',  label: 'NADİR',   order: 1, color: '#7fb0c8', foil: 0.30, scale: 64, threshold: 64, minEvidence: 8 },
  nadide: { id: 'nadide', label: 'NADİDE',  order: 2, color: '#d4af55', foil: 0.55, scale: 72, threshold: 70, minEvidence: 16 },
  efsane: { id: 'efsane', label: 'EFSANE',  order: 3, color: '#c89bf0', foil: 1.00, scale: 80, threshold: 76, minEvidence: 30 },
};

/* ── Kategoriler (kitap çerçeveleri) ─────────────────────────────────────── */
export const CATEGORIES = {
  cekirdek:  { id: 'cekirdek',  label: 'Çekirdek Arketipler', glyph: '✦' },
  temel:     { id: 'temel',     label: 'Temeller',            glyph: '❖' },
  derinlik:  { id: 'derinlik',  label: 'Derinlikler',         glyph: '◈' },
  manifesto: { id: 'manifesto', label: 'Manifesto',           glyph: '⟡' },
  golge:     { id: 'golge',     label: 'Gölgeden Işığa',      glyph: '◐' },
  perde:     { id: 'perde',     label: 'Perdeler',            glyph: '◇' },
  tuzak:     { id: 'tuzak',     label: 'Tuzaklar',            glyph: '⊘' },
  surec:     { id: 'surec',     label: 'Süreç Ustalığı',      glyph: '∞' },
  gercek:    { id: 'gercek',    label: 'Gerçek Hayat',        glyph: '◉' },
  bilesik:   { id: 'bilesik',   label: 'Bileşik Kişiler',     glyph: '⧉' },
};

/* ════════════════════════════════════════════════════════════════════════
   DESTE KURULUMU — içerik sidecar'dan (bundle diyeti)
   12 kartlık içerik gövdesi 12b2-deste-icerik.js'te ve ana bundle'a
   GİRMEZ: build.sh onu ext-deste.js sidecar'ı yapar; boot'ta buradan
   fire-and-forget istenir (splash perdesi ~4sn — ~41KB gzip paket yetişir).
   API sözleşmesi SYNC kalır: veri gelmeden getFullDeck()=[] /
   getCardById()=null — tüketiciler savunmacı; kritik erken yüzey (02d
   Eşik) deckReady()'yi bekler.
═══════════════════════════════════════════════════════════════════════════ */
let _deck = null;
let _byId = null;
let _deckP = null;

/* Overlay uygulanabilecek METİN alanları — bu liste donuk sözleşmenin
   (id/category/rarity/recipe/virtue/glyph/sigil/roman) sınırını çizer; overlay
   bunların DIŞINA asla yazamaz.
   TR kaynak dildir, overlay almaz. EN 2026-08-19'a kadar TR ile aynı istisnadaydı
   (K3, tüm-diller v2'ye bağlıydı) — ama v2 DIŞ diller içindir; EN uygulamanın
   ikinci resmî dilidir ve arayüzü zaten tam native'di. Arayüz İngilizce iken
   kartın portresini Türkçe okutmak yarım lokalizasyondu (İç Çalışma 04 rev.2 ·
   Y3); Emre kararıyla istisna kaldırıldı, deste `en-deste` overlay'ini alır. */
const DECK_OVERLAY_FIELDS = ['name', 'sub', 'whisper', 'lesson', 'portre', 'gercek', 'kok', 'olunca', 'dusunceler', 'inanclar', 'hisler', 'davranislar'];

function _applyDeckOverlay(lang) {
  if (!lang || lang === 'tr' || !_deck) return Promise.resolve(true);
  return ensureExt('deste-' + lang).then(ns => {
    const overlay = ns?.DESTE_OVERLAY;
    if (!overlay) return true;
    for (const card of _deck) {
      const patch = overlay[card.id];
      if (!patch) continue;
      for (const f of DECK_OVERLAY_FIELDS) {
        if (patch[f] !== undefined) card[f] = patch[f];
      }
    }
    return true;
  }).catch(e => {
    // overlay eksik/başarısız → kart TR içerikle görünmeye devam eder (kritik değil)
    console.error('deste overlay yüklenemedi (' + lang + '):', e);
    return true;
  });
}

export function deckReady() {
  if (_deck) return Promise.resolve(true);
  if (_deckP) return _deckP;
  _deckP = ensureExt('deste').then(ns => {
    if (typeof ns?.buildDeckData !== 'function') throw new Error('deste namespace boş');
    if (!_deck) {
      _deck = ns.buildDeckData({ getAllArchetypeData, kumHeuristicSpec, ikvNormSpec, RARITIES });
      // Koleksiyon numarası (K2 · Pokémon set numarası dili): "007 / 12".
      // 12b2'nin build sırası deterministik olduğundan bir kartın numarası
      // oturumdan oturuma DEĞİŞMEZ — numara kartın kimliğinin parçasıdır.
      // catGlyph: kart yüzünün künyesi (12c) kategori glifini buradan okur —
      // 12c'nin 12b'yi import etmesi döngü olurdu (12b→12d→12c), glif TEK
      // kaynakta (CATEGORIES) kalsın diye karta iliştirilir.
      const n = _deck.length;
      _deck.forEach((c, i) => {
        c.no = i + 1; c.noTotal = n;
        c.catGlyph = (CATEGORIES[c.category] && CATEGORIES[c.category].glyph) || '';
      });
      _byId = new Map(_deck.map(c => [c.id, c]));
    }
    return _applyDeckOverlay(S._currentLang);
  }).catch(e => {
    _deckP = null; // geçici ağ hatası kalıcı olmasın — sonraki çağrı yeniden dener
    console.error('deste sidecar yüklenemedi:', e);
    return false;
  });
  return _deckP;
}

// Boot'ta hemen iste — ilk tüketici (Eşik/kart motoru) geldiğinde çoktan hazır.
if (typeof window !== 'undefined') deckReady();

export function getFullDeck() { return _deck || []; }

export function getCardById(id) { return _byId ? (_byId.get(id) || null) : null; }

export function getCardsByCategory(catId) {
  return getFullDeck().filter(c => c.category === catId);
}

export function getDeckStats() {
  const deck = getFullDeck();
  const byRarity = {}; const byCat = {};
  for (const c of deck) {
    byRarity[c.rarity] = (byRarity[c.rarity] || 0) + 1;
    byCat[c.category] = (byCat[c.category] || 0) + 1;
  }
  return { total: deck.length, byRarity, byCat };
}
