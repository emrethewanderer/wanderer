/* ═══════════════════════════════════════════════════════
   10q4 — OLUŞ MÜHRÜ · Davet Töreni
   ───────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     "Wanderer böyle kart dağıtamaz — kullanıcı kartını belirler,
     Emre öneri olarak sunar." Kart bir envanter kalemi değil bir
     BEYAN'dır. Reçetenin tutması "kart senin" demek değildir; Wanderer'ın
     gördüğünü söylemesidir. Kimin olduğuna kullanıcı karar verir.
     Kanıt kimdeyse yük ondadır: burada kanıtı Wanderer sunduğu için
     kullanıcıdan istenen tek şey ONAY'dır — tek soru yeter. (Sınama,
     FAZ 3, bunun tersidir: iddia kullanıcınınsa kanıtı da o verir.)
     "Mesele Sensin."
   MEKANİK / MİMARİ / TEK GİRİŞ:
     olusDavetSun() → öneri rafının (10q kkOneriRafi) en güçlü kartını
     seçer → olusDavetAc(id) töreni açar. ÜÇ DURAK:
       1-A KAPALI KART — koleksiyonun sırtı (12c ikvCardBack); çeviren
           kullanıcıdır. Ambalaj/paket yok: bu mekânda kart ürün değildir.
       1-B LAPİS YÜZ  — kanıt + soru + iki mühür. Karta dokununca YAPRAK
           açılır: dört boyut + Emre'nin "neden sen" gerekçesi (tören
           terk edilmez, aynı portalda bir tabaka yükselir).
       2   MÜHÜR      — mühür kendiliğinden düşmez; kullanıcı basılı tutar,
           halka dolar, temas anında kart LAPİS'ten ALTIN'a erir (§1 anlam
           ekseni görünür olur) ve kkMuhurle çağrılır. Elini çekerse hiçbir
           şey yazılmaz — bırakmak vazgeçmek değil, ertelemektir.
     Mühür 10q'nun işidir; bu modül yalnız SORAR — `collection`'ın tek
     yazarı `kkMuhurle`'dir (K2). "Henüz değil" kartı silmez: eşikte
     bekler, red izi düşer, süreç devam eder.
   Kalıcılık: yok — eşik havuzu ve günlük sayaç 10q'nun S._kisiKarti'sinde
     (`kk.esik`, `kk.olusGun`) yaşar; bu modül onları okur/işaretler.
   Konvansiyon: i18n t(); window.olus* expose; stiller css/parts/olus.css
═══════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { SUMMARY_MODEL } from '../config.js';
import { escapeHTML, localISODate } from './00a-infrastructure.js';
import { getCardById, RARITIES } from './12b-kart-destesi.js';
import { ikvCardFace, ikvCardBack } from './12c-kart-gorsel.js';
import { callLLM } from './04-llm-hero-history.js';
import { p } from './16-i18n-prompts.js';
// Alıntı kapısı (13y) — sınamanın hükmü buna dayanır: model kanıtı YAZMAZ,
// numaralı blokta gösterir; metni uygulama kullanıcının cevabından keser.
import { kokenSozBlok, kokenAlintiCoz } from './13y-koken.js';
// Sınamanın altın kutbu ("şu an olduğun kişi") 10f'in sırasıyla okunur —
// Portre > Kimlik Motoru. Üçüncü bir kopya yazılmaz (K2).
import { yolGoldPole } from './10f-w2-yol.js';
// Yerleşim Eşik Ekranı'nın kendisidir: iki kutup kart + aradaki yol çubuğu
// aynı CSS'ten çizilir, kopyalanmaz (K3).
import { esikEnsureStyles } from './02d-esik-ekrani.js';
import {
  kkMuhurle, kkOneriRafi, kkEsikDurum, kkEsikAc, kkTyping, kkSaveDebounced, kkIsHedef,
  kkMatchCard, kkComputeSignals, kkEvrim, kkSentezDurum,
  kkEvolveCeremony, kkSynthCeremony, DIM_GLYPH,
} from './10q-w2-kisi-karti.js';
import { t } from './15-i18n.js';

/* ─── 1. SABİTLER ─── */
const OLUS_GUNLUK_DAVET = 1;   // "her davranışa demez" — gün başına tek davet
const OLUS_RED_BEKLEME_GUN = 10; // "henüz değil" dedikten sonra dinlenme
const OLUS_SKOR_SICRAMA = 8;   // bu kadar yükseldiyse bekleme kısalır (aynı soru değildir)
const RED_MS     = 1600;       // "henüz değil" sahnesi
const SEAL_SONRASI_MS = 900;   // mühür oturdu → çıkış/paylaşım belirir
const SIRT_OTO_MS = 3200;      // dokunulmazsa kart kendi çevrilir — akış tıkanmaz
const FLIP_MS     = 760;       // çevirme süresi (§5 flip dili, --ease-out)
const DIMS = ['dusunceler', 'inanclar', 'hisler', 'davranislar'];
/* Boyut adlarının BULUNMA HÂLİ — kanıt cümlesi "Bunu {a} ve {b} görüyorum"
   kalıbına giriyor. `kk.dim.*` yalın çoğuldur ("Düşünceler"); ek TR'de ünlü
   uyumuna göre değişir (-lerinde / -larında), bu yüzden ek koda değil sözlüğe
   yazılır — EN tarafında aynı anahtar yalın kelimeyi taşır. */
const DIM_LOC_FB = {
  dusunceler: 'düşüncelerinde', inanclar: 'inançlarında',
  hisler: 'hislerinde', davranislar: 'davranışlarında',
};

let _olusOpen = false;         // çift tören guard'ı
let _secimBusy = false;        // LLM beklerken ikinci seçim başlamasın

/* ─── 2. YARDIMCILAR ─── */
const _esc = (s) => escapeHTML(String(s == null ? '' : s));

/** reduced-motion: sahneyi bekletmenin anlamı yok, kısa yoldan bitir. */
function _reduced() {
  try { return !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches; }
  catch (_) { return false; }
}

/** Tören portalı — 10q'nun kkPortal deseninin ikizi (o modül-private). */
function _portal() {
  let el = document.getElementById('olus-portal');
  if (!el) { el = document.createElement('div'); el.id = 'olus-portal'; document.body.appendChild(el); }
  el.style.cssText = 'position:fixed;inset:0;z-index:var(--z-ceremony,9400);';
  return el;
}

/** Wanderer'ın kanıt cümlesi — kartın hangi tarafında göründüğü.
 *  FAZ 1: sayısal (m.dims'in en güçlü iki boyutu). FAZ 2 bunun yerine
 *  LLM'in yazdığı cümleyi koyacak; imza aynı kalır, çağıran değişmez. */
export function olusKanitCumlesi(card, m) {
  try {
    const dims = (m && m.dims) || {};
    const guclu = DIMS
      .filter(d => typeof dims[d] === 'number' && dims[d] > 0)
      .sort((a, b) => dims[b] - dims[a])
      .slice(0, 2)
      .map(d => t(`olus.dim_loc.${d}`, DIM_LOC_FB[d] || d));
    if (guclu.length >= 2) {
      return t('olus.kanit_iki', 'Bunu {a} ve {b} görüyorum.')
        .replace('{a}', guclu[0]).replace('{b}', guclu[1]);
    }
    if (guclu.length === 1) {
      return t('olus.kanit_tek', 'Bunu {a} görüyorum.').replace('{a}', guclu[0]);
    }
  } catch (_) {}
  return t('olus.kanit_genel', 'Son zamanlarda bu kişiye yaklaştığını görüyorum.');
}

/** LLM nesnesini {davet, kanit, boyutlar, emre} sözleşmesine indirger.
 *  Sayı sızan HER cümle düşürülür — ölçüm kullanıcıya asla görünmez (§ton).
 *  Tek cümleyi elemek yeterli: yaprak eksik alanı kartın kendi maddesiyle
 *  doldurur, uydurma yapmaz. Tek kart da kapı da aynı süzgeçten geçer. */
function _kanitNormalize(j) {
  const temiz = (v) => {
    const s = String(v == null ? '' : v).trim();
    return (!s || /\d/.test(s)) ? null : s;
  };
  const boyutlar = {};
  for (const d of DIMS) {
    const c = temiz(j && j.boyutlar && j.boyutlar[d]);
    if (c) boyutlar[d] = c;
  }
  return {
    davet: !!j && j.davet !== false,
    /* KOKEN-MUAF: buradaki "kanit" kullanıcı alıntısı değil, Emre'nin ağzından
       NE GÖRDÜĞÜNÜ söyleyen tek cümledir; dayanağı ölçülmüş davranış verisidir
       (kkMatchCard dört boyutu), model bir alıntı iddia etmez */
    kanit: temiz(j && j.kanit),
    boyutlar,
    emre: temiz(j && j.emre),
  };
}

const _kimlikBaglami = () => {
  try { return window.imGetContext?.() || '-'; } catch (_) { return '-'; }
};

/** Kart başına LLM'e verilen ölçüm bloğu — tek kartta da kapıda da aynı. */
function _kanitBlok(card, m) {
  const dims = (m && m.dims) || {};
  const say = (v) => (typeof v === 'number' && isFinite(v) ? Math.round(v) : '-');
  const nitelikler = DIMS
    .map(d => `${t(`kk.dim.${d}`)}: ${(Array.isArray(card[d]) ? card[d] : []).slice(0, 3).join(' · ') || '-'}`)
    .join('\n');
  return {
    kartAdi: card.name || '-',
    portre: card.portre || card.lesson || card.whisper || '-',
    nitelikler,
    skor: say(m && m.score),
    d: say(dims.dusunceler), i: say(dims.inanclar),
    h: say(dims.hisler), dv: say(dims.davranislar),
    hedef: kkIsHedef(card.id) ? 'evet' : 'hayır',
  };
}

/** Wanderer'ın KRİTİK değerlendirmesi — "her davranışa demez".
 *  Sayısal reçete kapının ön koşuludur; buradaki LLM turu dört şeye karar verir:
 *  bu benzerlik sorulmaya değer mi (`davet`), kullanıcıya ne gördüğümüzü
 *  söyleyen cümle ne (`kanit`), dört boyutta ne görüldüğü (`boyutlar`) ve neden
 *  bu kişi olduğu (`emre`). Son ikisi karta dokununca açılan yaprağı besler —
 *  AYRI ÇAĞRI YOK, kota tek turda kalır (yaprak açılmazsa da maliyeti aynıdır,
 *  açıldığında beklemesi olmaz). Persona metni HARDCODE EDİLMEZ — p() (16b/16e).
 *  Döner: {davet, kanit, boyutlar, emre} | null (null → sayısal cümleye düşer). */
export async function olusKanit(card, m) {
  if (!card || !S.currentUser?.id) return null;
  try {
    const raw = await callLLM({
      contents: [{ role: 'user', parts: [{ text: p('prompt.olus.davet_user', {
        ..._kanitBlok(card, m),
        kimlik: _kimlikBaglami(),
      }) }] }],
      systemPrompt: p('prompt.olus.davet_system'),
      maxTokens: 800, temperature: 0.4, jsonMode: true,
      model: SUMMARY_MODEL, skipPersona: true,
    });
    const j = JSON.parse(String(raw || '').replace(/```json|```/g, '').trim());
    if (!j || typeof j !== 'object') return null;
    return _kanitNormalize(j);
  } catch (e) {
    // 429/offline dahil — sessiz: davet yine açılır, kanıt sayısal cümleye düşer
    console.warn('olusKanit:', e && e.message);
    return null;
  }
}

/** Kapının kanıt turu — üç aday, TEK LLM çağrısı. Ayrı ayrı sormak kotayı
 *  üçe katlardı; dahası Wanderer'ın üç kartı YAN YANA tartması, tek tek
 *  bakmasından daha iyi bir eleme verir ("bu üçünden hangileri gerçekten
 *  sorulmaya değer"). Döner: adaylarla AYNI SIRADA dizi — her eleman
 *  {davet, kanit, boyutlar, emre} | null (null → sayısal cümleye düşer). */
