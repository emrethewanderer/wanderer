---
name: donusum-aynasi-2
description: 2026-08-24 sprint TAM (8 faz) — kanıt yıllardır yazılıyordu ama hiç gösterilmiyordu; ELLE iş YOK
metadata:
  type: project
---

**Dönüşüm Aynası 2.0** — Emre'nin görevi (2026-08-19): "Wanderer'ı analiz et,
hedef kitlemizin sorunlarını çözdüğümüzü **onlara** kanıtlayacak metrikleri
inşa et." Plan: `.claude/plans/donusum-aynasi-2.md`. Sekiz faz da bitti,
tam süit yeşil, **ELLE iş YOK** (tüm ölçüm client-side, mevcut veriden türer;
migration/edge deploy gerektiren adım yok).

**Keşfin tek cümlesi:** uygulama kanıtı yıllardır **yazıyordu ama hiç
göstermiyordu.** Mesafenin 30 günlük izi (`13x:185`) diskteydi, tek tüketicisi
yoktu; söz tutma oranı (13u) hesaplanıp kullanıcıya söylenmiyordu; sönen
örüntüler yalnız söndüğü hafta görünüyordu; değerlendirme defteri (10l)
write-only'ydi; `10t totalSeals` her mühürde artıyordu ama hiçbir yüzey
okumuyordu. Sprintin işi yeni ölçü icat etmek değil, **yazılmış olanı
görünür kılmaktı** — bu yüzden fazların çoğu 🅢 çıktı.

**Fazlar:** 1 kırık onarımı (prompt sızıntısı `13t:74`, `msIzFark` son iki
KAYIT değil GÜN, yetim `#dunun-ozet-page`) · 2 "önce"yi koruma (beyanın t0'ı
üzerine yazılıyordu) · 3 ölçü getter'ları · 4 tanıklık defteri · 5 Belgesel
2.0 (tek 🅞) · 6 kanıt kılcalları · 7 paylaşım çıkışı · 8 parite + kapılar +
temizlik.

**Why:** Tez "Mesele Sensin" — uygulama kullanıcı hakkında bir şey
söylüyorsa kaynağı kullanıcı olmak zorunda. Kanıt biriktirip göstermemek
tezin yarısını yaşamak demekti. Kanıt kapısı her yüzeyde aynı: değer
kanıtsızsa satır **doğmaz**, sayaç dili kurulmaz ([[gerceklik-mimarisi]],
[[kanit-bekleyen-alanlar]]).

**How to apply:** Bu alana dokunan yeni iş önce planın `## Metrik Sözlüğü`
bölümünü okusun — inşa edilen ölçülerin tanımı orada tek yerde. Yeni bir
sayı/yargı eklenecekse §6.10 sırası: kanıtı nedir → kaç tane → kullanıcı mı
koydu. Paylaşım kartına kullanıcının kendi cümleleri ve tanıklık beyanı
GİRMEZ (K8) — belgeselin içi dışarı çıkmaz.

Bağlar: [[gerceklik-mimarisi]] · [[kanit-bekleyen-alanlar]] · [[mesafe-motoru]] ·
[[oruntu-motoru]] · [[soz-ihtiyac-motoru-karari]] · [[ultra-seri-uc-muhur]] ·
[[buyuk-harf-dil-kapisi]] · [[kitaplik-paylasim-indirme]]
