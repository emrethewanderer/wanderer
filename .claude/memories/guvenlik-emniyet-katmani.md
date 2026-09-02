---
name: guvenlik-emniyet-katmani
description: Kriz tespiti (13-extras detectCrisis) tek kaynaktır ve window köprüsünden okunur; getCrisisContext bir dönem hiç bağlanmayıp kriz enjeksiyonunu SESSİZCE ölü bıraktı — köprü bugün 13-extras'ın kendi expose bloğunda değil main.js'in toplu Object.assign'ında yaşıyor
type: gotcha
---

# Emniyet Katmanı — sessizce çalışmayan kontrol, olmayandan beterdir

> **Bu dosya hakkında.** `js/parts/13D-duygu-motoru.js:699-706` bu ada
> `[[guvenlik-emniyet-katmani]]` diye bağ veriyordu; hedef dosya
> `.claude/memories/` altında yoktu. Özgün dosya repoya hiç girmedi
> ([[claude-altyapisi-commit-disi]]); **bu metin kurtarma değildir**, bugünkü
> koddan yeniden keşifle yazıldı.
>
> **Kayıp olan:** kırığın tarihi ve süresi. 13D'nin yorumu *"bir dönem"*
> diyor; ne zaman başladığı, ne kadar sürdüğü ve nasıl fark edildiği
> repodan okunamıyor — **uydurulmadı**. Emniyet Katmanı'nın kendi tasarım
> gerekçeleri de (hangi kalıplar kriz sayılır, eşik nasıl seçildi) bu
> dosyanın kapsamı dışında; onlar `js/parts/13-extras.js` ve
> `GUVENLIK-VE-SORUMLULUK-CALISMASI.md`'de yaşar.

**Why:** Bu repodaki en pahalı kırık sınıfının adı budur:
**sessizce çalışmayan emniyet kontrolü.** 13D'nin yorumu dersi tek cümlede
söyler:

> *"`getCrisisContext` bir dönem window'a hiç bağlanmamış ve kriz enjeksiyonu
> BAŞTAN BERİ ölü kalmıştı. Sessizce çalışmayan bir emniyet kontrolü,
> olmayan bir emniyet kontrolünden beterdir: kimse eksikliğini görmez."*

Kırığın mekaniği şudur: `getCrisisContext` `13-extras.js:891`'de tanımlıdır,
ama iki tüketicisi onu **window üzerinden** çağırır —
`06-summary-chat.js:1981` (`window.getCrisisContext?.() || ''`) ve
`10-features-w2.js:764`. Optional chaining sayesinde bağlanmamış bir köprü
hata vermez; boş string döner, prompt'a kriz bağlamı hiç girmez ve **hiçbir
yerde kırmızı yanmaz**. Build yeşil, konsol temiz, özellik ölü.

**Ve bugünkü hâli kendi başına bir tuzaktır.** 13-extras'ın *kendi* expose
bloğu (`13-extras.js:1515-1522`) yalnız üç adı bağlar:
`getHesapGunuContext`, `getWellnessContradictionContext`, `detectCrisis`.
`getCrisisContext` **orada yoktur** — köprü `js/main.js:541`'in toplu
`Object.assign(window, { … })` bloğunda, satır 683'te yaşar. Yani modülün
kendi dosyasına bakıp "bu ad window'a bağlanmamış" sonucuna varmak
**yanlıştır**; bu repoda köprüler iki ayrı yerden kurulabiliyor ve
asimetrinin kendisi kırığın kökeni.

**13D'nin savunması bu dersten doğdu** (`13D-duygu-motoru.js:707-710`). Motor
köprüyü önce **okunabilir mi** diye sınar:

```js
const krizOkunabilir = typeof window !== 'undefined' && typeof window.detectCrisis === 'function';
```

Okunamıyorsa — ve kritik olan budur — **kriz OLMADIĞINI VARSAYMAZ**. Riskli
eksenleri (kutlama, diriltme) kapatır ve tanıklığa düşer; *"tanıklık hiçbir
hâlde zarar vermez (K6)"*. Kriz okunduğunda ise K9 işler: *"kriz üstündür,
müzakere edilmez"* — tablo çalışmaz, İklim uygulanmaz, cue basılmaz, dönüş
`{ eksen:'tutma', … }` olur.

**Neden köprü, neden import değil:** 13-extras zaten 03-auth-shell'i, o da
00-config-tracking'i import ediyor; 13D'nin 13-extras'ı **statik import
etmesi döngü kurardı**. Yani window köprüsü burada tembellik değil, bilinçli
bir dairesel-bağımlılık çözümüdür — ve bedeli, köprünün sessizce kopabilmesi.

**How to apply:**

## 1 · Yeni bir emniyet/kriz okuyucusu eklerken

Kriz tespiti **yeniden yazılmaz** — tek kaynak `13-extras.js:816`
(`detectCrisis`) ve `:822` (`detectCrisisSoft`, LLM ile doğrulanan yumuşak
sınıf). İkinci bir dedektör yazmak yalnız çift bakım değil, iki farklı eşik
demektir; hangisinin konuştuğu belirsizleşir.

## 2 · Köprüyü kurduktan sonra OKUNABİLİRLİĞİNİ sına

`window.foo?.()` yazan her emniyet yolu için sor: *karşı uç gerçekten bağlı
mı?* Bu repoda bunun iki kapısı var — `scripts/yetim-kopru-denetci.mjs`
(köprünün karşı ucunu sorar) ve `scripts/bagsiz-ad-denetci.mjs`
([[bagsiz-ad-kapisi]], çağıran tarafı sorar). Yeni bir köprü eklerken
`js/main.js`'in toplu bloğunu da kontrol et: ad orada mı, modülün kendi
expose bloğunda mı, yoksa hiçbir yerde mi?

## 3 · Okunamayan köprüde varsayılan DAİMA güvenli taraf olmalı

13D'nin kalıbını kopyala: köprü okunamıyorsa "sorun yok" varsayma —
riskli davranışı kapat, zararsız olana düş. Emniyet yolunda `catch (_) {}`
ile sessizce geçmek §5.2'nin *"asla bloklama"* kuralının yanlış
uygulamasıdır; bloklamamak, **görmezden gelmek** demek değildir.

İlgili: [[bagsiz-ad-kapisi]] (aynı kırık sınıfının kaynak-tarafı kapısı) ·
[[yetim-kopru-denetcisi]] (köprünün karşı ucunu soran kardeş denetçi) ·
[[kapi-sessiz-gec]] (bir kapının kırığı değil, kırığı GÖRME yeteneğini
kaybetmesi — aynı körlüğün denetçi tarafındaki hâli)