export async function olusKapiKanit(kartlar) {
  if (!Array.isArray(kartlar) || !kartlar.length || !S.currentUser?.id) return null;
  try {
    const bloklar = kartlar.map((k, i) => {
      const b = _kanitBlok(k.card, k.m);
      return `### KART ${i + 1}\nKİŞİ: ${b.kartAdi}\nBU KİŞİ KİM: ${b.portre}\n`
        + `NİTELİKLERİ:\n${b.nitelikler}\n`
        + `ÖLÇÜM (yalnız senin bilgin): yakınlık ${b.skor}/100 · düşünceler ${b.d} · `
        + `inançlar ${b.i} · hisler ${b.h} · davranışlar ${b.dv}\nHEDEFİNDE Mİ: ${b.hedef}`;
    }).join('\n\n');

    const raw = await callLLM({
      contents: [{ role: 'user', parts: [{ text: p('prompt.olus.kapi_user', {
        kartlar: bloklar,
        adet: String(kartlar.length),
        kimlik: _kimlikBaglami(),
      }) }] }],
      systemPrompt: p('prompt.olus.kapi_system'),
      // Üç kartın her biri kanıt + dört boyut + gerekçe yazıyor: tek kartın
      // bütçesi (800) üçe katlanır, üstüne JSON iskeleti için pay bırakılır —
      // bütçe daralırsa yanıt SON kartın ortasında kesilir ve parse çöker.
      maxTokens: 2600, temperature: 0.4, jsonMode: true,
      model: SUMMARY_MODEL, skipPersona: true,
    });

    const j = JSON.parse(String(raw || '').replace(/```json|```/g, '').trim());
    // Biçim toleransı: model kökü Türkçeleştirebilir ya da diziyi doğrudan
    // döndürebilir — üç kabul edilen şekli de tanı (llm-bicimleri-geri-sizar).
    const dizi = Array.isArray(j) ? j
      : (Array.isArray(j?.kartlar) ? j.kartlar : (Array.isArray(j?.cards) ? j.cards : null));
    if (!dizi) return null;

    return kartlar.map((_, i) => {
      // `no` 1-tabanlıdır ama modelin sırayı koruduğuna güvenilmez; eşleşme
      // önce no ile, bulunamazsa indeksle kurulur.
      const bul = dizi.find(x => Number(x?.no) === i + 1) || dizi[i];
      return bul ? _kanitNormalize(bul) : null;
    });
  } catch (e) {
    console.warn('olusKapiKanit:', e && e.message);
    return null;
  }
}

/* ─── 3. GÜNLÜK RİTİM — "her davranışa demez" ───
   Gün anahtarı DAİMA localISODate(): toISOString() UTC'dir, TR'de gün kaydırır. */
function _gunState() {
  const kk = S._kisiKarti;
  if (!kk) return null;
  const bugun = localISODate();
  const g = kk.olusGun || (kk.olusGun = { gun: '', davet: 0 });
  if (g.gun !== bugun) { g.gun = bugun; g.davet = 0; }
  return g;
}

/** Bugün davet hakkı kaldı mı. */
export function olusGunHakki() {
  const g = _gunState();
  return g ? Math.max(0, OLUS_GUNLUK_DAVET - (g.davet | 0)) : 0;
}

function _gunSay() {
  const g = _gunState();
  if (g) g.davet = (g.davet | 0) + 1;
}

/* ─── 4. DAVET TÖRENİ ─── */
/** Mühürden sonra kartın hak ettiği ÖZEL tören — yalnız evrim ve sentez.
 *  kkMaybePresent'in `ozelToren` mantığının halefi (K0 sökümünde buraya taşındı).
 *
 *  DÜZ KAZANIMDA PAKET AÇILMAZ (plan K5'ten bilinçli sapma): 80'ler folyo
 *  paketi bir HEDİYE jestidir — "al, bu senin". Oluş Mührü'nün tezi tam
 *  tersidir: kart verilmez, beyan edilir. Kullanıcı kartı perde 1'de zaten
 *  gördü ve "artık o kişiyim" dedi; ardından paketten çıkması anlamı tersine
 *  çevirirdi (üstelik paketin "KOLEKSİYONA EKLE" düğmesi hiçbir şey eklemez,
 *  yalnız kapatır — mühür çoktan düşmüştür). Paylaşım ve çıkış bu yüzden
 *  mühür perdesine taşındı.
 *  Evrim ve sentez KALIR: onlar dağıtım değil DÖNÜŞÜM jestleridir (tohumun
 *  kök salması / iki kartın birleşmesi) ve kendi anlamlarını taşırlar.
 *  kkOpenPack yetim kalmaz: kkEvolveCeremony/kkSynthCeremony kendi
 *  fallback'lerinde onu çağırmayı sürdürür (10q:973, :1051). */
function _sonrakiToren(cardId) {
  const kk = S._kisiKarti;
  if (!kk) return;
  try {
    const ev = kkEvrim(cardId);
    if (ev && ev.onceki && kk.collection[ev.onceki]) { kkEvolveCeremony(cardId); return; }
    const sz = kkSentezDurum(getCardById(cardId), kk.collection);
    if (sz && sz.hazir) { kkSynthCeremony(cardId); return; }
  } catch (_) {}
}

/** PERDE 2 — MÜHÜR BASIMI (Emre, 2026-07-28: "Gerçekten mühür basılsın…
 *  hem kartın hem de mühür basımı ile oluşan biri!").
 *
 *  Mühür artık KENDİLİĞİNDEN DÜŞMEZ. Perde açıldığında kart hâlâ LAPİS'tir
 *  (henüz senin değil) ve mühür havada durur; kullanıcı onu basılı tutar,
 *  halka dolar, mühür alçalır ve TEMAS anında kart altına döner, iz kartın
 *  üstünde kalır. `kkMuhurle` tam o temasta çağrılır — elini çekerse hiçbir
 *  şey yazılmaz.
 *
 *  Neden jest: ilk tur "kartı kim seçer" sorusunu kullanıcı lehine kapatmıştı;
 *  bu perde aynı cevabı BEDENE taşır. Beyan bir düğmeye tıklamak değil, bir
 *  şeyi mühürlemektir — kararın ağırlığı elde hissedilir. Bırakmak vazgeçmek
 *  değil ERTELEMEKTİR: kart eşikte kalır, hiçbir kayıt düşmez. */
const PRESS_MS = 950;          // mührün oturması için gereken temas süresi
function _perde2(portal, card, yol, soz) {
  const kicker = t('olus.muhur_kicker', 'OLUŞ MÜHRÜ');
  // Sınama yolunda Emre'nin kendi sözü varsa o konuşur; yoksa mührün sabit
  // cümlesi. Davet yolunda soru zaten sorulmuştu, sabit cümle yeter.
  const line   = (soz && String(soz).trim()) || t('olus.muhur_line', 'Mühür senin.');
  let portre = '';
  try { portre = window.porCardName?.() || ''; } catch (_) {}
  // Ek uyumu: {portre} özel ad taşır ("Olunan Emre") — iyelik eki kestirilemez,
  // cümle bilerek eksiz kuruldu (sözlükteki not ile aynı gerekçe).
  const sub = portre
    ? t('olus.muhur_sub', '{kart} bundan böyle sende — {portre} yeniden yazılıyor.')
        .replace('{kart}', card.name || '').replace('{portre}', portre)
    : t('olus.muhur_sub_yalin', '{kart} bundan böyle sende.').replace('{kart}', card.name || '');

  // Kart mühürden ÖNCE lapis (gelecek/hedef), SONRA altın (şimdi/olduğun).
  // İki yüz de üst üste kurulur: mühür anında biri diğerine ERİR — anlam
  // ekseninin kendisi görünür olur (§1 üç kutuplu renk dili).
  let lapisYuz = '', altinYuz = '';
  try { lapisYuz = ikvCardFace(card, { palette: 'lapis' }); } catch (_) {}
  try { altinYuz = ikvCardFace(card, { palette: 'gold' }); } catch (_) {}

  const reduced = _reduced();
  const ipucu = reduced
    ? t('olus.press.hint_tap', 'Mühre dokun.')
    : t('olus.press.hint', 'Mührü basılı tut.');

  portal.innerHTML = `
    <div class="olus-veil olus-veil--gold" aria-hidden="true"></div>
    <div class="olus-stage olus-stage--press" role="dialog" aria-live="polite"
         aria-label="${_esc(t('olus.aria_muhur', 'Oluş mührü'))}">
      <div class="olus-kicker olus-kicker--seal olus-kicker--now">${_esc(kicker)}</div>
      <div class="olus-card olus-card--seal" id="olus-seal-card">
        <div class="olus-face olus-face--lapis">${lapisYuz}</div>
        <div class="olus-face olus-face--gold" aria-hidden="true">${altinYuz}</div>
      </div>
      <button type="button" class="olus-press" id="olus-press"
              aria-label="${_esc(ipucu)}">
        <span class="olus-press-ring" aria-hidden="true"></span>
        <span class="olus-press-face" aria-hidden="true">${_esc(card.catGlyph || '◆')}</span>
      </button>
      <div class="olus-press-hint" id="olus-press-hint">${_esc(ipucu)}</div>
      <div class="olus-muhur-line" id="olus-muhur-line" hidden>${_esc(line)}</div>
      <div class="olus-muhur-sub" id="olus-muhur-sub" hidden>${_esc(sub)}</div>
      <div class="olus-actions olus-actions--seal" id="olus-seal-actions" hidden>
        <button type="button" class="olus-btn olus-btn--evet" id="olus-devam">
          ${_esc(t('olus.devam', 'Devam'))}
        </button>
        <button type="button" class="olus-btn olus-btn--hayir" id="olus-paylas">
          ${_esc(t('olus.paylas', 'Paylaş ↗'))}
        </button>
      </div>
    </div>
    <div class="olus-flash" aria-hidden="true"></div>`;

  const press   = portal.querySelector('#olus-press');
  const hint    = portal.querySelector('#olus-press-hint');
  const actions = portal.querySelector('#olus-seal-actions');
  const stage   = portal.querySelector('.olus-stage');
  let ok = false;
  let basildi = false, raf = 0, t0 = 0;

  const bitir = () => {
    cancelAnimationFrame(raf);
    // Sahne ölürken belge seviyesindeki dinleyici de gitmeli (aşağıda kurulur;
    // çağrı anında tanımlıdır).
    try { document.removeEventListener('visibilitychange', gorunurluk); } catch (_) {}
    // Tanıma Motoru (FAZ 1) — mühür yolunun GERÇEK sonucu ancak burada
    // bilinir (`ok` = kkMuhurle'nin dönüşü, 13l imOnCardEarned'e giden tek
    // kapı). Segment ÇOKTAN kapandı (sahne perdeyi açarken kapattı) — sonucu
    // segmentten ayrı yazıyoruz ki törenin süre ölçümü eski tanımında kalsın.
    try { window.wtTorenSonuc?.(yol === 'sinama' ? 'olus-sinama' : 'olus-davet', ok ? 'muhur' : 'kapat'); } catch (_) {}
    portal.style.cssText = ''; portal.innerHTML = '';
    _olusOpen = false;
    // Yalnız ÖZEL tören (evrim/sentez) — düz kazanımda paket açılmaz.
    if (ok) setTimeout(() => _sonrakiToren(card.id), 260);
  };

  /** TEMAS — mühür kâğıda değdi. Kazanımın yazıldığı tek an. */
  const muhurle = () => {
    if (basildi) return;
    basildi = true;
    cancelAnimationFrame(raf);
    press?.classList.remove('is-pressing');
    press?.classList.add('is-sealed');
    press?.setAttribute('disabled', '');
    // lapis → altın: CSS crossfade (is-sealed). innerHTML takası ani bir
    // sıçramaydı; geçişin kendisi anlamı taşır, o yüzden görünür olmalı.
    stage?.classList.add('is-sealed');
    if (hint) hint.hidden = true;
    portal.querySelector('.olus-flash')?.classList.add('is-on');
    try { window.fxCue?.('seal'); } catch (_) {}      // His Motoru — mühür vuruşu
    try { navigator.vibrate?.([14, 40, 90]); } catch (_) {}

    // MÜHÜR — collection'ın tek yazarı (K2). Tören yalnız sorar, o yazar.
    try { ok = kkMuhurle(card.id, { yol: yol || 'davet' }); } catch (_) {}

    const lineEl = portal.querySelector('#olus-muhur-line');
    const subEl  = portal.querySelector('#olus-muhur-sub');
    if (lineEl) lineEl.hidden = false;
    if (subEl) subEl.hidden = false;
    // Sahne kendiliğinden kapanmaz: mühür bir kazanç bildirimi değil,
    // kullanıcının kendi kararının anıdır — ne zaman biteceğine de o karar verir.
    setTimeout(() => {
      if (!actions) return;
      actions.hidden = false;
      try { portal.querySelector('#olus-devam')?.focus(); } catch (_) {}
    }, reduced ? 0 : SEAL_SONRASI_MS);
  };

  /* Basılı tutma — pointer + klavye. reduced-motion'da süre beklenmez:
     hareketi kısıtlayan kullanıcıdan bir jesti "tutması" istenmez, dokunuş
     yeter (a11y kısa yolu, 10q:1817 deseninin kardeşi). */
  const bas = (ev) => {
    if (basildi) return;
    try { ev?.preventDefault?.(); } catch (_) {}
    if (reduced) { muhurle(); return; }
    press?.classList.add('is-pressing');
    t0 = Date.now();
    const tik = () => {
      const p = Math.min(1, (Date.now() - t0) / PRESS_MS);
      try { press?.style.setProperty('--p', String(p)); } catch (_) {}
      if (p >= 1) { muhurle(); return; }
      raf = requestAnimationFrame(tik);
    };
    raf = requestAnimationFrame(tik);
  };
  const birak = () => {
    if (basildi || !t0) return;
    t0 = 0;
    cancelAnimationFrame(raf);
    press?.classList.remove('is-pressing');
    try { press?.style.setProperty('--p', '0'); } catch (_) {}
    // Yargısız: elini çekmek bir hata değil, bir erteleme.
    if (hint) hint.textContent = t('olus.press.birakti', 'Elini çektin. Acele yok.');
  };

  press?.addEventListener('pointerdown', bas);
  press?.addEventListener('pointerup', birak);
  press?.addEventListener('pointercancel', birak);
  press?.addEventListener('pointerleave', birak);
  press?.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) bas(e);
  });
  press?.addEventListener('keyup', (e) => {
    if (e.key === 'Enter' || e.key === ' ') birak();
  });
  // Sekme arkaya giderse parmak "basılı" sayılmaya devam ederdi: yarım kalan
  // temas asla kkMuhurle çağırmamalı.
  function gorunurluk() { if (document.visibilityState !== 'visible') birak(); }
  document.addEventListener('visibilitychange', gorunurluk);

  setTimeout(() => { try { press?.focus(); } catch (_) {} }, 120);

  // Dinleyici sahneye bağlanır, portala değil (gerekçe: _sahneKart).
  portal.querySelector('#olus-devam')?.addEventListener('click', bitir);
  portal.querySelector('#olus-paylas')?.addEventListener('click', () => {
    // 13g story kartı — portal açık kalır (kullanıcı sonra Devam'a basar)
    try {
      window.shrShareStory?.({
        kicker: t('olus.muhur_kicker', 'OLUŞ MÜHRÜ'),
        glyph: card.catGlyph || '◆',       // 12b deste kurulumunda yazılır
        title: card.name || '', sub: t('olus.share_sub', 'Artık o kişiyim.'),
        line: card.lesson || card.whisper || '',
        accent: 'var(--gold, #F5A623)', tier: 3,
        tur: 'kart',
      });
    } catch (_) {}
  });
  // Escape: mühür basılmadıysa da sahne kapanır — kart eşikte kalır, hiçbir
  // kayıt düşmez (ne mühür ne red; kullanıcı kararını henüz vermedi).
  stage?.addEventListener('keydown', (e) => { if (e.key === 'Escape') bitir(); });
}

