---
name: llm-bicimleri-geri-sizar
description: "LLM'e gösterilen her biçim çıktıya geri sızar — protokol etiketleri modelin diline çevrilir, meta satırlar taklit edilip birikir (2026-07-28 teşhisi)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 3da9b599-f17e-4978-99e9-6387260a7809
  modified: 2026-07-28T17:31:21.061Z
---

Wanderer'ın sohbet yanıtlarında 2026-07-28'de teşhis edilen iki kırık, tek bir kökten
doğuyordu: **modele gösterdiğin her biçim geri gelir** — ya taklit edilerek, ya modelin
diline çevrilerek. Parser'ı "modelin talimata harfiyen uyacağı" varsayımıyla yazmak
Türkçe bir üründe sistemik olarak kırılır.

**İki tezahür:**

1. **Etiket Türkçeleşmesi.** Protokol `[TAKIP]` / `[ARAC:]` / `[KAGIT]` (13a) diye
   tanımlıydı; model Türkçe yanıt yazarken etiketi kendi yazımına *düzeltiyordu* —
   `[TAKİP]`, `[ARAÇ:]`, `[KAĞIT]`. "TAKIP" Türkçede zaten yanlış yazım, model doğrusunda
   ısrar ediyor. `indexOf('[TAKIP]')` kaçırınca `aracExtract` null dönüyor ve blok ham
   metin olarak ekrana + geçmişe + DB'ye sızıyordu; takip pilleri TR'de büyük ölçüde ölüydü.

2. **Meta satır taklidi ve birikimi.** 06, LLM'e giden geçmiş assistant mesajlarının
   başına `[bu yanıt "tasarla" modunda yazıldı]` ekliyordu. Model bunu "assistant
   mesajları böyle başlar" diye öğrenip kendi çıktısına yazdı. Sıyıran hiçbir şey
   olmadığı için satır DB'ye girdi, sonraki turda 06 üstüne bir katman DAHA bindirdi —
   ekranda ikizlendi. Ayrıca satır öne geçtiği için `^` ankorlu `[MOD:xxx]` regex'i
   tag'i yakalayamıyor, mod telemetrisi yanlışlıkla `tag_missing` sayıyordu.

**Why:** Bir LLM'in prompt'una koyduğun biçim, sözleşme değil *örnektir*. Model onu
few-shot kalıbı sanar (meta satırlar) ya da dilbilgisi hatası sanıp düzeltir (etiketler).
Talimatı sıkılaştırmak tek başına yetmez — parser toleranslı, çıktı sıyırıcılı olmalı.

**How to apply:**
- Yeni bir protokol etiketi tasarlarken **ASCII adı Türkçe yazımıyla çakışıyorsa**
  parser'ı en baştan toleranslı yaz: `TAK[IİÎıiî]P`, `ARA[CÇ]`, `KA[GĞ][IİÎıiî]T` — karakter
  sınıfları bire bir olduğu için `.index` kaymaz. Yalnız etiket ADI toleranslı olur;
  **yakalanan içerik asla normalize edilmez** (soru metinleri, JSON bozulur).
- Aynı toleransı temizlik regex'lerine de taşı — 13o `gcFire` bu yüzden ikizdi.
- LLM'e giden prompt'a bir meta satır eklersen, **aynı sprintte çıkışta sıyırıcısını yaz**
  ve giriş tarafını **idempotent** yap (önce soy, sonra tek katman ekle) — yoksa birikir.
- Prompt sözlüğünde protokol etiketiyle karışan başlık kullanma: `[TAKİP — ÖNEMLİ]`
  modele noktalı-İ örneği veriyordu → `[AÇIK DÖNGÜ — ÖNEMLİ]` oldu.
- Eski kirli DB kayıtları için `cleanHistoryText` (00-config) geri-okuma katmanıdır;
  `S.chatHistory`'ye giren **beş** hidrasyon noktasının hepsinde çağrılır (03 ×2, 04, 06, 08).
- `p()` bir anahtarı çözemezse **anahtarın kendisini** döndürür — prompt'a koymadan önce
  daima `!wm.includes('prompt.')` kontrolü yap (emsal: `aracPromptGuide`).

İlgili: [[kart-salon-dili]] · [[sohbet-cekirdek-kontrol]] · [[emre-yonlendirme-hardcode-yasak]]
