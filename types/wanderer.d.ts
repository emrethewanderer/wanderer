/* Wanderer AI — Ambient Type Declarations
   js/ dosyaları JSDoc'lanmadan TS strict check'i geçemediği için ortak global
   tanımlamalar burada toplanır. Yeni .js dosyaları yazılırken type IntelliSense
   buradan beslenir. Faz 3.2 → kademeli strict typing yol haritasının başlangıcı. */

// Window global'leri — main.js Object.assign(window, {...}) ile expose ediliyor.
declare global {
  interface Window {
    // Capacitor (native shell mock)
    Capacitor: { isNativePlatform: () => boolean } & Record<string, unknown>;

    // Dev tools (sadece development mode)
    _S?: Record<string, unknown>;
    _sb?: unknown;
    _t?: (key: string, fallback?: string) => string;

    // Auth & Navigation
    doLogin?: () => Promise<void>;
    doRegister?: () => Promise<void>;
    doLogout?: () => Promise<void>;
    switchView?: (v: string) => void;
    initApp?: (user: unknown) => Promise<void>;
    toggleMenu?: () => void;

    // Premium
    isPremium?: boolean;
    isPremiumPlus?: boolean;

    // HTML safety helpers
    safeHTML?: (html: unknown, opts?: object) => string;
    setHTML?: (el: Element | null, html: unknown, opts?: object) => void;
    setText?: (el: Element | null, str: unknown) => void;
    safeMarkdownHTML?: (html: unknown) => string;

    // Service worker registration
    breathUpdate?: () => void;

    // Chat
    sendMessage?: () => Promise<void>;
    appendMsg?: (role: string, text: string, modeClass?: string, ts?: string | null) => HTMLElement;
    startStreamingMsg?: (modeClass?: string) => {
      element: HTMLElement;
      appendChunk: (delta: string) => void;
      finalize: (finalText?: string) => HTMLElement;
    };

    // Internal helpers exposed by various modules
    _obAnswer?: (idx: number) => void;
    _obSkip?: () => void;
    loadTransformationCards?: () => void;
    renderAvoidanceCloud?: () => void;
    renderAvoidanceTrend?: () => void;
    renderTransformationScore?: () => void;
    initPricing?: () => void;
    maCountUp?: (el: HTMLElement, value: number, ms: number) => void;
    loadHasimlarView?: () => void;

    // Sentence/sefer modals (10-features-w2 — drawer/profile)
    wsShowSeferModal?: (bossId: string) => void;
    wsToggleSeferGecmis?: (btn: HTMLElement) => void;
    wsBugunOzetAc?: () => void;
    wsBugunOzetKapat?: () => void;

    // Day summary cache for sefer page
    _wsDunSummary?: unknown;
    _wsDunMessages?: number;
    _wsDunDuration?: string;

    // Calendly (3rd party script)
    Calendly?: {
      initInlineWidget: (opts: object) => void;
    };

    // visualViewport API (already in lib.dom but sometimes typed loosely)
    // standalone is iOS Safari only — augment Navigator separately
  }

  interface Navigator {
    standalone?: boolean;
  }
}

export {};
