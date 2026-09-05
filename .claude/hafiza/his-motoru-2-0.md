---
name: his-motoru-2-0
description: His Motoru 2.0 (2026-07-20) — Wanderer Akordu + 10 yeni cue + haptik koreografi + gece kısıklığı + Fener Ambiyansı; plan .claude/plans/soft-forging-river.md
metadata: 
  node_type: memory
  type: project
  originSessionId: df22d532-32b1-4688-ac20-35e63e0713b3
  modified: 2026-07-20T11:52:30.828Z
---

2026-07-20 tamamlanan sprint: 13e-his-motoru.js'i (eski: 13 cue, ses+haptik, prefs {sound,haptic}) tam bir duyusal katmana genişletti. FAZ A-F, tümü test+build doğrulamalı.

**FAZ A — His Bütünlüğü.** 6 ham `navigator.vibrate` sitesi (00a hapticTap, 07, 10-features, 10r, 10w, 10y) artık `window.fxHaptic` üzerinden geçiyor — Titreşim ayarı artık HER yerde geçerli (önceden baypaslanıyordu). 10q'nun eski deseni (`if(window.fxHaptic)...else navigator.vibrate`) emsal alındı.

**FAZ B — Wanderer Akordu.** Kök Sol (G); altın=alçak/sıcak (G2-G4), lapis=tiz/kristal (G5-G7). Yeni primitif `_pad` (yavaş atak + lowpass, nefes/eşik dokusu için — `_tone`'un tersi). 10 yeni cue: `breath` (splash), `esikGold`/`esikLapis` (02d, CSS animasyon gecikmesiyle senkron 150/300ms), `cardBirth` (02c Benlik Kartı doğuşu), `nisan` (12e isikSeal), `streak` (13r gsRecordChatDay), `sendTick`/`replyBreath` (06 sendMessage + _ensureInserted, INLINE — hook'lara DEĞİL, çünkü sendMessageHooks validasyondan önce koşar), `flip` (10y, Faz A'nın geçici delegasyonunun yerine), `recall` (13o gcFire). Doz kontrolü: `CUES[name].cooldownMs` + `_lastFired` haritası (streak 300ms, sendTick 1500ms, replyBreath 45s).

**FAZ C — Haptik koreografi.** `_hapticSeq([{kind,at}])`: native'de zamanlı `setTimeout`+fxHaptic dizisi, web'de TEK `navigator.vibrate()` desenine derlenir (vibrate'te "stil" yok). `milestone2-4`/`holoGrand` artık `hapticSeq` kullanır (milestone1 sade kalır). Reduced-motion açıkken dizi son adıma sadeleşir (ses etkilenmez).

**FAZ D — Gece Kısıklığı.** Zincir: cue → `_master` → `_moodFilter` (lowpass, varsayılan 18kHz=şeffaf) → destination. `_ready()` her cue öncesi `_moodFor(document.documentElement.classList)` okur (13f'nin tw-night/tw-evening sınıfı — import ETMEZ, yalnız classList). Gece g=0.22/lpf=3200, akşam g=0.38/lpf=8000. `setTargetAtTime` ile tıklamasız geçiş. `prefs.nightDim` (default true) opt-out alanı var, UI toggle YOK henüz.

**FAZ E — Fener Ambiyansı.** Opt-in (`prefs.ambient` default **false**), `window.fxToggleAmbient(on)`. Sürekli oda tonu: 2× G2 sine (±4 cent detune, "beating") + gürültü katmanı + 0.05Hz LFO nefes (reduced-motion'da LFO kurulmaz). Kendi faz tablosu `_ambientMoodFor` — `_moodFor`'dan bağımsız, KENDİ gain zinciriyle doğrudan `_moodFilter`'a bağlanır (gece kısıklığından 2 kez etkilenmesin). tw-morning'de +147Hz (D3) parti tonu eklenir. `document.hidden` → durur (visibilitychange listener, MODÜL TOP-LEVEL — test dosyalarında `vi.resetModules()` sonrası stale listener birikir, testte her ambient testinden sonra `fxToggleAmbient(false)` ile temizlenir). `fxToggleSound(false)` ambient'ı da durdurur. Tek istisna: Akordun "asla loop" kuralını bozan tek yer (loop gerekiyor).

**FAZ F — Ayarlar UI.** `_src.html` "Doku · Ses & Titreşim" grubuna `#fx-ambient-toggle` ("Fenerin Uğultusu", Titreşim ile Işık izleri arasında, varsayılan UNCHECKED). **Gözlem:** bu grup baştan beri i18n'siz (hardcoded TR, `data-i18n` yok) — yeni toggle da bu YEREL kalıba uydu, kasıtlı seçim (parçalı i18n tek bir grup içinde tutarsızlık yaratırdı). EN kullanıcı bu grubu tamamen TR görüyor — pre-existing gap, bu sprintte kapsam dışı bırakıldı.

**Kalıcı sözleşme:** `etw_fx_prefs_v1_<uid>` artık `{sound, haptic, nightDim, ambient}`; eski `{sound,haptic}` kayıtları `Object.assign(_default(), data)` ile ileri-uyumlu hidrate olur. `window.fx*` 7 fonksiyon (fxInit/fxCue/fxHaptic/fxToggleSound/fxToggleHaptic/fxToggleAmbient/fxSyncSettingsUI).

**Test:** `tests/13e-his-motoru.test.js` (YENİ, 56 test) — kendi sahte AudioContext/AudioParam/Oscillator/BiquadFilter/BufferSource sınıfları (setup.js'e global mock KONULMADI, bilinçli — bkz. dosya başı yorum). `@capacitor/haptics` vi.mock; `navigator.vibrate` `Object.defineProperty` ile tanımlanır (jsdom'da yok). `window.matchMedia` de jsdom'da yok — her test kendi stub'ını kurar.

**Kapanış öz-incelemesinde bulunan gerçek bug (düzeltildi):** `_loadHaptics()` eskiden `_hapticsTried` BOOLEAN bayrağıyla önbelleğe alıyordu (13e:331 civarı, pre-existing kod). `_hapticSeq` art arda (180-700ms aralıklarla) `fxHaptic()` çağırdığı için — ki bunu BEN ekledim (FAZ C) — ilk `import('@capacitor/haptics')` henüz çözülmeden gelen 2./3. çağrı `_hapticsTried=true` ama `_Haptics` hâlâ `null` görüyor, sessizce web `navigator.vibrate` fallback'ine düşüyordu (native'de o da güvenilir değil) → milestone2-4/holoGrand'ın 2. ve sonraki haptik adımları native'de SESSİZCE KAYBOLABİLİRDİ. Fix: bayrak yerine PROMISE önbelleğe alındı (`_hapticsPromise`), tüm eşzamanlı çağıranlar aynı yüklemeyi paylaşır. Regresyon testiyle kanıtlandı — eski kod geri konup test bilerek kırdırıldı (2 yerine 1 `Haptics.impact` çağrısı), sonra fix geri getirildi.

**Why:** Emre'nin isteği — "sesler ve titreşim üzerine unutulmayacak bir deneyim". Uygulama bir *yer*; yerin dokusu ve tınısı olur. [[his-doku-paylasim]] (eski/temel 13e bilgisi, artık kısmen bayat).

**How to apply:** Yeni tören/ekran eklerken önce mevcut 23 cue'dan (13 eski + 10 yeni) birine bak — sözlük şişmesin. Yeni cue gerekiyorsa Wanderer Akordu'na (G-pentatonik, altın/lapis ekseni) sadık kal, `_tone`/`_hiss`/`_pad` primitifleriyle yaz. Ses dosyası YASAK — her şey sentez. Ambient'a dokunursan `_moodFilter`'a bağlan (gece kısıklığını 2 kez uygulama). Bundle 641→643KB gzip (650KB bütçesinin altında ama pay daraldı — ~7KB kaldı, yeni büyük ses/veri eklerken dikkat).
