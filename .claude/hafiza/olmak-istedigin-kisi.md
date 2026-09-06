---
name: olmak-istedigin-kisi
description: 10D Olmak İstediğin Kişi (OİK) — sil-baştan yeniden tasarım; kullanıcının kendi tasarladığı hedef kimlik + Geçiş Protokolü ritüeli; eski Geçiş Alanı (10j) + Arketip View (12a) TEK KAYNAKTA birleşti
metadata: 
  node_type: memory
  type: project
  originSessionId: 9b22b9dc-4981-435d-938c-9e013a2b0da9
---

**Olmak İstediğin Kişi (10D · `js/parts/10D-olmak-istedigin.js`, önek `oik`)** —
2026-07-03 sil-baştan yeniden tasarım (plan: `.claude/plans/cosmic-prancing-spring.md`).
Emre'nin 3 kararı: **ekran + tek kaynak** · **kendi tasarladığın kişi** (statik arketip
değil) · **ritüel entegre**. Kitap temeli: Manifesto VIII "istediğin hayatı O kişi yaşar"
+ Yeni Bir Kişiye Geçiş Yapısı + Geçiş Protokolü (md.6 AI mandatı). Benlik Kartı'nın
([[benlik-karti]]) LAPİS İKİZİ; [[kimlik-motoru]] "Olduğun Kişi"nin hedef kutbu.

**Emeklilik (Faz 6):** eski **Geçiş Alanı (10j)** + **Arketip View (12a `loadArketipView`)**
tek kaynağa gömüldü. `switchView('arketip'|'gecis')` → `'oik'` alias (03 switchView başı).
10j-w2-gecis-alani.js + css/parts/gecis-alani.css + `#gecis-view`/`#arketip-view` HTML +
`ga.*` i18n (72×2) SİLİNDİ. 12a `loadArketipView` silindi ama KORUNAN canlı importlar
(ARKETIPLER_DATA/getArchetypeById/getAllArchetypeData/getSuggestedArchetype/initArchetypes/
_getDeck/wsArchFigure/wsArchFigureBody/EMRE_ONERI/_saveArchetypeProgress) DURUYOR —
`wsArchCard/wsArchTraitsHTML/_openTraitPopup/_getStreak/_getUserAdds` ölü kod bırakıldı
(birbirine bağlı küme; ayrı temizlik turu). Geri-getirme haritası → repo kökü `CODEMOD.md`.

**Şema (`js/state/oik.js` S._oik):** `{cards[], activeCardId, readingLog{lastMorning,
lastNight,lastDayKey,streak,totalReadings}, crystalMilestone, seedHint, migratedFromGecis}`.
Kart = Benlik Kartı ile AYNI 4 kategori: `{id:'oik_…', baslik, whisper, dusunceler[],
inanclar[], duygular[], davranislar[]` (madde {text,src,at})`, olumlama, olumlama_duygu,
source, version, parent_id, state:'active'|'archived', has_recording, ...}`.

**Omurga = 10A ([[an-karti]]) çift-yazım ikizi:** KV `etw_oik_v1_{uid}` ayna + tablo
`oik_kartlari` (mig 029 ELLE) birincil; dirty-set→800ms debounce upsert; 42P01 sessiz KV
modu; `_oikHydrateRemote` post-auth. `_rowFromCard/_cardFromRow` simetri. `oikInit` (03
post-auth, gaInit'in YERİNE): oikLoad → **10j KV'sinden tek seferlik idempotent göç**
(`_cardFromLegacyGecis`; readingLog+crystalMilestone 1:1 → 13l hayalet olay yok; IDB kayıt
`gecis_`→`oik_` best-effort; 10j KV SİLİNMEZ) → `_syncLegacyMirror` → hydrate.

**Tek kaynak API (tüm tüketiciler buradan):** `oikGetDesired()` {name,whisper,description}
· `oikGetCard()` · `oikGetContext()` (09a enjeksiyon: benlik→ak→im→**oik**) · `oikGetStats()`
(getGecisAlaniStats halefi; 10r/10n streak) · `oikSeedDraft()` (13-extras/10k/10m DOM-köprü
yerine). **Legacy ayna (KRİTİK geriye uyum):** `_syncLegacyMirror` her kayıtta
`S._personTransition.desired.description=baslik` + `S._affirmation` + `dfSave()` yazar →
eski okuyucular (02d/10f/10g/10i/13-extras + dfGetAffirmationContext) kırılmaz. Tüketiciler
`window.oikGetDesired?.()||desired` kalıbıyla geçti. **09b regex guard:** OİK kartı mühürlüyse
sohbet regex'i desired'ı EZMEZ → `seedHint`'e düşer. **Geçiş dönemi:** 13l sayaçları +
10u `_gecisDone` `max`/`OR(S._oik, S._gecisAlani)` — hiçbir okuma kaybolmaz.

**Ekran (`#oik-view`, css/parts/oik.css, `loadOikView`):** boş→tasarım töreni CTA; dolu→12c
lapis kart hero + sabah/gece ritüel pilleri + seri + kristal + "OKU & HAYAL ET" altın CTA +
4 boyut panelleri + olumlama + "YENİDEN TASARLA" (version+1/parent_id/archived). **Tasarım
töreni (`oikOpenDesign`, .sc-onb overlay, boot'ta ASLA otomatik):** 4 sahne Geçiş Yapısı
(gözünden bak→düşünce+inanç→his+davranış→sentez); LLM ko-tasarım `prompt.oik.design` (16b
TR+EN, admin "Emre'nin Sesi") maddeleri RAFİNE eder (src korunur) + `_oikDesignFallback`;
sunum lapis kart + olumlama + "Kitaptaki örneği yükle" (kanonik `oik.canonical_affirmation`).
**Okuma ritüeli (10j'den taşındı):** `oikOpenReading` sesli oku + MediaRecorder `oik_{id}` +
`oikCompleteReading` (=gaCompleteReading ikizi: slot çifti→streak, `awardElmas(4/+8,'gecis')`,
recordActivityDay, usCheckHayalDay, kristal). Kristal CRYSTAL_TIERS aynen; `oikCheckCrystal`
Bugün'e girişte (10-features-w2, eski gaRenderBugunCard halefi).

**i18n:** `oik.*` 81 anahtar TR+EN (parite 2625=2625); kart kategori etiketleri `sc.label.*`
REUSE. **Doğrulama:** build temiz (198 modül), 455 vitest (17 yeni: göç/olumlama/row↔kart/
normalize/kristal/oikGetDesired öncelik/seedHint), preview konsol error+warn 0; oik* expose +
boş hub + tören sahne-1 (Fraunces başlık/Cinzel-lapis kicker computed) + eski view'lar silinmiş
doğrulandı.

**ELLE (Emre):** mig 029 Supabase'e; reset-user + delete-user (`oik_kartlari` eklendi)
yeniden deploy; (ops) admin `prompt.oik.design`.

İlgili: [[an-karti]] (omurga kalıbı) · [[benlik-karti]] (kimlik ikizi) · [[kimlik-motoru]] ·
[[esik-ekrani]] · [[uc-muhur-yol-tasarimi]] · [[ritual-streak-unity]] · [[build-source-convention]]
· UI 2.0 sil-baştan → [[olmak-istedigin-kisi-2-pencere-tasarimi]]
