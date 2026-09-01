/* ═══════════════════════════════════════════════════════
   16g — PROVA SAHNESİ · Yayınlamadan Duymak
   ───────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Emre'nin Sesi odasında bir cümleyi değiştirip "Yayınla" dediğinde o
     cümle canlıya iner — ve sonucunu görmenin tek yolu gerçek bir
     kullanıcı sohbetiydi. Yani sesin provası, sahnede yapılıyordu.
     Kitabın kendi ölçüsü bunu reddeder: "Kısa yol arama, o kişi ol."
     Bir sesi değiştirmek de bir seçimdir; seçimin sonucunu görmeden
     yapılan değişiklik bir tasarım değil, bir temennidir.
     Bu modül sahneyi ikiye ayırır: prova ve gösteri.
   MEKANİK / MİMARİ / TEK GİRİŞ:
     prvKos(taslak, mesaj, opts) — taslak yönlendirmeleri canlı override
     haritasının ÜSTÜNE geçici olarak bindirir, callLLM'i bir kez koşar,
     `finally` içinde haritayı aynen geri yazar. Kaydetmez: sohbet
     geçmişine, deko-ledger'a, hafızaya ve kota sayacına dokunmaz.
     Gerçek turdan tek farkı budur — persona (07b anayasası, sunucuda) ve
     mod kılavuzu (identity.core + protokol + kartuş) AYNEN gider, yoksa
     prova yanıltır.
   Kalıcılık: YOK — bilinçli. Prova bir iz bırakmaz.
   Konvansiyon: önek `prv`; window.prv* expose; i18n gerekmez (admin TR)
═══════════════════════════════════════════════════════ */

import { callLLM } from './04-llm-hero-history.js';
import { buildModeSelectionGuide } from './00-config-tracking.js';
import { getPromptOverrides, setPromptOverrides } from './16-i18n-prompts.js';

/* Prova tek mesajlıktır ve kısa tutulur: amaç sesin RENGİNİ duymak,
   uzun bir sohbeti canlandırmak değil. Kota da admin'in cebinden çıkar. */
const PRV_MAX_TOKENS = 420;
const PRV_TEMP = 0.8;

/* Aynı anda iki prova koşarsa ikincisinin `finally`si birincinin
   yedeğini geri yazar ve taslak canlıda ASILI KALIR. Tek kapı. */
let _prvKosuyor = false;

/** Canlı haritanın üstüne taslağı bindirir (dil bazında sığ birleşim). */
function _prvBirlestir(canli, taslak) {
  const out = {};
  const diller = new Set([...Object.keys(canli || {}), ...Object.keys(taslak || {})]);
  for (const d of diller) {
    out[d] = { ...(canli?.[d] || {}), ...(taslak?.[d] || {}) };
  }
  return out;
}

/**
 * Taslak yönlendirmelerle TEK bir dönüş koşar — yayınlamadan.
 *
 * @param {Object} taslak  { tr: { 'prompt.x': 'metin' }, en: {...} }
 * @param {string} mesaj   provada kullanıcının söyleyeceği cümle
 * @param {Object} [opts]  { modKilavuzu?: boolean }  — kimlik+mod kartuşu
 *                         gitsin mi (varsayılan: evet; gerçek turun hâli)
 * @returns {Promise<{ metin: string, sureMs: number }>}
 * @throws  taslak/mesaj boşsa, prova zaten koşuyorsa ya da LLM düşerse
 */
export async function prvKos(taslak, mesaj, opts = {}) {
  const soru = String(mesaj || '').trim();
  if (!soru) throw new Error('Prova için bir cümle yaz.');
  if (_prvKosuyor) throw new Error('Bir prova zaten koşuyor — bitmesini bekle.');

  const yedek = getPromptOverrides();
  const t0 = Date.now();
  _prvKosuyor = true;
  try {
    setPromptOverrides(_prvBirlestir(yedek, taslak));

    // Kılavuz taslak YÜRÜRLÜKTEYKEN kurulur — p() zincirinden geçtiği için
    // düzenlenen kimlik/kartuş metni provaya da yansır. Sırayı bozma.
    const sistem = opts.modKilavuzu === false ? '' : buildModeSelectionGuide();

    const metin = await callLLM({
      contents: [{ role: 'user', parts: [{ text: soru }] }],
      systemPrompt: sistem,
      maxTokens: PRV_MAX_TOKENS,
      temperature: PRV_TEMP,
      // Persona sunucuda eklenir (07b anayasası → admin_settings.system_prompt).
      // Provanın gerçeğe yakın olmasının şartı budur — kapatma.
      skipPersona: false,
    });

    return { metin: String(metin || '').trim(), sureMs: Date.now() - t0 };
  } finally {
    // Taslağın canlıya sızmasını engelleyen tek satır. Hata da atsa, kullanıcı
    // sekmeyi kapatsa da buradan geçilir.
    setPromptOverrides(yedek);
    _prvKosuyor = false;
  }
}

/** Prova sürüyor mu — yüzey (16d) butonu kilitlemek için okur. */
export function prvMesgul() {
  return _prvKosuyor;
}

/* ── window expose ── */
if (typeof window !== 'undefined') {
  window.prvKos = prvKos;
  window.prvMesgul = prvMesgul;
}
