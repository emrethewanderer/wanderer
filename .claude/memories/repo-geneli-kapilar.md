---
name: repo-geneli-kapilar
description: Hedefli süitin önek kuralı repo-geneli kapıları asla seçmez; npm run kapi:genel o kör noktayı kapatır
type: gotcha
---

# Repo-geneli kapılar önekle bulunmaz

`PROTOKOL-FABLE.md` §3.3'ün faz kapısı şöyle der: değişen her
`js/parts/<önek>…` için `tests/<önek>…` koşulur. Kural doğrudur ve tam süiti
faz sonundan çıkarmayı haklı çıkarır — bir fazın kırığı o fazın dosyalarında
yaşar.

**Ama bazı testler bir modülün değil BÜTÜN AĞACIN kapısıdır** ve `git diff`
onlara hiç işaret etmez: `xss-kapisi` · `tasarim-kapisi` · `gerceklik-kapisi` ·
`bagsiz-ad-kapisi` · `bundle-kapisi` · `yetim-kopru-kapisi` · `eksen-kapisi` ·
`oz-denetim-kapisi` · `native-senkron-kapisi` ve ötekiler.

**Why:** 2026-09-03'te ölçüldü. FAZ 5 `js/parts/13q-*` değiştirdi, hedefli süit
`tests/13q-*` koştu ve **yeşil bastı** — oysa aynı faz XSS tabanını 23
korumasız interpolasyonla büyütmüştü. Kırık CI'da doğdu (#57), üç faz boyunca
taşındı (#58–#60), Emre dört uyarı e-postası aldı. Faz kapısı kendi ölçüsünde
dürüst koştu; yalnız yanlış hedefe bakıyordu.

**How to apply:**

    npx vitest run tests/<önek>*   # o fazın modülleri
    npm run kapi:genel             # repo-geneli kapılar — ~17 sn

`kapi:genel` = `vitest run kapisi kapi-workflow` (20 dosya, 284 test).
**Elle bakımlı bir liste DEĞİL, desen** — kasıtlı: liste bayatlar, yeni bir
kapı ona kendiliğinden girmez ve kapı sessizce eksilir. Ucuzluğu da kasıtlı:
ucuz olmayan bir kural yine atlanır (tam süit faz sonundan tam bu sebeple
çıkarılmıştı).

İkinci ders aynı gün çıktı ve ayrı bir dosyada: [[kirmizi-kapi-okunmali]].

Bağlar: [[kapi-sessiz-gec]] · [[kapi-cifte-kosu]] · [[dogrulama-tarayicisi]]
