# innerHTML Codemod — Migrating to setHTML

## Mevcut Durum (Faz 1.1 + Phase B)
- Helper hazır: `js/parts/00c-html-safe.js` → `setHTML(el, html)`, `safeHTML(html)`, `safeMarkdownHTML(html)`, `setText(el, str)`
- Window globals: `window.setHTML`, `window.safeHTML`, `window.setText`, `window.safeMarkdownHTML`
- Audit script: `node scripts/audit-innerhtml.mjs`

## Audit Snapshot
- **Total:** 165 `.innerHTML =` çağrısı
- **Safe** (static template, no user data): 94
- **Escaped** (`escapeHTML` ile sanitize): 20
- **Sanitized** (DOMPurify/sanitizeMarkdown): 3
- **Risky** (manual review): 48

### Risky kategorisi yanıltıcı olabilir
Audit script satır-bazlı context'e bakar; multi-line template literal'ların içindeki `escapeHTML` çağrılarını her zaman yakalamaz. Gerçek risky sayısı muhtemelen 10-15 civarı.

## Codemod Yol Haritası

### 1. Auto-safe noktalar (94)
**Yapılacak yok.** Statik string template — XSS riski yok.

### 2. Escaped noktalar (20)
**Opsiyonel:** `setHTML` ile geçirmek defense-in-depth sağlar ama mevcut `escapeHTML` zaten yeterli.

```js
// Önce
el.innerHTML = `<div>${escapeHTML(userInput)}</div>`;

// Sonra (opsiyonel)
setHTML(el, `<div>${escapeHTML(userInput)}</div>`);
```

### 3. Sanitized noktalar (3)
**Yapılacak yok.** Markdown LLM çıktısı zaten DOMPurify'dan geçiyor.

### 4. Risky noktalar (48)
**Yapılacak:** Her birini incele, hangi kategoriye ait belirle.

Tipik düzeltme pattern'leri:

```js
// PATTERN A — user/DB content interpolation
// ÖNCE: list.innerHTML = items.map(it => `<div>${it.title}</div>`).join('');
// SONRA:
list.innerHTML = items.map(it => `<div>${escapeHTML(it.title)}</div>`).join('');

// PATTERN B — LLM/external HTML
// ÖNCE: el.innerHTML = aiResponseHtml;
// SONRA:
setHTML(el, aiResponseHtml); // safeHTML default config'i koruyor

// PATTERN C — static SVG / constant icon
// ÖNCE: btn.innerHTML = ICONS.check;
// SONRA: (değişiklik gereksiz — ICONS modul-local constant)
```

## Yaygın Risky Noktalar (manual review listesi)

Audit script çıktısından kategorize edilmiş başlıklar:

### Yüksek öncelikli (user data interpolation):
- `02-features-onboarding.js:57,338,601` — items/filtered/milestones map (yer yer escapeHTML var)
- `06-summary-chat.js:240,616` — session summary list, message render
- `07-settings-knowledge.js:281,568` — knowledge items, notes (escapeHTML kullanıyor — false positive)

### Düşük öncelikli (DOM constant/icon):
- `03-auth-shell.js:157` — `pso-icon` SVG string (PREMIUM_FEATURES constant)
- `04-llm-hero-history.js:221,229` — `_heroHTML()` çıktısı (modül-local üretim)

## Komutlar
```bash
node scripts/audit-innerhtml.mjs   # full audit
```

## Kabul Kriterleri
- `risky` sayısı < 10
- Hiçbir kullanıcı/LLM content noktası unprotected değil
- CI'da audit script çalışır + threshold check (`exit 1` if risky > 30 — şu an aktif)

---

# EMEKLİLİK — Geçiş Alanı (10j) + Arketip View (12a) → Olmak İstediğin Kişi (10D)

**Tarih:** 2026-07-03. **Neden:** "Olmak İstediğin Kişi" ekranı sil-baştan yeniden
tasarlandı. Eski iki yüzey (statik 12 arketip destesi + Geçiş Alanı) tek bir kaynağa
birleşti: kullanıcının kendi tasarladığı hedef kimlik (Yeni Bir Kişiye Geçiş Yapısı) +
Geçiş Protokolü ritüeli. Modül: `js/parts/10D-olmak-istedigin.js` (önek `oik`, tablo
`oik_kartlari` mig 029). Bkz plan: `.claude/plans/cosmic-prancing-spring.md`.

## Silinenler (geri getirmek için: bu commit öncesi git ref)
- **`js/parts/10j-w2-gecis-alani.js`** — TAM DOSYA silindi. İçeriği 10D'ye taşındı
  (okuma ritüeli, ses kaydı, kristal eşikleri, `oikCompleteReading` = eski
  `gaCompleteReading` ikizi). `etw_gecis_alani_v1_{uid}` KV'si kullanıcı diskinde
  KALIR — `oikInit` bir kez ondan göç eder (idempotent, `migratedFromGecis`).
- **`css/parts/gecis-alani.css`** — silindi (kurallar `oik-` önekiyle `oik.css`'e).
- **`_src.html`** — `#gecis-view` (hub + editör + okuma bölümleri) ve `#arketip-view`
  blokları çıkarıldı. Giriş butonları (`w2-profile-action`, `ws-drawer-identity`)
  `switchView('oik')`.
- **`js/parts/12a-archetypes.js`** — `loadArketipView` (route yüzeyi) SİLİNDİ.
  Zincirindeki yardımcılar (`wsArchCard`/`wsArchTraitsHTML`/`_openTraitPopup`/
  `_getStreak`/`_getUserAdds`/`TRAIT_FIELDS`/`TRAIT_SCALE`) artık çağrılmıyor —
  ölü kod olarak bırakıldı (birbirine bağlı küme; ayrı temizlik turunda sökülebilir).
  **KORUNAN (canlı importlar):** `ARKETIPLER_DATA`, `getArchetypeById`,
  `getAllArchetypeData`, `getSuggestedArchetype`, `initArchetypes`, `_getDeck`,
  `wsArchFigure`, `wsArchFigureBody`, `EMRE_ONERI`, `_saveArchetypeProgress`.
- **i18n `ga.*`** (72 anahtar × TR+EN) — silindi; okuma/kristal metinleri `oik.*`'e
  devşirildi (parite 2625=2625).

## Route köprüsü (kalıcı — eski derin-linkler kırılmasın)
`switchView('arketip')` ve `switchView('gecis')` → `'oik'` (03-auth-shell `switchView`
başı). PWA shortcut `?view=arketip` da alias'lanır.

## Tek kaynak (tüm tüketiciler 10D'den beslenir)
`window.oikGetDesired()` / `oikGetContext()` / `oikGetStats()` / `oikGetCard()` /
`oikSeedDraft()`. Geriye uyum: `S._personTransition.desired.description` +
`S._affirmation` "ayna" olarak yazılmaya devam eder (`_syncLegacyMirror`).
Geçiş dönemi guard'ları: 13l sayaçları ve 10u `_gecisDone` hem `S._oik` hem eski
`S._gecisAlani`'yi `max`/`OR` ile onurlandırır (hiçbir okuma kaybolmaz).

## ELLE ADIMLAR (Emre)
1. `migrations/000_wanderer_schema.sql` → Supabase SQL editöründe uygula.
2. `reset-user` + `delete-user` edge fn'leri (`oik_kartlari` eklendi) → yeniden deploy.
3. (Ops.) Admin "Emre'nin Sesi" → `prompt.oik.design` yönlendirmesini gözden geçir.
