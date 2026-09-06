---
name: benlik-karti-2-olunan-ad
description: "Benlik Kartı 2.0 \"Olunan [Ad]\" (2026-07-11) — kazanılan kart karta işlenir + her dalgada LLM tam sentez; kartlaşmış görünüm + doğuş töreni + altın kimlik birliği; mig 032 ELLE"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5ec15d1b-1a1d-48bd-9cfe-df28694c32dd
---

**Benlik Kartı 2.0 · "Olunan [Ad]"** (2026-07-11, Fable 5; plan `.claude/plans/delightful-beaming-riddle.md`).
Vizyon: onboarding'de kart "Olunan {Ad}" adıyla DOĞAR, kazanılan her Kişi Kartı'nın (10q/12b)
bildikleri ona İŞLENİR, LLM portreyi yeniden yazar, kart görsel olarak da evrilir.
Emre'nin kararları: (1) altın kimlik HER YERDE Olunan [Ad], persona kartın İÇİNDE rozet;
(2) her kazanımda TAM sentez (uygulama: kazanım DALGASI başına tek LLM — 1200ms debounce).

## Omurga (02c)
- `benlikAbsorbCard(card,{silent})`: eşleme **`hisler`(12b)→`duygular`(02c)**; kart başına
  kategori başına 2 madde; `{text,src:'kart',ref:kartId,at}`; dedup norm; aynı kart ref/history
  ile ikinci kez işlenmez. Onaysız kartta id `etw_benlik_absorb_q_{uid}` kuyruğuna → onboarding
  confirm drenajı. ~~Retroaktif absorb YOK~~ → **2026-08-26'da açıldı**: `porBackfillCollection()` eski sahipli kartları toplu işler, davet Portrem'de belirir ([[esigin-nabzi]]).
- `benlikResynth()`: `_evrimWave` splice → tek `callLLM` (`p('prompt.benlik.resynth_system')`,
  SUMMARY_MODEL, skipPersona). **Dokunulmazlık: yalnız taşan kategorilerde (>8 kart-maddesi)
  `kart_ozu` src:'kart' maddelerini değiştirir; user/emre asla.** version++, history (son 40,
  {v,at,baslik,portrait,cards}), sahne=null→`kumEnsureSpec` seed `benlik-{uid}-v{n}` virtue
  'yansima' (görsel evrim). Hata→dalga geri+`_resynthPending`→loadBenlikView'da retry.
- 10q kkTick: `earnedThisTick` (silent dahil) → `window.benlikAbsorbCard?.()`; madde sayısı
  `kk.collection[id].benlikAbsorbed` (paket satırı bunu okur).
- `benlikCardName()`: `t('sc.card_name')` "Olunan {name}"/"Attained {name}" (2026-07-27 ad göçü); ad `#ob-name` →
  user_metadata ilk isim → 'Gezgin'. DB'de ad tutulmaz.

## Yüzeyler
- **loadBenlikView**: hero=gerçek `ikvCardFace` (gold, kicker BENLİK KARTI, badge ✦v{n},
  sub=epitet(baslik), card.sahne) + ikvHoloScan tilt; nabız (`etw_benlik_seen_v_{uid}`);
  KARTIN EVRİMİ şeridi (`benlikToggleEvrim`); rozetler Sen/Emre/{kart adı}+`{n} Kart`.
- **Doğuş töreni** (scene 3): ikvCardBack→700ms flip→kart; `kumHeuristicSpec` senkron
  `birthSahne` confirm'de karta işlenir; buton `sc.birth_confirm` "Bu Kart Benim";
  reduced-motion'da flip yok. CSS `.sc-birth*` self-card.css (?v=4 bump).
- **02d _goldData TERS öncelik**: onaylı Benlik birincil (name=benlikCardName, sahne kartta —
  ikvScene `card.sahne`'yi kendisi okur 12c:648); persona caption `esik.gold.persona_cap`
  "{n} gündür {persona}" + nadirlik rozeti. Benlik onaysızsa eski persona zinciri.
- **10q kkOpenPack**: `kk-pack-cap-benlik` satırı "Bu kişinin bildikleri {card} kartına
  işlendi." (TR ek uyumu için "{card}'a" DEĞİL "kartına" kalıbı). 13l seed-fallback adı da
  benlikCardName.
- benlikGetContext: ◈ başlık AYNEN + kart adı/v{n} + "Son evrim: X işlendi" satırları.

## Kalıcılık + ELLE
- **mig 032 ELLE**: benlik_karti +`version INT DEFAULT 1` +`history JSONB '[]'`
  (`sahne` 031'de vardı!). 42703 → `_benlikEvrimColsOk=false`, evrim alanları atılıp retry
  (KV-only). reset/delete-user benlik_karti ZATEN listede; yeni etw_ anahtarları gdpr.js:182
  wildcard süpürmesiyle kapsanır — edge fn redeploy GEREKMEZ.
- `prompt.benlik.resynth_system` 16b TR+EN (admin "Emre'nin Sesi"nden incelenebilir).

## Testler + tuzaklar
- `tests/02c-benlik-evrim.test.js` (11): eşleme/sınır/dedup/kuyruk/debounce/dokunulmazlık/
  retry/ad/bağlam. **TUZAK: test ortamında 12d yüklü → window.kumEnsureSpec GERÇEK, arka
  planda fazladan callLLM; beforeEach'te stub'landı + sarkan `_evrimWave` drenajı.**
  callLLM mock'u KISMİ olmalı (importOriginal) — 11-w2 renderHistory'yi sarar.
- 02c artık 12b/12c'yi statik import eder (02c→12b→12d→12c, döngüsüz).
- v1 doğuş history'si confirm'de tohumlanır; eski kayıtlar benlikLoad'da version/history
  garantilenir.

İlgili: [[benlik-karti]] (1.0 omurga) · [[kimlik-motoru]] (persona motoru DEĞİŞMEDİ; yalnız
sunum) · [[esik-ekrani]] (altın öncelik tersine döndü) · [[kart-uretim-motoru-huzura-cikis]] ·
[[kisilerim-kart-motoru]] · [[emre-yonlendirme-hardcode-yasak]] ·
[[benlik-kusursuzluk-sprinti]] (2026-07-18: bu maddede "1200ms debounce'ta kayıt, dalga
kalıcılığı yok, dil sızıntısı" diye yazılan riskler artık ÇÖZÜLDÜ — anında kayıt +
`etw_benlik_evrim_wave_{uid}` kalıcılığı + enrich↔resynth serileştirme + TR-olmayan
kullanıcıda çeviri kapsamı; ayrıntı o hafızada)

> **⚠️ KART ADI DEĞİŞTİ (2026-07-27):** "Şu Anki [Ad]" → **"Olunan [Ad]"**;
> `por.card_name` = 'Olunan {name}' / 'Attained {name}', kart id
> `portre-simdi`→`portre-olunan`. Lapis ikizi doğdu: **"Niyet Alınan [Ad]"**
> (`oikCardName`, 10D). Ayrıntı: [[olunan-ve-niyet-alinan-karari]].
>
> **⚠️ AD SENKRONU (2026-07-25):** bu dosyadaki modül/dosya/anahtar adları
> ESKİDİR. Güncel eski→yeni haritası: [[ad-senkronu-kurali]]. Kısaca:
> `02c-self-card.js`→`02c-portre.js` (`sc.`→`por.`), `10A-an-karti.js`→
> `10A-gecis-karti.js` (`ak.`→`gk.`), `kk.living`→`kk.butunluk`;
> tablolar `benlik_karti`→`portre`, `benim_kartlarim`→`gecis_kartlarim`.
