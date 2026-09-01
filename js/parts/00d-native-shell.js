/* ═══════════════════════════════════════════════════════════════════
   00d — NATIVE SHELL · klavye lift + status bar (native cila)
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Wanderer bir dil modeli kabuğu (Claude gibi). "Web sitesi" hissini
     veren şey ham native ayrıntılardır: klavye composer'ı örter, status
     bar yanlış renktedir, içerik çentiğin altına girer. Bu modül o
     ayrıntıları kapatır — sohbet kabuğu native gibi durur.

   MEKANİK:
     • KLAVYE — yumuşak klavye açılınca --kb-height yazılır; #app-screen
       o kadar daralır (shell.css) → flex düzen composer'ı klavyenin üstüne
       taşır, messages-area kısalıp sona kaydırılır.
         - native: window.Capacitor.Plugins.Keyboard olayları (kesin yükseklik)
         - PWA/web: VisualViewport API (klavye açılınca görsel viewport kısalır)
       Yazma odağı yoksa --kb-height hep 0 → adres-çubuğu titreşimini yutar.
     • STATUS BAR — koyu uygulama için açık içerik + overlay (çentik bölgesi
       zaten --safe-t ile yönetiliyor). window.Capacitor.Plugins.StatusBar.

   KONVANSİYON: ESM plugin importu YOK — 13k gibi runtime
     window.Capacitor.Plugins.* erişimi (IIFE/file:// güvenli). Plugin'ler
     native'de cap sync ile kayıtlı; web'de undefined → tüm yollar no-op.
     Native plugin kurulumu ELLE: SETUP-NATIVE-PUSH.md / cap sync.
═══════════════════════════════════════════════════════════════════ */

function _plugin(name) {
  try { return window.Capacitor?.Plugins?.[name] || null; } catch (_) { return null; }
}

let _kbWired = false;
let _sbWired = false;

/* --kb-height'i yaz + klavye açıkken son mesaj görünür kalsın */
function _setKbHeight(px) {
  const v = Math.max(0, Math.round(px || 0));
  document.documentElement.style.setProperty('--kb-height', v + 'px');
  if (v > 0) {
    requestAnimationFrame(() => {
      const area = document.getElementById('messages-area');
      if (area) area.scrollTop = area.scrollHeight;
    });
  }
}

/* Şu an bir metin alanına yazılıyor mu? (adres-çubuğu yanlış-pozitiflerini eler) */
function _isTyping() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'TEXTAREA' || tag === 'INPUT' || el.isContentEditable === true;
}

function _wireKeyboard() {
  if (_kbWired) return;
  _kbWired = true;

  // 1) NATIVE — Capacitor Keyboard plugin kesin yükseklik verir.
  const Keyboard = _plugin('Keyboard');
  if (Keyboard) {
    // Webview'i biz daraltıyoruz (--kb-height) → plugin de daraltırsa çift olur.
    try { Keyboard.setResizeMode?.({ mode: 'none' }); } catch (_) {}
    try { Keyboard.setScroll?.({ isDisabled: true }); } catch (_) {}
    try {
      Keyboard.addListener('keyboardWillShow', (info) => _setKbHeight(info?.keyboardHeight || 0));
      Keyboard.addListener('keyboardWillHide', () => _setKbHeight(0));
    } catch (_) {}
    return; // native yolu yeterli
  }

  // 2) PWA / MOBİL WEB — VisualViewport klavye açılınca kısalır.
  const vv = window.visualViewport;
  if (!vv) return;
  const onResize = () => {
    if (!_isTyping()) { _setKbHeight(0); return; }
    // innerHeight sabit; vv.height klavye kadar kısalır. offsetTop sayfa kaymasını telafi eder.
    const delta = window.innerHeight - vv.height - (vv.offsetTop || 0);
    _setKbHeight(delta > 60 ? delta : 0); // 60px eşik: küçük chrome oynamalarını yut
  };
  vv.addEventListener('resize', onResize);
  vv.addEventListener('scroll', onResize);
  // Odak kaybında garanti sıfırla (bazı tarayıcılar gizlemede resize atmaz)
  document.addEventListener('focusout', () => setTimeout(() => { if (!_isTyping()) _setKbHeight(0); }, 50), true);
}

function _wireStatusBar() {
  if (_sbWired) return;
  const StatusBar = _plugin('StatusBar');
  if (!StatusBar) return;
  _sbWired = true;
  try {
    // Koyu (obsidyen) uygulama → açık/beyaz içerik. Capacitor Style.Dark = light content.
    StatusBar.setStyle?.({ style: 'DARK' });
    // İçerik status bar'ın altına uzanır; üst güvenli alan --safe-t ile zaten korunuyor.
    StatusBar.setOverlaysWebView?.({ overlay: true });
  } catch (_) {}
}

export function initNativeShell() {
  try { _wireKeyboard(); } catch (_) {}
  try { _wireStatusBar(); } catch (_) {}
}

// Kendiliğinden başlat (idempotent). Web'de tüm yollar sessizce no-op.
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { try { initNativeShell(); } catch (_) {} }, { once: true });
  } else {
    try { initNativeShell(); } catch (_) {}
  }
}
