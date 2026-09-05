---
name: kapi-kapsami-deseni
description: kapi:genel bir DESENDİR ama desen de bir ADA bağlıdır — adı `kapisi` ile bitmeyen repo-geneli kapı faz kapısının dışında kalır; ölçen kapı tests/kapi-kapsami-kapisi.test.js
type: gotcha
---

# Deseni kurtaran şey, desenin kendisi değildi — adın kuralı oldu

`npm run kapi:genel` (= `vitest run kapisi kapi-workflow`) faz kapısının ikinci
adımıdır ve kasten **liste değil desen**dir: liste bayatlar, yeni bir kapı ona
kendiliğinden girmez. Bu doğruydu ve bir kör noktayı kapattı (§3.3, 2026-09-03).

Ama desen de bir **ada** bağlıdır — ve 2026-09-05'te desen ıskaladı.

## Ölçüm

`tests/referans-butunlugu.test.js` bütün ağacı tarıyordu; adı `kapisi` ile
bitmediği için desene girmiyordu. Faz kapısı yeşil bastı, CI kırmızı kapandı
(Kapı koşusu #102): hafıza devri 195 dosya getirdi, her biri kendi bağlarını
taşıdı, kapı 209 yeni kırık referans saydı ve bunu ancak tam süit gördü.

Aynı gün ikinci örnek çıktı: `tests/i18n-parity.test.js` — `TASINABILIR-ZEMIN.md`'nin
denetçi listesinde yazılı dokuz kapıdan biri, yine desenin dışında. Yani
mesele tek bir dosyanın adı değil, bir **sınıftı**.

**Why:** §6.6'nın üç basamağı burada tamamlanıyor. Kural yok değildi (kapı
vardı), yanlış yerde de durmuyordu (faz kapısındaydı) — **ölçülemiyordu**.
Ölçülemeyen kural her sprintte yeniden keşfedilir; bu sefer bedeli bir kırmızı
CI koşusu oldu. Ölçülebilir hâle getiren şey kuralın kendisi değil, **kodun
biçimi**: "bir denetçi script'i koşturan test" grep'lenebilir bir cümledir,
"repo-geneli kapı" değildir.

**How to apply:** Repo-geneli bir kapı yazarken adını `*-kapisi.test.js` koy —
ad göçü gerekiyorsa §4.3, eski ad repoda kalmaz. Kapının yarısı ölçülür:
`tests/kapi-kapsami-kapisi.test.js`, hem `spawnSync`/`execFileSync` çağıran
hem gövdesinde `scripts/<ad>.mjs` geçen her testin desene girmesini şart
koşar; deseni `package.json`'dan okur, sabit yazmaz (betik değişirse kapı
takip eder, ikinci gerçek kaynak doğmaz). Ölçütü dar tutuldu: geniş bir ölçüt
modül testlerini kapı sanıp gürültü üretirdi.

**Yargıya bırakılan yarısı:** ağacı bir denetçi çağırmadan KENDİ İÇİNDE yürüyen
kapılar (emsal: `referans-butunlugu-kapisi`) bu ölçütle yakalanmaz — "repo
tarayan test" ile "kendi modülünün dosyasını okuyan test" statik olarak
ayrılmıyor. Onların adını doğru koymak yazanın işidir; kural
`PROTOKOL-FABLE.md` §3.3'te yazılıdır.

Kardeş kayıt: [[kapi-sessiz-gec]] — bir kapının kırığı değil, kırığı GÖRME
yeteneğinin kaybı en pahalı olandır.
