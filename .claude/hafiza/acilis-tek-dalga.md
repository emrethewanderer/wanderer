---
name: acilis-tek-dalga
description: 08-19 KARAR — ana ekran BİR kez kurulur; perde bir çözüm değil örtüydü (reload'da kat 0 açığa çıkarır)
metadata:
  type: project
---

Emre'nin ekran kaydı (2026-08-19) ana ekranın **dört dalgada** kurulduğunu
gösterdi: boş → yerleşik i18n başlatıcıları → selam+model → kişisel şerit.
Belirleyici ipucu davranışın koşullu olmasıydı: **kapat-aç'ta yok, reload'da
var.** Sebebi `_splashPlan`'ın kat 0'ı (aynı sessionStorage → perde YOK):
perdeli katlarda `llmSyncHome`'un `splashUp` guard'ı ara çizimleri örtüyordu.

**Why:** Perde bir tören ([[acilis-perdesi]]) ama teşhiste ÖRTÜ görevi
görüyordu — Boot Nabzı'nın merkez sorusu ("perde inerken zincir bitmiş mi?")
kayıtta "hayır" cevabını aldı: perde ~1.0 sn'de indi, kuruluş 3.0 sn'ye sürdü
([[boot-nabzi]]). Ve yerleşik başlatıcılar ne beyandır ne ölçüm; ekranda
"senin soruların" gibi durup sonra değişiyorlardı ([[gerceklik-mimarisi]] §6.10).

**How to apply:** Üç kural, hepsi `js/parts/10y-w2-llm-shell.js`'te:
1. **Kanıt kapısı** `_kapiAcik()` — şerit / model satırı / placeholder ancak
   `S._fmYuklendi` (10w'nin ağ turu KARARA vardı; `finally` ile, çünkü legacy
   dalındaki erken `return` üç satırı atlıyordu) **ve** `window.bslOku` hazırsa
   çizilir. Sigorta zincirin ucunda: `llmHomeAc()`, 03'te `kbSerbest()` yanında
   ([[kanit-bekleyen-alanlar]] ikinci kapısıyla aynı felsefe).
2. **İdempotent çizim** — `.casc` chat-view'dan HİÇ kaldırılmıyor, bu yüzden
   `innerHTML`'e her dokunuş giriş animasyonunu baştan oynatır. Şerit imzaya
   bağlı (`host.dataset.llmImza`, imza DOM'da yaşar); metinler `_yaz()` ile.
3. **Tek açılış kademelenmesi** — `_bootCascDene()`: perde indi **ve** kapı
   açıldıysa bir kez oynar. `llmSyncHome`'un eski `splashUp` guard'ı yerine
   `_bootCascOynadi`. Bayrak view'dan bağımsız set edilir, yoksa ana ekrana
   hiç uğramayan boot (`?view=bugun`) sonraki gezinmelerin cascade'ini
   kilitlerdi.

Kapı: `tests/acilis-tek-dalga.test.js` (5 test, taze modül + `.casc` mutation
sayacı; negatif sınamayla doğrulandı — kapı sökülünce 3'ü kırmızı).
Yan bulgu düzeltildi: `#llm-continue` metni `data-i18n` taşımıyordu →
`llm.continue_today` TR+EN.

Plan: `.claude/plans/acilis-tek-dalga.md`. **Commit ATILMADI** (paralel oturum
ağaçtaydı); ilk hamle plan dosyasının sonunda.
