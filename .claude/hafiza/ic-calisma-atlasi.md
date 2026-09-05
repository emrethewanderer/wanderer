---
name: ic-calisma-atlasi
description: "2026-07-18 İç Çalışma sprinti — 18 sistem analizi + Atlas indeksi (19 Artifact); 6 kesişen tema (ELLE borcu, yazılan-okunmayan telemetri, llm-chat vendor, tören orkestratörü, git yokluğu, gerçek-cihaz turu); doğrulanmış yeni bulgular"
metadata: 
  node_type: memory
  type: project
  originSessionId: f323b95f-da8b-493c-8b23-1ae72e5165dc
---

**İç Çalışma sprinti (2026-07-18):** Emre'nin "tüm özellikleri analiz et, her biri için
en iyi seviyeye taşıyacak bir iç çalışma Artifact'ı hazırla" isteğiyle 18 domain çalışması
+ 1 Atlas indeksi yayınlandı. Şablon: [[rapor-tasarim-sablonu]] estetiği; yapı = hakkını
teslim → boşluklar (dosya:satır + sektör kıyası + etki/efor) → fazlı yol haritası →
korunanlar → Dürüstlük Notu. Her iddia o günkü koda karşı grep/okuma ile doğrulandı.

**Atlas (tüm linkler burada):** https://claude.ai/code/artifact/07a1a25a-ca78-4aff-ad16-ccd37dc268ca
(01 Sohbet · 02 Kişiselleştirme · 03 Persona · 04 Kart · 05 Gamification(rev.2) ·
06 Onboarding · 07 Kimlik Üçgeni · 08 Modeller&Kabuk · 09 Araç&Görsel · 10 Tören&Duyu ·
11 Bildirim · 12 Sosyal · 13 i18n · 14 Altyapı · 15 Güvenlik · 16 Monetizasyon ·
17 Telemetri · 18 Bugün&Studio)

**6 kesişen tema (öncelik sırasıyla):**
1. **git yok** — 60K satır sürümsüz tek kopya; her riskin çarpanı (İÇ 14 kritik).
2. **ELLE borcu** — ~15 migration + 5 edge deploy sessiz fallback'lerde görünmez;
   önerilen "Dashboard Günü" + admin şema sondası.
3. **"Yazılıyor ama okunmuyor"** — notification_log, error_logs, safety olayları
   tüketicisiz + 10 domain'de ölçüm adaları → "Tek Cam" sprinti (İÇ 17 Faz 1).
4. **llm-chat vendor** — persona bayatlığı(03) + güvenlik yamaları(15) + kota
   zorlaması(16) + dil eki(13) aynı kapıda; Kusursuzluk 7b tetiği.
5. **Tören orkestratörü** — 05+10+11'in ortak çözümü (sahne kuyruğu + oturum bütçesi).
6. **Gerçek-cihaz turu** — Yol→Gördün çıkışları, seri ayrımı, tören zincirleri.

**Sprint sırasında doğrulanan YENİ bulgular (koda karşı):**
- `delete-user/index.ts:123-127` yalnız `chat-images/{uid}/` siler; `hayal/{uid}/`
  görselleri hesap silindikten sonra kalıyor (GDPR) — düzeltme görev chip'i açıldı
  (task_1e8a8c48).
- `send-push/index.ts:233` "KURALLAR: Türkçe yaz" — sunucu tek dilli; user_engagement'ta
  lang kolonu yok.
- 06:915-918 regenerate DB silmesi `content` eşleşmesiyle — mesajlarda id taşınmıyor.
- ErrorBoundary/Sentry/error_logs (mig 002) VAR ama okuyan panel yok; 00f wt* kapsaması
  10s/10t/10p/13h/13i/13j/10q-detay'da var, 02x/10D/13l/10w/10y/kkOpenPack/paywall'da yok.
- Oyun katmanı (10g-10m) ARTIK tam i18n'li (t() göçü Dalga 3-4) — 48 günlük
  [[wanderer-gamification-engine]] kaydındaki "hardcoded TR" bilgisi BAYAT.

**Why:** Bu Atlas, sonraki iyileştirme sprintlerinin tek başlangıç noktası; kritik
bulgular ve önerilen icra sırası (Hafta 0: git+Dashboard+güvenlik → Hafta 1: Tek Cam →
Hafta 2+: mağaza+vendor) orada.
**REVİZE ARTIFACT'A DA İŞLENİR (Emre'nin kuralı, 2026-08-31).** Bir çalışmanın
rev.2 denetimi yapıldığında iş plan dosyasıyla bitmez: **yayındaki artifact da
aynı turda güncellenir.** İki tur (07 ve 08) bu adım atlanarak kapandı — denetim
repoda tazeydi, Emre'nin okuduğu rapor 18 Temmuz'da kalmıştı. Rapor bir arşiv
kaydı değil, Emre'nin ürüne baktığı yüzeydir; eskimiş bir rapor bayat hafızadan
beterdir, çünkü güncel görünür.

Kalıp (emsal: `ic-06-onboarding-body.html`, 26 Ağustos):
`kicker`'a `· rev.2`, `meta`'ya `rev.1: <tarih> · rev.2: <tarih>`, ve **ilk bölüm
olarak** `01 · Önce raporun kendisini denetleyelim` — rev.1'in yanlışlanan
iddiaları orada tek tek adlandırılır (düştü / derinleşti / çözümü yanlışlandı).
Sonra "Bu turda kapatılanlar" (`gap kapali` + `pill kapandi`), varsa "Denetimin
dersi", ve rev.2 yol haritası. rev.1'in bölümleri SİLİNMEZ, numaraları kayar ve
başlıklarına "rev.1'de çizilen" eklenir — rapor kendi tarihini taşır.

Dikiş: `README.md` tablosuna `*(Ağu rev.2)*`, `manifest.json`'a yeni açıklama,
ve **Atlas'ın (00) o satırına rev notu** — Atlas kritik bulguyu eski hâliyle
söylemeye devam ederse indeks raporu yalanlar.

**How to apply:** Bir domain'de işe başlarken önce o çalışmanın "Korunanlar" ve yol
haritası bölümünü aç; Atlas'taki tema işleri domain işlerinden önce gelir. Artifact
güncellemek için aynı oturumda değilsen `url` parametresiyle yayınla. Bu sprintin
kendi dersi: hafıza kayıtları koddan hızlı eskir — her kritik iddia yayın öncesi
grep'le doğrulanmalı (05'in rev.2 düzeltmesi bunun kanıtı).
