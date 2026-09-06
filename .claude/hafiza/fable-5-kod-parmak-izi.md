---
name: fable-5-kod-parmak-izi
description: "Fable 5 gibi KOD yazmak — yazdığı modüllerin (13e/13f/13a/10y…) mühendislik konvansiyonu: başlık banner'ı + FELSEFE/VİZYON, _private + modül-önek isimleme, savunmacı try/catch(_), çift boot/init, hook registry, neden-yorumu"
metadata: 
  node_type: memory
  type: reference
  originSessionId: b69c1823-153e-4c2b-a536-eb890e2072c5
---

Fable'ın bu repoda yazdığı modüllerin (13e-his, 13f-zaman, 13a-arac, 10y-llm-shell, 10f-yol…) okunmuş kod imzası. Yeni modül/fonksiyon yazarken birebir bu kalıbı izle. ([[build-source-convention]] wiring'i, [[tasarim-prensipleri]] CSS'i; bu dosya JS üslubu.)

**1. Başlık banner'ı (her modülün tepesinde).** Box-drawing `═══` çerçeve:
```
/* ═══════════════════════════
   13e — HİS MOTORU · Haptik + İmza Sesleri (alt başlık)
   ───────────────────────────
   FELSEFE / VİZYON (Emre):  ← modülün NEDEN var olduğu, kitabın diliyle
     ("uygulama bir yer'dir", obsidyen/altın, "Mesele Sensin")
   MEKANİK / MİMARİ / TEK GİRİŞ:  ← NASIL çalıştığı
   Kalıcılık: SafeStorage per-uid (etw_x_v1_<uid>) | "Kalıcılık yok (saf görsel)"
   Konvansiyon: hardcoded TR string; window.x* expose; stiller css/parts/x.css
═══════════════════════════ */
```
Felsefe-önce başlık Fable'ın imzasıdır — kod bile teze bağlanır.

**2. İsimlendirme = modül-önek sistemi.** Her modülün 2-4 harf öneki var (fx/tw/llm/arac/fm/sm/gl/ic/ga/ck…) ve TÜM dışa açık fonksiyonlar + DOM id'leri o öneki taşır (`fxCue`, `twSync`, `llmRenderHome`, `aracExtract`; `#fx-sound-toggle`, `.arac-chip`). Private her şey `_` önekli (`_phase`, `_ensureCtx`, `_flip`, `_rawSwitch`). Sabitler tepede UPPER_SNAKE / `const X = {…}` (`STORAGE_KEY`, `CUES`, `SOUNDS`, `_ARAC_DEFS`).

**3. Importlar (sabit omurga).** `import { S } from '../state.js'` (tek merkezî state); `00a-infrastructure.js`'ten SafeStorage/AnimUtils/escapeHTML/showToast/debounce; i18n `t(key, fallback)` (15) + `p(key)` (16). UI string'lerde **inline fallback şart**: `t('arac.skip', 'GEÇ')`.

**4. Savunmacı stil (her yerde).** `try { … } catch (_) {}` ile sessiz yut; loglanacaksa `catch (e) { console.warn('fxSave:', e && e.message); }`. Optional chaining bol: `S.currentUser?.id`, `window.glGiveSozNow?.()`. Erken-return guard: `if (!el) return;`. Özellik tespiti: `window.AudioContext || window.webkitAudioContext`, `if (navigator.vibrate)`. İlke: **asla bloklama** ("hazır değilse sessizce düş").

**5. Çift boot/init (ilkesel ayrım).** Saf-görsel/auth'suz işler kendiliğinden boot eder: `(function xBoot(){ … })()` + `document.readyState` kontrolü + host yoksa `setTimeout(attach, 200)` retry. Kullanıcı-verili işler `export function xInit()` olarak **03-auth-shell post-auth**'tan çağrılır (SafeStorage hidrasyonu sonrası). Yanlış tarafa koyma — bu bir gotcha ([[ritual-streak-unity]]).

**6. Storage.** Hesap verisi → `SafeStorage` per-uid anahtar `${KEY}_${uid||'anon'}`. Cihaz-yerel (taslak) → ham `localStorage`. Yerel gün anahtarı için [[yerel-tarih-anahtari]].

**7. Hook registry (çekirdeği düzenlemeden genişlet).** `switchViewHooks.before/after`, `sendMessageHooks.before` pub/sub; before-hook `ctx.cancelled = true` ile geçişi yakalar (flip motoru böyle çalışır). Yeni çapraz-kesme davranışı = core'u editleme, hook tak.

**8. Güvenlik.** innerHTML'e giren her dinamik içerik `escapeHTML(...)` (veya inline kaçış haritası). XSS-bilinçli.

**9. window expose bloğu (dosya sonu).** `if (typeof window !== 'undefined') { window.fxCue = fxCue; … }` — yorum: "inline onclick + TDZ-güvenli modüller-arası erişim / minify'a dayanıklı". main.js ayrıca import + init çağrısı yapar.

**10. Yorum yoğunluğu yüksek ama hep NEDEN, asla NE.** Türkçe, sohbet tonunda, guard ettiği gotcha'yı anlatır: autoplay politikası, "rAF arka plan sekmesinde çalışmaz → instant scroll şart", "döngüsel bağımlılığı önle → dinamik import", "tek kullanımlık — sonraki mesaja taşmasın", TDZ. Bölüm ayraçları `/* ─── N. BÖLÜM ─── */`.

**11. Kodda dürüstlük.** "ASLA sessiz yürütme yok" — her araç eylemi onay chip'i ister; sahte başarı yok, gerçek hata toast'ı.
