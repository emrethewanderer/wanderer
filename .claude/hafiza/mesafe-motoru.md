---
name: mesafe-motoru
description: "13x Mesafe Motoru — hazirlik=üç kapının en zayıf halkası (===100 ⟺ earned), niyet sırayı kurar kapıyı satın almaz, Ana Mesafe iki kutup arası tek sayı"
metadata: 
  node_type: memory
  type: project
  originSessionId: 2c6c072c-6ebe-40c9-bff7-c497468396d1
  modified: 2026-08-03T12:42:14.348Z
---

**Aradaki Yol — Mesafe Motoru (13x)**, 2026-08-01'de kuruldu. Wanderer iki kutbu
(altın=olduğun · lapis=olmak istediğin) her yerde çiziyordu ama aradaki mesafeyi
hiçbir yerde dürüstçe ölçmüyordu. Üç kırık vardı, üçü de aynı kökten:

1. **Çubuklar sahteydi** — `.esik-path-fill` (02d), `.yol-fill` ve
   `.yolp-score-fill` (yol.css) `inset:0` ile HEP tam doluydu; üstlerindeki
   "%93 yakınsın" metniyle çelişiyorlardı.
2. **Kart detayındaki yüzde kartın gelişiyle senkron değildi** — `ikvRing(m.score)`
   gösteriliyordu, oysa kart üç kapıya bağlı (`score>=threshold` **ve**
   `evidenceOk` **ve** dört boyutta `iknaOk`). Kullanıcı %85 görüp kart alamıyor
   ya da %72'de alıyordu.
3. **Ölçüm kişisel değildi** — kullanıcının kendi hedefi (OİK maddeleri,
   `kk.hedefler`) hesaba hiç girmiyordu.

## Motorun üç kavramı

- **HAZIRLIK** (`kkMatchCard().hazirlik`, 10q içinde doğar): üç kapının 0-1
  doluluğunun **minimumu** × 100, `Math.floor`. Kart-nesnel.
  **SÖZLEŞME: `hazirlik === 100` ⟺ `earned === true`** — testle mühürlü
  (60 profil × 112 kart taraması). `min` seçildi çünkü bir kişi olmak zincirin
  en ince yerinden kopar; ortalama "neredeyse oldun" yalanını söylerdi.
  `floor` şart: `round(100 × 0.996)` = 100 sözleşmeyi kırardı.
- **NİYET** (`msNiyet`, 1.0–4.0): hedef mührü +2.0 · OİK'i besleyen kart erdemi
  örtüşmesi +0.6 · OİK'in en yoğun kategorisi ile kartın baskın boyutu +0.4.
  **Sırayı kurar, kapıyı SATIN ALMAZ** — `earned` niyeti hiç görmez.
- **ANA MESAFE** (`msAnaMesafe`): hedeflenen kartların niyet-ağırlıklı hazırlık
  ortalaması → hedef yoksa en yakın 3 → hiç yoksa `null` (sayı gizlenir).
  Eşik Ekranı çubuğu, Bugün hero çizgisi ve `yolScore()` **tek bu kaynaktan**
  beslenir.

**Why:** Emre'nin vizyonu "olduğu kişi ile olmak istediği kişi farkını bulup ona
söylemek"ti. Mekaniğin çoğu zaten kuruluydu ([[olus-muhru-karari]],
[[kisilerim-kart-motoru]], [[olmak-istedigin-kisi]]); eksik olan ölçümün DÜRÜST
olmasıydı. Gösterilen sayı kartın gelişiyle aynı şeyi söylemezse güven kırılır.

**How to apply:**
- Ölçümle ilgili yeni yüzey `window.msAnaMesafe()` okur — ikinci bir sayı türetme.
- Kart-başı yüzde gerekiyorsa `kkMatchCard().hazirlik`; **asla `.score`** (o üç
  kapıdan yalnız biri, kullanıcıya gösterilmez).
- `earned` kapısına ASLA niyet/ağırlık karıştırma — kart ekonomisi 112 kartlık
  dengeye bağlı ([[kart-yagmuru-toren-ritmi]]).
