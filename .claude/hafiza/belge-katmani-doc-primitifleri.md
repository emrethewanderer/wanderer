---
name: belge-katmani-doc-primitifleri
description: "2026-07-13: rapor estetiği Wanderer'a taşındı — css/parts/document.css (doc- primitifleri) + --gold-quiet/--green-ok token'ları, 6 fazlı göç"
metadata: 
  node_type: memory
  type: project
  originSessionId: c43711b1-866e-4715-b0cb-cd03c0ff7e3e
---

[[rapor-tasarim-sablonu]]'ndaki bekleyen "uygulama tasarımına taşıma" işi tamamlandı. Yeni bir
"Belge Katmanı" (`css/parts/document.css`, `doc-` öneki) kuruldu ve uygulamanın metin-ağırlıklı
bilgi yüzeylerine göç edildi.

## Kalıcı kararlar (gelecekte de geçerli)
- **İkili altın sistemi:** `--gold-quiet` (#C9A66B, base.css) yalnızca editoryal yüzeylerde
  (eyebrow, kıl çizgi, tablo başlığı, ince metin vurgusu). Mevcut parlak `--gold` (#F5A623) mühür/
  CTA/kart motoru/glow için dokunulmadı — "mühür daima altın ve daima parlak" korunuyor.
  `--bronze` (#C9A24B) ile görsel olarak yakın ama kasıtlı ayrı token (yüzey ayrımı: bronz=tören/
  yol.css, sessiz altın=belge; hiç yan yana gelmezler).
- **`--green-ok`** (#5BB97B) — yeni "uygulandı/tamam" token ailesi, mevcut celebrate-yeşiliyle aynı komşulukta.
- **Yeni primitif kütüphanesi kapsamı:** kart motoru (`12c-kart-gorsel.js`) ve tören sahneleri
  (mühür, kilometre taşı, flip, **Mektuplar**, **Manifesto Reader**) bilinçli olarak KAPSAM DIŞI —
  kendi olgun türlerinde kalıyorlar, rapor kalıbına zorlamak "anlamsız süs" olurdu.
- **Mevcut olgun eyebrow sınıflarına (`.hk-eyebrow`, `.mem-section-label` vb.) `doc-eyebrow` EKLEME**
  — Cinzel/Barlow font-family çekişmesi yaratır. Bunun yerine sınıfın kendi `color` değeri
  `var(--gold-quiet)`'e retint edilir (dual-class değil, token-seviye swap).

## `document.css` primitifleri
`doc-eyebrow`, `doc-section`/`doc-title`/`doc-lead`, `doc-rise` (giriş animasyonu), `doc-seal`
(kritik kutu) + `doc-fixed-badge`, `doc-tablebox` (gerçek `<table>`), `doc-pill` (`--crit/--high/
--mid/--ok`), `doc-cards`/`doc-card`, `doc-phase`/`doc-phase-item` (sol-çizgili timeline — `modes.css`
`.yh-timeline` ile kasıtlı paralel, taşınmadı), `doc-note`/`doc-note--gold`, `doc-foot`.

## Göç eden 8 yüzey (fazlar)
FAZ 0 temel (token+kütüphane) → FAZ 1 GDPR (`gdpr.js`) + Kitaplık notu (`10h-w2-library-challenges.js`)
+ Ayarlar açıklamaları (`_src.html`) → FAZ 2 Hukuki panel token retint (`features.css` `.hk-*`) →
FAZ 3 Admin gerçek tablo (`13q-gozlemevi.js` retint + `07-settings-knowledge.js`
`loadAdminSummaries()` div→table) → FAZ 4 RAPORLAR moderasyon pill'leri (`10C-sosyal-feed.js`,
report_count/hidden → `doc-pill`) → FAZ 5 Ayna (`oruntu.css` `.om-kanit` → gold varyant) + Hafıza
(`chat.css` `.mem-section-label` retint). Gün Özeti/İçsel Sentez bilinçli dokunulmadı (dashboard
register + altın=şimdi/lapis=gelecek ekseni korunuyor).

## Doğrulama notu
Canlı tarayıcıda yalnız auth-öncesi hukuki panel test edilebildi (login credential yok) — eyebrow/
h2 rengi computed style ile `rgb(201,166,107)` = `--gold-quiet` olarak doğrulandı, parlak
`--gold`'dan (#F5A623) ayrıştığı görsel olarak teyit edildi. Diğer fazlar (Ayarlar/GDPR/Admin/
RAPORLAR/Ayna/Hafıza) için `dist/assets/_src-*.js` bundle'ında class/string varlığı grep ile
doğrulandı (`doc-tablebox` 7, `doc-note` 6, `doc-pill--crit/high` 3+2, gerçek Türkçe büyük harf
`GİZLİ`/`RAPOR`). Build temiz, bundle 644KB gzip (bütçe 650KB) içinde.

**Why:** Emre'nin 2026-07-12 kararının doğal devamı — editoryal dil artık dağınık kopyalar yerine
tek kaynaktan geliyor, gelecekteki yeni bilgi yüzeyleri `document.css`'ten primitif alacak.
**How to apply:** Yeni bir bilgi/metin-ağırlıklı ekran eklerken önce `document.css`'e bak; kart/
tören ekranlarında bu dosyaya dokunma. Yeni bir "sessiz altın" ihtiyacı çıkarsa `--gold-quiet`
ailesini kullan, yeni bir altın tonu icat etme.

## Öz-inceleme turu (2026-07-13, aynı gün) — bulunan 4 gerçek hata
1. **Inline `style.cssText` class'ı sessizce eziyordu:** `gdpr.js`'te elemente hem
   `className='doc-section'` hem `style.cssText='margin-top:32px...'` verilmişti — inline stil her
   zaman kazanır, `.doc-section`'ın 64px boşluğu hiç uygulanmadı + Ayarlar panelinin 48px grup
   ritmiyle çakışırdı (64+48=112px). Ders: `doc-*` sınıfını satır-içi stille aynı elemente verirken
   hangi kuralın kazanacağını kontrol et; çakışıyorsa sınıfı ekleme, primitifi yalnız iç içerikte kullan.
2. **`.doc-tablebox` orijinal rapordan sapmıştı:** `overflow:hidden` yazmışım, kaynak
   `overflow-x:auto` kullanıyordu. `overflow:hidden` uzun içeriği (özellikle mobilde, Wanderer önce
   mobil PWA) kaydırma imkânı olmadan kırpardı — düzeltildi (`overflow-x:auto`, border-radius
   kırpması yine çalışıyor).
3. **Ölü CSS:** `sosyal.css` `.hr-meta b{color:var(--red)}` kuralı, `<b>` etiketini `doc-pill`'e
   çevirince artık hiçbir yerde kullanılmıyordu — silindi, `.hr-meta`'ya `align-items:center` eklendi
   (pill'in padding'i flex `stretch`'le satırı bozmasın diye).
4. **Version-bump atlanmıştı:** `sosyal.css`'i düzeltirken `_src.html`'deki `?v=1` bump'lanmamış.
   [[build-source-convention]] notuna göre prod cache asıl JS bundle hash'ine bağlı (bu `?v=` yalnız
   dev-server bookkeeping) ama yine de tutarlılık için düzeltildi.

**Ders (genel):** Bir CSS/JS dosyasını bir fazda "dokunmadım" diye işaretleyip sonraki bir düzeltme
turunda ona dokunursan, o dosyanın `?v=` bump'ını da o turda yap — "dokunmadım" listesi zamanla
bayatlar.