/** "Henüz değil" — kart silinmez, eşikte bekler; red izi düşer. */
function _perdeRed(portal, card) {
  // Red izi kalıcı olmalı: FAZ 2'nin bekleme penceresi bunu okur, ayrıca
  // kaydedilmezse sayfa yenilenince "hayır" unutulur ve aynı kart yeniden sorulur.
  try {
    const e = kkEsikDurum(card.id);
    if (e) {
      if (!Array.isArray(e.red)) e.red = [];
      e.red.push(new Date().toISOString());
      kkSaveDebounced();
    }
  } catch (_) {}
  portal.innerHTML = `
    <div class="olus-veil" aria-hidden="true"></div>
    <div class="olus-stage olus-stage--red" role="dialog" aria-live="polite">
      <div class="olus-red-line">${_esc(t('olus.red_line', 'Peki. Acele yok — ben bakmaya devam ediyorum.'))}</div>
    </div>`;
  setTimeout(() => {
    portal.style.cssText = ''; portal.innerHTML = '';
    _olusOpen = false;
  }, _reduced() ? 500 : RED_MS);
}

/* ─── 4a. YAPRAK — karta dokunuş ───
   Emre (2026-07-28): "o törenden ayrılmadan o kartın 4 özelliği yazsın ve
   Emre altta ayrıca neden o kişi olduğunu düşündüğünü açıklasın."

   TÖREN TERK EDİLMEZ: yaprak yeni bir overlay değil, aynı portalda sahnenin
   ÜSTÜNE yükselen bir tabakadır. Kart yukarıda görünür kalır, soru arkada
   bekler — kullanıcı "detaya gitmez", kartın içine bakar ve geri döner.
   İçerik iki kaynaktan gelir: dört boyut kartın KENDİ maddelerinden (her
   zaman vardır), Wanderer'ın o boyutta gördüğü ve "neden sen" gerekçesi
   davet turunun LLM cevabından (yoksa sözlük fallback'i — yaprak asla boş
   açılmaz). */
function _yaprakAc(portal, card, m, detay) {
  if (!portal || portal.querySelector('.olus-yaprak')) return;   // çift açılma
  const dd = detay || {};
  const boyutHTML = DIMS.map(d => {
    const maddeler = (Array.isArray(card[d]) ? card[d] : []).slice(0, 2);
    const gordum = String((dd.boyutlar && dd.boyutlar[d]) || '').trim();
    return `<div class="olus-y-dim">
      <div class="olus-y-dim-h">${_esc(DIM_GLYPH[d] || '·')} ${_esc(t(`kk.dim.${d}`))}</div>
      ${maddeler.length ? `<ul>${maddeler.map(x => `<li>${_esc(x)}</li>`).join('')}</ul>` : ''}
      ${gordum ? `<div class="olus-y-gordum">${_esc(gordum)}</div>` : ''}
    </div>`;
  }).join('');

  // Emre'nin gerekçesi — LLM sustuysa sözlükten. Fallback bilerek GENELDİR:
  // kişiselleştirilmiş bir gerekçe uydurmaktansa niyeti dürüstçe söylemek.
  const emre = String(dd.emre || '').trim() ||
    t('olus.yaprak.emre_fb', 'Bu kişiyi sende gördüğüm için buradayım. Kartı sana ben veremem — ama gördüğümü söyleyebilirim.');

  const yaprak = document.createElement('div');
  yaprak.className = 'olus-yaprak';
  yaprak.setAttribute('role', 'dialog');
  yaprak.setAttribute('aria-label', t('olus.yaprak.aria', 'Kartın içi'));
  yaprak.innerHTML = `
    <div class="olus-y-veil"></div>
    <div class="olus-y-sheet" id="olus-y-sheet" tabindex="-1"><div class="wn-grain">
      <button type="button" class="olus-y-close" id="olus-y-close"
              aria-label="${_esc(t('olus.yaprak.kapat', 'Kapat'))}">✕</button>
      <div class="olus-y-kicker">${_esc(t('olus.yaprak.kicker', 'EŞİKTEKİ KİŞİ'))}</div>
      <div class="olus-y-name">${_esc(card.name || '')}</div>
      ${card.portre ? `<div class="olus-y-portre">${_esc(card.portre)}</div>` : ''}
      <div class="olus-y-dims">${boyutHTML}</div>
      <div class="olus-y-emre">
        <div class="olus-y-emre-h">${_esc(t('olus.yaprak.neden_h', 'NEDEN SEN'))}</div>
        <div class="olus-y-emre-b">${_esc(emre)}</div>
      </div>
      <button type="button" class="olus-btn olus-btn--hayir olus-y-geri" id="olus-y-geri">
        ${_esc(t('olus.yaprak.geri', 'Karta dön'))}
      </button>
    </div></div>`;
  portal.appendChild(yaprak);
  requestAnimationFrame(() => yaprak.classList.add('is-open'));

  const kapatYaprak = () => {
    yaprak.classList.remove('is-open');
    setTimeout(() => yaprak.remove(), _reduced() ? 0 : 260);
    // Odak soruya döner: kullanıcı kartın içine baktı, şimdi karar sırası.
    try { portal.querySelector('#olus-evet')?.focus(); } catch (_) {}
  };
  yaprak.querySelector('#olus-y-close')?.addEventListener('click', kapatYaprak);
  yaprak.querySelector('#olus-y-geri')?.addEventListener('click', kapatYaprak);
  yaprak.querySelector('.olus-y-veil')?.addEventListener('click', kapatYaprak);
  // Escape burada YAPRAĞI kapatır, töreni değil — sahne dinleyicisi ayrı
  // düğümde olduğu için "henüz değil" dalına düşmez.
  yaprak.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); kapatYaprak(); }
  });
  // Odak yaprağın GÖVDESİNE gider, en alttaki düğmeye değil: düğmeye odaklamak
  // tarayıcıyı onu görünür kılmaya zorlar ve yaprak ortasından açılır — kullanıcı
  // kartın adını hiç görmez. preventScroll ikinci kemer.
  setTimeout(() => {
    try { yaprak.querySelector('#olus-y-sheet')?.focus({ preventScroll: true }); } catch (_) {}
  }, 60);
}

/** PERDE 1-A — KAPALI KART (Emre, 2026-07-28: "selef ekrana gelirken paket
 *  açılımı olarak gelsin" + "90'lar tarzını kaldıralım").
 *
 *  Açılış jesti KORUNUR, ambalaj değişir. İlk deneme 10q'nun folyo paketini
 *  (`.kk-pack*`: metalik varak, barkod, "WANDERER" bandı) ödünç alıyordu —
 *  o dil 80'ler ticari kart paketinindir ve Tasarım Prensipleri §0 ile
 *  çelişir ("parlak, düz, SaaS/ürün hissi veren hiçbir şey"). Bu mekânda
 *  kartın kapalı hâli zaten VARDIR: koleksiyonun ortak SIRTI (§6 — kafes
 *  dokusu, çift halka, fener mührü, EMRE THE WANDERER), ve açılışın kendi
 *  dili de yazılıdır (§5 flip dili).
 *
 *  Böylece jest anlamına kavuşur: Wanderer sana kapalı bir kart uzatır,
 *  ÇEVİREN sensin. Kimse paket yırtıp içinden ürün çıkarmaz — bir yüz
 *  görünür. Yeni motor yok: sırt 12c'nin `ikvCardBack`'i, ses 13e'nin
 *  `flip`/`cardBirth` cue'ları. */
function _sahneSirt(portal, card, sonra) {
  let sirt = '', lapisYuz = '';
  try { sirt = ikvCardBack(); } catch (_) {}
  try { lapisYuz = ikvCardFace(card, { palette: 'lapis', star: true }); } catch (_) {}

  portal.innerHTML = `
    <div class="olus-veil" aria-hidden="true"></div>
    <div class="olus-stars" aria-hidden="true"></div>
    <div class="olus-stage olus-stage--sirt" role="dialog" aria-modal="true"
         aria-label="${_esc(t('olus.aria_davet', 'Oluş mührü daveti'))}">
      <div class="olus-kicker">${_esc(t('olus.sirt.kicker', 'SANA BİRİNİ GÖSTERECEĞİM'))}</div>
      <button type="button" class="olus-flip" id="olus-flip"
              aria-label="${_esc(t('olus.sirt.aria', 'Kartı çevir'))}">
        <span class="olus-flip-in">
          <span class="olus-flip-face olus-flip-face--back">${sirt}</span>
          <span class="olus-flip-face olus-flip-face--front">${lapisYuz}</span>
        </span>
      </button>
      <div class="olus-sirt-hint">${_esc(t('olus.sirt.hint', 'Kartı çevir.'))}</div>
    </div>`;

  const flip = portal.querySelector('#olus-flip');
  const hint = portal.querySelector('.olus-sirt-hint');
  let cevrildi = false;
  const cevir = () => {
    if (cevrildi) return;
    cevrildi = true;
    clearTimeout(oto);
    try { window.fxCue?.('flip'); } catch (_) {}      // His Motoru — çevirme
    flip?.classList.add('is-flipped');
    if (hint) hint.style.visibility = 'hidden';
    // Yüz göründüğü an kartın doğuşu: ses buraya düşer, çevirmeye değil.
    setTimeout(() => { try { window.fxCue?.('cardBirth'); } catch (_) {} }, _reduced() ? 0 : 420);
    setTimeout(sonra, _reduced() ? 0 : FLIP_MS);
  };
  // Dokunulmazsa kendi çevrilir: jest bir davettir, kilit değil.
  const oto = setTimeout(cevir, SIRT_OTO_MS);

  flip?.addEventListener('click', cevir);
  setTimeout(() => { try { flip?.focus(); } catch (_) {} }, 60);
}

