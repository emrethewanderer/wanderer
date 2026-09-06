---
name: iki-kisi-bir-deste
description: "2026-07-25 TAM — Hedef Mührü (10q↔10D lapis köprüsü) + Bugün'de KİŞİLERİM iki destesi (10q2) + Üç Mühür kutupları SENTEZ oldu; ELLE mig 040"
metadata: 
  node_type: memory
  type: project
  originSessionId: adb7bc4d-79d7-4f96-b280-8d0ea490dc96
  modified: 2026-07-26T20:22:18.153Z
---

**Emre'nin vizyonu (2026-07-25):** *"Asıl olarak 2 kart var: Olduğun Kişi ve
Olmak İstediğin Kişi — diğer unsurlar burayı besliyor."* Plan:
`.claude/plans/velvety-prancing-giraffe.md`.

## Kurulan mimari (üç katman)

| Katman | Ne | Nerede |
|---|---|---|
| **SENTEZ** | Üç Mühür'ün iki kartı: altın = olunanların TOPLAMI (Portre), lapis = olunmak istenenlerin ÖZETİ (OİK kartı) | `#yol-hero` (10f) |
| **DESTE** | Tek tek kişiler: ALTIN = kazanılan tüm Kişi Kartları, LAPİS = hedef mührü vurulanlar | `#kk-bugun` (10q2, YENİ) |
| **BESLEME** | kazanım → `porAbsorbCard` (altın) · hedef mührü → `oikAbsorbCard` (lapis) | 02c / 10D |

**En güzel keşif:** altın tarafın besleme kanalı (`porAbsorbCard`, 02c:541)
repoda zaten kuruluydu; eksik olan tam simetriğiydi. `oikAbsorbCard` onun
lapis ikizi olarak yazıldı — yeni motor değil, mevcut kalıbın ikizi.

## Hedef Mührü — "Böyle bir kişi olmak istiyorum."

- Buton YALNIZ **sahipsiz** kartta (Kişiler ekranı) — olunmuş kişi hedeflenmez.
  Emre'nin ilk mesajı "Kişilerim'de" diyordu, sonra düzeltti.
- `kkHedefMuhurle(id)` → `S._kisiKarti.hedefler[id] = {at, absorbed}` **+**
  `oikAbsorbCard(card)`: 4 boyut → OİK kartı (`hisler`→`duygular`, kategori
  başına 2, dedup'lu, `src:'kart'` + **`ref`**).
- **`ref` izi kritik:** mühür sökme (`kkHedefSok`→`oikReleaseCard`) o izden
  bulur. `_cleanEntries` genişletildi — yoksa iz Supabase turunda düşerdi.
- **Kuyruk:** OİK kartı yokken mühür kaybolmaz → `etw_oik_absorb_q_<uid>`;
  tasarım töreni kartı mühürleyince `_commitCard` drene eder.
- **Mezuniyet:** hedeflenen kart kazanılırsa mühür düşer (hedef→olunan).
  `kkTick`'te **uzlaştırma taraması** (kazanım yolu ne olursa olsun — bu
  tick, Supabase senkronu, backfill). Absorbe edilen maddeler ÇEKİLMEZ.
- Tören: lapis perde → **altın** damga (prensip 1) → flaş → "Bu kişi artık
  hedefinde." + aforizma → 2.2 sn. `fxCue('seal')`.
- 13l taksonomisine `hedef_muhru` eklendi — **sayaçlı**, doğrudan `imEvent`
  ÇAĞRILMAZ (sayaç + doğrudan çağrı çifte kayıt olurdu; `gecis_karti`'nda bu
  ikizlik zaten var, tekrarlanmadı).

## KİŞİLERİM bölümü (10q2 · yeni modül, önek `kk`)

- `_src.html`: `#kk-bugun` sarmalı; ~~`#gk-bugun-strip` id'si korunarak İÇİNE
  taşındı~~ — **⚠️ BU KARAR 2026-07-26'da GERİ ALINDI.** Şerit yeni bölümün
  içine konmuş ama onunla BİRLEŞTİRİLMEMİŞTİ; sonuç aynı çerçevede iki ayrı
  kart sistemiydi. Şerit tamamen söküldü, kutuplar destelerin başına, üç vuruş
  köprüye taşındı; `gkRenderYolHero` artık YOK → [[tek-deste-iki-kutup]].
- Başlık `switchView('kisilerim')` kapısı — Emre'nin istediği kapı.
- **Yelpaze:** en fazla 6 yüz çizilir, kalan `+N` rozetinde (100+ kartta GPU
  yormaz). Gezinme: sürükleme (dikey hareket sayfaya bırakılır) · ‹ › · ← →.
- İki deste **DIŞA** açılır (`--dir: -1/+1`); ön yüzler `rotateY(±8deg)` ile
  birbirine bakar (yol.css kutup dili). İçe aynalamak altın kolonla çakışıyordu.
- Deste uzunluğu değişince imleç başa döner — haber olan kart öndedir.

## GOTCHA'lar (bu turda öğrenilen)

1. **`ikvHoloAttach(el,{mode:'vars'})` `ikvCardFace` yüzlerinde İŞE YARAMAZ.**
   `--rx/--ry` değişkenlerini 10q'nun `.kk-card3d-inner`'ı okur; `.ikv-card`
   okumaz. Bağlanırsa geriye boşa dönen bir rAF kaydı kalır. Mini kartta
   holo zaten soyulur (prensip 6). 10q2'de bilerek bağlanmadı.
2. **Gizli view'de `getComputedStyle(el).transform` daima `"none"`.**
   `#bugun-view` kapalıyken düz `translateX(9px)` bile "none" döner — CSS
   bozuk sanılır. Doğrulama için view'i geçici açığa çıkar.
3. `assets/*.js` içinde eski build artefaktı yaşar — `grep` ile "yetim mi?"
   ararken `assets/` ve `dist/` hariç tutulmalı, yoksa ölü kod canlı görünür.

## Ölü kod (kanıtla silindi)

`kkRenderBugunNudge` + `.kk-nudge*` stilleri + `.ws-identity-split` CSS bloğu
(sentez.css): host `#kk-bugun-nudge` repoda HİÇ yoktu (2026-07 temizliğinde
kalkmış), fonksiyon her Bugün açılışında boşa çağrılıyordu. `wsArchFigure`
importu 10q'da yetim kaldı → kaldırıldı. `kk.spot.kicker` i18n anahtarı
Kişiler spotlight'ında CANLI, korundu.

## Doğrulama

build 648KB/650KB ✓ · **58 test dosyası / 1187 test yeşil** (34 yeni:
hedef mührü 21 + deste 16 + sentez kutupları 8) · preview'da TR+EN canlı
(buton metni, tören, deste gezinme, başlık kapısı → kisilerim-view), konsol 0 hata.
Anon preview'da doğrulanamayan: sentez kutuplarının GERÇEK veriyle hâli
(Portre+OİK ister) — 8 birim testiyle kapsandı, Emre'nin oturumunda görülmeli.

## Bekleyen ELLE iş

`migrations/040_kisi_hedefleri.sql` (kisi_karti_profile.hedefler jsonb).
**Deploy edilmiş varsayılmaz** — kolon yokken client 42703'ü yakalar,
hedefler cihaz-yerel (IndexedDB) yaşar, hiçbir şey kırılmaz.

Bkz. [[kisilerim-kart-motoru]] · [[olmak-istedigin-kisi]] · [[benlik-karti-2-olunan-ad]] ·
[[uc-muhur-yol-tasarimi]] · [[kimlik-motoru]] · [[kart-gorsel-dili]] · [[ad-senkronu-kurali]]
