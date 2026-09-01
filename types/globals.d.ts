/**
 * Wanderer AI — global type augmentations.
 *
 * HTML onclick handler'ları window üzerinden çağrılır (sendMessage, switchView, vb.).
 * Bu dosya tipi belgeleme + ileride strict mode'a geçişe zemin için fonksiyonları beyan eder.
 *
 * NOT: Şu an `checkJs: false`. Strict mode için tsconfig'de açılır + bu beyanlar
 * window üzerinden çağıran modüllerin tip kontrolüne tabi olur.
 */

export {};

declare global {
  interface Window {
    /* Auth & Navigation */
    doLogin: () => Promise<void>;
    doRegister: () => Promise<void>;
    doLogout: () => Promise<void>;
    newSession: () => Promise<void>;
    switchView: (view?: string) => void;
    initApp: (user: unknown) => Promise<void>;
    toggleMenu: () => void;

    /* Premium gating */
    isPremium: boolean;
    isPremiumPlus: boolean;
    showPremiumFeatureSpotlight: (featureKey: string) => void;
    closePremiumSpotlight: () => void;

    /* Chat */
    sendMessage: (...args: unknown[]) => unknown;
    appendMsg: (role: string, text: string, modeClass?: string) => HTMLElement;
    startStreamingMsg: () => { finalize: (text?: string) => HTMLElement };
    handleKey: (e: KeyboardEvent) => void;
    autoResize: (el: HTMLTextAreaElement) => void;

    /* HTML safety helpers (Faz 1.1) */
    safeHTML: (html: unknown, opts?: object) => string;
    setHTML: (el: HTMLElement | null, html: unknown, opts?: object) => void;
    setText: (el: HTMLElement | null, str: unknown) => void;
    safeMarkdownHTML: (html: unknown) => string;

    /* PWA / Capacitor shim */
    Capacitor?: { isNativePlatform: () => boolean };

    /* Dev tools (sadece import.meta.env.DEV) */
    _S?: unknown;
    _sb?: unknown;
    _t?: (key: string, fallback?: string) => string;
  }
}