/** Wanderer baktı ve "henüz değil" dedi — kart havuzda kalır, yalnız
 *  bakıldığının izi düşer (davet sayısı ARTMAZ: sorulmadı, elendi). */
function _elendi(cardId) {
  try {
    const e = kkEsikDurum(cardId);
    if (e) { e.sonDavet = new Date().toISOString(); kkSaveDebounced(); }
  } catch (_) {}
}

/** Davet izi — kaçıncı kez soruldu, ne zaman. Kapı akışında YALNIZ seçilen
 *  karta düşer: açılmayan kapı sorulmuş sayılmaz. */
function _davetIzi(cardId) {
  try {
    const e = kkEsikDurum(cardId);
    if (e) {
      e.davet = (e.davet | 0) + 1;
      e.sonDavet = new Date().toISOString();
      kkSaveDebounced();
    }
  } catch (_) {}
}

/* ─── 4-B. ÜÇ KAPI — "sistem daraltır, seçen sensin" ───
   Oluş Mührü kartın sahibine kullanıcıyı koydu ama SEÇİMİ hâlâ Wanderer
   yapıyordu: rafın en güçlü kartı uzatılır, kullanıcı yalnız onaylardı.
   Kapı o kararın eksik yarısıdır — Wanderer üç adayı daraltır, hangisinin
   bugün konuşulacağına kullanıcı karar verir.
   Kapılar KAPALI durur (kapalı kart draması korunur): sırtta yalnız kartın
   ailesi (kategori glifi) ve nadirlik ışığı görünür — kimin beklediğini
   çevirince öğrenirsin. Açılmayan kapıya iz DÜŞMEZ: sorulmadı, reddedilmedi,
   yarın yine gelebilir. */
function _sahneKapilar(portal, adaylar) {
  const n = adaylar.length;
  const kicker = n >= 3
    ? t('olus.kapi.kicker_3', 'BUGÜN ÜÇ KAPI VAR.')
    : t('olus.kapi.kicker_2', 'BUGÜN İKİ KAPI VAR.');

  const kapiHTML = adaylar.map((a, i) => {
    let sirt = '', yuz = '';
    try { sirt = ikvCardBack(); } catch (_) {}
    try { yuz = ikvCardFace(a.card, { palette: 'lapis', star: true }); } catch (_) {}
    // Işığın rengi 12b'nin nadirlik tablosundan gelir — CSS'e ikinci bir
    // renk gerçeği yazılmaz (kart künyesi de aynı tabloyu okur).
    const rar = a.card.rarity || 'yaygin';
    const renk = (RARITIES[rar] || RARITIES.yaygin).color;
    return `<button type="button" class="olus-kapi" data-i="${i}"
              data-rarity="${_esc(rar)}" style="--i:${i};--rar:${_esc(renk)};"
              aria-label="${_esc(t('olus.kapi.aria', 'Kapıyı aç'))}">
        <span class="olus-kapi-flip">
          <span class="olus-kapi-face olus-kapi-face--back">${sirt}</span>
          <span class="olus-kapi-face olus-kapi-face--front">${yuz}</span>
        </span>
        <span class="olus-kapi-glif" aria-hidden="true">${_esc(a.card.catGlyph || '◆')}</span>
      </button>`;
  }).join('');

  portal.innerHTML = `
    <div class="olus-veil" aria-hidden="true"></div>
    <div class="olus-stars" aria-hidden="true"></div>
    <div class="olus-stage olus-stage--kapi" role="dialog" aria-modal="true"
         aria-label="${_esc(t('olus.kapi.aria_sahne', 'Oluş mührü kapıları'))}">
      <div class="olus-kicker">${_esc(kicker)}</div>
      <div class="olus-kapilar" id="olus-kapilar">${kapiHTML}</div>
      <div class="olus-kapi-hint">${_esc(t('olus.kapi.hint', 'Birini sen aç.'))}</div>
    </div>`;

  try { window.fxCue?.('breath'); } catch (_) {}   // eşiğin nefesi; 'seal' mühre saklı

  const kutu = portal.querySelector('#olus-kapilar');
  const hint = portal.querySelector('.olus-kapi-hint');
  let secildi = false;

  const ac = (i) => {
    if (secildi) return;
    const a = adaylar[i];
    if (!a) return;
    secildi = true;
    _davetIzi(a.card.id);                            // iz YALNIZ açılana düşer
    try { window.fxCue?.('flip'); } catch (_) {}
    kutu?.classList.add('is-secildi');
    kutu?.querySelector(`.olus-kapi[data-i="${i}"]`)?.classList.add('is-secili', 'is-flipped');
    if (hint) hint.style.visibility = 'hidden';
    setTimeout(() => { try { window.fxCue?.('cardBirth'); } catch (_) {} }, _reduced() ? 0 : 420);
    // LLM cümlesi yoksa sayısal kanıta düşülür — olusDavetAc'ın kapısıyla
    // aynı sözleşme: kart asla kanıtsız sorulmaz.
    const kanit = a.kanit || olusKanitCumlesi(a.card, a.m);
    setTimeout(() => _sahneKart(portal, a.card, kanit, a.m, a.detay, true), _reduced() ? 0 : FLIP_MS);
  };

  kutu?.addEventListener('click', (e) => {
    const el = e.target.closest?.('.olus-kapi');
    if (el) ac(Number(el.dataset.i));
  });

  /* Escape kapıları kapatır ve hiçbir ize dokunmaz — hiçbiri açılmadıysa
     hiçbiri sorulmamıştır; bu bir RET değil, "bugün değil"dir. Guard'ı
     burada düşürmek zorunlu: _olusOpen yalnız kapanış akışında düşer,
     portalı boşaltmak onu temizlemez ve sonraki törenleri kilitler. */
  const kapat = () => {
    // Tanıma Motoru (FAZ 1) — hiçbir kapı açılmadı: mühür yolu hiç başlamadı, 'kapat'.
    try { window.wtOverlayClose?.('olus-davet', 'kapat'); } catch (_) {}
    portal.style.cssText = ''; portal.innerHTML = '';
    _olusOpen = false;
  };
  // Dinleyici SAHNEYE bağlanır, portala değil: portal törenler arası yaşayan
  // tek düğümdür, ona bağlanan Escape kart seçildikten sonra da canlı kalırdı.
  const stage = portal.querySelector('.olus-stage');
  stage?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !secildi) kapat();
  });

  // Kapı OTO-AÇILMAZ: tek kartın kendi çevrilmesi bir davetin nezaketiydi,
  // burada seçim kullanıcınındır — zaman onun yerine seçemez.
  setTimeout(() => { try { kutu?.querySelector('.olus-kapi')?.focus(); } catch (_) {} }, 60);
}

/** Kapı töreni — çoğul giriş. `adaylar`: [{card, kanit, m, detay}].
 *  Tek aday kaldıysa çağıran zaten olusDavetAc'a düşer (tek kart draması
 *  kapı sahnesinden daha güçlüdür: seçim yoksa kapı da yoktur). */
export function olusKapilarAc(adaylar) {
  if (!Array.isArray(adaylar) || adaylar.length < 2 || _olusOpen) return false;
  const temiz = adaylar.filter(a => a && a.card && !S._kisiKarti?.collection?.[a.card.id]);
  if (temiz.length < 2) return false;
  _olusOpen = true;
  const portal = _portal();
  try { window.wtOverlayOpen?.('olus-davet'); } catch (_) {}   // Gözlemevi (00f)
  _sahneKapilar(portal, temiz);
  return true;
}

/** PERDE 1 — soru. Kart LAPİS palette görünür: henüz senin değil, eşikte.
 *  opts.kanit verilirse o kullanılır (FAZ 2'de LLM cümlesi); yoksa sayısal. */
export function olusDavetAc(cardId, opts) {
  opts = opts || {};
  const card = getCardById(cardId);
  if (!card || _olusOpen) return false;
  // Mühürlenen bir daha sorulmaz. Normal akışta seçici zaten eşik havuzundan
  // seçer (mühürlenen kart oradan düşer), ama olusDavetAc window'a açıktır —
  // dışarıdan gelen çağrı kullanıcıya ikinci bir "Mühür senin" perdesi
  // göstermesin (kkMuhurle idempotent olduğu için kayıt bozulmazdı, tören
  // yalancı çıkardı).
  if (S._kisiKarti?.collection?.[cardId]) return false;
  _olusOpen = true;

  let m = opts.m || null;
  if (!m) { try { m = kkMatchCard(card, kkComputeSignals()); } catch (_) {} }
  const kanit = opts.kanit || olusKanitCumlesi(card, m);

  _davetIzi(cardId);
  const portal = _portal();
  try { window.wtOverlayOpen?.('olus-davet'); } catch (_) {}   // Gözlemevi (00f)

  // Çevirme bir JESTTİR: hareket yasaklıysa (reduced-motion) bekletmenin
  // anlamı yok, kart doğrudan yüzüyle gelir.
  if (_reduced()) _sahneKart(portal, card, kanit, m, opts.detay);
  else _sahneSirt(portal, card, () => _sahneKart(portal, card, kanit, m, opts.detay, true));
  return true;
}

/** PERDE 1-B — kart + kanıt + soru + iki mühür. Kart çevrildikten sonra
 *  (ya da reduced-motion'da doğrudan) aynı portalda açılır.
 *  `yerinde`: kart az önce çevrilerek zaten göründü — yeniden "süzülerek
 *  girmesi" aynı nesnenin iki kez doğması olurdu; yalnız çevresi belirir. */
