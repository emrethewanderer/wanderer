---
name: tanima-motoru
description: Tanıma Motoru = 09d Örüntü Motoru + 09i Seçici ikilisinin proje adı; amaç fonksiyonu P(kalır) değil P(tanındı) ve hiçbir şey İCAT ETMEZ, var olan kanıtı sıralar — iki "FAZ 7 dersi" repoda başka dosyalardan alıntılanır
type: mimari
---

# Tanıma Motoru — "asla icat etmez, var olan kanıtı sıralar"

> **Bu dosya hakkında.** `js/parts/06-summary-chat.js:30` ve
> `tests/06-summary-chat.test.js:371` bu ada `[[tanima-motoru]] FAZ 7 dersi`
> diye bağ veriyordu; hedef dosya `.claude/memories/` altında yoktu. Özgün
> dosya repoya hiç girmedi ([[claude-altyapisi-commit-disi]]); **bu metin
> kurtarma değildir**, bugünkü koddan yeniden keşifle yazıldı.
>
> **Kayıp olan: fazların kendisi.** "Tanıma Motoru" bir modül adı değil bir
> **proje/çalışma adıdır** ve fazlarına kod içinden atıf yapılıyor —
> `grep -no "FAZ [0-9]\+" js/parts/09d-oruntu-motoru.js js/parts/09i-secici.js`
> bugün FAZ 1, 2, 3, 4, 5, 6, 7, 17, 18'i döndürüyor. **O fazları tanımlayan
> plan belgesi repoda YOK** — `.claude/plans/` altında bir "tanıma motoru"
> planı bulunmuyor. Yani hangi fazın neyi kapsadığı, kod yorumlarından
> parça parça okunabiliyor ama bütünü **okunamıyor**; bu dosya o planın
> yerine geçmez.

**Why:** Tanıma Motoru iki modülün ortak adıdır ve ikisi de kendi
banner'ında kendi cümlesini taşır:

| Modül | Başlık | Rolü |
|---|---|---|
| `js/parts/09d-oruntu-motoru.js` | ÖRÜNTÜ MOTORU · *"Gördüğün şey sensin"* | haftayı üç sesle aynaya koyar: **KANIT** (verbatim alıntı) · **TEŞHİS** (kitabın çerçevesi) · **YOL** (gerçek bir ritüele bağlantı) |
| `js/parts/09i-secici.js` | SEÇİCİ · *"Tutmak için değil, tanımak için sıralar"* | hangi kartın/davetin/kapının önce görüneceğine karar verir |

Motorun tezi 09i'nin banner'ında (`:5-14`) doğrudan yazılı ve dört platformun
tavsiye motorlarına karşı konumlanır:

> *"Onların amaç fonksiyonu P(kalır) — kullanıcıyı ekranda tutmak. Tanıma
> Motoru'nun amaç fonksiyonu **P(tanındı)**… bağımlılığa göre değil.
> 'Mesele algoritma değil — Mesele Sensin': seçici asla bir şey İCAT ETMEZ,
> yalnız zaten var olan kanıtı SIRALAR."*

Bu, §6.10'un (gerçeklik kuralı) sıralama katmanındaki hâlidir ve kodda
uygulanmış: 09i'nin çekirdeği (`secAday`/`secSirala`) **saftır** — hiçbir
modülün state'ine dokunmaz — ve *"kanıtsız girdi (`kokenOlc` kapısından
geçemeyen) aday listesine HİÇ GİRMEZ — 0 alıp sonda durmaz, **doğmaz**"*
(`09i-secici.js:22-24`).

09d üç katmanlıdır (`09d:13-22`): **1)** sinyal defteri (deterministik, gün
satırları + hafta agregaları) · **2)** haftalık damıtma (LLM, tembel) →
`user_patterns`'e `pme_weekly_` satırı yazar ve *"mevcut
`loadSessionPatterns` okuyucusu (01) SIFIR değişiklikle canlanır"* ·
**3)** sunum (Pattern modu, Örüntü Aynası, Gün Özeti, geri-çağrı ithafı).