- Kullanıcı ölçüyü arayüzde görür ama **Emre'nin ağzı sayı konuşmaz**: Oluş
  daveti prompt'undaki "SAYI, YÜZDE, PUAN YASAK" kuralı korunur.
- **KARAR 2026-08-01 (Emre) — hero'nun sayısızlığı kaldırıldı.** Kural bir gün
  önce tersiydi ("çizgi dolar ama rakam yazmaz"); Emre "burada da sayı olsun
  ancak tıklandığında Sabır Kartı açılsın" dedi. Denge sayıyı gizlemekte değil,
  **sorunun ikiye ayrılmasındadır: "ne kadar" kulun ölçtüğü, "ne zaman"
  Allah'ın bildiğidir.** Sayı üç yüzeyde de yazılır (02d Eşik · Bugün hero ·
  Yol ekranı `.yolp-score-lbl`), üçü de aynı `msAnaMesafe()` sayısını söyler;
  ölçü `null` ise sayı HİÇ basılmaz ("%0 yakınsın" yeni kullanıcıyı
  karşılayacak ilk cümle olamaz).
- **DÜZELTME 2026-08-03 — hero'nun sayısı `.yol-pct` DEĞİL, cümlenin
  içindedir.** Emre "ilk başta Fable 5 nasıl yaptıysa öyle" dedi; repo
  tarihinin ilk commit'inde (`bf29a06`) çizginin ucunda çıplak rakam yoktu,
  sayı Eşik cümlesinin `<b>` etiketindeydi. Hero artık **aynı i18n
  anahtarını paylaşıyor** (`esik.path.label` — kopyalanmadı; kopyalansaydı
  iki yüzey bir gün ayrışırdı). `.yol-pct` ve `yol.pct` / `yol.aria.path`
  anahtarları emekli; buton aria'sı `yol.sabir.aria`'ya döndü (sayıyı
  görünür cümle söylüyor, ekran okuyucuya iki kez okunmuyor). Cümle
  `.yol-label--mesafe` ile çizgiye yaslanır; ultra günü ve ölçüsüz
  kullanıcıda eski cümleler (`yol.hero.ultra` / `.first` / `.on`) durur.
- **Sabır Kartı (`yolOpenSabir`) çizginin kapısıdır** — hero'da ve Yol
  ekranında çizgi/sayı tıklanabilir bir butondur, kart oradan açılır. Eşik
  Ekranı'nın çizgisi bilerek dışarıda: orası akan bir tören sahnesi
  (`aria-hidden`), modal töreni böler. Kart TEK bir kanon metin taşır ve
  **dile çevrilmez** (manevi register, hardcoded TR); yeni yüzey eklerken
  metni yerelleştirmeye kalkma.
- Hazırlığı kısan kapıyı `kkEnZayifHalka(m)` adlandırır → "En ince yerin: {alan}"
  cümlesi. Boyut adları cümle içinde `kk.dim.soft.*` (başlık etiketleri BÜYÜK).
- Günlük iz: `etw_mesafe_iz_v1_<uid>`, gün anahtarı `localISODate()`
  ([[yerel-tarih-anahtari]]); `msIzFark()` yalnız İLERİ hareket için konuşur —
  geri giden güne bir şey denmez. **AÇIK İŞ:** iz yalnız Eşik Ekranı'nda tek
  satırla görünür (`esik.path.iz`); geri giden günün sessizliği bilinçli ama
  henüz Emre'nin onayından geçmedi.

**GOTCHA (build'i kırdı):** `02d-esik-ekrani.js` ve `10q`'nun enjekte CSS blokları
**template literal** içindedir — o blokların yorumlarına **backtick yazılmaz**;
literali kapatır, build "Expected a semicolon" ile patlar. → [[build-source-convention]]

**GOTCHA (dolgu):** `--ms-pct` ile dolan çubuklarda `animation-fill-mode` **backwards**
olmalı (`both` değil): `both` ile dolgu animasyonun son karesine bağımlı kalır,
arka plan sekmesinde boş donar, sayı ise yüzdeyi söylemeye devam eder.

**ELLE iş yok** — ölçüm tamamen client-side, mevcut verilerden türetilir.
Plan: `.claude/plans/mesafe-motoru.md`