function _sahneKart(portal, card, kanit, m, detay, yerinde) {
  const soru = t('olus.soru', '{kart} gibi görünüyorsun. Artık o kişi gibi hissediyor musun?')
    .replace('{kart}', card.name || '');

  let lapisYuz = '';
  try { lapisYuz = ikvCardFace(card, { palette: 'lapis', star: true }); } catch (_) {}

  portal.innerHTML = `
    <div class="olus-veil" aria-hidden="true"></div>
    <div class="olus-stars" aria-hidden="true"></div>
    <div class="olus-stage" role="dialog" aria-modal="true"
         aria-label="${_esc(t('olus.aria_davet', 'Oluş mührü daveti'))}">
      <div class="olus-kicker">${_esc(t('olus.kicker', 'EŞİKTESİN'))}</div>
      <button type="button" class="olus-card olus-card--tap${yerinde ? ' olus-card--yerinde' : ''}"
              id="olus-kart"
              aria-label="${_esc(t('olus.dokun_aria', 'Kartı incele'))}">${lapisYuz}</button>
      <div class="olus-kanit">${_esc(kanit)}</div>
      <div class="olus-soru">${_esc(soru)}</div>
      <div class="olus-actions">
        <button type="button" class="olus-btn olus-btn--evet" id="olus-evet">
          ${_esc(t('olus.evet', 'Evet, artık o kişiyim.'))}
        </button>
        <button type="button" class="olus-btn olus-btn--hayir" id="olus-hayir">
          ${_esc(t('olus.hayir', 'Henüz değil.'))}
        </button>
      </div>
    </div>`;

  // esikLapis (13e) — eşik anının kendi sesi; 'seal' mühre (perde 2) saklıdır.
  try { window.fxCue?.('esikLapis'); } catch (_) {}

  // Tanıma Motoru (FAZ 1) — 'kapat' yalnız Hayır/Escape'te kesindir (mühür
  // yolu asla başlamaz, _perdeRed terminaldir). Evet'te segment yine burada
  // kapanır (süre ölçümü eski tanımında kalır) ama SONUÇSUZ: mühür basıldı mı
  // elini mi çekti, ancak _perde2'nin bitir()'inde bilinir — sonucu o yazar.
  const kapat = () => { try { window.wtOverlayClose?.('olus-davet', 'kapat'); } catch (_) {} };
  const kapatSessiz = () => { try { window.wtOverlayClose?.('olus-davet'); } catch (_) {} };
  // Dinleyiciler SAHNEYE bağlanır, portala değil: portal tören boyunca (ve
  // törenler arası) yaşayan tek düğümdür — ona bağlanan Escape perde 2'de de
  // canlı kalır ve mühürden sonra "henüz değil" sahnesini açardı. innerHTML
  // değişince sahne düğümü ölür, dinleyicisi de onunla gider.
  const stage = portal.querySelector('.olus-stage');

  portal.querySelector('#olus-evet')?.addEventListener('click', () => {
    kapatSessiz(); _perde2(portal, card);
  });
  portal.querySelector('#olus-hayir')?.addEventListener('click', () => {
    kapat(); _perdeRed(portal, card);
  });
  portal.querySelector('#olus-kart')?.addEventListener('click', () => {
    _yaprakAc(portal, card, m, detay);
  });
  // Escape = "henüz değil" (kararı ertelemek de bir karardır, kayıt düşer)
  stage?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { kapat(); _perdeRed(portal, card); }
  });
  setTimeout(() => { try { portal.querySelector('#olus-evet')?.focus(); } catch (_) {} }, 60);
}

/* ─── 5. SUNUM — kuyruk YOK, öneri rafından tek kart ───
   kkMaybePresent'in halefi. Fark: kuyruk tüketmez, stok bilmez; rafın en
   güçlü UYGUN kartını sorar ve günde bir kez konuşur. Raf boşsa sessizce çıkar. */

/** "Henüz değil" denen kart dinlenir. İstisna: kişi o günden beri belirgin
 *  yükseldiyse bu artık aynı soru değildir — bekleme kısalır. */
function _redBekliyor(e, cardId, sig) {
  const redler = Array.isArray(e && e.red) ? e.red : [];
  if (!redler.length) return false;
  const son = new Date(redler[redler.length - 1]).getTime();
  if (!isFinite(son)) return false;
  if ((Date.now() - son) / 86400000 >= OLUS_RED_BEKLEME_GUN) return false;
  try {
    const m = kkMatchCard(getCardById(cardId), sig);
    if (m && (m.score - (e.skor || 0)) >= OLUS_SKOR_SICRAMA) return false;
  } catch (_) {}
  return true;
}

/** Raftan sorulacak kartları seç — hedefliler önce (kkOneriRafi'nin sırası),
 *  dinlenmedeki kartlar atlanır. Döner: cardId dizisi (en fazla n).
 *  Havuz 8'e kadar taranır: üç uygun aday çıkarmak tek aday çıkarmaktan
 *  daha derin bir raf ister (dinlenmedekiler eleniyor). */
export function olusKapiSec(n = 3) {
  let raf = [];
  try { raf = kkOneriRafi(8); } catch (_) { return []; }
  let sig = null;
  try { sig = kkComputeSignals(); } catch (_) {}
  const secili = [];
  for (const id of raf) {
    const e = kkEsikDurum(id);
    if (!e) continue;
    if (_redBekliyor(e, id, sig)) continue;
    secili.push(id);
    if (secili.length >= n) break;
  }
  return secili;
}

/** Tek kart seçici — kapı seçicisinin ilk elemanı. İki yol tek kaynaktan
 *  besleniyor: sıralama ve dinlenme kuralı ikiye ayrılmaz. */
export function olusDavetSec() {
  return olusKapiSec(1)[0] || null;
}

export async function olusDavetSun() {
  const kk = S._kisiKarti;
  if (!kk || _olusOpen || _secimBusy) return false;
  if (document.visibilityState !== 'visible') return false;
  if (kkTyping()) return false;                    // kullanıcı yazarken bölme
  if (olusGunHakki() <= 0) return false;           // "her davranışa demez"
  const idler = olusKapiSec(3);
  if (!idler.length) return false;

  _secimBusy = true;
  try {
    const sig = (() => { try { return kkComputeSignals(); } catch (_) { return null; } })();
    const adaylar = idler.map(id => {
      const card = getCardById(id);
      let m = null;
      try { m = kkMatchCard(card, sig); } catch (_) {}
      return { card, m };
    }).filter(a => a.card);
    if (!adaylar.length) return false;

    // Günün bakışı BURADA harcanır — LLM "henüz erken" dese bile, kaç aday
    // tartılırsa tartılsın BİR kez. Aksi hâlde aynı gün içinde kart kart
    // dolaşıp kota tüketirdik; "her davranışa demez" ilkesi sunumu değil
    // BAKIŞI sınırlar, bakış da tek turdur.
    _gunSay();
    try { kkSaveDebounced(); } catch (_) {}

    // Tek aday varsa kapı kurulmaz: seçim yoksa kapı da yoktur.
    const kanitlar = adaylar.length >= 2
      ? await olusKapiKanit(adaylar)
      : [await olusKanit(adaylar[0].card, adaylar[0].m)];

    // Wanderer kritik davrandı: benzerlik var ama oluş yok. Kart havuzda
    // kalır, yalnız bakıldığının izi düşer.
    const gecen = [];
    adaylar.forEach((a, i) => {
      const k = (kanitlar && kanitlar[i]) || null;
      if (k && k.davet === false) { _elendi(a.card.id); return; }
      gecen.push({
        card: a.card, m: a.m,
        kanit: (k && k.kanit) || null,
        // Yaprağın malzemesi (dört boyut + "neden sen") aynı turdan gelir.
        detay: k ? { boyutlar: k.boyutlar, emre: k.emre } : null,
      });
    });
    if (!gecen.length) return false;

    // LLM beklerken dünya değişmiş olabilir: kullanıcı yazmaya başladı, sekme
    // gitti ya da başka bir tören açıldı — sahneyi zorla açma.
    if (_olusOpen || kkTyping() || document.visibilityState !== 'visible') return false;

    // Kapı yalnız GERÇEK bir seçim varken kurulur. LLM turu düştüyse (kota,
    // offline, bozuk JSON) kanıtlar boştur: üç kapalı kartı ayırt edilemez
    // hâlde uzatmak seçim değil kumar olurdu — tek kartın sayısal kanıt
    // akışına düşülür.
    if (gecen.length >= 2 && kanitlar) return olusKapilarAc(gecen);
    const s = gecen[0];
    return olusDavetAc(s.card.id, { kanit: s.kanit, m: s.m, detay: s.detay });
  } finally { _secimBusy = false; }
}

/* ════════════════════════════════════════════════════════════════════
   6. OLUŞ SINAMASI — "iddia senin, kanıt da senin"
   ─────────────────────────────────────────────────────────────────────
   Davet tek soru sorar çünkü kanıtı Wanderer sundu. Burada iddia
   kullanıcınındır ("Artık o kişiyim") — bu yüzden kanıtı o verir: dört
   boyutta dört soru. Kapı sınamadır, reçete DEĞİL: barajı geçmemiş bir
   karta da beyan edilebilir (kkEsikAc kartı havuza kullanıcı adına alır).
   Geçilemezse ceza yok, ROTA var: eksik boyut söylenir ve kartın o
   taraftaki kendi maddeleri gösterilir — nereye bakacağını kart söyler.

   BEŞ DURAK (2026-08-03):
     0 KAPI    — iki kutup kart: soldaki ALTIN "şu an olduğun" (10f'in
                 sırasıyla: Portre > Kimlik Motoru), sağdaki LAPİS sınanan
                 kart. Aralarında Eşik Ekranı'nın yol çubuğu — burada
                 ÖLÇÜSÜZ, çünkü bu bir yüzde değil bir eşiktir. Yerleşim
                 02d'nin CSS'inden gelir (esikEnsureStyles), kopyası değil.
     1-4 SORU  — dört boyut şeridi ilerlemenin dilidir (yüzde halkası değil:
                 ilerleme dört AYRIK kapıdır). Boş cevapla ilerlenmez —
                 sınamanın bedeli yedi gündür, yanlışlıkla ödenmemeli.
     5 GÖZDEN  — dört cevap bir arada; dokunulan satır kendi sorusuna döner.
     6 OKUMA   — hükmün GEREKÇESİ. Her boyutun altında ya kullanıcının o
                 boyutu ayakta tutan KENDİ cümlesi durur, ya kartın oradaki
                 maddeleri (rota). Geçen de geçmeyen de bu sahneyi görür.
     7 MÜHÜR   — yalnız geçen için; davet yolunun _perde2'si REUSE edilir.

   HÜKÜM İKİ İMZA TAŞIR (§6.10 · K4): model boyut boyut yargılar, ALINTI
   kapıyı açar. Bir boyut ancak model "yaşandı" derse VE gösterdiği referans
   kullanıcının kendi cevabında çözülürse sayılır (13y kokenSozBlok →
   kanit_ref → kokenAlintiCoz). Eskiden kapı modelin `gecti` boolean'ıydı;
   kalibre edilmemiş bir öz-beyan kapı olamaz. Geçme kuralı artık kodda ve
   deterministiktir: kanıtlı boyut >= SINAMA_GECER.
════════════════════════════════════════════════════════════════════ */
const SINAMA_BEKLEME_GUN = 7;   // geçilemeyen sınamadan sonra dinlenme

/* Dört boyuttan kaçının KANITLI durması gerektiği. Bir "güven" sayısı değil
   ürün kuralıdır (emsal: 13y KOKEN_ESIK): üç boyut kullanıcının kendi
   cümlesiyle ayakta duruyorsa ve dördüncü açıkça çelişmiyorsa o kişi
   yaşanıyordur. Eskiden bu kural modelin KAFASINDAYDI ("üçü sağlamsa geçer"
   diye prompt'a yazılıydı) ve hükmü de o veriyordu; artık kural burada,
   deterministik ve test edilebilir. Modelin öz-beyanı kapı DEĞİLDİR (K4). */
const SINAMA_GECER = 3;
/* Cevaplar cümlelere bölünüp numaralanır; bu tavanlar 13y'nin varsayılanını
   sınamaya göre açar (dört cevap × birkaç cümle). */
const SINAMA_SOZ_MAX = 16;
const SINAMA_SOZ_MAXLEN = 200;
/* Bundan kısa parça kanıt olamaz ("Evet.", "Bilmem.") — numaralı bloğu da
   şişirir, modelin parmağını da bulanıklaştırır. */
const SINAMA_SOZ_MIN = 8;

let _sinamaOpen = false;

/* Son kayıt + dört öncesi. Dönüşümün kanıtı "üçüncü denemede geçtim"dir;
   ilk denemenin eksikleri silinirse o cümle kurulamaz. */
const SINAV_TARIHCE_CAP = 5;

/** Yeni sınav kaydına öncekilerin tarihçesini iliştirir — ikinci sınav
 *  ilkini SİLMEZ ("önce"yi koru).
 *
 *  Tarihçe kaydın İÇİNDE yaşar (`oncekiler`), yeni bir alan açılmaz: geçiş
 *  kartında `sinav` bir Supabase JSONB KOLONUDUR (10A gkFlush) ve ikinci bir
 *  kolon migration ister — bu iş ELLE'siz kalsın diye tek alanda durur.
 *  Üst düzey alanlar (at/gecti/eksik/alintilar) aynen korunduğu için mevcut
 *  okuyucular — bekleme hesabı, "Neden bu?" paneli, gkRingSVG — kırılmaz. */