**İki "FAZ 7 dersi" bu motordan çıkıp BAŞKA dosyalara taşınmış** — ve
ikisi de aynı aileden: *görünmeyen bir eksiklik, görünen bir hatadan
tehlikelidir.*

1. **Stil enjeksiyonu dersi** (`06-summary-chat.js:28-33`): 12c primitifleri
   (`ikv-panel`/`ikv-ghost-btn`/`ikv-seal-btn`) stillerini **kendi
   enjeksiyonundan** alır ve bunu bugüne dek yalnız **kart çizen** yüzeyler
   tetikliyordu. Kart çizmeyen bir yüzey `ikvEnsureStyles()` çağırmazsa
   *"zemin/düğmeler tarayıcı varsayılanına düşer (**build+testler yeşil
   kalırken**)"*. Çare tek satır: `dgSeffaflikAc` panelin açılışında
   `try { ikvEnsureStyles(); } catch (_) {}` çağırır (`06:532`).
2. **Kanıt kapısı dersi** (`tests/06-summary-chat.test.js:369-372`):
   *"söylenecek beyan/ölçüm/yorum yoksa panel VERİSİ HİÇ ÜRETİLMEZ —
   [[tanima-motoru]] FAZ 7 dersi ('kanıt yoksa giriş düğmesi hiç
   çizilmez')."* Yani boş bir panel açan bir düğme çizmek yerine düğme hiç
   doğmaz (`_dgSeffaflikVeri` `null` döner).

Tanıma Motoru'nun kendi FAZ 7'si `09i-secici.js`'te **Beyan Defteri**dir
(`:47`, `:381`): ölçümün üstündeki kat — *"Kesin susturma yalnız
kullanıcının BEYANIdır"* (`:114`) ve beyan kapısı kanıt kapısından **ÖNCE**
çalışır (`:184`).

**How to apply:**

## 1 · Sıralama/öneri yapan bir yüzey yazarken

Adayı `secAday(tur, id, girdiler)` ile kur, `secSirala` ile diz. **Kanıtsız
bir aday üretme** — 0 puanla listenin sonuna koymak da bir icattır; bu
motorda kanıtsız aday doğmaz. Çekirdeğin saflığını koru: `secAday`/`secSirala`
başka modülün state'ini okumaz, çağıran taraf sinyalleri toplayıp verir.

## 2 · 09d'yi import ETME

Konvansiyon banner'da yazılı: *"kimse bu modülü import etmez — tüm girişler
`window.om*` (06/01/10/13o, TDZ-güvenli)"*. Yeni bir tüketici de aynı
köprüden okur; okuma yoksa sessizce düşer (§5.2). Köprünün karşı ucunun
gerçekten bağlı olduğunu sınamak için bkz. [[guvenlik-emniyet-katmani]] —
sessizce kopan köprü bu repoda kanıtlanmış bir kırık sınıfıdır.

## 3 · Kart çizmeyen ama 12c primitifi kullanan bir yüzey açıyorsan

`ikvEnsureStyles()` çağır. Bu çağrı unutulduğunda **hiçbir kapı kırılmaz** —
build yeşil, test yeşil, konsol temiz; yalnız ekran yanlış görünür. Bugünkü
çağıranlar: `06:532`, `10q:2225`, `02d:332`, `02c:1021`, `13B:477` (window
köprüsüyle).

## 4 · Gün anahtarı ve ölçüm dili

09d gün satırlarını `localISODate`/`localDayKey` ile yazar — bkz.
[[yerel-tarih-anahtari]]. Sunum katmanında ölçüm kesin, davet ihtimalsel
konuşur (`15b-i18n-dict-core.js:2441`, *"Keşif yuvası daveti (Tanıma Motoru
K6) — ölçüm kesin, davet ihtimalsel"*) — bkz. [[ihtimalsel-dil-devrimi]].

İlgili: [[ihtimalsel-dil-devrimi]] (sunum katmanının dil kuralı) ·
[[yerel-tarih-anahtari]] (gün satırlarının anahtarı) ·
[[guvenlik-emniyet-katmani]] (window köprüsünün sessizce kopması)
