---
name: tum-diller-native-plani
description: "Dil serüveni: v2 planı AKTİF ama BEKLEMEDE — 2026-07-25'te yarım kalan DE pilot dalgası Emre kararıyla silindi, uygulama TR/EN'de; FAZ 0 altyapısı duruyor, DE emeği git a93ed3d'de"
metadata: 
  node_type: memory
  type: project
  originSessionId: 037fe4af-8e6d-4171-962d-f1e9a8e96dbc
  modified: 2026-08-09T14:16:46.544Z
---

**⏸ 2026-08-09 — PLAN BEKLEMEYE ALINDI (Emre kararı).** TR register devrimi öne
geçti: [[ihtimalsel-dil-devrimi]]. Gerekçe: diller TR kaynağından doğar; kaynak
değişirken çeviri başlatmak her dili iki kez yazdırır (~2.800 anahtar × 11 dil).
Devrim bitince dalgalar yeni sesten doğar ve `scripts/i18n-style/tr.md` her dilin
register anayasasının atası olur. FAZ 0 altyapısı 2026-08-09'da canlı doğrulandı
(validate script + parite testi + K3/K7 kancaları yerinde) — dil-nötr, bekler.

---

**GÜNCEL DURUM (2026-07-25) — DE PİLOTU SİLİNDİ, UYGULAMA TR/EN'DE.**
Emre yarım kalan Almanca dalgasını sildirdi ("sadece TR+EN kalsın"). DE hiçbir zaman
dalga kapısından (§0.5) geçmemişti — hukuk/kanon/QA eksikti, `I18N_LANGS`'a hiç
girmemişti → **kullanıcı Almanca'yı hiç görmedi, silme UX'i değiştirmedi.**
Silinen 9 dosya: `js/parts/i18n/de-{ui,prompt,detect,deste,hukuk}.js` ·
`js/ext/{i18n,deste,hukuk}-de.js` · `scripts/i18n-style/de.md` (klasörler boşaldı).
**FAZ 0 altyapısı KORUNDU** (dil-nötr, yeniden yazılmayacak): `i18n-validate.mjs` ·
`tests/i18n-parity.test.js` (dış dil yokken "boşta bekliyor" dalıyla geçer) ·
15/16 K3 yükleyici genellemesi · `LANG_INSTRUCTION_NAMES` 11 dil haritası ·
12b `_applyDeckOverlay` + K7 etiket köprüsü · 13p `_hkEnsureLangDocs`.
**DE emeği kaybolmadı:** `git checkout a93ed3d -- js/parts/i18n js/ext/i18n-de.js
js/ext/deste-de.js js/ext/hukuk-de.js scripts/i18n-style/de.md` ile geri gelir.
Plan yeniden başlarsa FAZ 1 (de pilot) sıfırdan koşar — yeni sözlük zaten yeni
kart adlarıyla ([[ad-senkronu-kurali]]) doğar, geriye dönük düzeltme işi yok.

---

**v2 AKTİF PLAN (2026-07-12, aynı gün ikinci karar):** Emre dilleri bu kez **sıfırdan,
tam native** geri istedi → `.claude/plans/tum-diller-native-2.md` (Fable 5). v1'den farkları:
(1) **dikey dil dalgaları** — bir dil ancak TÜM katmanları (UI+prompt+detect+deste+hukuk) native
olduğunda `I18N_LANGS`'a girer ("ya tam native ya hiç" yapısallaştı); (2) **çevirmen = Sonnet 5'in
kendisi** (transcreation), script yalnız bekçi (`i18n-validate.mjs` + parite spec); (3) **hukuk 3 belge
ülke-hukuku bazlı native** — Emre'nin mühürlediği eşleme: es→İspanya, **pt→Brezilya (register pt-BR!)**,
ar→KSA PDPL, **zh→Tayvan PDPA (Geleneksel Çince, bayrak 🇹🇼)**, ru→152-FZ + şeffaf yurt-dışı barındırma
notu; (4) sıra: **de PİLOT (Emre pilot mührü şart)** → fr es it nl pt ja ko ru zh → **ar en son (RTL)**;
(5) dalga başına Emre mühürleri: kanon onay dosyası (`.claude/plans/onay/<lang>-kanon.md`) + hukuk
metni + avukat incelemesi ELLE. Sidecar altyapısı (bundle-diyet: `js/ext/*` → `ext-<ad>.js`, jenerik)
işi bedavaya getirdi — build.sh'a dokunulmuyor. İlerleme: `tum-diller-native-2-STATUS.md` tek gerçek.