export function olusSinavKayitla(onceki, kayit) {
  const gecmis = Array.isArray(onceki && onceki.oncekiler) ? onceki.oncekiler.slice() : [];
  if (onceki && onceki.at) {
    // İç içe büyümeyi keser: tarihçenin tarihçesi tutulmaz.
    const sade = { ...onceki };
    delete sade.oncekiler;
    gecmis.push(sade);
  }
  return { ...kayit, oncekiler: gecmis.slice(-(SINAV_TARIHCE_CAP - 1)) };
}

/** Bir sınav kaydından kalan dinlenme (0 = şimdi olur). Saf ve export:
 *  defterin NEREDE durduğunu bilmez — katalog kartı `kk.esik`e yazar, geçiş
 *  kartı kendi `k.sinav`ına (10A). Kural ikisinde de aynı. */
export function olusSinamaBeklemeSinav(sinav) {
  const s = sinav;
  if (!s || s.gecti || !s.at) return 0;
  const gecen = (Date.now() - new Date(s.at).getTime()) / 86400000;
  if (!isFinite(gecen)) return 0;
  return Math.max(0, Math.ceil(SINAMA_BEKLEME_GUN - gecen));
}

/** Kaç gün sonra yeniden sınanabilir (0 = şimdi olur) — katalog kartı yolu. */
export function olusSinamaBekleme(cardId) {
  const e = kkEsikDurum(cardId);
  return olusSinamaBeklemeSinav(e && e.sinav);
}

/** Kart maddesi kendi tırnağını taşıyabilir (örn. `"Hayır" demek beni kötü
 *  yapmaz.`); şablonun dış tırnağıyla çakışıp `""Hayır"` üretmesin diye içteki
 *  düz tırnaklar tipografik tek tırnağa iner — açılış ‘ , kapanış ’. */
