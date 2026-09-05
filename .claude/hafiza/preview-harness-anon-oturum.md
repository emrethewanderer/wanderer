---
name: preview-harness-anon-oturum
description: "Harness ham kaynağı import map'le yükleyip gerçek CSS ile açar; GÜNCELLEME 08-21: preview artık anon DEĞİL, gerekçe oturum yokluğu değil VERİ yokluğudur"
metadata: 
  node_type: memory
  type: project
  originSessionId: cadd5690-6717-450a-9177-7dfeb9bf5db5
  modified: 2026-08-17T17:52:22.343Z
---

> **GÜNCELLEME 2026-08-21 — açılış varsayımı yanlışlandı.** Emre geliştirme
> hesabı açtı ve preview artık **giriş yapılmış** oturumdadır
> ([[gelistirme-hesabi-preview-oturumu]]): kullanıcı verisine bağlı ekranlar
> canlı açılır, `S.currentUser` doludur, Supabase sorguları gerçek uid ile
> döner. Harness'ın gerekçesi **daralmıştır ama bitmemiştir**: artık "oturum
> yok" diye değil, **veri yok** diye tohumlanır (hesap yeni, tablolar boş) ve
> `S`/`sb` hâlâ `window`'a expose edilmediği için state'i dışarıdan yazmanın
> tek yolu odur. Aşağıdaki iki kapalı yol (bare specifier, vite EPERM) hâlâ
> geçerlidir.

Preview (tek origin `localhost:3030`, bkz. [[preview-sw-bayat-modul]])
**eskiden anon oturumdaydı** ve `SafeStorage`
bellek-içi `_kvCache`'tir — `window`'a expose edilmez. Bu yüzden kullanıcı
verisine bağlı ekranlar (Geçiş Ekranı `gkOpenDetail`, Kişilerim desteleri…)
preview'da canlı açılamaz: `S._gecisKartlari` boştur ve dışarıdan yazılamaz.

İki kapalı yol (2026-08-10'da denendi, ikisi de tükendi):
- `import('/js/state.js')` — bare specifier (`@supabase/supabase-js`, `marked`,
  `dompurify`, `chart.js`) tarayıcıda çözülmez; **sayfa yüklendikten sonra**
  eklenen `<script type="importmap">` uygulanmaz.
- Vite dev server — `preview_start` süreçleri cwd'siz başlattığı için hem
  `node_modules/.bin/vite` hem `npx vite` **EPERM** verir. Bash'ten `vite build`
  çalışır ama dev server preview'a bağlanmaz. (2026-08-17: aynı EPERM repo
  içindeki her `.mjs` için geçerli — sunucu kabuktan başlar, `launch.json`
  komutsuz `url` girdisiyle yalnız **attach** eder.)

**Açık yol — harness:** `.claude/harness/gecis-ekrani.html` sayfanın KENDİ
`<head>`'inde import map taşır (`@supabase/supabase-js` →
`.claude/harness/supabase-stub.js`, kalanlar `/node_modules/...` ESM
dosyalarına), build'in stylesheet'ini link'ler, ham modülleri import edip
`S`'ye elle kart koyar. Gerçek CSS + gerçek `ikvCardFace` + gerçek DOM.

**How to apply:** Oturum verisine bağlı bir ekranı preview'da doğrulaman
gerektiğinde yeni motor yazma — bu harness'ı kopyala, `S`'ye koyduğun tohumu
değiştir, `http://localhost:3030/.claude/harness/<ad>.html` aç. Stylesheet
adı build'de hash'lenir (`assets/style-*.css`); değişirse link'i tazele.
Harness üretim kodu DEĞİLDİR, build'e girmez.

İlgili: [[gecis-karti-mezun-kapisi]] · [[preview-sw-bayat-modul]] ·
[[safestorage-testlerde-kvcache]]
