# XSS Yüzeyi — Ölçüm, Kapı ve Yol Haritası

> **2026-09-02 · Bu belge baştan yazıldı.** Önceki hâli "165 innerHTML, 48
> risky" ve "CI'da audit script çalışır + threshold check (şu an aktif)"
> diyordu. Denetim ölçtü: gerçek sayılar 379/105'ti ve script **hiçbir yerde
> koşmuyordu** — ne CI vardı, ne bir test onu çağırıyordu (bulgu B2/D2).
> Belge, koda karşı doğrulanmadan gerçek sayılmaz.

## Katmanlar

| Katman | Dosya | Durum |
|---|---|---|
| Kaçış (tek kaynak) | `js/parts/00a-infrastructure.js` → `escapeHTML` | ✅ canlı, 600+ çağrı |
| Sanitize | `js/parts/00c-html-safe.js` → `safeHTML`/`setHTML`/`safeMarkdownHTML`/`setText` | ⚠️ **sıfır tüketici** |
| Ölçüm | `scripts/audit-innerhtml.mjs` | ✅ kapıya bağlı |
| Kapı | `tests/xss-kapisi.test.js` | ✅ vitest içinde |
| Taban | `scripts/xss-taban.json` | 950 kayıt |

## `escapeHTML` — tek kaynak (2026-09-02)

Eskiden merkezî helper tip-güvensizdi: `!str` guard'ı `0` ve `false`'u yutuyor,
string olmayan bir değerde `str.replace is not a function` ile **çöküyordu**.
Sonucu 22 modülün kendi `esc`/`_esc` ikizini yazması oldu — üstelik altısı
tek tırnağı hiç kaçırmıyordu, yani tek-tırnaklı attribute bağlamında açık
bırakıyordu. Helper tip-güvenli yapıldı; bütün ikizler ona delege ediyor.

Kapı: `tests/00a-infrastructure.test.js` içindeki "Tip güvenliği" bloğu —
sayı, `0`/`false`, nesne, tek tırnak ve `null` vakaları. Bu vakalar düşerse
ikizler geri gelir.

**`10g-w2-wanderer-game.js`'teki `esc`** bir HTML kaçışı değil, regex
kaçışıdır (`_libHlRegex`). Ona dokunulmadı; denetçi de `&amp;` üretmediği
için onu ayırt eder.

## Ölçüm motoru — neyi sayar

Motor **satır değil ifade** tarar ve yalnız `innerHTML` atamalarını değil,
**HTML üreten her template'i** kapsar. Gerekçe: bu repoda HTML çoğunlukla
`innerHTML` satırında değil, HTML döndüren yardımcı fonksiyonlarda kurulur
(`${_atlRing(1)}`, `${kkRenderCard3D(kart)}`). Eski motor `.innerHTML =`
satırının ±2 satırlık penceresine bakıyordu; bu hem çok satırlı `map`
bloklarındaki kaçışı göremiyor (temiz kodu "riskli" sayıyor), hem komşu
satırdaki alakasız bir `escapeHTML` yüzünden gerçekten korumasız bir atamayı
"kaçışlı" damgalıyordu — ikincisi tehlikeliydi.

Bir interpolasyon **güvenli** sayılır:

- `escapeHTML(...)` / `esc(...)` / `safeHTML(...)` ile sarılıysa
- i18n getter'ıysa (`t(...)`, `p(...)`) — sözlük statiktir
- salt literal, aritmetik ya da `UPPER_SNAKE` sabitse
- fonksiyon çağrısıysa — **o fonksiyonun gövdesi ayrıca taranır**, bu yüzden
  çağrı yerinde yapısal sayılır
- elle yazılmış kaçış zinciri içeriyorsa (`.replace(/</g,'&lt;')`)

Aksi hâlde ham veri erişimidir ve tabana kaydedilir.

## Kapı nasıl çalışır

`scripts/xss-taban.json` bugünkü kayıtları dondurur. Denetçi listenin
**büyümesini** yasaklar — listeden düşmek (kaçış eklemek) serbesttir ve
`--taban-yaz` ile kayda geçer. Liste boşaldığında kapı kendiliğinden sert
kapıya döner.

```bash
node scripts/audit-innerhtml.mjs             # denetle (ihlalde exit 1)
node scripts/audit-innerhtml.mjs --liste     # tüm kayıtları dök
node scripts/audit-innerhtml.mjs --taban-yaz # tabanı bugüne çek
```

Bilinçli istisna, satıra ya da hemen üstündeki yoruma yazılır:
`/* XSS-MUAF: gerekçe */`. Gerekçesiz muafiyet de ihlaldir.

## Bekleyen iş — `safeHTML` katmanı

`00c-html-safe.js` yazılmış, `main.js` import edip window'a açmış, ama
**hiçbir modül kullanmıyor**. 2026-09-02'de katmanın kendisi onarıldı:
`ALLOWED_URI_REGEXP` override'ı `ADD_URI_SAFE_ATTR` olmadan URI **olmayan**
değerlere de uygulanıyordu, bu yüzden `target`, `tabindex` ve tüm `data-*`
allowlist'te olmalarına rağmen sessizce siliniyordu — ve `target="_blank" →
rel="noopener"` hook'u hiç çalışmıyordu. Katman artık doğru davranır ve
`tests/00c-html-safe-gercek.test.js` bunu gerçek DOMPurify ile sınar.

Bağlanacağı gün seçim şudur: LLM/markdown çıktısı `safeMarkdownHTML`'den,
kullanıcı verisi `escapeHTML`'den geçer. `setHTML`, HTML'i **kendi üretmediğin**
yerler içindir — kendi template'ini sanitize etmek gereksiz maliyettir.
