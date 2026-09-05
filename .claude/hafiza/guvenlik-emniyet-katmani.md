---
name: guvenlik-emniyet-katmani
description: "2026-07-13 Emniyet Katmanı 6 faz KOD TAM (build+720 test+preview ✓); ELLE: llm-chat 3 yaması + avukat; kural: hat teyitsiz yayınlanmaz"
metadata: 
  node_type: memory
  type: project
  originSessionId: 40a0b8b7-d2dc-40b9-8742-7c4d87cd9a79
  modified: 2026-08-07T16:39:48.023Z
---

2026-07-13: **Emniyet Katmanı 6 fazın tamamı kodda UYGULANDI** (çalışma: repo kökü
GUVENLIK-VE-SORUMLULUK-CALISMASI.md; sektör/dava/regülasyon kaynakları orada).

**Düzeltilen kritik hatalar:** (1) 182 "İntihar Önleme Hattı" DEĞİL — MHRS randevu hattı;
her yerde 112 + findahelpline'a çevrildi (15b kart, 16b/16e XIV + prompt.crisis).
(2) `getCrisisContext` window'a hiç bağlanmamıştı → kriz enjeksiyonu + crisis modu BAŞTAN BERİ
ölüydu; main.js hub'a eklendi.

**Kurulan mimari:** 13-extras kriz çekirdeği: `detectCrisis` artık `dpAll()` ile dil-BAĞIMSIZ
(16c'de 11 dil kriz deseni + TR/EN dolaylı + `detect.crisis_soft`→sessiz LLM teyidi
`prompt.crisis_classify`); enjeksiyon 10 mesaj sürer, kart 20 dk soğumalı; `_crisisDayKey`
(localStorage `etw_crisis_day`) → 10s Armağan/Söz + 13o geri çağrı kriz günü susar; ertesi gün
`prompt.crisis_followup`. 13m `ktGate` kriz lütfu (günde 15, `etw_crisis_grace_<gün>`); 06'da 429
duvarına kriz kartı eşliği. `getSafetyGuards()` (06 systemPrompt sonuna, crisis kanalından bağımsız):
`prompt.minor_guard` + `prompt.break_hint` (2 saat, 45 dk boşlukta sıfırlanır). Yaş kapısı:
kayıtta doğum yılı, <13 engel, 13-17 → user_metadata.is_minor → S._isMinor. `.cl-ai-note`
şeffaflık satırı (EU AI Act m.50). XIV'e GERÇEKLİK + İLAÇ SINIRI. 13p2 v1.2 (HK_VERSION artırıldı):
güvenlik/kriz bölümü, yasak kullanım, KVKK m.6 özel nitelikli veri + rıza geri alma; kayıt rıza cümlesi.
00f `wtLogSafety` → usage_events kind:'safety' (crisis_signal/card/grace; içerik ASLA loglanmaz).

**ELLE bekleyen:** (1) SETUP-LLM-CHAT.md §5: sunucu SAFETY_FOOTER + kota kriz muafiyeti
(quota_consume p_crisis) + **sunucu persona 182/eski-adversarial temizliği** ⚠️;
(2) hukuki metinler avukat incelemesi; (3) Almanca pilotu öncesi TelefonSeelsorge teyidi;
(4) **clickjacking koruması HTTP BAŞLIĞI ister** (2026-08-07): `frame-ancestors 'none'`
`_src.html`'de `<meta>` içindeydi — tarayıcılar bu direktifi meta ile teslim edildiğinde
YOK SAYAR ve her açılışta konsola hata basar. Yani koruma hiç yoktu, yalnız varmış gibi
duruyordu. Meta'dan söküldü (gerekçe `_src.html` başında yazılı); gerçek koruma
hosting/CDN katmanında verilmeli: `Content-Security-Policy: frame-ancestors 'none'`.
`X-Frame-Options` da meta ile çalışmaz — aynı yoldan verilir.

**KURAL (kalıcı):** Yeni dilde kriz hattı resmî kaynaktan teyit edilmeden yayına GİRMEZ
(182 hatasının kökü internetteki yanlış bilgiydi). Manevi çerçeve krizde yalnız yaşama çağrı
yönünde — [[kitap-sesi-manevi-register]]. Konumlandırma kalkanı: "kişisel gelişim, terapi DEĞİL"
pazarlamada da korunmalı. İzleyen iş: bağımlılık sinyalinin Örüntü Motoru'na (09d) bağlanması.
İlgili: [[hukuki-cerceve]], [[kota-motoru]], [[gozlemevi-kullanim-nabzi]], [[tum-diller-native-plani]].
