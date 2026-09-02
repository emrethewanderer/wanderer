# TypeScript Yol Haritası

> **2026-09-02 · sayılar ölçülerek güncellendi.** Önceki hâli "446 hata" ve
> "TS2304 = 100 gerçek bug" diyordu. Gerçek: **3.758 hata**, ve TS2304
> (`Cannot find name`) **sıfır** — o iş bir noktada bitmiş, belge
> güncellenmemişti (denetim D2).

## Bugünkü durum

| | |
|---|---|
| `tsconfig.json` | `allowJs:true`, **`checkJs:false`** — IntelliSense açık, hata raporu yok |
| `tsconfig.strict.json` | `checkJs:true` → 3.758 hata (bilinen taban) |
| `npm run typecheck` | exit 0 — CI'da koşar (`.github/workflows/kapi.yml`) |
| `npm run typecheck:strict` | tam rapor, `\|\| true` ile maskeli |
| `types/wanderer.d.ts` · `types/globals.d.ts` | window global bildirimleri |

### Dürüst uyarı: bu kapı bugün boş koşuyor

`checkJs:false` olduğu için `npm run typecheck` 85 bin satır JS'e **hiç
bakmaz** — repo'da 2 `.d.ts` dışında TypeScript dosyası yoktur, yani komut
her hâlükârda exit 0 verir. CI adımı olarak durması ücretsizdir ve
`checkJs` açıldığı gün kendiliğinden sertleşir; ama bugün bir kapı değil,
bir yer tutucudur. Bunu bilerek taşıyoruz.

## `checkJs:true` hata dağılımı (ölçüm: 2026-09-02)

| Kod | Sayı | Ne demek |
|---|---|---|
| TS2339 | 3.421 | `Property 'style' does not exist on type 'Element'` — `querySelector` `Element` döndürür, `HTMLElement` değil. Çözüm: `as HTMLElement` ya da bir `qs<T>()` yardımcısı. |
| TS2551 | 50 | Yakın ad önerisiyle bulunamayan özellik. |
| TS2322 | 50 | Tip uyuşmazlığı. |
| TS2362/2363 | 85 | Sayı olmayan değerle aritmetik — `Number(...)` eksik. |
| TS2698 | 37 | Spread edilen değerin tipi belirsiz. |
| Diğer | ~115 | |
| **TS2304** | **0** | Eskiden 100 idi ("eksik import" = gerçek bug). **Bitti.** |
| **TS1127** | **0** | JSDoc'ta `@param {T} [ad] — açıklama` biçimindeki em-dash çözümleyiciyi kırıyordu; 2026-09-02'de üç satırda ayırıcı `-` yapıldı (denetim E4). |

TS2339'un baskınlığı bir kalite sorunu değil, bir **tipleme boşluğu**dur:
DOM sorgularının dönüş tipi daraltılmadan kullanılıyor. Tek bir yardımcı
bu sayının çoğunu eritir.

## Sıradaki adımlar (öncelik sırası)

1. **`qs<T extends HTMLElement>(sel): T | null` yardımcısı** — TS2339'un
   büyük kısmını tek noktadan kapatır.
2. **`S` (merkezî state) için arayüz** — `js/state/` bölünmesi bitti, tipleme
   artık dosya başına yapılabilir.
3. **Aritmetik dönüşümleri** (TS2362/2363) — 85 nokta, mekanik.
4. **Yeni dosyaları `.ts` yaz** — kademeli göç.
5. **`checkJs:true`'yu varsayılan yap** — ölçü: TS2339 < 50. O gün
   `npm run typecheck` gerçek bir kapıya döner.

```bash
npm run typecheck          # CI uyumlu (bugün boş koşar — yukarı bkz.)
npm run typecheck:strict   # tam rapor
```