function _icTirnak(s) {
  let i = 0;
  return String(s).replace(/"/g, () => (i++ % 2 === 0 ? '‘' : '’'));
}

/** LLM yoksa da sınama olur: sorular kartın KENDİ maddelerinden şablonlanır. */
function _fallbackSorular(card) {
  return DIMS.map(d => {
    const madde = _icTirnak((Array.isArray(card[d]) ? card[d] : [])[0] || '');
    // Madde yoksa tırnak boş kalmasın: soru boyutun kendi diline düşer
    if (!madde) {
      const yer = t(`olus.dim_loc.${d}`, d);
      return { boyut: d, soru: t('olus.sinama.fb_bos', 'Bu kişi {yer} nasıl görünür — sen bunu son zamanlarda nerede yaşadın?').replace('{yer}', yer) };
    }
    const fb = {
      dusunceler: 'Bu kişi şöyle düşünür: "{madde}" — sen bunu son zamanlarda nerede düşündün?',
      inanclar: 'Bu kişi şuna inanır: "{madde}" — bu inanç sende en son ne zaman sınandı?',
      hisler: 'Bu kişi şunu hisseder: "{madde}" — bunu en son ne zaman, nerede hissettin?',
      davranislar: 'Bu kişi şunu yapar: "{madde}" — sen bunu son günlerde nerede yaptın?',
    }[d];
    return { boyut: d, soru: t(`olus.sinama.fb_${d}`, fb).replace('{madde}', madde) };
  });
}

/** Dört soru — biri her boyuttan. LLM hata verirse şablona düşer (sınama
 *  ASLA LLM'e bağlı kalmaz: kullanıcı beyan ettiyse sorulacaktır). */
export async function olusSinamaSorular(card) {
  if (!card) return [];
  if (!S.currentUser?.id) return _fallbackSorular(card);
  try {
    const nitelikler = DIMS
      .map(d => `${t(`kk.dim.${d}`)}: ${(Array.isArray(card[d]) ? card[d] : []).slice(0, 3).join(' · ') || '-'}`)
      .join('\n');
    const raw = await callLLM({
      contents: [{ role: 'user', parts: [{ text: p('prompt.olus.sinama_soru_user', {
        kartAdi: card.name || '-',
        portre: card.portre || card.lesson || card.whisper || '-',
        nitelikler,
      }) }] }],
      systemPrompt: p('prompt.olus.sinama_soru_system'),
      maxTokens: 600, temperature: 0.6, jsonMode: true,
      model: SUMMARY_MODEL, skipPersona: true,
    });
    const j = JSON.parse(String(raw || '').replace(/```json|```/g, '').trim());
    const list = Array.isArray(j && j.sorular) ? j.sorular : [];
    // Dört boyutun HEPSİ gelmeliydi; eksik geldiyse o boyut şablondan tamamlanır.
    const fb = _fallbackSorular(card);
    const out = DIMS.map((d, i) => {
      const hit = list.find(x => x && x.boyut === d && String(x.soru || '').trim());
      return hit ? { boyut: d, soru: String(hit.soru).trim() } : fb[i];
    });
    return out;
  } catch (e) {
    console.warn('olusSinamaSorular:', e && e.message);
    return _fallbackSorular(card);
  }
}

/** Cevapları cümlelere böler — kanıtın birimi cevabın tamamı değil, tek
 *  cümledir. Kullanıcı ekranda dört paragrafını değil, o boyutu ayakta tutan
 *  CÜMLESİNİ görsün diye. Lookbehind KULLANILMAZ (eski iOS Safari'de yok):
 *  noktalama parçanın sonunda kalacak şekilde eşleştirilir. */
function _sinamaSozler(qa) {
  const out = [];
  (Array.isArray(qa) ? qa : []).forEach((x) => {
    const metin = String((x && x.cevap) || '').trim();
    if (!metin) return;
    (metin.match(/[^.!?…\n]+[.!?…]*/g) || [])
      .map(s => s.trim())
      .filter(s => s.length >= SINAMA_SOZ_MIN)
      .forEach(s => out.push(s));
  });
  return out;
}

/** Numaralı söz bloğu + referans haritası. Prompt ve çözüm AYNI listeden
 *  üretilir (ikisi de saf ve deterministik) — numaralar kaymaz. */
function _sinamaBlok(qa) {
  const sozler = _sinamaSozler(qa);
  const { blok, harita } = kokenSozBlok(sozler, { max: SINAMA_SOZ_MAX, maxLen: SINAMA_SOZ_MAXLEN });
  return { sozler, blok, harita };
}

/** MODELİN CEVABINI HÜKME ÇEVİREN SAF ÇÖZÜCÜ — sınamanın kalbi.
 *
 *  Buradaki tek soru şudur: model bir boyutta "yaşandı" diyorsa, bunu
 *  kullanıcının HANGİ cümlesiyle söylüyor? Gösteremiyorsa o boyut yaşanmamış
 *  sayılır — modelin kendi yargısı tek başına kapı olamaz (§6.10 · K4).
 *  Böylece hüküm iki imza taşır: model yargılar, alıntı geçirir.
 *
 *  Saf ve export: LLM mock'u olmadan test edilebilsin (asıl kural burada).
 *  Döner: { gecti, kanitli, boyutlar:{d:{yasandi, alinti}}, eksik, soz } | null */
export function olusSinamaCoz(j, qa) {
  if (!j || typeof j !== 'object') return null;
  const { sozler, harita } = _sinamaBlok(qa);
  const kaynak = (j.boyutlar && typeof j.boyutlar === 'object') ? j.boyutlar : {};

  const boyutlar = {};
  let kanitli = 0;
  for (const d of DIMS) {
    const b = (kaynak[d] && typeof kaynak[d] === 'object') ? kaynak[d] : {};
    // Model biçimi yerelleştirebilir (llm-bicimleri-geri-sizar): iki ad da tanınır.
    const iddia = b.yasandi === true || b.lived === true;
    const coz = iddia ? kokenAlintiCoz(b.kanit_ref, b.kanit, harita, sozler) : null;
    const alinti = coz ? coz.alinti : null;
    const yasandi = !!(iddia && alinti);
    if (yasandi) kanitli++;
    boyutlar[d] = { yasandi, alinti };
  }

  // Rota hangi boyuttan gösterilecek: modelin işaret ettiği boyut kanıtsızlar
  // arasındaysa ona uyulur (o cevapları okudu), değilse ilk kanıtsız boyut.
  const eksikler = DIMS.filter(d => !boyutlar[d].yasandi);
  const mEksik = DIMS.includes(j.eksik) ? j.eksik : null;
  const eksik = (mEksik && eksikler.includes(mEksik)) ? mEksik : (eksikler[0] || null);

  return {
    gecti: kanitli >= SINAMA_GECER,
    kanitli, boyutlar, eksik,
    soz: String(j.soz || '').trim() || null,
  };
}

/** Cevapları değerlendir. LLM yoksa/hata verirse null döner — çağıran
 *  sınamayı TÜKETMEZ, kullanıcı yeniden deneyebilir (kaybı kullanıcı ödemez). */
export async function olusSinamaKarar(card, qa) {
  if (!card || !Array.isArray(qa) || !qa.length || !S.currentUser?.id) return null;
  try {
    const qaBlok = qa.map((x, i) =>
      `${i + 1}. [${t(`kk.dim.${x.boyut}`)}] ${x.soru}\nCEVAP: ${String(x.cevap || '').trim() || '-'}`
    ).join('\n\n');
    const { blok } = _sinamaBlok(qa);
    const raw = await callLLM({
      contents: [{ role: 'user', parts: [{ text: p('prompt.olus.sinama_karar_user', {
        kartAdi: card.name || '-',
        portre: card.portre || card.lesson || card.whisper || '-',
        qa: qaBlok,
        sozler: blok,
      }) }] }],
      systemPrompt: p('prompt.olus.sinama_karar_system'),
      // Dört boyut ayrı ayrı karar + referans yazıyor: eski 400'lük bütçe
      // yanıtı son boyutun ortasında keser ve parse çökerdi.
      maxTokens: 700, temperature: 0.2, jsonMode: true,
      model: SUMMARY_MODEL, skipPersona: true,
    });
    const j = JSON.parse(String(raw || '').replace(/```json|```/g, '').trim());
    return olusSinamaCoz(j, qa);
  } catch (e) {
    console.warn('olusSinamaKarar:', e && e.message);
    return null;
  }
}

/** SINAMA TÖRENİ — kapı → dört soru → değerlendirme → mühür ya da rota.
 *
 *  Kart-tipinden BAĞIMSIZ (2026-08-10). Sınamanın çekirdeği — dört soru,
 *  kanıtlı boyut sayısı, alıntı kapısı — kartın nereden geldiğini hiç
 *  sormuyordu; yalnız GİRİŞİ katalog kartına bağlıydı (getCardById,
 *  kk.collection, kk.esik defteri, kkMuhurle). O bağ opsiyonel bir
 *  sözleşmenin arkasına alındı ki Geçiş Kartım'ın lapis kutbu da aynı
 *  sınamadan geçebilsin — ikinci bir sınama motoru yazmak, aynı hükmü iki
 *  yerde ayrı ayrı yanlış yapmanın yoludur (§1.3).
 *
 *  opts (hepsi opsiyonel — boşsa davranış BİREBİR eskisi):
 *    card      — kartı dışarıdan ver (katalogda olmayan kutup)
 *    goldPole  — sınama sahnesinin altın kutbu ({card, sahne, empty});
 *                verilmezse kullanıcının genel altın kutbu (10f yolGoldPole)
 *    defter    — { oku(): sinav|null, yaz(sinav) }; sınav kaydının EVİ.
 *                Katalog kartı kk.esik'e yazar, geçiş kartı kendi k.sinav'ına
 *                — ontolojiler ayrı kalır, biri ötekinin defterine karışmaz.
 *    onGecti   — sınama geçildi ve kullanıcı "Mührü bas" dedi: mühür yolunu
 *                çağıran devralır (10A kendi tamamlanma törenini oynatır).
 *                Verilmezse bugünkü yol: _perde2 → kkMuhurle.
 */
export function olusSinamaAc(cardId, opts = {}) {
  const card = opts.card || getCardById(cardId);
  if (!card || _sinamaOpen || _olusOpen) return false;
  const disKart = !!opts.card;                         // katalog dışı kutup
  const defter = opts.defter || null;
  const _sinavOku = () => defter
    ? (defter.oku?.() || null)
    : ((kkEsikDurum(cardId) || {}).sinav || null);

  if (!disKart) {
    const kk = S._kisiKarti;
    if (!kk || kk.collection[cardId]) return false;    // olunmuş kişi sınanmaz
  }
  if (olusSinamaBeklemeSinav(_sinavOku()) > 0) return false;   // dinlenmede
  _sinamaOpen = true;

  // Kullanıcı kartı kendi eşiğe getirdi — havuzda yeri açılır (baraj aranmaz).
  // Dış kart havuza girmez: katalog eşiği katalog kartlarının defteridir.
  if (!disKart) {
    try {
      let m = null;
      try { m = kkMatchCard(card, kkComputeSignals()); } catch (_) {}
      kkEsikAc(cardId, { skor: (m && m.score) || 0, dims: (m && m.dims) || {}, kaynak: 'beyan' });
    } catch (_) {}
  }

  // Yerleşim Eşik Ekranı'nın stil bloğundan gelir (.esik-cards/.esik-path) —
  // 02d stilleri kendi kendine enjekte etmez, açan sahne ister (K3).
  try { esikEnsureStyles(); } catch (_) {}

  const st = { step: 0, qa: [] };
  /* Okumadaki hüküm mühür anına da geçer: `onGecti` alan taraf hangi
     boyutların KANITLI durduğunu bilmeli (10A oradan `davranis_kaniti`
     düşürüyor). Sahneler innerHTML ile yeniden kurulduğu için karar
     DOM'da tutulamaz. */
  let _sonKarar = null;
  const overlay = document.createElement('div');
  overlay.className = 'onb-ritual sc-onb olus-sinama';
  overlay.id = 'olus-sinama';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', t('olus.sinama.aria', 'Oluş sınaması'));
  document.body.appendChild(overlay);
  // K1 fix (02c/02d/10D kalıbı): sınıf bir sonraki karede eklenmezse perde
  // görünmez kalır — geçiş başlangıç durumunu yakalayamaz.
  requestAnimationFrame(() => overlay.classList.add('onb-open'));
  try { window.wtOverlayOpen?.('olus-sinama'); } catch (_) {}

  /* Yalnız görsel kapanış. Sonucun yazımından AYRI: "geçti" dalında sahne
     kapanır ama mühür yolu _perde2/bitir()'de sürer; orada erken 'kapat'
     yazmak gerçek sonucu (basılı-tut tamamlandı mı) daha bilinmeden
     yalanlardı. Segment ise her iki dalda da BURADA kapanır — süre ölçümü
     sahnenin ömrüdür, mührün değil. */
  function _sinamaTeardown(sonuc) {
    overlay.classList.remove('onb-open');
    overlay.classList.add('onb-closing');
    _sinamaOpen = false;
    try { window.wtOverlayClose?.('olus-sinama', sonuc); } catch (_) {}
    setTimeout(() => overlay.remove(), 320);
  }

  /** İptal/vazgeç/LLM-hatası — mühür yolu hiç başlamadı ya da sınama
   *  geçmedi: 'kapat' burada kesindir (sceneSonucGecti bu yolu KULLANMAZ). */
  function kapat() {
    _sinamaTeardown('kapat');
  }

  /* ── Sahne parçaları ── */

  /** İKİ KUTUP — "hangi kişiden hangi kişiye". Altın kutup 10f'in sırasıyla
   *  okunur (Portre > Kimlik Motoru), lapis kutup sınanan kartın kendisidir.
   *  Yerleşim Eşik Ekranı'nın CSS'idir (.esik-cards/.esik-path): sınama da bir
   *  eşik olduğuna göre kart yerleşimi de aynı eşiğin yerleşimi olmalı —
   *  kopyalanırsa iki yüzey zamanla ayrışır (K3). Yol çubuğu ÖLÇÜSÜZ biçimde
   *  kullanılır: burada bir yüzde yok, bir eşik var. */
  function kutuplar() {
    // Altın kutup dışarıdan gelebilir: geçiş kartında "şu an olduğun" o
    // kartın KENDİ altın kutbudur, kullanıcının genel portresi değil.
    let g = opts.goldPole || null;
    if (!g) try { g = yolGoldPole(); } catch (_) {}
    let goldYuz = '', lapisYuz = '';
    try {
      if (g) goldYuz = ikvCardFace(g.card, { palette: 'gold', fog: !!g.empty, sahne: g.sahne, sub: '' });
    } catch (_) {}
    try { lapisYuz = ikvCardFace(card, { palette: 'lapis', star: true }); } catch (_) {}
    return `
      <div class="esik-cards olus-s-kutuplar">
        <div class="esik-card esik-card--gold">
          <div class="esik-card-tag">${_esc(t('olus.sinama.tag_gold', 'ŞU AN OLDUĞUN'))}</div>
          ${goldYuz}
        </div>
        <div class="esik-card esik-card--lapis">
          <div class="esik-card-tag esik-card-tag--lapis">${_esc(t('olus.sinama.tag_lapis', 'OLDUĞUNU SÖYLEDİĞİN'))}</div>
          ${lapisYuz}
        </div>
      </div>
      <div class="esik-path esik-path--olcusuz olus-s-path" aria-hidden="true">
        <span class="esik-path-dot esik-path-dot--gold"></span>
        <span class="esik-path-line"></span>
        <span class="esik-path-dot esik-path-dot--lapis">✷</span>
      </div>`;
  }

  /** DÖRT BOYUT ŞERİDİ — sınamanın tek ilerleme dili.
   *  Burada eskiden yüzde halkası vardı (step/4 × 100). Halka §7'nin dili ama
   *  SÜREKLİ ilerleme içindir; sınamanın ilerlemesi dört AYRIK kapıdır ve
   *  dördü zaten kitabın kendi boyutları. Aynı şerit üç sahnede de durur:
   *  kapıda neyin geleceğini, soruda nerede olunduğunu, okumada neyin ayakta
   *  kaldığını söyler — tek motif, üç durak. */
  function serit(opts) {
    const o = opts || {};
    const durum = o.durum || null;
    const aktif = Number.isFinite(o.aktif) ? o.aktif : -1;
    return `<div class="olus-s-serit" aria-hidden="true">${DIMS.map((d, i) => {
      let cls = '';
      if (durum) cls = (durum[d] && durum[d].yasandi) ? ' is-kanitli' : ' is-bos';
      else if (i < aktif) cls = ' is-dolu';
      else if (i === aktif) cls = ' is-aktif';
      return `<span class="olus-s-adim${cls}"><span class="olus-s-adim-g">${DIM_GLYPH[d]}</span>`
        + `<span class="olus-s-adim-t">${_esc(t(`kk.dim.${d}`))}</span></span>`;
    }).join('')}</div>`;
  }

  /* Soru sahnesinin küçük lapis kartı — "kimin ağzından konuşuyorsun"
     görünürde kalır. Bir kez çizilir: her soruda yeniden üretmek aynı kartı
     dört kez doğurmak olurdu (§5 — aynı nesne iki kez doğmaz). */
  let _miniYuz = '';
  function mini() {
    if (!_miniYuz) {
      try { _miniYuz = ikvCardFace(card, { palette: 'lapis', star: true, mini: true }); } catch (_) { _miniYuz = ''; }
    }
    return _miniYuz;
  }

  /* Kartlar sahneye girdikten sonra: holo eğimi (12c) + kartların CSS
     gecikmesiyle senkron ses. 02d'nin kalibresi — aynı yerleşim, aynı ritim. */
  function kartlarCanlandi() {
    try { window.ikvHoloScan?.(overlay); } catch (_) {}
    try {
      setTimeout(() => window.fxCue?.('esikGold'), 150);
      setTimeout(() => window.fxCue?.('esikLapis'), 300);
    } catch (_) {}
  }

  function sceneKapi() {
    overlay.innerHTML = `
      <div class="onb-scene olus-s-scene">
        <div class="olus-kicker">${_esc(t('olus.sinama.kicker', 'OLUŞ SINAMASI'))}</div>
        ${kutuplar()}
        <div class="olus-s-iddia">“${_esc(t('olus.sinama.cta', 'Artık o kişiyim.'))}”</div>
        <div class="olus-s-body">${_esc(t('olus.sinama.kapi', 'Öyleyse bana o kişinin ağzından cevap ver. Dört soru: düşüncen, inancın, hissin, davranışın.'))}</div>
        ${serit()}
        <div class="olus-aph"><em>${_esc(t('olus.sinama.kapi_aph', 'Söylemek kolaydır. Yaşamak iz bırakır — izi göster.'))}</em></div>
        <div class="olus-s-nav">
          <button type="button" class="ikv-ghost-btn" data-act="iptal">${_esc(t('olus.sinama.vazgec', 'Vazgeç'))}</button>
          <button type="button" class="ikv-seal-btn" data-act="basla">${_esc(t('olus.sinama.basla', 'Başla'))}</button>
        </div>
      </div>`;
    kartlarCanlandi();
  }

  function sceneYukleniyor(metin) {
    overlay.innerHTML = `
      <div class="onb-scene olus-s-scene olus-s-scene--wait">
        <div class="olus-kicker">${_esc(t('olus.sinama.kicker', 'OLUŞ SINAMASI'))}</div>
        <div class="olus-s-wait" aria-live="polite">${_esc(metin)}</div>
      </div>`;
  }

  function sceneSoru(i) {
    const q = st.qa[i];
    const dolu = !!String(q.cevap || '').trim();
    overlay.innerHTML = `
      <div class="onb-scene olus-s-scene">
        ${serit({ aktif: i })}
        <div class="olus-s-mini">${mini()}</div>
        <div class="olus-s-soru">${_esc(q.soru)}</div>
        <textarea class="olus-s-ta" id="olus-s-ta" rows="5"
          placeholder="${_esc(t('olus.sinama.ph', 'Bir an anlat — ne oldu, ne yaptın.'))}">${_esc(q.cevap || '')}</textarea>
        <div class="olus-s-ipucu" id="olus-s-ipucu"${dolu ? ' hidden' : ''}>${_esc(t('olus.sinama.bos_ipucu', 'Bu kapı cümleyle değil, anıyla açılır.'))}</div>
        <div class="olus-s-nav">
          <button type="button" class="ikv-ghost-btn" data-act="geri">${_esc(i === 0 ? t('olus.sinama.vazgec', 'Vazgeç') : t('olus.sinama.geri', 'Geri'))}</button>
          <button type="button" class="ikv-seal-btn" data-act="ileri" id="olus-s-ileri"${dolu ? '' : ' disabled'}>${_esc(i === 3 ? t('olus.sinama.gozden', 'Gözden geçir') : t('olus.sinama.ileri', 'Devam'))}</button>
        </div>
      </div>`;
    setTimeout(() => { try { overlay.querySelector('#olus-s-ta')?.focus(); } catch (_) {} }, 80);
  }

  /* GÖZDEN GEÇİRME — dördüncü cevaptan sonra, hükümden önce.
     Sınamanın bedeli yedi gün beklemektir; kullanıcının yanlışlıkla ya da
     yarım bir cevapla o bedeli ödemesi töreni cezaya çevirirdi. Burada kendi
     dört cümlesini bir arada görür, istediğine dokunup döner — ve "ver"
     dediğinde verdiğini bilerek verir. */
  function sceneGozden() {
    const kisalt = (s) => {
      const x = String(s || '').trim();
      return x.length > 120 ? x.slice(0, 119).trim() + '…' : x;
    };
    overlay.innerHTML = `
      <div class="onb-scene olus-s-scene">
        <div class="olus-kicker">${_esc(t('olus.sinama.gozden_kicker', 'CEVAPLARIN'))}</div>
        ${serit({ aktif: 4 })}
        <div class="olus-s-body">${_esc(t('olus.sinama.gozden_body', 'Vermeden önce bir kez daha oku — değiştirmek istediğine dokun.'))}</div>
        <div class="olus-s-liste">
          ${st.qa.map((q, i) => `
            <button type="button" class="olus-s-satir" data-git="${i}">
              <span class="olus-s-satir-g">${DIM_GLYPH[q.boyut] || ''}</span>
              <span class="olus-s-satir-m">
                <span class="olus-s-satir-h">${_esc(t(`kk.dim.${q.boyut}`))}</span>
                <span class="olus-s-satir-c">${_esc(kisalt(q.cevap))}</span>
              </span>
              <span class="olus-s-satir-d" aria-hidden="true">✎</span>
            </button>`).join('')}
        </div>
        <div class="olus-s-nav">
          <button type="button" class="ikv-ghost-btn" data-act="geri">${_esc(t('olus.sinama.geri', 'Geri'))}</button>
          <button type="button" class="ikv-seal-btn" data-act="ver">${_esc(t('olus.sinama.bitir', 'Cevaplarımı ver'))}</button>
        </div>
      </div>`;
  }

  function sceneSonucGecti() {
    // Segment burada kapanır (sahnenin ömrü doldu) ama SONUÇSUZ: sınamayı
    // geçmek mührü basmak değildir — basılı-tut jesti hâlâ önde, sonucu
    // _perde2/bitir() yazar.
    _sinamaTeardown();
    // Mühür yolunu çağıran devralabilir: geçiş kartının kendi tamamlanma
    // töreni var (10A _completionCeremony — lapis kart altına YANAR) ve
    // arkasından mezuniyet zinciri işler. İki töreni üst üste bindirmek
    // ikisini de küçültürdü; kullanıcının eli "Mührü bas"ta zaten düştü.
    if (typeof opts.onGecti === 'function') {
      setTimeout(() => { try { opts.onGecti(_sonKarar); } catch (_) {} }, 340);
      return;
    }
    // Mühür perdesi REUSE — davet yolundaki aynı sahne, yalnız `yol` başka.
    // Emre'nin sözü okuma sahnesinde ZATEN söylendi; burada `null` geçilir ki
    // perde kendi sabit cümlesini kursun ("Mühür senin.") — aynı cümleyi iki
    // sahnede tekrarlamak töreni değil, metni çoğaltırdı.
    setTimeout(() => { _perde2(_portal(), card, 'sinama', null); }, 340);
  }

  /** OKUMA — hükmün gerekçesi, dört boyutta.
   *
   *  Sınamanın sonucu artık tek cümlelik bir "geçti/geçmedi" değil, bir
   *  OKUMA'dır: her boyutun altında ya kullanıcının o boyutu ayakta tutan
   *  KENDİ cümlesi durur, ya da kartın oradaki kendi maddeleri (rota).
   *  Kanıtı gösteren taraf uygulama olduğu için kullanıcı ekranda modelin
   *  hatırladığını değil, kendi yazdığını görür — mimarinin verdiği söz
   *  budur (§6.10). Geçen ve geçmeyen aynı sahnede buluşur: fark cezada
   *  değil, hangi boyutun kendi cümlesini taşıdığındadır. */
  function okumaListesi(karar) {
    const b = (karar && karar.boyutlar) || {};
    return `<div class="olus-s-okuma">${DIMS.map(d => {
      const dur = b[d] || {};
      const kanitli = !!(dur.yasandi && dur.alinti);
      const maddeler = kanitli ? [] : (Array.isArray(card[d]) ? card[d] : []).slice(0, 2);
      return `<div class="olus-s-oku${kanitli ? ' is-kanitli' : ''}">
        <div class="olus-s-oku-h"><span class="olus-s-oku-g">${DIM_GLYPH[d] || ''}</span>${_esc(t(`kk.dim.${d}`))}</div>
        ${kanitli
          ? `<div class="olus-s-oku-k">${_esc(t('olus.sinama.kanit_h', 'KENDİ CÜMLEN'))}</div>
             <blockquote class="olus-s-oku-a">“${_esc(dur.alinti)}”</blockquote>`
          : (maddeler.length
            ? `<div class="olus-s-oku-r">${_esc(t('olus.sinama.rota_h', 'Bu kişi orada şöyle:'))}</div>
               <ul class="olus-s-oku-l">${maddeler.map(x => `<li>${_esc(x)}</li>`).join('')}</ul>`
            : '')}
      </div>`;
    }).join('')}</div>`;
  }

  function sceneOkuma(karar) {
    const gecti = !!(karar && karar.gecti);
    const eksik = (karar && karar.eksik) || null;
    const soz = (karar && karar.soz) || (gecti
      ? t('olus.sinama.gecti_soz', 'Kendi anlarını gösterdin. Bu artık iddia değil.')
      : (eksik
        ? t('olus.sinama.henuz_eksik', 'Henüz değil — {boyut} tarafında hâlâ eski kişinin sesi var.')
            .replace('{boyut}', t(`kk.dim.${eksik}`).toLocaleLowerCase(S._currentLang === 'tr' ? 'tr-TR' : 'en-US'))
        : t('olus.sinama.henuz', 'Henüz değil. Ama yol açık — bu kişi eşiğinde bekliyor.')));
    overlay.innerHTML = `
      <div class="onb-scene olus-s-scene">
        <div class="olus-kicker${gecti ? ' olus-kicker--seal olus-kicker--now' : ''}">${_esc(t('olus.sinama.okuma_kicker', 'DÖRT BOYUT'))}</div>
        ${serit({ durum: karar && karar.boyutlar })}
        <div class="olus-s-hukum">${_esc(soz)}</div>
        ${okumaListesi(karar)}
        ${gecti ? '' : `<div class="olus-aph"><em>${_esc(t('olus.sinama.henuz_aph', 'Kart kaybolmadı. Eşikte, seni bekliyor.'))}</em></div>`}
        <div class="olus-s-nav">
          <button type="button" class="ikv-seal-btn" data-act="${gecti ? 'muhre' : 'iptal'}">${_esc(gecti ? t('olus.sinama.muhre', 'Mührü bas') : t('olus.devam', 'Devam'))}</button>
        </div>
      </div>`;
  }

  async function basla() {
    sceneYukleniyor(t('olus.sinama.hazirlaniyor', 'Sorularını hazırlıyorum…'));
    const sorular = await olusSinamaSorular(card);
    if (!_sinamaOpen) return;                       // kullanıcı bu arada kapattı
    st.qa = sorular.map(q => ({ ...q, cevap: '' }));
    st.step = 1;
    sceneSoru(0);
  }

  async function degerlendir() {
    sceneYukleniyor(t('olus.sinama.okunuyor', 'Cevaplarını okuyorum…'));
    const karar = await olusSinamaKarar(card, st.qa);
    if (!_sinamaOpen) return;
    if (!karar) {
      // LLM konuşamadı: sınama TÜKETİLMEZ, kullanıcı yeniden dener.
      sceneYukleniyor(t('olus.sinama.sessiz', 'Şimdi cevap veremiyorum — birazdan yeniden dene.'));
      setTimeout(() => { if (_sinamaOpen) kapat(); }, 2200);
      return;
    }
    _sonKarar = karar;
    try {
      // Alıntılar da SAKLANIR (Tanıma Motoru FAZ 7): bunlar kullanıcının
      // kendi cümleleridir, `kokenAlintiCoz` zincirinden geçmiş — sınama
      // ekranında bir kez gösterilip atılıyorlardı. "Neden bu?" yüzeyinin
      // gösterebileceği TEK gerçek kanıt bunlar: kartın hazırlığı bir
      // ölçümdür, ama kullanıcının ağzından çıkmış bir cümle beyandır.
      // Yalnız kanıtlanmış boyutlar yazılır — `yasandi:false` bir yokluktur,
      // saklanacak bir şey değil.
      const alintilar = {};
      for (const [d, b] of Object.entries(karar.boyutlar || {})) {
        if (b && b.yasandi && b.alinti) alintilar[d] = b.alinti;
      }
      const kayit = {
        at: new Date().toISOString(), gecti: !!karar.gecti, eksik: karar.eksik || null,
        alintilar: Object.keys(alintilar).length ? alintilar : null,
      };
      // Defterin evi çağırana ait: katalog kartı kk.esik'e, geçiş kartı
      // kendi kaydına yazar (10A gkSave). Kayıt biçimi ikisinde de aynı.
      // Tarihçe İKİ evde de aynı yardımcıdan geçer: defterin yazma yolu
      // çağırana ait (10A gkSave), ama "önce"yi koruma kuralı burada tek
      // yerde durur — iki ev iki ayrı kuralla yaşarsa biri gün gelir unutur.
      if (defter) {
        defter.yaz?.(olusSinavKayitla(defter.oku?.() || null, kayit));
      } else {
        const e = kkEsikDurum(cardId);
        if (e) { e.sinav = olusSinavKayitla(e.sinav, kayit); kkSaveDebounced(); }
      }
    } catch (_) {}
    // Geçen de geçmeyen de ÖNCE okumayı görür; mühür ancak kullanıcı okuduktan
    // sonra, kendi eliyle basılır (mühür kendiliğinden düşmez — §modül felsefesi).
    sceneOkuma(karar);
  }

  /** Ekrandaki cevabı state'e yaz — sahne DEĞİŞMEDEN önce daima çağrılır.
   *  (Sahne innerHTML ile yeniden kurulduğu için textarea'nın değeri kendi
   *  başına hiçbir yere gitmez.) */
  function yaz() {
    const ta = overlay.querySelector('#olus-s-ta');
    const i = st.step - 1;
    if (ta && st.qa[i]) st.qa[i].cevap = ta.value;
  }

  /* Boş cevapla ilerlemek yedi günlük beklemeyi boşa yakardı: "Devam" cevap
     yazılana kadar kapalı durur, ipucu da o zaman görünür. Delegasyon — her
     sahne innerHTML ile yeniden kurulduğu için dinleyici tek yerde kalır. */
  overlay.addEventListener('input', (ev) => {
    if (!ev.target || ev.target.id !== 'olus-s-ta') return;
    const dolu = !!String(ev.target.value || '').trim();
    const btn = overlay.querySelector('#olus-s-ileri');
    if (btn) btn.disabled = !dolu;
    const ip = overlay.querySelector('#olus-s-ipucu');
    if (ip) ip.hidden = dolu;
  });

  overlay.addEventListener('click', (ev) => {
    // Gözden geçirme satırı: o soruya dön (cevabı değiştirmek için)
    const satir = ev.target.closest('[data-git]');
    if (satir) {
      const i = Math.max(0, Math.min(3, Number(satir.getAttribute('data-git')) || 0));
      st.step = i + 1; sceneSoru(i); return;
    }
    const btn = ev.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.getAttribute('data-act');
    if (act === 'iptal') { kapat(); return; }
    if (act === 'basla') { basla(); return; }
    if (act === 'ver')   { degerlendir(); return; }
    if (act === 'muhre') { sceneSonucGecti(); return; }
    if (act === 'geri') {
      yaz();
      if (st.step > 4) { st.step = 4; sceneSoru(3); return; }   // gözden → son soru
      if (st.step <= 1) { kapat(); return; }                    // ilk sorudan geri = vazgeç
      st.step--; sceneSoru(st.step - 1); return;
    }
    if (act === 'ileri') {
      yaz();
      if (st.step >= 4) { st.step = 5; sceneGozden(); return; }
      st.step++; sceneSoru(st.step - 1);
    }
  });

  sceneKapi();
  return true;
}

/* ─── 7. WINDOW EXPOSE (TDZ-güvenli, minify-dayanıklı) ─── */
if (typeof window !== 'undefined') {
  window.olusDavetAc     = olusDavetAc;      // töreni aç (kart id ile)
  window.olusDavetSun    = olusDavetSun;     // rafın en güçlü uygunu (günde 1)
  window.olusDavetSec    = olusDavetSec;     // hangi kart sorulacak (dinlenme kapılı)
  window.olusKapiSec     = olusKapiSec;      // kapı adayları (en fazla n)
  window.olusKapilarAc   = olusKapilarAc;    // üç kapı sahnesi (çoğul giriş)
  window.olusKanit       = olusKanit;        // LLM'in kritik değerlendirmesi
  window.olusKapiKanit   = olusKapiKanit;    // çoğul kanıt turu (tek çağrı)
  window.olusGunHakki    = olusGunHakki;     // bugün bakış hakkı kaldı mı
  window.olusKanitCumlesi = olusKanitCumlesi; // sayısal fallback cümlesi
  window.olusSinamaAc    = olusSinamaAc;     // "Artık o kişiyim" → dört soru
  window.olusSinamaBekleme = olusSinamaBekleme; // kaç gün sonra yeniden sınanır
  window.olusSinamaBeklemeSinav = olusSinamaBeklemeSinav; // aynısı, defteri dışarıda olan kart için (10A)
  window.olusSinavKayitla = olusSinavKayitla; // sınav tarihçesi — "önce" korunur
}
