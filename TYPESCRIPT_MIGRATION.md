# TypeScript Migration Roadmap

## Mevcut Durum (Faz 3.2)
- `tsconfig.json`: `allowJs:true`, `checkJs:false` (lenient — IntelliSense aktif, hata raporu yok)
- `tsconfig.strict.json`: `checkJs:true` (446 hata; bunlar known baseline)
- `npm run typecheck` → exit 0 (CI passes)
- `npm run typecheck:strict` → tam tip raporu (`|| true` ile CI failure önlenir)
- `types/wanderer.d.ts` → window global ambient declarations

## checkJs:true Hata Dağılımı (baseline)
| Kod | Sayı | Açıklama |
|---|---|---|
| TS2339 | 242 | `Property 'style' does not exist on type 'Element'` — `querySelector` HTMLElement değil Element döndürür. Çözüm: `as HTMLElement` cast veya `getElementById`. |
| TS2304 | 100 | `Cannot find name 'X'` — **GERÇEK BUG'lar**: eksik import'lar. |
| TS2322 | 28 | Type mismatch — değer ataması uyumsuz. |
| TS2363/2362 | 46 | Math operations on non-number — `parseInt|String` cast eksik. |
| Diğer | 30 | |

## Gerçek Bug'lar (TS2304 — Cannot find name)
ESM'de import edilmemiş semboller. Vite IIFE bundle'da aynı scope sayesinde runtime'da çalışıyor ama strict ESM uyumsuz:
- `SecureStorage` (11) — bazı modüllerde import eksik
- `getAllMessages` (9)
- `COACH_IMG` (8) — config.js'ten import edilmeli (zaten 10b'de düzeltildi)
- `getSessionLastActivity` (7)
- `p` (6) — i18n prompts import eksik
- `_currentLang` (4) — `S._currentLang` olmalı (10b'de düzeltildi)
- `w2ExtractToneFromSummary`, `openDailyClosure`, `applySessionPartDots`, `_activeHomework`, `WHATSAPP_COMMUNITY_URL` …

## Sıradaki Adımlar (öncelik sırası)
1. **TS2304 hatalarını gerçek import'larla çöz** — bu gerçek bug'lar, runtime'da gizli hatalara yol açabilir.
2. **state.js'i tiplemek** — `S` object için interface tanımı (Faz 2.3 split sonrası).
3. **`querySelector` cast'leri** — utility fonksiyonu: `qs<T extends HTMLElement>(sel: string): T | null`.
4. **Yeni dosyaları `.ts` olarak yaz** — gradüel migration.
5. **`checkJs:true`'yu varsayılan yap** — TS2304 = 0 ve TS2339 < 50 olduğunda.

## Komutlar
```bash
npm run typecheck          # CI uyumlu (lenient)
npm run typecheck:strict   # tam rapor (development)
```
