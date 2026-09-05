---
name: imge-kapisi-zaltman
description: "İmge Kapısı (13z, 2026-08-04) — Zaltman 'Tüketici Nasıl Düşünür' katmanı: kullanıcının kendi metaforu; 12 arketip + kanıtlı zirve; modül öneki ig (im DOLU)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 05a4654e-a5ab-4bbe-9ab2-7573a9b118fe
  modified: 2026-08-04T16:06:44.891Z
---

Cazibe Motoru (Cialdini, 10r) "karar anını" çalışır; **İmge Kapısı (13z) kararın
altındaki imgeyi** çalışır. Zaltman'ın beş bulgusu ürüne şöyle indi: %95 kuralı
(davet), imge-metafor (12 arketip), hafıza yeniden inşası (Zirve Mührü), priming
(Eşik filigranı), bedenlenmiş biliş (mevcut His Motoru cue'ları).

**Mekanik:** Kullanıcı 12 arketipten (kapı·deniz·dağ·ateş·köprü·tohum·fener·yol·
kanat·kök·yıldız·**kumru** — kitap-köklü) birini seçer, "bu imge neden sen?"
sorusuna KENDİ cümlesini yazar, basılı tutup mühürler. Cümle yoksa kayıt YOK
(`igSec` iki kapılı: id geçerli + `kokenKirp(neden)` dolu). İmge daima **beyan**dır;
`igGetAktif()` `kokenBeyan` sarmalı + `.kanit` alanı döndürür → tüketiciler
`kokenKayitVar` ile kapılar.

**Yüzeyler:** Bugün davet şeridi (`#ig-invite`, kapı: imge yok + `S._portre.confirmed`)
· tören portalı `#ig-portal` · Eşik'te ALTIN kartın köşesinde filigran (priming) ·
09a prompt damarı `_buildImgeContext` (oturum başına 1 kez; **merdiven bu kısıtı
bilerek aşar** — kullanıcının kendi talebi) · `[ARAC:imge]` chip · Cazibe Pusulası'nın
9. satırı (şeffaflık: "imgeyi sen seçersin, biz icat etmeyiz") · 13h akşam töreninde
"Bugün şunu söyledin" · 13j Ayın Filmi'nde zirve sahnesi.

**Zirve Mührü (K2):** Model zirve cümlesini YAZMAZ, `zirve_kanit_ref` ile numarasını
GÖSTERİR; metni `kokenAlintiCoz` kaynaktan keser → `igZirveKaydet`. Çözülemezse
hiçbir şey yazılmaz. Mevcut `personalizationDeepAnalysis` çağrısına binen tek alan —
**yeni LLM çağrısı yok, kota ≈ 0**.

**Why:** "Mesele Sensin" tezi burada dile de uzanır — uygulama kullanıcıya kendi
metaforuyla konuşur, ona metafor DAYATMAZ. `p('prompt.imge.yanki')` bunu modele
açıkça yasaklar ("sen aslında bir X'sin" deme; kullanıcı uzaklaştıysa sürükleme).

**How to apply:**
- **Modül öneki `ig`, `im` DEĞİL.** `im` + `window.im*` 13l-kimlik-motoru'nun ve
  15+ dosya onu tüketiyor; plan `im` demişti, uygulamada yakalandı. Yeni modül
  öneki seçerken önce `grep -rn "window\.<önek>[A-Z]" js/`.
- Yeni tam-ekran tören eklersen `ig-portal`'ı blokaj listesine ekle **ve tersini de
  yap**: 13h/13i/**10s/10t** listelerine eklemek dikiş turunda ayrı ayrı gerekti
  (10s/10t ilk turda atlanmıştı — kullanıcı "neden sen?" yazarken üstüne tören
  biniyordu).
- Deterministik seed artık tek kaynakta: `stableHash`/`seededRng`
  (`00a-infrastructure.js`). 10i ve 10r'deki private kopyalar buna bağlandı;
  üçüncü kopya yazma.
- Filigran gibi ikincil öğelere `animation: … both` VERME — animasyon koşmazsa
  (arka plan sekmesi) öğe `opacity:0`'da kilitlenir; taban değeri CSS'te bırak.

İlgili: [[cazibe-motoru-cialdini]] · [[gerceklik-mimarisi]] · [[kesin-alinti-mimarisi]] ·
[[his-motoru-2-0]] · [[toren-katmani-aksam-meclis-wrapped]] · [[esik-ekrani]] ·
[[personalization-engine-layers]] · [[tasarim-prensipleri]] (§0.1 Derin Metafor Haritası)
