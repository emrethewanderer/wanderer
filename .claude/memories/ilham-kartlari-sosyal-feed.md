---
name: ilham-kartlari-sosyal-feed
description: "İlham Kartı" ayrı bir kart sınıfıydı; 2026-06-21'de Geçiş Kartım (10A) omurgasına gömüldü — ama ad üç katmanda yaşamaya devam ediyor (modül dosyası 10B, DB tablosu ilham_kartlari, enum kind:'ilham'), bu yüzden grep yanıltır
type: karar
---

# "İlham Kartı" kavramsal birleşmesi — ölen sınıf, yaşayan ad

> **Bu dosya hakkında.** `js/state/gecis-karti.js:5` bu ada
> `[[ilham-kartlari-sosyal-feed]]` diye bağ veriyordu; hedef dosya
> `.claude/memories/` altında yoktu. Özgün dosya repoya hiç girmedi
> ([[claude-altyapisi-commit-disi]]); **bu metin kurtarma değildir**, bugünkü
> koddan yeniden keşifle yazıldı.
>
> **Kayıp olan:** birleşme kararının verildiği tur. Kod tarihi
> (`2026-06-21`) ve sonucu üç dosyada yazılı, ama neyin denendiği ve
> nelerin elendiği repoda yok.

**Why:** Bu, bu repoda bir **kavramın öldüğü ama adının yaşadığı** en büyük
örnektir — ve tam da bu yüzden `grep "ilham"` yanıltıcıdır.

**Karar (2026-06-21, üç dosyada aynen yazılı).** "İlham Kartı" diye anılan
**ayrı yaratım sahnesi ve ayrı kart sınıfı kaldırıldı**; yaratım + koleksiyon
10A "Geçiş Kartım"ın iki kutuplu omurgasına gömüldü. `10B-ilham-karti.js:5-9`
sonucu tek cümlede söyler: *"Tek kart, tek koleksiyon, tek dil — kaynak
meta'da yaşar."* Yani bir kartın sohbetten mi Atölye'den mi doğduğu artık
**bir sınıf farkı değil, bir alan**dır (`source:'sohbet'`).

`js/state/gecis-karti.js:4-6` aynı kararın ad tarafını yazar: yaratım sahnesi
**Atölye**dir ve İlham Kartı ile *"aynı tezgâh, farklı giriş"*tir.

**Adın yaşadığı üç katman** — birleşmeden sonra geriye kalanlar:

| Katman | Bugünkü hâli |
|---|---|
| **Modül** `10B-ilham-karti.js` | artık **sohbet köprüsü**. Geriye yalnız şunlar kaldı: `ilhamRumuz()`, `_messageSuggestsPerson()`, `_extractKartTag()`, `_excerptForDisplay()`, `_chatContextForSeed()`, `_onEmreMessageFinalized`, `_armCardFrame()`. Eski export'ların **hepsi silindi** ve banner onları tek tek sayar (`ilhamShare`, `ilhamOpenAtolye`, `ilhamMiniCard`, `emptyIlhamKarti`…) — yerlerini 10A'nın `gk*` fonksiyonları aldı |
| **State** `js/state/ilham.js` | artık **sosyal feed** slice'ı. Kart verisi `_gecisKartlari`'na taşındı; burada yalnız üç yerel `Set` cache kaldı (beğendiklerim / koleksiyonuma aldıklarım / bildirdiklerim) |
| **DB** | `ilham_kartlari` tablosu ve `paylasilan_kart_kopyala` RPC'si **legacy** — artık yazılmaz/çağrılmaz. Paylaşım `paylasilan_kartlar` tablosuna iner; `kind:'ilham'` değeri **enum geri uyumu için bilerek korundu**, yeni paylaşımlar `kind:'benim'` yazar (`10A-gecis-karti.js:1299-1304`) ve feed `kind`'a hiç bakmaz |

**Sosyal feed'in kendi tasarım kararları** (`10C-sosyal-feed.js:1-32`):

- Feed bir **takipçi sayacı değil**, *"paylaşılan kartlar bir halka
  pazarıdır"*. Gerçek ad yoktur — yalnız anonim, `user_id` türevli sabit
  wanderer-rumuzu (rumuz artık **sunucu mührüdür**, mig 025 BEFORE INSERT
  trigger'ı; client gönderimi yalnız migration'sız kurulum fallback'i).
- Üç ses: beğen · yorum · kendi koleksiyonuna ekle. 2.0'da (2026-07-02)
  **dördüncü sessiz ses** eklendi: ⚑ BİLDİR — iki vuruşlu, *"halkayı korur"*.
- **Sosyal akış state'te TUTULMAZ** (`js/state/ilham.js:9-12`): *"büyür,
  kaybolur, sayfada anlık sorgulanır."* State'te yalnız "ben neyi beğendim /
  aldım" cache'i durur, o da UI'ın çift istek atmaması için.

**Ve aynı ailenin ikinci Emre kararı — 3.0 (2026-08-02):** *"DAVET, ANCAK
DEMİR TUTTUYSA GELİR."* Altın CTA chip'i kaldırıldı; kart artık mesaj biter
bitmez **arka planda sessizce** tasarlanır ve tasarım kurulamazsa kullanıcı
**hiçbir şey görmez**. Gerekçe §6.2'dir: uygulama tutamayacağı sözü vermez —
eski akışta LLM düşünürken sahte bir kart ("Olunan Kişi" + kullanıcının kesik
cümlesi) gerçekmiş gibi sunuluyordu.

**How to apply:**

## 1 · "ilham" adını görünce önce hangi katman olduğunu sor

Bir `ilham*` adı üç şeyden biri olabilir: **ölü bir sınıfın kalıntısı**
(dokunma, silme — legacy DB uyumu), **yaşayan bir sohbet köprüsü
fonksiyonu** (10B'de kalan yedi ad), ya da **sosyal feed'in kendisi**
(10C + `js/state/ilham.js`). Üçünü karıştırmak, birleşmeden bu yana bu
dosyaların en olası kırık kaynağıdır.

## 2 · Bu ad göçünü "tamamlanmamış" sanıp bitirmeye kalkma

§4.3 *"tek ad, tek gerçek"* der ve haklıdır — ama burada kalan adlar
**bilinçli** bırakılmıştır ve gerekçeleri yazılıdır: `kind:'ilham'` DB enum
geri uyumu, `ilham_kartlari` legacy veri. Bunları yeniden adlandırmak bir
temizlik değil, kullanıcı verisine dokunan bir **göçtür** (§4.3 madde 5,
ELLE migration). Kalan yüzeye dokunacaksan önce `10B` banner'ını oku:
neyin neden kaldığı orada tek tek yazılı.

## 3 · Yeni bir kart sınıfı eklemek istediğinde

Bu birleşmenin kendisi cevaptır: **ayrı sınıf açma, mevcut omurgaya kaynak
alanı ekle.** İlham Kartı ayrı bir sahne, ayrı bir koleksiyon ve ayrı bir
tablo taşıyordu; hepsi tek bir `source` alanına indirildi. §1.3'ün
("mevcut olanı yeniden kullan, paralel sistem yazma") bu repodaki en pahalı
şekilde öğrenilmiş hâli budur.

İlgili: [[kisi-kartlari]] (öteki kart sınıfı — o birleşmedi, kendi motoru ve
tabloları var) · [[olus-muhru-2-muhru-sen-basarsin]] (kartın kullanıcıya
nasıl geçtiği) · [[sohbet-reasoning-fix]] (3.0'ın sessiz ocağının timeout
tarafı)
