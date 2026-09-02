---
name: olus-muhru-2-muhru-sen-basarsin
description: Wanderer kart DAĞITMAZ, beyan ettirir — kazanımın tek kapısı Oluş Mührü'dür (10q4) ve mührü kullanıcı basar; aynı karar söz töreninde de geçerlidir (madde otomatik söze yazılmaz)
type: karar
---

# "Mührü sen basarsın" — kart dağıtılmaz, beyan edilir

> **Bu dosya hakkında.** Bu ada `js/parts/13A-derin-calisma.js:513`
> `[[olus-muhru-2-muhru-sen-basarsin]]` diye bağ veriyordu; hedef dosya
> `.claude/memories/` altında yoktu. Özgün dosya repoya hiç girmedi
> (`git log --all -- .claude/memories/` onu hiç döndürmüyor —
> [[claude-altyapisi-commit-disi]]). **Bu metin o dosyanın kurtarılmış hâli
> DEĞİLDİR**; bugünkü koddan yeniden keşifle yazıldı (§3.1). Kararın kendisi
> `js/parts/10q4-olus-muhru.js` banner'ında Emre'nin ağzından **verbatim**
> duruyor, o yüzden burada aktarılan şey bir çıkarım değil bir alıntıdır (K3).
>
> **Kayıp olan iki şey.** (1) Adın içindeki **"2"** çözülemedi: repoda
> "Oluş Mührü 2" diye bir sürüm, plan ya da i18n anahtarı yok
> (`grep -rn "Oluş Mührü 2"` boş; `olus.muhur_kicker` yalnız "OLUŞ MÜHRÜ").
> İkinci bir tören sürümüne mi, yoksa özgün hafızanın kendi bölüm numarasına
> mı işaret ettiği **bilinmiyor** — uydurulmadı. (2) Kararın alındığı
> tartışma: kodda sonuç var, müzakere yok.

**Why:** Bu, Wanderer'ın ana oyunlaştırma mekaniğinin (kart toplama) tezle
çarpıştığı yerde verilmiş karardır. `10q4-olus-muhru.js` banner'ı kararı
şöyle yazar:

> *"Wanderer böyle kart dağıtamaz — kullanıcı kartını belirler, Emre öneri
> olarak sunar. Kart bir envanter kalemi değil bir **BEYAN**'dır. Reçetenin
> tutması 'kart senin' demek değildir; Wanderer'ın gördüğünü söylemesidir.
> Kimin olduğuna kullanıcı karar verir."*

Yani ölçüm bir kartın eşiğini geçtiğinde uygulama **kartı vermez**, soru
sorar. `10q-w2-kisi-karti.js:862` bunu tek satırda mühürler: *"OLUŞ MÜHRÜ —
kazanımın TEK kapısı (K2 · 'kart dağıtılmaz, beyan edilir')"*.

Kararın ikinci yarısı **yük dağılımıdır**: *"kanıt kimdeyse yük ondadır."*
Davet yolunda kanıtı Wanderer sunar, o yüzden kullanıcıdan istenen tek şey
onaydır — **tek soru**. Sınama yolunda iddia kullanıcınındır, o yüzden kanıtı
da o verir — **dört soru** (`tests/10q4-olus-muhru.test.js:1-3` bu ayrımı
"merkez kavram" diye yazar).

Üçüncü yarısı **törenin fiziğidir** (banner, ÜÇ DURAK):

1. **Kapalı kart** — koleksiyonun sırtı (`12c ikvCardBack`); **çeviren
   kullanıcıdır**. Ambalaj/paket yok: *"bu mekânda kart ürün değildir."*
2. **Lapis yüz** — kanıt + soru + iki mühür; karta dokununca yaprak açılır
   (dört boyut + "neden sen" gerekçesi), tören terk edilmez.
3. **Mühür** — *"mühür kendiliğinden düşmez; kullanıcı basılı tutar, halka
   dolar, temas anında kart LAPİS'ten ALTIN'a erir ve `kkMuhurle` çağrılır.
   **Elini çekerse hiçbir şey yazılmaz — bırakmak vazgeçmek değil,
   ertelemektir.**"*

Lapis→altın erimesi süs değil: §1'in anlam ekseni (altın = olduğun/şimdi,
lapis = hayal/gelecek) tam da mühür anında **görünür** olur.

Aynı karar model prompt'una da inmiştir. `16b-i18n-prompt-dict-core.js:517`
(`prompt.olus.davet_system`) modele şunu emreder: *"Kartı VERMEZ, gördüğünü
anlatır ve kararı ona bırakır ('kartı ben veremem', 'karar senin')."* Ve
kanıt kapısı: *"Her yükselişe 'oldun' denmez. Kanıt zayıfsa… 'davet': false
ver — kart eşikte bekler, kaybolmaz, bir daha bakılır."* (§6.10'un bu
yüzeydeki hâli.)

**How to apply:**

## 1 · Kazanım yazan yeni bir yüzey eklerken

`kk.collection`'ın **tek yazarı `kkMuhurle`'dir** (10q4 banner, K2). Yeni bir
tören, yeni bir ekran, yeni bir backfill — hiçbiri koleksiyona doğrudan
yazmaz; hepsi `kkMuhurle`'den geçer. İkinci bir yazar açmak yalnız veri
tutarsızlığı değil, **kararın ihlalidir**: kart o noktada beyan olmaktan
çıkıp envanter kalemine döner.

## 2 · "Henüz değil" bir son değildir

Red kartı **silmez**: eşikte bekler, red izi düşer, süreç devam eder
(`kk.esik`). Bir davet akışı yazarken "reddedildi → kapat/temizle" refleksine
kapılma — bu törende geri çevirmek ertelemektir.

## 3 · Aynı karar SÖZ töreninde de geçerli

`js/parts/13A-derin-calisma.js:511-519` (Ko-Zo sütunları) bunun ikizidir:
madde **otomatik olarak söze YAZILMAZ**, yalnız DAVET edilir
(`window.glGiveSozNow?.(madde.metin)` → `10s-w2-gunluk-ritus.js:523`).
Yorumun gerekçesi iki katlı: dışarıdan `pledges`'e yazmak hem 10s'in
sözleşmesini ezer, hem **töreni çiğner** — *"söz vermek bir törendir ve mührü
kullanıcı basar."* Aynı karar Çalışma Kağıdı'nın 4. adımı için de verilmiştir
(`13b-calisma-kagidi.js:242`).

**Davetin cümle taşıması ayrı bir derstir.** Argümansız çağrı töreni açıyor
ama kullanıcıya maddesini **baştan yazdırıyordu** — sözün önüne konmuş bir
engel. Çare: metin DOM'dan değil kaynaktan okunur (`dcKozoListe`) ve daveti
taşır. Yani "mührü kullanıcı basar" kuralı, kullanıcıya **gereksiz iş
yüklemek** anlamına gelmez; tören onun olur, angarya değil.

## 4 · Yeni bir tören yazarken sınav

*Bu akış kullanıcıya bir şey **veriyor** mu, yoksa gördüğünü söyleyip
**kararı ona mı bırakıyor**?* Birincisi bu repoda bir kırıktır — kaç satır
kod tasarruf ettirdiğinden bağımsız olarak.

İlgili: [[olunan-ve-niyet-alinan-karari]] (mührün hemen ardından koşan
sıra kritik adım) · [[kisi-kartlari]] (kartın kalıcılık ve sosyal yüzey
tarafı)
