---
name: sahne-gogu-tek-kaynak
description: "Yol'un göğü dört tam-ekran sahnenin TEK zemini — --sky-scene + --sky-stars token'ları (base.css); yeni sahne degradeyi kopyalamaz, token'ı içer"
metadata: 
  node_type: memory
  type: project
  originSessionId: ac231c5d-e73f-4bcf-bc6f-2ac19744a902
  modified: 2026-08-02T17:01:23.308Z
---

**KARAR 2026-08-02 (Emre):** Üç Mühür'ün Yol ekranındaki gök, **Açılış Perdesi**
ve **Bugünün Eşiği**'nin de zemini oldu. Artık dört tam-ekran sahne aynı göğü
içiyor: `.yolp-scene` (Yol) · `#auth-screen` (giriş eşiği) · `#wn-splash`
(perde) · `.esik-onb` (Bugünün Eşiği). `.gor-scene` (Gördün) yalnız gökten içer,
yıldızsızdır.

**İki token, `css/parts/base.css` `:root`:**
- `--sky-scene` — üstte lapis gece (gelecek/hayal) → obsidyen → altta altın ufuk
  ısısı (şimdi/eylem). **Saat evresine göre döner:** `<html>`'deki `tw-morning/
  day/evening/night` sınıfı (13f) token'ı yeniden tanımlar, sahne kendiliğinden
  değişir. 13f modül seviyesinde boot ettiği için sınıf **perdeden önce**
  takılıdır — perde doğru vakitle doğar.
- `--sky-stars` (YENİ) — dört yıldızın radial-gradient dizisi. Saat evresine göre
  DEĞİŞMEZ. Önceden yol.css ile auth.css'te elle ikizlenmişti; perde ve Eşik
  üçüncü-dördüncü kopyayı doğuracaktı. Tek kaynak olmasının sebebi estetik değil
  **süreklilik**: aynı yıldız aynı yerde durmazsa perde inerken gök zıplar.

**Kullanım kalıbı** — yıldızlar daima göğün ÜSTÜNDE:
`background: var(--sky-stars), var(--sky-scene);` + ayrı bir gren katmanı
(`--grain-img`, opacity .22–.25; gren üstünde `mix-blend-mode` kırılgandır).

**Gren katmanının konumu ekranın kaydırıp kaydırmadığına bağlıdır:** perde
kaymaz (`fixed inset:0`, taşma yok) → `::after` **absolute** yeter; `.esik-onb`
`.onb-ritual`'dan `overflow-y:auto` alır → gren **fixed** olmalı, yoksa kısa
ekranda içerikle birlikte kayıp dokuyu sahnenin altında bırakır. İçerik göğün
üstünde durmalı: `> * { position: relative; z-index: var(--z-base); }`.

**Neden:** perde eskiden düz `var(--bg)` siyahtı — bir yükleme ekranı gibi
duruyordu ve inerken altından çıkan yüzey BAŞKA bir zemindi, göz bir kesme
görüyordu. Bugünün Eşiği'nin zemini ise o göğün elle yazılmış, **saatsiz ve
yıldızsız bir ikiziydi** (aynı şeyi söylüyordu, kendi kopyasından). Aynı gökle
perde sahnenin kendisi olur, eşikten geçmek yolun başına çıkmaktır.

**Kural:** yeni bir tam-ekran sahne açarken degradeyi KOPYALAMA, bu iki token'ı
iç. Tüketici listesi `base.css`'teki token yorumunda tutulur — yeni tüketici
eklerken o satır da güncellenir.

İlgili: [[uc-muhur-yol-tasarimi]] (göğün kaynağı) · [[acilis-perdesi]] ·
[[esik-ekrani]] · [[esik-anon-giris-kapilari]] · [[gordun-pencereden-bakis]] ·
[[uc-ana-renk-lapis]] · [[tasarim-prensipleri]].
