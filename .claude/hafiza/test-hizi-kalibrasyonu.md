---
name: test-hizi-kalibrasyonu
description: "Test süiti 6:34→3:10 indi — pool:'threads' + maxWorkers:3; isolate:false ve jsdom→node göçü ölçülüp REDDEDİLDİ"
metadata: 
  node_type: memory
  type: project
  originSessionId: aa0243d6-0902-4bbd-93f8-cf5bfd7d9881
  modified: 2026-08-07T20:34:48.953Z
---

2026-08-07'de ölçüldü ve `vite.config.js` test bloğuna yazıldı: `pool: 'threads'`
+ `maxWorkers: 3`. Tam süit **386.23 sn → 188.09 sn** (wall 6:34 → 3:10, %51),
1898 test yeşil, izolasyon korunuyor.

Kök neden testin kendisi değil **ortam kurulumuydu**: `state.test.js`'te testler
18 ms, jsdom kurulumu 3.04 sn — 160 katı. Tam süitte `environment` 562.95 sn ile
en büyük kalemdi (`tests` 285.47 sn'nin iki katı).

Makine profili kalibrasyonun sebebidir: Intel i5-5350U (2015, **2 fiziksel
çekirdek**, 1.8 GHz ULV), 8 GB RAM. Vitest varsayılanı 8 worker açıyordu →
swap (Pageins 1.9M) → yük ortalaması **151** (4 mantıksal çekirdeğe karşı).
Ölçüm: 2 worker 52.37 sn (fazla kısıyor) · **3 worker 44.24 sn** · varsayılan
83.01 sn. Başka makinede bu sayı yeniden ölçülmeli.

## Ölçülüp REDDEDİLEN iki yol

**`isolate: false`** — 28.70 sn'ye iniyordu (en hızlısı) ama testler modül
state'ini paylaşıp **sıraya bağımlı** hale geliyor. Kanıt: `10q2`'nin "boş
durumda iki deste de kart sırtı gösterir" testi, önceki dosyadan sızan
`temel-ozsaygi-filiz` kartını DOM'da görüp kırıldı. `--pool=threads --no-isolate`
kombinasyonunda yeşil görünüyordu — o yeşillik **tesadüftü**, sıra denk gelmişti.

**jsdom → node ortam göçü** — 22 aday dosyadan yalnız **2'si** geçti
(`state.test.js`, `gerceklik-kapisi.test.js`; ikisinde `// @vitest-environment
node` docblock'u var, `environment: 1ms`). Kalan 20'si patladı: 42×
`window.location.pathname` undefined, 27× `vi.mock` hatası, 18× `document is not
defined`. Sebep mimari: modüller top-level'da `window`/`document`'e dokunuyor
(IIFE boot + window expose kalıbı). Sahte bir `window.location` shim'i yazmak
jsdom'u elle yeniden yazmak olurdu.

`tests/setup.js`'in `beforeEach` bloğundaki `localStorage.clear()` /
`sessionStorage.clear()` artık try/catch içinde — node ortamındaki dosyalar
setup'ta ReferenceError almasın diye. jsdom davranışı değişmedi.

**Why:** Yavaşlık "makine eski" diye geçiştirilebilirdi; ölçünce yarısının
yapılandırma israfı olduğu çıktı. Ama iki cazip kısayol da ölçülünce çürüdü —
`isolate: false` kapının kırmızı olma yeteneğini satıyordu. Hız kazancı, testin
yalan söyleme riskiyle ödenmez.

**How to apply:** Faz kapısında hedefli koşu için **test dosyasını doğrudan
ver**: `npx vitest run tests/13m-kota.test.js` (2 dosya = 2.57 sn). Vitest'in
`--changed` ve `related` bayrakları bu repoda İŞE YARAMIYOR — ölçüldü:
`vitest related js/parts/13m-kota.js` 74 dosya / 1792 test koştu, çünkü her
modül `state.js` / `00a-infrastructure.js` üzerinden birbirine bağlı ve
bağımlılık grafiği neredeyse tam bağlı. `test:changed` script'i eklenip aynı
turda geri alındı; yeniden ekleme.

Tam süit sprint kapanışına saklanır (protokol §3.3: "kapının ölçüsü işin
yüzeyine göredir"). Yeni bir test dosyası gerçekten DOM'suzsa
`// @vitest-environment node` docblock'u ekle — ama grep tahminiyle değil,
koşarak kanıtla (bu turda grep tahmini %91 yanlış çıktı). `isolate: false`'u
yeniden gündeme getirme; ölçüldü, kırıyor.

**zsh tuzağı (ölçüm yaparken):** `ADAY="a.js b.js"; vitest run $ADAY` zsh'de
kelime bölmesi YAPMAZ — vitest tek bir filtre sanır ve "No test files found"
der. `${=ADAY}` yaz.

İlgili: [[test-kirilganligi-jsdom-stil-isinmasi]] (aynı kök nedenin daha önceki
semptomu — testTimeout 20 sn'ye o yüzden çıkarılmıştı), [[safestorage-testlerde-kvcache]]
