---
name: kapinin-kendisi-yalan-soyleyebilir
description: Bir denetçi betiğinin kendi kör nokta defteri yanlış olabilir — ölü import tarayıcısı `'image/*'` yüzünden 1324 karakter gerçek kodu yutup iki CANLI import'u ölü raporladı; ve sıfıra inen bir TABAN kapısı, kırık bir tarayıcıdan ayırt edilemez
type: gotcha
---

# Kapının kendisi yalan söyleyebilir — ve sıfır, en tehlikeli hâlidir

Ölçüldü: **2026-09-06**, İç Çalışma FAZ 18.

## Olay

`scripts/olu-import-denetci.mjs` kör nokta defterinde şunu yazıyordu:

> Kapı ölü importu KAÇIRABİLİR, ama canlı olanı ölü SANMAZ — yani yanlış
> pozitif üretmez. Sayı şişmez, eksilir.

Bu bir kod değil bir **iddiaydı** ve yanlıştı. Yorum sökümü iki `replace`
ile yapılıyordu:

```js
ham.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
```

`js/parts/13c-gorsel-ekleme.js` şu satırı taşıyor:

```js
fi.accept = 'image/*';
```

String'in içindeki dizi **sahte bir blok yorum açtı** ve bir sonraki gerçek
kapanışa kadar **1324 karakter gerçek kodu yuttu**. Yutulan aralıkta
`S.currentUser` ve `sb.storage` kullanımları vardı — yani iki **canlı**
import ölü raporlanıyordu. Silinselerdi görsel yükleme sessizce ölürdü:
kapı bir kırığı önlemek yerine **üretecekti**.

## Why

Çünkü bir denetçi, denetlediği dilin ayrıştırıcısı değildir. Regex'le
yazılmış her "kod/yorum/string" ayrımı, dilin kendi kaçış kurallarının
dışında kalır — ve o boşluk **sessizdir**: kapı yeşil yanmaz, yanlış
raporlar. Ve yanlış rapora göre yapılan bir temizlik, kapının koruduğu
şeyi bozar.

İkinci katman daha sinsi: bu iddia bir **yorumda** yaşıyordu. Yorumun
yanlış olduğunu hiçbir şey ölçmüyordu. Sonraki tur onu okur ve **ölçmeden
inanır** (§5.2: yanlış bir NEDEN, hiç yorum olmamasından kötüdür).

## Ve düzeltirken aynı sınıfa iki kez daha düşüldü

Durum makinesini yazarken:

1. Yorumun **içine** blok-yorum kapatan diziyi bir örnek olarak koydum —
   yorum erken kapandı, dosya ayrıştırılamaz oldu. (Bu hâlde gürültülü
   patlıyor, yani zararsız.)
2. String **sınırlarını** da düşürdüm. `from 'x'` kalıbı bozuldu,
   `IMPORT_RE` hiçbir import bulamadı ve kapı **"0 ölü import" diye sahte
   bir yeşil bastı.** Bu hâl hiç patlamaz.

## İkinci ders: sıfıra inen TABAN kapısı kendini silahsızlandırır

Borç sıfırlandığında, *gerçek bir sıfır* ile *hiçbir şey bulamayan kırık
bir tarayıcının* çıktısı **birebir aynıdır** ([[kapi-sessiz-gec]]). Borç
döneminde bu risk yoktu: taban doluydu ve tarama bir şey buluyordu, yani
kırık bir tarayıcı hemen kırmızı yakardı. Sıfır, o doğal korumayı kaldırır.

Aynı sebeple borç dönemine yazılmış testler ("taban boş olmasın", "tarama
bir şey bulsun") sıfırda **yapısal olarak yanlış** hâle gelir — ama
korudukları şey kaybolmaz, **yer değiştirir**.

## How to apply

1. **Bir yorum davranış hakkında yanlışlanabilir bir iddia taşıyorsa, o
   iddia bir teste bağlanır.** "Şunu asla yapmaz" bir sözleşmedir; kapısı
   olmayan sözleşme temenniye döner (§6.6). Bu turda dört kez aynı sınıf
   görüldü — üçü yorumda, biri belgede.
2. **TABAN tutan her kapı, ilk günden**, sentetik bir kökte tarayıcının
   GERÇEKTEN çalıştığını kanıtlayan bir test taşır: canlı + ölü bir girdi
   verilir, ikisinin de doğru ayrıldığı sınanır. Sonradan eklemek geç olur
   — sıfıra varıldığında kapı çoktan sessizleşmiştir.
3. **Bir denetçinin çıktısına göre TOPLU silme yapmadan önce bağımsız
   doğrula.** Bu turda 65 addan üçü şüpheli çıktı; ikisi kendi grep'imin
   Türkçe `\b` yanılgısıydı ([[buyuk-harf-dil-kapisi]] ailesi), biri
   gerçek bir yanlış pozitifti. Kanıtsız silme yok (§3.1).
4. **Kod/yorum/string ayrımı gerekiyorsa regex değil, soldan sağa bir durum
   makinesi yaz.** Dört hâl yeter: kod · satır yorumu · blok yorum · string
   (tek/çift/şablon). Şablon içeriği **korunur** — `${…}` içinde gerçek kod
   yaşar; düz string içeriği de korunur, çünkü betiğin yön güvenliği bunu
   ister (bir ad yalnız string'de geçiyorsa "kullanılıyor" sayılır).

## Kilit

`tests/olu-import-kapisi.test.js` — iki yeni regresyon: string içindeki
`/*` bir yorum açmamalı, ve şablon içindeki `${S.x}` bir kullanım
sayılmalı. Ayrıca "taban SIFIR" ve "ayrıştırıcı canlı" testleri.
Kural `PROTOKOL-FABLE.md` §3.3'e yazıldı.

Bağlar: [[kapi-sessiz-gec]] · [[rapor-bayatligi]]
