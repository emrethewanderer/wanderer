---
name: kesin-alinti-mimarisi
description: KARAR 2026-08-02 — alıntı kapısı eşiksiz; model alıntıyı yazmaz gösterir (kanit_ref); modelin guven sayısı kapı olamaz (denetçi K4)
metadata: 
  node_type: memory
  type: project
  originSessionId: 0d091c2f-9c77-4750-9e7a-20291cd389bf
  modified: 2026-08-02T10:29:21.691Z
---

Emre 2026-08-02'de alıntı kapısının 0.6 kalibresini reddetti: *"Nasıl 0.6'yı
seçebilirsin, ara sıra doğru bir alıntı düşürüyor diye? Wanderer'ı ara sıra
doğruya göre inşa etmiyoruz."* Sprint bunun üzerine kuruldu.

**İki karar:**

1. **Alıntı eşikle değil eşleştirmeyle doğrulanır.** Bulanık kelime örtüşmesi
   (`_oran >= ALINTI_ESIK`) söküldü. Model alıntıyı **yazmaz, gösterir**:
   `kokenSozBlok` prompt'a numaralı blok (`[S3] "…"`) basar, model
   `kanit_ref: "S3"` döndürür, metni `kokenAlintiCoz` kaynaktan keser.
   Zincir: ref+kırpma doğrulanır → havuzda birebir alt-dize aranır →
   **ref tek başına kurtarır** (parafraz hâli) → yoksa null.
   `kokenAlinti` artık birebir alt-dize testidir (eşik parametresi yok).

2. **Modelin kendi `guven` sayısı bir köken değildir ve kapı olamaz.**
   Üç kapı söküldü: 09e kör nokta (0.55), 09g hipotez (0.6), 09d örüntü
   (0.55). Hiçbiri ekranda görünmüyordu — tek işlevleri gerçek maddeleri
   modelin keyfî sayısıyla düşürmekti. `guven` alanı sözleşmeden çıkarıldı.

**Why:** Bulanık kapı yapısı gereği bir ROC eğrisinde nokta seçmektir —
hangi eşiği seçersen seç iki tür hatadan birini satın alırsın; "kalibre"
sözcüğü bu satın almayı meşrulaştırıyordu. Kanıt referansla gösterilince
doğrulama tahminden eşleştirmeye iner ve eşiğe ihtiyaç kalmaz. Tez gereği
(*"Mesele Sensin"*) kullanıcıya "kanıt" diye gösterilen her cümle
kullanıcının kendi cümlesi olmak zorundadır.

**How to apply:**
- LLM'den kanıt isteyen YENİ her akış `kokenSozBlok` + `kanit_ref` +
  `kokenAlintiCoz` kalıbını kullanır; serbest metin kanıt istemez.
- Kanıt metni DAİMA kaynaktan kesilir, modelin yazdığından değil.
- `guven`/`confidence` alanını eşiğe vurma — denetçi **KURAL 4** kırmızı
  yakar (`scripts/gerceklik-denetci.mjs`). Meşru istisna satırda
  `/* KOKEN-MUAF: gerekçe */` ile beyan edilir.
- Kör nokta ve Ayna hipotezi artık kanıtsız doğmaz; hipotez kanıtını
  kaynağından **devralır** (`dayanak: ["K1","C2"]`), kendi gerekçesini
  yazmaz. 09h o kanıtı tırnak içinde gösterir.
- Temizlik bayrağı `etw_koken_temiz_v2_<uid>` — v1'in geçirdiği parafraz
  kanıtlar yeni kapıda geçersiz, temizlik yeniden koşar.

Denetçinin kendi kör noktası da kapatıldı: blok-yorum devam satırları
artık kod sayılmıyor (`yorumHaritasi`) — yoksa kaldırılan bir eşiği
ANLATAN yorum ihlal olarak okunuyordu.

Plan: `.claude/plans/kesin-alinti-mimarisi.md`.
İlgili: [[gerceklik-mimarisi]] · [[taniyan-ayna-kisisellestirme-3]] ·
[[oruntu-motoru]] · [[fable-protokol-belgesi]]
