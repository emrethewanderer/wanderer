---
name: sohbet-canli-dom-korumasi
description: "Sohbet'e geri girişte süslemeler (mod divider/kitap alıntısı/kişi chip/takip) korunsun diye w2RenderInfiniteChat artık DOM'u sıfırlamıyor; marker sözleşmesi"
metadata: 
  node_type: memory
  type: project
  originSessionId: a9768d59-5859-4348-8edd-1855226f1d06
---

2026-06-28: "Sohbet"ten çıkıp tekrar girince konuşma akışında CANLI eklenen
unsurlar (mod geçişi ayracı, "Kitap Alıntısı" kartı, "Hadi böyle bir kişi
oluşturalım" chip'i, [TAKIP] pilleri, araç chip'leri…) kayboluyordu. Kök neden:
`switchView('chat')` her girişte `w2RenderInfiniteChat()` çağırıyor, o da
`messages-area.innerHTML=''` ile sıfırdan kuruyordu — bu unsurlar yalnız canlı
finalize kancalarında (startStreamingFinalizeHooks / aracAfterReply / inject*)
eklendiği için yeniden-kurmada üretilmiyordu.

ÇÖZÜM (11-w2-chat-cal.js `_w2RenderInfiniteChatBody`): **canlı DOM koruması**.
- `_w2ChatRenderKey()` = `currentSessId | YYYY-M-D | S._currentLang`.
- Build sonunda `area.dataset.w2mode='inf'` + `dataset.w2key=key` set edilir (`_w2MarkRendered`).
- Girişte `w2mode==='inf' && w2key===key && childElementCount>0` ise YENİDEN KURMAZ;
  sadece en alta kaydırır → tüm süslemeler korunur. Yeni mesaj DOM'a canlı eklendiği
  için key (gün-bazlı seans/gün/dil) değişmez → skip çalışır.
- SÖZLEŞME: messages-area'ya "sonsuz bugün" DIŞINDA bir şey basan yollar
  `dataset.w2mode='session'` set ETMELİ (yoksa yanlış skip olur). Şu an böyle yapanlar:
  06 openSummarySession, 04 renderHistory item onclick, 08 history onclick.
  Onboarding (02 startOnboardingSequence) bilerek set etmez — opener allSessions'ta
  olmadığı için skip'in korumasını ister.

EK FIX: fmswitch (odak-modeli geçiş) satırları role:'system'. Yeniden-kurma yolu
bunları coach balonu olarak basıyordu (gizli bug). Artık ayraç çiziliyor; 10w'den
`fmBuildSwitchDivider` (eleman döndürür, VS yolu) ayrıldı, `fmRenderSwitchDivider`
(append) korundu. fmswitch DB'de (system row) olduğu için mod divider reload'da da
döner.

SINIR: kitap alıntısı/kişi chip/takip/kaynak DB'de DEĞİL → navigasyonda korunur
(skip sayesinde) ama HARD RELOAD'da gider. Reload-kalıcılığı isterse per-mesaj
deco-ledger (mesaj objesine _proto/_sources/_lesson iliştir + rebuild'de replay)
gerekir — ayrı iş. İlgili: [[dil-modeli-kabugu]] [[sohbet-cekirdek-kontrol]]
[[arac-motoru-vision-kaynakca]] [[ilham-kartlari-sosyal-feed]] [[odak-modelleri]]
