---
name: cazibe-motoru-cialdini
description: Cazibe Motoru (10r) — Cialdini İknanın Psikolojisi 8 ilkesi oyunlaştırma çekirdeğinde; sistem çekiciliği katmanı
metadata: 
  node_type: memory
  type: project
  originSessionId: f16b53f5-0326-4ddd-9d7c-25a1307ba73a
---

**CAZİBE MOTORU — İknanın Psikolojisi (Cialdini) sistem çekiciliği (2026-06-02):** Emre, Cialdini'nin 8 etki ilkesini *ayrı kart olarak değil* oyunlaştırmanın çekirdeğine yerleşen tasarım kaldıraçları olarak istedi (sistemi "çok cazip" kılmak). İlkeler ETİK olarak ters çevrildi: başkasını ikna değil, kullanıcıyı KENDİ dönüşümüne çekmek — çekirdek tez "Mesele Sensin" korunur. Sahte sayı/sayaç/karanlık desen YOK; manevi dil. 8. ilke (Etkinin Silahları) bunu kullanıcıya da dürüstçe anlatan meta-katman.

**Modül:** `js/parts/10r-w2-cazibe.js` (tek dosya). `CAZIBE` merkezî içerik (thoughts/pledges/tribe/pusula, kitap-köklü hardcoded TR). Deterministik günlük seed `czDaily(salt)` = mulberry32(hash(`uid|YYYY-MM-DD|salt`)) → "bugüne özel" rotasyonlar aynı gün sabit. `czEnsureStyles` JS-enjekte (`#cz-styles`). State `S._cazibe` (w2.js'e eklendi): `{gift,pledge,lastCompliment,seenPusula,sparkTotal}`. Kalıcılık SafeStorage `etw_cazibe_v1_<uid>` (Supabase migration YOK — cihaz-yerel). `czInit` 03-auth-shell'de `personalizationLoad()` sonrası dinamik import.

**8 Kaldıraç:**
- 1 Karşılıkta Bulunma → **Günün Hediyesi** (`czRenderHediye`/`czClaimHediye`): app önce verir (elmas/düşünce/ipucu, günlük seed); alınınca "sıra sende" karşılık CTA'sı. Bugün view.
- 2 Bağlılık/Tutarlılık → **Günün Sözü** (`czRenderSoz`/`czPledge`/`czPledgeKept`): 3 mikro-söz seç → gün içi yansıt → **akşam (saat≥20) "tuttun mu?"** → kept'te awardElmas(4)+iltifat. Streak kayıp-çerçevesi. Bugün view.
- 3 Toplumsal Kanıt → `czToplumsalKanit()`: öz-kanıt (streak≥3 gerçek veri) VEYA kabile normu (evergreen). Kişiler view `.cz-proof` satırı. Uydurma sayım yok.
- 4 Sevgi/Beğeni → `czIltifat()` (milestone-kapılı hak edilmiş övgü) + `czKisiselDokunis()` (S._lifeMemory.people/lifeFacts varsa sıcak gönderme). Kişilerim `.cz-praise-line` + söz-kept praise + hediye touch.
- 5 Otorite → 10q `kkEmreBlock` "iki kitabın yazarından" + `kkOpenDetail` kök "◆ KAYNAK ·" + `.kk-det-auth` not.
- 6 Azlık → 10q spotlight `.kk-spot-scarce`(nadide/efsane)+`.kk-spot-loss`(score≥55) + **Bugünün Kişisi** (`cz-bugun-kisi`, günlük seed, spotlight/emre ile dedup) + detay/paket "az bulunur".
- 7 Anlık Etki → `czSpark(amount,label)`: her kazanımda anında mikro-ödül patlaması. **`10g awardElmas` → `window.czSpark`** kancası (import yok, cycle yok). GOTCHA (2026-06-16 fix): `.cz-spark` z-index 9500; tören portalları/veil'leri (gl-/sm-/us-/yol-/at-… hepsi `*-veil`) z 9700 → tören açıkken kıvılcım veil'in ALTINDA kalıp blur arkasından "soluk yatay çizgi" olarak sızıyordu (Günün Armağanı'nda "Söze Geç" altındaki hayalet çizgi = armağan toplanınca tetiklenen +3 elmas kıvılcımı). Çözüm: czSpark başında `if (document.querySelector('[class*="-veil"]')) return;` — tören açıkken kıvılcım hiç çizilmez (elmas yine kazanılır, tören kendi ödül rayını gösterir).
- 8 Etkinin Silahları → **Cazibe Pusulası** (`czPusula`): 8 gücü adlandıran meta panel; Kişiler altbilgisi `cz-pusula-link` girişi. Radikal dürüstlük.

**Mimari kararı (TDZ güvenliği):** Modüller-arası statik import kenarı EKLENMEDİ — 10q/10g, 10r'ye `window.cz*` üzerinden erişir (dinlenme'nin `window.getGecisAlaniStats` kalıbı). 10r boot'ta main.js'te side-effect import (`import './parts/10r-w2-cazibe.js'`) + kendini window'a açar (`czRenderBugun/czSpark/czPusula/czToplumsalKanit/czIltifat/czKisiselDokunis/czDayKey/czDaily/czEnsureStyles/czClaimHediye/czPledge/czPledgeKept`). `loadBugunView` (10-features-w2) `window.czRenderBugun()` çağırır; _src.html bugun-view'da `#cz-bugun-hediye`+`#cz-bugun-soz` (kk-bugun-nudge üstü).

**DOĞRULANDI (2026-06-02):** build 120 modül temiz; boot TDZ/hata/uyarı YOK; preview eval ile seed determinizmi + hediye/söz/claim/pledge-kept/iltifat/kanıt/spark/Pusula(8 satır) çalışıyor; 359 test geçer. inlineDynamicImports=true (tek IIFE). `vite.config.js` input=_src.html → `build.sh` _src.html→index.html + root'a kopya.

İlgili: [[wanderer-gamification-engine]] · [[kisilerim-kart-motoru]] · [[personalization-engine-layers]] · [[build-source-convention]] · [[auto-build-on-stop]]
