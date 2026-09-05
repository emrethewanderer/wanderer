---
name: dil-beyani-kapisi
description: "2026-08-19 KARAR — dil bir tahmin değil BEYANDIR: navigator.language yalnız ilk boyamayı yapar ve asla kaydedilmez; kapı onboarding'in İLK adımında bir kez sorar, beyan kullanıcı değiştirene kadar ezilmez"
metadata:
  type: project
---

Emre'nin şikâyeti: *"Dilin EN görünüyor."* Kök, dilin hiç **sorulmamış**
olmasıydı. `initI18n` her boot'ta `navigator.language`'e düşüyor, o tahmini
hiçbir yere yazmıyordu — yani "kullanıcının seçimi" diye bir şey yoktu, her
açılış cihaza yeniden soruyordu.

**Kural (§6.10 uygulaması):** cihazın dili kullanıcı hakkında bir kanıt
değildir — telefonu İngilizce kurulmuş biri Türkçe konuşuyor olabilir.
Zincir tek yönlüdür: **tahmin boyar, beyan kalır.** Tahmin kaydedilseydi
beyana dönüşür ve kapı bir daha hiç açılmazdı.

| | Kaynak | Kalıcı mı |
|---|---|---|
| Tahmin | `navigator.languages[0]` | **Hayır** — yalnız ilk boyama |
| Beyan | kullanıcının kapıda / ayarlarda seçimi | Evet: `etw_lang` (ham localStorage + SafeStorage) |

## Kapının yeri: onboarding'in İLK adımı (Emre'nin kararı)

İlk yazımda kapı boot'ta açılıyordu; Emre onu **onboarding'e** taşıttı:
soru yeni üye olana sorulur, çünkü sorulduğu andan sonraki her cümle —
yönlendirmeler, kategori adları, doğan kartın kendisi — o dilde söylenecektir.
`02c-portre.js` `runPortreOnboarding()` başında: beyan yoksa `openLangGate({
onSecim })`, seçimden sonra **onboarding baştan kurulur** (sözlük değişti,
metinler yeniden okunmalı — rekürsiyon tek seviyedir).

Onboarding'i çoktan geçmiş kullanıcı dilini ayarlardan değiştirir
(`openLangPicker` → `requestLangChange` → onay → reload). Kapı bunu kendisi
söyler: alt satırı iki dilde "ayarlardan değiştirebilirsin".

**Kapının biçimi:** başlık İKİ dilde durur ("Hangi dilde konuşalım?" /
"Which language shall we speak?") — hangi dili bildiğini bilmediğin birine
tek dilde soru sormak, sorunun kendisini engele çevirir. Seçenekler daima
kendi dillerinde (`I18N_LANGS[code].name` native addır).

Yüzey: `langBeyanVar()` · `openLangGate({ onSecim })` — `js/parts/15-i18n.js`.
Stil `#lang-gate-*`, `css/parts/wanderer.css` (görsel dili `#lang-confirm` ile
ortak). Kapı: `tests/15-dil-beyani-kapisi.test.js` +
`tests/02c-portre-onboarding.test.js` son üç test.

**GOTCHA — testte ölçüm yeri:** `tests/setup.js`'in `beforeEach`'i her testten
önce `etw_lang='tr'` yazar. "Boot tahmini kaydetti mi" sorusu `it()` gövdesinden
sorulamaz; ölçüm modül **import anında** alınıp bir değişkende tutulur.

Bkz. [[tr-en-i18n-tamamlama]] · [[i18n-bundle-bolme]] · [[gerceklik-mimarisi]] ·
[[benlik-karti]]
