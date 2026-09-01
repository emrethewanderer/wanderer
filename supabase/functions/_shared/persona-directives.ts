/* ═══════════════════════════════════════════════════════
   _shared — SUNUCU TARAFI YÖNLENDİRME OKUYUCUSU · pServer
   ───────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     "Emre sadece Admin'den yönlendirilsin" (2026-07-02) kararı client'ta
     bir refleks oldu: kodda sıfır inline "Sen Emre…" kaldı, ~380 anahtarın
     tamamı canlıda düzenlenebilir. Ama karar sunucuda hiç kurulmamıştı —
     ve boşluk sessizce doldu: soz-terzisi (31 Tem) ve sohbet-baslaticilari
     (12 Ağu) kendi sistem prompt'larını TypeScript içine yazdı. O metinler
     Emre'nin sesini taşıyor ama panelde görünmüyor, canlıda değişmiyor,
     bir kelimesi için deploy gerekiyor.
     Ses tek yerden çıkmalı: kullanıcının okuduğu her cümlenin kaynağı
     Emre'nin dokunabildiği bir yer olmalı.
   MEKANİK / MİMARİ / TEK GİRİŞ:
     pServer(sb, key, lang, fallback) — client p() zincirinin (16:71)
     sunucu aynası. Sıra: dil-override → TR-override → fonksiyonun kendi
     varsayılanı. Satır yoksa, tablo yoksa, DB düşerse: fallback. ASLA
     bloklamaz — sesin kaynağına ulaşamamak sesi susturmaz.
   Kalıcılık: okuma-yalnız; kaynak `persona_directives (key, lang, content)`
   Konvansiyon: anahtarlar `prompt.srv.*` (panelde kendi odasına düşer,
     grep'te ayrılır); önek `p` (pServer); modül-içi cache 10 dk
     — llm-chat'in `_personaCache` emsali (llm-chat:17)
═══════════════════════════════════════════════════════ */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/* ─── 1. CACHE ─── */

/* Edge fonksiyonu instance'ı sıcak kaldığı sürece yaşar; her çağrıda DB'ye
   gitmemek için. TTL llm-chat'in persona cache'iyle aynı: 10 dk. Emre bir
   yönlendirmeyi yayınladığında en geç 10 dakikada canlıya iner. */
const TTL_MS = 600_000;

type Kayit = { deger: string | null; until: number };
const _cache = new Map<string, Kayit>();

function _cacheAl(k: string): string | null | undefined {
  const c = _cache.get(k);
  if (!c) return undefined;              // hiç bakılmamış
  if (c.until <= Date.now()) {
    _cache.delete(k);
    return undefined;                    // bayat → yeniden sor
  }
  return c.deger;                        // null = "DB'de yok" da geçerli cevap
}

function _cacheYaz(k: string, deger: string | null): void {
  _cache.set(k, { deger, until: Date.now() + TTL_MS });
}

/* ─── 2. OKUMA ─── */

/** Tek satır okur; yoksa null. Hata da null döner — çağıran fallback'e düşer. */
async function _oku(
  sb: SupabaseClient,
  key: string,
  lang: string,
): Promise<string | null> {
  const ck = `${key}::${lang}`;
  const onbellek = _cacheAl(ck);
  if (onbellek !== undefined) return onbellek;

  try {
    const { data, error } = await sb
      .from('persona_directives')
      .select('content')
      .eq('key', key)
      .eq('lang', lang)
      .maybeSingle();

    // Tablo hiç kurulmamışsa da buraya düşer — sessiz, çünkü tablosuz
    // çalışmak tasarımın parçası (client tarafında da öyle).
    if (error) {
      console.warn('pServer okuma:', key, lang, error.message);
      return null;
    }
    const deger = typeof data?.content === 'string' && data.content.trim()
      ? data.content
      : null;
    _cacheYaz(ck, deger);
    return deger;
  } catch (e) {
    console.warn('pServer:', key, lang, e instanceof Error ? e.message : String(e));
    return null;
  }
}

/* ─── 3. TEK GİRİŞ ─── */

/**
 * Canlı yönlendirmeyi getirir; yoksa fonksiyonun kendi varsayılanına düşer.
 *
 * Zincir (client p() ile aynı mantık, 16:71):
 *   1. `lang` için yazılmış override
 *   2. TR override — ext dillerde silinen anahtarların canlı sesi izlemesi
 *      için; client'taki "TR-fallback" inceliğinin aynısı
 *   3. `fallback` — çağıran fonksiyonun kendi metni (çevrimdışı emniyeti)
 *
 * Hiçbir aşamada throw etmez.
 */
export async function pServer(
  sb: SupabaseClient,
  key: string,
  lang: string,
  fallback: string,
): Promise<string> {
  const dil = lang === 'en' ? 'en' : 'tr';

  const kendi = await _oku(sb, key, dil);
  if (kendi) return kendi;

  if (dil !== 'tr') {
    const tr = await _oku(sb, key, 'tr');
    if (tr) return tr;
  }
  return fallback;
}

/** Test/bakım için: cache'i düşür (llm-chat'in invalidate_persona emsali). */
export function pServerCacheSifirla(): void {
  _cache.clear();
}
