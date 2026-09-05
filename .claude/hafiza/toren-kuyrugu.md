---
name: toren-kuyrugu
description: "13B Tören Kuyruğu — sahne sırası tek yerden sorulur; oturum bütçesi 2, son birim taahhüt döngüsüne korumalı, Günlük Ritüel muaf"
metadata:
  type: project
---

**19 Ağustos 2026 · İç Çalışma 05 rev.3 FAZ 4-5.** Tören çakışma listesi ÜÇ
yerde elle tutuluyordu — `10s _glBlockingOverlay`, `13h _blocked`,
`13z _igBlocked` — ve üçü birbirinden ayrışmıştı (13z `mt-portal`ı tanıyordu,
10s tanımıyordu). `js/parts/13B-toren-kuyrugu.js` üçünü topladı.

**Yüzey:** `trnIzin(ad, {davetsiz})` · `trnMesgul()` · `trnAcikSahne()` ·
`trnDurum()` · `trnSifirla()` (window'da, TDZ-güvenli). 14-boot'ta yüklenir —
auth'suz, state'siz, perde inerken de sorulabilmeli.

**Kurallar:**
- **DOM tek gerçek kaynak** — ayrı "açık sahne" defteri YOK; tutulsaydı state
  ile DOM ayrıştığında kuyruk kilitlenirdi. `trnBitti` bu yüzden yazılmadı.
- **Bütçe:** oturum başına 2 davetsiz sahne (akşam yığılması üç sahnedir,
  üçüncüsü bildirime dönüşür). Gün dönünce sıfırlanır.
- **Son birim korumalı:** oraya yalnız taahhüt döngüsü girer (`gunluk-ritus` 1,
  `seri-muhru` 2); günün özeti (`aksam-toreni` 3) sözün kapanışını kapıda
  bırakamaz.
- **Zorunlu sahne muafiyeti:** `TRN_ZORUNLU` (bugün yalnız `gunluk-ritus`)
  tavana takılmaz ama sayacı tüketir. Dikiş turunun bulgusu: bütçe dolunca
  Günlük Ritüel o oturumda büsbütün kayboluyordu — armağan da söz de
  kullanıcıya ulaşmıyordu.
- **Davetli tören kotadan düşmez:** `{davetsiz:false}` (Oluş Mührü, hazine
  paketi) sıra kontrolünden geçer, bütçeyi harcamaz.
- **Erteleme sessizdir** — görülmemiş bir törenin ertelendiğini duyurmak
  törenin kendisinden gürültülüdür; microcopy bilinçli olarak yazılmadı.

**GOTCHA (faz denetiminde yakalandı):** bir sahnenin KENDİ portalının tekrar
açılmasına karşı koruma kuyruğa DEVREDİLEMEZ. Kuyruk yüklenmemiş bir ortamda
(test, erken boot, modül hatası) `window.trnMesgul?.()` undefined döner ve
koruma da yok olur → aynı portal ikinci kez açılır. Her sahne sahibi kendi
`getElementById('<kendi>-portal')` guard'ını korur; dikiş testiyle mühürlü.

**Yeni tören eklerken:** portal id'si `TRN_PORTAL` listesine, gerekiyorsa
öncelik `TRN_ONCELIK`'e girer. Listeye yazılmayan sahneyi kuyruk görmez ve
üstüne ikinci sahne açılır.

İlgili: [[toren-katmani-aksam-meclis-wrapped]] · [[gunluk-ritus-armagan-soz]] ·
[[seri-muhru-toreni]] · [[imge-kapisi-zaltman]] · [[emek-sayar-bakis-saymaz]] ·
[[ic-calisma-atlasi]]