---

**v1 ARŞİV NOTU (2026-07-12 sabahı): Uygulama yalnız TR/EN destekliyordu.** Aşağıdaki plan
yazılıp onaylandı, FAZ 0'a (dil-başına asset bölme) başlandı — sonra Emre kararı
tersine çevirdi: 11 dış dili yarım-parite (~%13 anahtar) ile tutmak yerine
**tamamen kaldırıldı**. Geri alma: `I18N_LANGS`/`DETECT_I18N`/dosya yapısı TR/EN'e
indirgendi, per-lang loader mantığı (`_loadLang`) tamamen söküldü, `loadExtScript`
helper'ı silindi, `13p-hukuk.js`'teki dil-notu ölü dalı temizlendi. Dil seçici
(`openLangPicker`) altına nazik bir not eklendi: `lang.picker_note` — "Wanderer
şimdilik Türkçe ve İngilizce konuşuyor — yeni diller yolda." 635 vitest yeşil,
build/preview doğrulandı.

**Çıkarım — genelleştirilebilir ilke:** Emre yarım-parite bir çok-dilli deneyimi
(kullanıcı dil seçse de %13 çevrilmiş metinle karşılaşıyor) UX olarak istemiyor;
"ya tam native ya hiç" tercihini gösterdi. İleride benzer geniş-kapsamlı
özellik tekliflerinde (yüzlerce/binlerce anahtarlık iş) önce küçük bir pilot/örnek
göstermek veya kapsamı netleştirmek, büyük altyapı yatırımından sonra geri
alınmasını önleyebilir — ama bu normal yön değişikliği, süreç hatası değil.

Aşağıdaki araştırma ve faz haritası, ileride "tüm diller native" fikrine geri
dönülürse kullanılacak referans olarak duruyor — **aktif plan değil**.

---

2026-07-12 (ARŞİV): "Tüm Diller Native" planı yazıldı → `.claude/plans/tum-diller-native.md`.

Keşif ölçümleri (o günkü durum): 15b core TR/EN 2.773 anahtar, 11 dış dilin her biri 371 (eksik 2.402/dil → ~26,4k çeviri); 16b prompt TR/EN 340, ext 104 (eksik 236/dil); 16c detect eksik 5/dil; ext'teki mevcut 475 girdi/dil yüzleşme-çağı register'ında (revizyon ister); `prompt.mode.guide` 11 dilden bilinçli silinmiş. send-push Türkçe hardcode + user_engagement'ta lang kolonu yok; CSS'te 0 RTL kuralı; 12a/12b kart içeriği TR.

Plan omurgası: FAZ 0 dil-başına asset bölme (`i18n-<lang>.js`, tek ext dosyası ölür, build.sh döngüsü) + `scripts/i18n-translate.mjs` hattı + doğrulayıcı ({{var}}/token/JSON bekçisi) → FAZ 1 core sözlük dil-dil → FAZ 2 prompt + mode.guide yeniden üretim → FAZ 3 sunucu dili (mig 036 `user_engagement.lang` + send-push) → FAZ 4 RTL(ar) + font zinciri + microcopy el revizyonu → FAZ 5 kart destesi overlay (`deck-<lang>.js`, id/recipe donuk) → FAZ 6 dil-dil QA + LLM-hakem örneklem.

Kritik ilkeler: dil değişimi reload'lu → aynı anda TEK dil yüklenir (per-lang asset bunu varsayar); ayet/kanon LLM'e bırakılmaz, yerleşik meal + Emre onayı ([[kitap-sesi-manevi-register]]); hitap kararları: de-du, fr-tu, ru-ты, zh-你, ja-です sıcak, ko-해요체; TR kaynak metne dokunulmaz. Gelecek erozyon bekçisi: `--gaps` raporu — büyük özellik kapanışlarında koşulacak konvansiyon.

ELLE (uygulama sonrası): mig 036 + send-push deploy + llm-chat dil eki (repoda yok, pano tarifi) + ayet onay dosyası.

İlgili: [[tr-en-i18n-tamamlama]], [[i18n-bundle-bolme]], [[emre-sesi-yonlendirme]], [[yuzlesme-kacis-kaldirma]]
