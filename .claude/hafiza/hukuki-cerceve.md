---
name: hukuki-cerceve
description: "Hukuki Çerçeve (13p) — Kullanım Koşulları + Gizlilik Politikası + Fikri Mülkiyet Bildirimi; TR+EN tam metin modülde, sekmeli tören paneli, Ayarlar bölümü + auth bağları"
metadata: 
  node_type: memory
  type: project
  originSessionId: 4a98f22a-c11d-47c8-a895-86aaae9176e6
---

**Hukuki Çerçeve · 13p** (2026-07-03) — endüstri-standardı üç belge uygulama içinde: **Kullanım Koşulları** (AI feragatnamesi md.3: tavsiye değildir + kriz yönlendirmesi; mağaza aboneliği md.5; TR hukuku md.12), **Gizlilik Politikası** (KVKK+GDPR; hassas içerik/açık rıza md.3; AI işlemesi md.5 "eğitimde kullanılmaz"; işleyici kategorileri md.6; [[sifirdan-basla-reset]]/gdpr.js araçlarına atıf md.7), **Fikri Mülkiyet Bildirimi** (kitaplar+metodoloji+kavram adları+görsel dil; scraping/AI-eğitimi yasağı md.4; FSEK 5846).

**Mimari:** `js/parts/13p-hukuk.js` — belge gövdeleri TR+EN tam metin MODÜLDE yaşar (dict'e girmez → [[tr-en-i18n-tamamlama]] paritesi bozulmaz); TR-dışı TÜM dillerde EN belge + lapis `hk-langnote` ("Turkish text is authoritative"). markdown-lite parser (`## `→h2, `- `→li) escape-sonrası. UI etiketleri `hk.*` dict-core'da TR+EN.

**Yüzeyler:** ① `hkOpen(kind)` sekmeli panel (mektup-sheet estetiği, `.hk-*` features.css, z=--z-ceremony) ② Ayarlar "Hukuki Çerçeve" bölümü — `mountHukukUI()` 07 loadSettings'te mountGdprUI'nin HEMEN altına ③ auth kayıt onay satırı (`auth.legal.register` data-i18n-html, onclick'li linkler dict value İÇİNDE) + auth footer künye (3 link + © satırı).

**Sürüm mekaniği:** `HK_VERSION`/`HK_EFFECTIVE` modül başında — metin değişince elle artır; panel + Ayarlar'da görünür. İletişim: emre.gulluce.eg@gmail.com. Yaş: 13+ (18- veli onayı). "Türkçe metin esastır" her belgenin sonunda.

**2026-08-27 — HK_VERSION 1.2 → 1.3 (yürürlük 2026-08-26).** Kod kapısıyla
birlikte metin değişti: Kullanım Koşulları §4 "Uygunluk, **Hesap ve E-Posta**"
oldu — hesabın şifresi yoktur (adres kimliğin kendisidir), kullanıcı adları
benzersizdir, ve **iki tür posta** vardır. İki türün ayrılması hem hukuken hem
ürün olarak yüklüdür: *işlemsel* iletilerden çıkış YOKTUR ve sebebi metinde
açıkça yazılıdır — giriş kodun da o iletilerden biridir; *bülten*den çıkış tek
tıktır ve işlemsel iletileri durdurmaz.
Gizlilik: §2'ye şifre yerine kod + teslimat sinyalleri (teslim/geri dönüş/
şikâyet); §4'e üç yeni dayanak (işlemsel = sözleşmenin ifası · bülten = rıza +
meşru menfaat GDPR m.6/1-f · teslimat kayıtları = meşru menfaat); §8'e çıkış hakkı.
**Bölüm numaraları KAYDIRILMADI** — "bkz. Bölüm 7" / "see Section 7" çapraz
referansları var, §4 genişletildi.
**AÇIK / ELLE:** ticari elektronik ileti için Türkiye'de **İYS (İleti Yönetim
Sistemi)** kaydı ayrı bir yükümlülüktür, kodla çözülmez — avukat kontrolü ister.
