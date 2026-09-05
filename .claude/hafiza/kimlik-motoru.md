---
name: kimlik-motoru
description: "13l Kimlik Motoru — tüm hareketlerden \"Olduğun Kişi\"yi çözen motor; kart kazanımı = kimlik devri; olay defteri + erdem vektörü + histerezisli çözücü"
metadata: 
  node_type: memory
  type: project
  originSessionId: 6c6e7293-9c18-4e14-9da5-b0288fbf031d
---

13l-kimlik-motoru.js (2026-06-11) — kitabın çekirdek tezinin motoru: kullanıcının uygulamadaki TÜM hareketlerinden "şu an hangi Kişi olduğunu" çözer; [[kisilerim-kart-motoru]] (10q) kart kazandırdığı an o kart OLDUĞU KİŞİ olur (paket töreninde "✦ ARTIK OLDUĞUN KİŞİ ✦" mührü).

**Mimari (window.im* expose):**
- OLAY DEFTERİ: `IM_TAXONOMY` — önem sırasına dizilmiş T1-4 taksonomi (T1 kimlik beyanı: bütünleşme/davranış kanıtı/söz tutma/geçiş okuması/hayal sahnesi/benlik maddesi → T4 ziyaretler). Hiçbir modüle dokunmadan çalışır: delta-gözlemci 12 sn'de bir sayaçları okur, artış = zaman damgalı olay; azalış = günlük sıfırlama (re-baseline, olay yok). İlk açılışta taban SESSİZ alınır (geçmiş birikim olay sayılmaz).
- ERDEM VEKTÖRÜ: olaylar yarı ömür 7 gün ile 11 erdeme damıtılır (erdem anahtarları = 12b VIRTUE_META; `card.virtue` TÜM destede güvenilir). Doyum: raw/(raw+20)*100.
- ÇÖZÜCÜ: sahipli kartlar arasında nowScore = %45 birikimli reçete (kkMatchCard) + %55 güncel erdem + tazelik bonusu. Histerezis: 18 saat tutma + ≥8 puan fark olmadan kimlik kaymaz. Persona ASLA silinmez (kart geri alınmaz).
- KAYMA TÖRENİ: davranış kayması → "HAREKETLERİN KONUŞTU" kurdelesi (6 saatte en çok 1; yazarken/gizliyken gösterilmez).

**KRİTİK yarış korumaları:** kkInit +1200ms, imInit +1800ms → (1) init öncesi kazanım `_imPendingEarn` kuyruğuna alınır, imInit hidrasyon sonrası işler; (2) imResolve `!_imInited` iken no-op; (3) açılıştan 30 sn içinde persona kartı koleksiyonda görünmüyorsa devirme (koleksiyon kısmen hidrate olabilir).

**Entegrasyonlar:** 10q kkTick→imOnCardEarned (çoklu kazanımda en nadir devralır) + Kişilerim `#im-identity-host` bloğu (hareket dökümü + kimlik yolu şeridi); 02c Benlik görünümü afişi (BOŞ durumda da basılır) + giriş ekranı çipi; 09a buildPersonalizationPrompt → window.imGetContext (benlikCtx'in hemen ardından). Hepsi TDZ-güvenli window.* erişimi.

**Kalıcılık:** SafeStorage `etw_kimlik_motoru_v1_{uid}` (ledger ~600 olay client'ta — gizlilik) + Supabase `kimlik_yolculugu` (mig 016, ELLE) yalnız persona+history+virtue_now senkronu.

**Not:** Emre'nin dev hesabında doğrulama sırasında 6 sentetik test olayı kaldı (3× gecis_okuma, 2× soz_tutuldu, 1× degerlendirme) — 7 günde yarılanır, persona gerçek davranışla kendini düzeltir.
