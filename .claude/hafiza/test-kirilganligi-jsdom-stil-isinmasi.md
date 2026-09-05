---
name: test-kirilganligi-jsdom-stil-isinmasi
description: "Yük altında kırılan testlerin kökü — kkEnsureStyles'ın jsdom CSS ısınması testin İÇİNDE ödeniyordu; ısıtmayı beforeAll'a al + testTimeout 20 sn"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5d8f4934-610e-4e77-a7e6-06e718aef63a
  modified: 2026-07-25T12:24:19.472Z
---

2026-07-25: "Testler paralel yük altında kırılgan" şikâyetinin kökü bulundu ve
çözüldü. Semptom `hzBuyPack` testlerinde görünüyordu ama hastalık genel:
ağır CPU yükü altında **5 test** birden 5000 ms'lik varsayılan sınıra çarpıyordu
— 12f hazine (hzBuyPack), 10q kart (kkOpenDetail), 02c onboarding, 09d örüntü,
09e portre. Kodda kusur yoktu; sınır yavaşlığı ölçüyordu.

**İki ayrı kök neden, iki ayrı ilaç:**

1. **jsdom stil ısınması (12f + 10q).** `kkEnsureStyles` devasa bir JS-enjekte
   CSS bloğunu `document.head`'e asar. jsdom'un CSS çözümlemesi pahalıdır ve bu
   tek seferlik maliyet, `hzOpenPack` / `kkOpenDetail`'in İLK çağrısında —
   yani törenin kendi testinin içinde — ödeniyordu. Ölçüm (aynı makine, arka
   arkaya 3 koşu): **ısıtmasız 5741/5368/6247 ms → ısıtmalı 1183/1591/1135 ms.**
   Çözüm: `beforeAll`'da `kkEnsureStyles()` ısıtması (açık 30000 ms hook payıyla).
   Makine soğukken maliyet ~590 ms, ısındığında saniyelere çıkıyor — ilk
   ölçüme aldanma, karşılaştırmalı ölç.

2. **Modül grafiği ısınması (02c/09d/09e).** Her dosyanın ilk testi kendi
   import maliyetini taşır; taşınabilir bir yer yok. Çözüm: `vite.config.js`
   `testTimeout: 20000` + `hookTimeout: 20000`.

**Ek: tören zamanlayıcı sızıntısı.** `hzOpenPack` 2600 ms oto-açılış + flip
kaskadı + actions timer'ı kurar; `close()` yalnız `autoT`yi temizliyordu.
Artık hepsi bir `timers` dizisinde toplanıp kapanışta atılıyor
(`js/parts/12f-hazine-paketleri.js`). Testte de `vi.useFakeTimers({ toFake:
['setTimeout','clearTimeout','setInterval','clearInterval'] })` — **Date
BİLİNÇLİ sahtelenmez**, `hzWeekKey` ve `earnedAt` gerçek takvim ister.

**Why:** Kırılgan test, güvenilmez kapıdır — "yeşil mi kırmızı mı" sorusunun
cevabı makine yüküne bağlıysa doğrulama kapısı (§3.3) anlamını yitirir.

**How to apply:** Bir test yük altında kırılıyorsa önce **ölç, tahmin etme**:
maliyeti testin içinde mi ödüyor? Tek seferlik bir ısınma (CSS, sidecar, modül
grafiği) test gövdesindeyse `beforeAll`'a taşı. Yeni bir tören/portal testi
yazarken, o modülün `*EnsureStyles` benzeri stil enjeksiyonunu `beforeAll`'da
ısıt. Zaman aşımını yükseltmek son çare ve yalnız gerçekten ağır ama doğru
çalışan testler için meşrudur — kök maliyeti düşürmeden yapılırsa sorunu
gizler. İlgili: [[hazine-destesi-kart-paketleri]], [[kisilerim-kart-motoru]].
