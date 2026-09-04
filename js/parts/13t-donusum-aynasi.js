/* ═══════════════════════════════════════════════════════════════════
   13t — DÖNÜŞÜM AYNASI · 90 günlük Geçiş Belgeseli
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     "Fiziki âlemde gördüklerinin değişmesi zaman alır." Kısa vadede
     dönüşüm görünmez — ama 90 gün sonra geriye bakınca görülür. Bu
     modül YENİ hiçbir veri TOPLAMAZ; zaten kaydedilenden bir ayna kurar:
     Portrenin ilk hâli ↔ bugünkü hâli (02c `history`), güncel
     erdem vektörü (13l `imVirtueNow`). Aynaya giren her satır kullanıcıya
     YAZILMIŞ olmalıdır — LLM'e yazılmış prompt metni buraya giremez
     (09d:887 "bir UI ona bakamaz"). Çekirdek tez: "Mesele Sensin" — ve değişti.

   MEKANİK: 90 gün eşiği hesap yaşından (Supabase `created_at`, yoksa
   Portrenin ilk versiyon tarihi) hesaplanır. Otomatik AÇILMAZ —
   Studio odasında bekler, kullanıcı hazır olduğunda görür (K4: dokunuş
   enflasyonu yaratma). Doc-* primitifleri (document.css, zaten global
   link'li) — yeni CSS dosyası açılmadı.

   Kalıcılık: SafeStorage per-uid (etw_gb_v1_<uid>) — yalnız "en son ne
   zaman görüldü" bilgisini tutar. Supabase YOK.
   Konvansiyon: hardcoded TR string + t() getter. TDZ güvenliği: window.*.
   Studio-only (Wanderer Studio kararı, 2026-07-19).
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { SafeStorage, localISODate, escapeHTML, showToast } from './00a-infrastructure.js';
import { t } from './15-i18n.js';

const STORAGE_KEY = 'etw_gb_v1';
const CYCLE_DAYS = 90;
const DAY_MS = 86400000;

function _key() { return `${STORAGE_KEY}_${(S.currentUser && S.currentUser.id) || 'anon'}`; }
function _default() { return { lastShownAt: null }; }

export function gbSave() {
  try { SafeStorage.set(_key(), S._gecisAyna); } catch (e) { console.warn('gbSave:', e && e.message); }
}
export function gbInit() {
  if (!S._gecisAyna) S._gecisAyna = _default();
  try {
    const data = SafeStorage.get(_key());
    if (data && typeof data === 'object') S._gecisAyna = Object.assign(_default(), data);
  } catch (e) { console.warn('gbInit:', e && e.message); }
}

/** Hesap yaşı (gün). Supabase created_at öncelikli; yoksa Portrenin
    ilk versiyon tarihine düşer; ikisi de yoksa 0 (henüz yeterli veri yok). */
export function gbAccountAgeDays() {
  const created = S.currentUser?.created_at ? Date.parse(S.currentUser.created_at) : NaN;
  const fallback = S._portre?.history?.[0]?.at ? Date.parse(S._portre.history[0].at) : NaN;
  const start = !isNaN(created) ? created : fallback;
  if (isNaN(start)) return 0;
  return Math.max(0, Math.floor((Date.now() - start) / DAY_MS));
}

/** 90 gün dolmuş VE (hiç gösterilmemiş VEYA son gösterimden 90+ gün geçmiş). */
export function gbShouldShow() {
  if (gbAccountAgeDays() < CYCLE_DAYS) return false;
  const last = S._gecisAyna?.lastShownAt ? Date.parse(S._gecisAyna.lastShownAt) : 0;
  return (Date.now() - last) >= CYCLE_DAYS * DAY_MS;
}

/** Kalan gün (Studio alt-satırı için) — negatif olmaz, 0 = hazır. */
export function gbDaysUntilReady() {
  return Math.max(0, CYCLE_DAYS - gbAccountAgeDays());
}

/* Bir eğri en az iki nokta ister — tek ölçüm bir yol çizmez, bir andır. */
const EGRI_MIN_NOKTA = 2;

/** Mevcut verilerden derleme — YENİ TOPLAMA YOK, saf okuma.
 *
 *  Her ölçü kendi motorunun getter'ından gelir (ikinci bir hesap türetilmez):
 *  mesafe 13x, söz 13u, sönen örüntü 09d, kartlar 10q, profil 09a, temeller
 *  02b (t0), ruh hâli ve alıntılar 09. Hepsi kanıt kapılıdır — kanıtsız ölçü
 *  `null`/`[]` döner ve o bölüm HİÇ çizilmez (§6.10).
 *
 *  NOT: burada bir zamanlar `omGetTopPatterns()` vardı ve çıktısı ekrana pill
 *  olarak basılıyordu. O metin LLM'e yazılmış bir TALİMATTIR ("yeri gelirse
 *  kutla", "teşhis: … yol: konusma") — 09d'nin kendi yorumu "bir UI ona
 *  bakamaz" der. Aynı tuzak `p1GetTemporalEvolution()`ta da vardır; ikisinin
 *  de UI-güvenli ikizi kullanılır.
 *
 *  Async: t0, ruh hâli ve alıntılar sunucudan gelir. Sunucu susarsa o
 *  bölümler yoktur — belgesel yine açılır (asla bloklama). */
export async function gbCompose() {
  const portre = S._portre || {};
  const first = (portre.history && portre.history[0]) || null;

  const oku = (fn, yedek) => { try { return fn() ?? yedek; } catch (_) { return yedek; } };
  const okuAsync = async (fn) => { try { return (await fn()) ?? null; } catch (_) { return null; } };

  const [temeller, ruhHali, alintilar] = await Promise.all([
    okuAsync(() => window.onbTemelKiyas?.()),
    okuAsync(() => window.moodPencereKiyas?.(180)),
    okuAsync(() => window.kirilmaUclari?.()),
  ]);

  return {
    ageDays: gbAccountAgeDays(),
    firstBaslik: first?.baslik || portre.baslik || '',
    currentBaslik: portre.baslik || '',
    version: portre.version || 1,
    // NOT: erdem vektörü (13l imVirtueNow) burada toplanmıyor — TEK UÇLU bir
    // ölçüdür ("şu an sabrın 74") ve bu belge kıyas üstüne kuruludur. t0
    // karşılığı doğduğu gün buraya girer.
    mesafe: oku(() => window.msIzSeri?.(), []),
    soz: oku(() => window.sdOranKiyas?.(), null),
    sonen: oku(() => window.omCozulmusArsiv?.(), []),
    kartlar: oku(() => window.kkKazanimAylik?.(), []),
    profil: oku(() => window.p1TemporalYapisal?.(), null),
    tanikSon: oku(() => window.rvTanikSon?.(), null),
    tanikVakti: oku(() => window.rvTanikVaktiGeldi?.(), false),
    temeller, ruhHali, alintilar,
  };
}

/** KAT EDİLEN YOLUN ÇİZGİSİ — inline SVG sparkline.
 *
 *  Renk tek: ALTIN. Anayasa degradeyi "altından lapise" akıtır ama o kural
 *  ŞİMDİ→GELECEK yolunu çizerken geçerlidir; bu eğri GEÇMİŞ→ŞİMDİ akar ve
 *  tamamı gerçekleşmiştir — gerçekleşmiş olan altındır. Solda sessiz altın
 *  (uzak geçmiş), sağda parlak altın (bugün): zaman ışığı kazanır.
 *
 *  Çizgi YORUM YAPMAZ, gösterir: inişler de çıkışlar da çizilir. Günlük
 *  tek-cümle yüzeyleri (02d izi) yalnız ileri hareket konuşur — bilinçli bir
 *  incelik; ama bir eğriden iyi haberi ayıklamak yalan olurdu.
 *
 *  Kanıtsızsa boş string döner: tek nokta bir yol değil, bir andır. */
function _sparkline(seri) {
  if (!Array.isArray(seri) || seri.length < EGRI_MIN_NOKTA) return '';
  // Ölçüler: SVG %100 genişliğe yayılır (preserveAspectRatio yok), dikey
  // sabit kalır — H düşük olursa gerçek bir yükseliş ekranda düzleşir.
  const W = 280, H = 76, P = 6;
  const pcts = seri.map(n => Math.max(0, Math.min(100, Number(n.pct) || 0)));
  const enAz = Math.min(...pcts), enCok = Math.max(...pcts);
  // Düz bir seri de bir gerçektir: aralık sıfırsa çizgi ortadan geçer.
  const aralik = (enCok - enAz) || 1;
  const x = i => P + (i * (W - 2 * P)) / (seri.length - 1);
  const y = v => H - P - ((v - enAz) / aralik) * (H - 2 * P);
  const nokta = pcts.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const sonX = x(seri.length - 1).toFixed(1), sonY = y(pcts[pcts.length - 1]).toFixed(1);
  return `
    <svg class="gb-spark" viewBox="0 0 ${W} ${H}" role="img" preserveAspectRatio="none"
         aria-label="${escapeHTML(t('gb.spark_aria', 'Mesafenin zaman içindeki eğrisi'))}">
      <defs>
        <linearGradient id="gbSparkG" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="var(--gold-quiet)" stop-opacity="0.45"/>
          <stop offset="100%" stop-color="var(--gold)" stop-opacity="1"/>
        </linearGradient>
      </defs>
      <polyline points="${nokta}" fill="none" stroke="url(#gbSparkG)"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${sonX}" cy="${sonY}" r="3" fill="var(--gold-bright)"/>
    </svg>`;
}

/** Bir tarihi "Mart 2026" biçimine indirger — belgeselin ölçüsü GÜN değil
 *  MEVSİMdir; gün gün konuşmak sayaç diline düşerdi. */
function _ay(tarih) {
  try {
    const d = new Date(tarih);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(t('gb.locale', 'tr-TR'), { month: 'long', year: 'numeric' });
  } catch (_) { return ''; }
}

/* ─── STİL — bundle CSS'ine girmez, ayna açılırken bir kez enjekte edilir.
   Yalnız belgesele HAS üç öğe burada: eğri, eğrinin ayak yazısı, tanıklık
   şeridi. Gerisi document.css'in doc-* primitifleridir — yeni bir görsel
   dil icat edilmedi (TASARIM-PRENSIPLERI §belge katmanı).
   GOTCHA: bu blok bir template literal'dır, yorumlarına backtick YAZILMAZ —
   literali kapatır ve build "Expected a semicolon" ile patlar. ─── */
let _stilKuruldu = false;
export function gbEnsureStyles() {
  if (_stilKuruldu || typeof document === 'undefined') return;
  _stilKuruldu = true;
  const el = document.createElement('style');
  el.id = 'gb-styles';
  el.textContent = `
    .gb-modal { max-width: 520px; max-height: 82vh; overflow-y: auto; }
    /* Belge sola hizalı okunur; .modal her şeyi ortalar ve doc-phase'in sol
       çizgisi metinden kopar. Başlık bloğu (eyebrow/title/lead) ortada kalır:
       o bir kapaktır, gövde değil. */
    .gb-modal #gb-body > .doc-section { text-align: left; }
    .gb-modal .doc-cards { text-align: left; }
    .gb-spark { display: block; width: 100%; height: 76px; margin: 6px 0 4px; }
    .gb-measure {
      font-family: var(--serif); font-size: 12.5px; line-height: 1.5;
      color: var(--text-dim); margin: 10px 0 0;
    }
    .gb-spark-foot {
      display: flex; justify-content: space-between;
      font-family: var(--sans); font-size: 10px; letter-spacing: 0.08em;
      text-transform: uppercase; color: var(--text-dim);
    }
    .gb-witness { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .gb-witness-btn {
      cursor: pointer; border: 1px solid var(--border-active);
      background: transparent; color: var(--text-mid);
      font-family: var(--sans); font-size: 12px;
      transition: border-color 0.2s var(--ease-out), color 0.2s var(--ease-out);
    }
    .gb-witness-btn:hover, .gb-witness-btn:focus-visible {
      border-color: var(--gold); color: var(--gold-bright);
    }
    .gb-closing { margin-top: 40px; }
    /* Paylaşım ikinci halkadır (K8): mühürden sonra gelir, onun önüne
       geçmez — tam genişlik ama sessiz, kapanışla arasında nefes payı. */
    .gb-share { display: block; width: 100%; margin-top: 18px; }
  `;
  document.head.appendChild(el);
}

/* ─── BÖLÜMLER — her biri kanıt kapılı: ölçü yoksa bölüm HİÇ çizilmez ─── */

const _bolum = (eyebrow, govde) => govde
  ? `<div class="doc-section"><div class="doc-eyebrow">${escapeHTML(eyebrow)}</div>${govde}</div>`
  : '';

/** 2 · O ZAMAN ↔ ŞİMDİ — kimliğin iki ucu. */
function _bolumIkiUc(d) {
  const kart = (k, v, alt) => `
    <div class="doc-card">
      <div class="doc-card-k">${escapeHTML(k)}</div>
      ${escapeHTML(v)}
      ${alt ? `<p>${escapeHTML(alt)}</p>` : ''}
    </div>`;
  if (!d.firstBaslik && !d.currentBaslik) return '';
  const ilkAlt = d.profil ? _ay(d.profil.ilkTarih) : '';
  return _bolum(t('gb.then_now', 'O ZAMAN ↔ ŞİMDİ'), `
    <div class="doc-cards">
      ${kart(t('gb.first', 'İlk hâlin'), d.firstBaslik || t('gb.no_data', '—'), ilkAlt)}
      ${kart(t('gb.current', 'Bugünkü hâlin'), d.currentBaslik || t('gb.no_data', '—'), '')}
    </div>`);
}

/** 3 · Aradaki yol böyle aktı — mesafenin eğrisi. */
function _bolumMesafe(d) {
  const svg = _sparkline(d.mesafe);
  if (!svg) return '';
  const ilk = d.mesafe[0], son = d.mesafe[d.mesafe.length - 1];
  return _bolum(t('gb.path', 'ARADAKİ YOL BÖYLE AKTI'), `
    ${svg}
    <div class="gb-spark-foot">
      <span>${escapeHTML(_ay(ilk.gun) || '')}</span>
      <span>${escapeHTML(t('gb.today', 'bugün'))}</span>
    </div>
    <p class="gb-measure">${escapeHTML(
      t('gb.path_note', '{once} · {simdi} — ölçü kartların üç kapısından doğar.')
        .replace('{once}', `%${Math.round(ilk.pct)}`)
        .replace('{simdi}', `%${Math.round(son.pct)}`))}</p>`);
}

/** 4 · Sözün sınandı — verilen sözün tutulma kıyası. */
function _bolumSoz(d) {
  const k = d.soz;
  if (!k || k.ilk.oran == null || k.son.oran == null) return '';
  const cumle = (o) => t('gb.vow_line', '{ay} — {n} sözden {t} tutuldu.')
    .replace('{ay}', _ay(`${o.ay}-01`) || o.ay)
    .replace('{n}', o.verilen)
    .replace('{t}', o.tutulan);
  return _bolum(t('gb.vow', 'SÖZÜN SINANDI'), `
    <div class="doc-phase">
      <div class="doc-phase-item">${escapeHTML(cumle(k.ilk))}</div>
      <div class="doc-phase-item">${escapeHTML(cumle(k.son))}</div>
    </div>`);
}

/** 5 · Artık sende olmayanlar — sönen örüntülerin arşivi. */
function _bolumSonen(d) {
  if (!Array.isArray(d.sonen) || !d.sonen.length) return '';
  const satir = (c) => `<div class="doc-pill doc-pill--ok">${escapeHTML(
    t('gb.faded_line', '{ad} — {n} hafta sürdü; artık görünmüyor.')
      .replace('{ad}', c.baslik)
      .replace('{n}', c.hafta_sayisi))}</div>`;
  return _bolum(t('gb.faded', 'ARTIK SENDE OLMAYANLAR'), d.sonen.map(satir).join(''));
}

/** 6 · Bu yolda olduğun kişiler — kazanımın zaman ekseni. */
function _bolumKartlar(d) {
  if (!Array.isArray(d.kartlar) || !d.kartlar.length) return '';
  const toplam = d.kartlar.reduce((n, a) => n + a.n, 0);
  if (!toplam) return '';
  const satirlar = d.kartlar.slice(-6).map(a =>
    `<div class="doc-phase-item">${escapeHTML(
      t('gb.cards_line', '{ay}: {n} kişi').replace('{ay}', _ay(`${a.ay}-01`) || a.ay).replace('{n}', a.n))}</div>`
  ).join('');
  return _bolum(t('gb.cards', 'BU YOLDA OLDUĞUN KİŞİLER'), `
    <p class="doc-note doc-note--gold">${escapeHTML(
      t('gb.cards_total', 'Bu yolda {n} kişi oldun.').replace('{n}', toplam))}</p>
    <div class="doc-phase">${satirlar}</div>`);
}

/** 6b · Sende ölçülenler — t0 ↔ bugün, sayının kıyası.
 *
 *  Üç kaynak tek tabloda: Yol Ayini'nin ilk teşhisi (02b), ruh hâli penceresi
 *  (09) ve profil evrimi (09a). Her satır İKİ uçludur — tek uçlu bir ölçü
 *  ("şu an sabrın 74") dönüşümü anlatmaz, durum bildirir.
 *
 *  Üslup satırı bilerek YOK: üslubun adları yalnız prompt sözlüğünde yaşar
 *  (`prompt.p1.style.*`) ve prompt metnini UI'ya taşımak bu modülün
 *  onardığı sızıntının ta kendisidir. */
function _bolumOlculenler(d) {
  const satirlar = [];
  const satir = (ad, once, simdi) =>
    `<tr><td>${escapeHTML(ad)}</td><td>${escapeHTML(String(once))} → ${escapeHTML(String(simdi))}</td></tr>`;

  for (const r of (d.temeller?.satirlar || [])) {
    satirlar.push(satir(t('por.found.' + r.anahtar, r.anahtar), r.once, r.simdi));
  }
  if (d.ruhHali) {
    satirlar.push(satir(t('gb.mood', 'İçsel hava (5 üzerinden)'),
      d.ruhHali.once.toFixed(1), d.ruhHali.simdi.toFixed(1)));
  }
  const mu = d.profil?.mesajUzunlugu;
  if (mu && mu.once > 0 && mu.simdi > 0) {
    satirlar.push(satir(t('gb.msg_len', 'Cümlelerinin uzunluğu'), mu.once, mu.simdi));
  }
  if (!satirlar.length) return '';

  const yeni = d.profil?.degerler?.yeni || [];
  const solan = d.profil?.degerler?.solan || [];
  // Pill'ler RENKSİZ: "sönen" sözcüğü bu belgede iki ayrı anlam taşıyor —
  // sönen ÖRÜNTÜ kazanılmış bir savaştır (yeşil), geri çekilen DEĞER bir
  // kayıp değil bir kayma. İkisini farklı renklerle boyamak, aynı kelimeyi
  // iki yerde iki şey sanmaya davet ederdi. Ayrım metinde durur.
  const deger = (etiket, liste) => liste.length
    ? `<div class="doc-pill">${escapeHTML(etiket.replace('{v}', liste.join(', ')))}</div>`
    : '';

  return _bolum(t('gb.measured', 'SENDE ÖLÇÜLENLER'), `
    <div class="doc-tablebox"><table>${satirlar.join('')}</table></div>
    ${deger(t('gb.values_new', 'Beliren: {v}'), yeni)}
    ${deger(t('gb.values_faded', 'Geri çekilen: {v}'), solan)}`);
}

/** 7 · Senin sözlerinden — iki uç, kullanıcının KENDİ cümlesiyle.
 *  Model bu cümleleri üretmez; uygulama kaynaktan keser. */
function _bolumAlinti(d) {
  const a = d.alintilar;
  if (!a) return '';
  const blok = (u, etiket) => `
    <div class="doc-card">
      <div class="doc-card-k">${escapeHTML(etiket)}${u.tarih ? ` · ${escapeHTML(_ay(u.tarih))}` : ''}</div>
      <p>${escapeHTML(u.metin)}</p>
    </div>`;
  return _bolum(t('gb.quotes', 'SENİN SÖZLERİNDEN'), `
    <div class="doc-cards">
      ${blok(a.ilk, t('gb.quote_first', 'O zaman'))}
      ${blok(a.son, t('gb.quote_last', 'Sonra'))}
    </div>`);
}

/** 8 · Tanıklık — hükmü kullanıcı verir. Uygulama "çözüldü" DEMEZ. */
function _bolumTaniklik(d) {
  if (!d.tanikVakti) {
    if (!d.tanikSon) return '';
    // Vakti gelmediyse: geçen mevsimin sözü hatırlatılır, soru sorulmaz.
    return _bolum(t('gb.witness', 'SENİN TANIKLIĞIN'), `
      <p class="doc-note">${escapeHTML(
        t('gb.witness_last', 'Geçen mevsim "{s}" demiştin.')
          .replace('{s}', t('gb.witness_' + d.tanikSon.durum, d.tanikSon.durum)))}</p>`);
  }
  const secenek = (k, etiket) =>
    `<button class="doc-pill gb-witness-btn" data-durum="${k}">${escapeHTML(etiket)}</button>`;
  // Soru ve şıklar TEK sarmalayıcıda: beyandan sonra ikisi birden gider.
  // Cevaplanmış bir soru ekranda kalırsa kullanıcı yeniden cevaplaması
  // gerektiğini sanır (canlı denemede yakalandı).
  return _bolum(t('gb.witness', 'SENİN TANIKLIĞIN'), `
    <div id="gb-witness">
      <p class="doc-lead">${escapeHTML(t('gb.witness_q', 'Bu dertle gelmiştin. Bugün neresinde?'))}</p>
      <div class="gb-witness">
        ${secenek('yol', t('gb.witness_yol', 'Yol alıyorum'))}
        ${secenek('yerinde', t('gb.witness_yerinde', 'Yerinde duruyor'))}
        ${secenek('degil', t('gb.witness_degil', 'Artık o kişi değilim'))}
      </div>
    </div>`);
}

/** PAYLAŞIM KARTI — belgeselin dışarı çıkabilen yüzü (13g sözleşmesi).
 *
 *  K8: belgeselin İÇİ bu odada kalır. Kullanıcının kendi cümleleri (alıntı
 *  bölümü) ve tanıklık beyanı karta GİRMEZ — onlar birine göstermek için
 *  değil, kendine bakmak için söylenmiştir. Dışarı yalnız sayılabilir olan
 *  çıkar: kaç gün, kaç kişi, kaç söz.
 *
 *  Kanıt kapısı (§6.10): gün sayısı tek başına bir dönüşüm değil, bir
 *  takvimdir — "90 gündür buradayım" kimseye bir yol göstermez. Kart ancak
 *  kişi ya da söz ölçüsünden EN AZ BİRİ varken doğar; ikisi de yoksa null
 *  döner ve buton hiç çizilmez.
 *
 *  Döner: 13g params objesi | null */
export function gbPaylasimKarti(data) {
  if (!data || !(data.ageDays > 0)) return null;

  const kisi = Array.isArray(data.kartlar)
    ? data.kartlar.reduce((n, a) => n + ((a && a.n) || 0), 0)
    : 0;
  const soz = data.soz && data.soz.son;
  const sozVar = !!(soz && soz.oran != null && soz.verilen > 0);
  if (!kisi && !sozVar) return null;

  const degisti = !!(data.firstBaslik && data.currentBaslik
    && data.firstBaslik !== data.currentBaslik);

  return {
    // Kartın üst şeridi odanın ADIDIR — Studio'daki etiketle aynı anahtardan
    // okunur. İkiz anahtar açılsaydı EN tarafta oda "THE MIRROR", kart
    // "THE MIRROR OF CHANGE" derdi: aynı yüzeyin iki adı olurdu (§4.3).
    kicker: t('studio.room.gecisaynasi', 'DÖNÜŞÜM AYNASI'),
    glyph: '✦',
    big: data.ageDays,
    bigLabel: t('gb.share_daylabel', 'GÜN'),
    title: t('gb.title', 'Kat Edilen Yol'),
    // Kart sayısı BÜYÜK HARFE çevrilerek çizilir (13g `_spaced`) — kısa dur.
    sub: kisi ? t('gb.share_cards', 'bu yolda {n} kişi').replace('{n}', kisi) : '',
    // Tırnak içine giren tek satır: belgeselin kapanış mührü. Kitabın cümlesi
    // kullanıcının cümlesi değildir — K8'in koruduğu mahremiyete girmez.
    line: degisti
      ? t('gb.closing_changed', 'Fiziki âlemde gördüklerinin değişmesi zaman alır — aldı, ve değişti.')
      : t('gb.closing_same', 'Fiziki âlemde gördüklerinin değişmesi zaman alır. Yol devam ediyor.'),
    note: sozVar
      ? t('gb.share_vow', '{n} sözden {t} tutuldu')
        .replace('{n}', soz.verilen).replace('{t}', soz.tutulan)
      : '',
    accent: 'gold',
    // Uygulamanın en uzun eşiği: doksan gün. Işıltı o mertebeyi taşır.
    tier: 4,
    // Paylaşım Nabzı: bu fonksiyon zaten 13g'nin params objesini üretir —
    // türü de burada sabitlemek, tek çağıranını (_bagliPaylas) nesneyi
    // yaymakla uğraştırmaz (İç Çalışma 12 FAZ 3).
    tur: 'kart',
  };
}

function _renderHTML(data) {
  const changed = data.firstBaslik && data.currentBaslik && data.firstBaslik !== data.currentBaslik;
  const bolumler = [
    _bolumIkiUc(data),
    _bolumMesafe(data),
    _bolumSoz(data),
    _bolumSonen(data),
    _bolumKartlar(data),
    _bolumOlculenler(data),
    _bolumAlinti(data),
    _bolumTaniklik(data),
  ].filter(Boolean).join('');

  // Hiçbir bölüm kanıtlanamadıysa belgesel bir DAVETtir — boş tablo değil.
  const govde = bolumler || `
    <p class="doc-note">${escapeHTML(
      t('gb.empty', 'Bu sayfanın dolması için yol gerek — yürümeye devam.'))}</p>`;

  return `
    <div class="doc-eyebrow">${escapeHTML(t('gb.eyebrow', 'GEÇİŞ BELGESELİ'))}</div>
    <div class="doc-title">${escapeHTML(t('gb.title', 'Kat Edilen Yol'))}</div>
    <div class="doc-lead">${escapeHTML(t('gb.lead', '{n} gündür bu yoldasın.').replace('{n}', data.ageDays))}</div>
    ${govde}
    <div class="doc-note doc-note--gold gb-closing">
      <div class="doc-eyebrow">${escapeHTML(t('gb.seal_eyebrow', 'KİTAPTAN'))}</div>
      <p>${escapeHTML(changed
        ? t('gb.closing_changed', 'Fiziki âlemde gördüklerinin değişmesi zaman alır — aldı, ve değişti.')
        : t('gb.closing_same', 'Fiziki âlemde gördüklerinin değişmesi zaman alır. Yol devam ediyor.'))}</p>
    </div>
    ${gbPaylasimKarti(data) ? `<button type="button" class="btn-outline-gold gb-share" id="gb-share">${
      escapeHTML(t('gb.share', 'YOLU PAYLAŞ ↗'))}</button>` : ''}`;
}


export async function gbOpen() {
  if (document.getElementById('gb-portal')) return;
  // gbInit() asenkron (post-auth dinamik import) — kullanıcı Studio odasına
  // init tamamlanmadan tıklarsa S._gecisAyna henüz yok; güvenli varsayılana düş.
  if (!S._gecisAyna) S._gecisAyna = _default();

  // KAPI — ayna iki uç ister: "o zaman" ve "şimdi". İlk haftalarda ikinci uç
  // henüz doğmamıştır; belgesel kendini tekrar eder ve kanıt yerine boşluk
  // gösterir. Oda tıklanabilir kalır (Studio'da görünür bir vaattir), ama
  // eşiğe varmadan açılmaz. Kapı YAŞ kapısıdır, gösterim kapısı değil:
  // gbShouldShow() bir kez görüldükten sonra false döner — onunla kapatsaydık
  // kullanıcı kendi belgeselini ikinci kez açamazdı.
  const kalan = gbDaysUntilReady();
  if (kalan > 0) {
    try {
      showToast(t('gb.gate', 'Bu ayna doksan gün ister — {n} gün sonra.').replace('{n}', kalan));
    } catch (_) {}
    return;
  }

  gbEnsureStyles();
  // Portal ÖNCE açılır, veri sonra dolar: t0/ruh hâli/alıntılar sunucudan
  // gelir ve ağ yavaşsa kullanıcı boş ekrana bakardı. Perde değil, iskelet.
  const portal = document.createElement('div');
  portal.id = 'gb-portal';
  portal.className = 'overlay open';
  portal.style.setProperty('z-index', 'var(--z-portal-alt)');
  portal.innerHTML = `
    <div class="modal gb-modal">
      <div id="gb-body"></div>
      <button class="btn-outline-gold" id="gb-close" style="margin-top:20px;">${escapeHTML(t('gb.close', 'KAPAT'))}</button>
    </div>`;
  document.body.appendChild(portal);
  portal.querySelector('#gb-close')?.addEventListener('click', () => _kapat(portal));

  const data = await gbCompose();
  // Kullanıcı beklerken kapatmış olabilir — kapanmış bir portala yazma.
  if (!document.body.contains(portal)) return;
  const body = portal.querySelector('#gb-body');
  if (body) {
    body.innerHTML = _renderHTML(data);
    body.classList.add('doc-rise');
    _bagliTaniklik(body, data);
    _bagliPaylas(body, data);
  }

  S._gecisAyna.lastShownAt = localISODate();
  gbSave();
  try { window.wtOverlayOpen?.('donusum-aynasi'); } catch (_) {}
}

function _kapat(portal) {
  try { window.wtOverlayClose?.('donusum-aynasi'); } catch (_) {}
  portal.remove();
}

/** Tanıklık beyanı — hüküm kullanıcınındır; tek dokunuşla deftere düşer.
 *  Beyandan sonra soru YERİNE teşekkür kalır: aynı soruyu iki kez sormak
 *  beyanı bir ankete çevirirdi. */
function _bagliTaniklik(body, data) {
  const kutu = body.querySelector('#gb-witness');
  if (!kutu) return;
  kutu.addEventListener('click', (ev) => {
    const btn = ev.target?.closest?.('.gb-witness-btn');
    if (!btn) return;
    const durum = btn.dataset.durum;
    const t0 = data.temeller ? { kalip: data.temeller.kalip, enZayif: data.temeller.enZayif } : null;
    let kayit = null;
    try { kayit = window.rvTanikKaydet?.(durum, t0); } catch (_) {}
    if (!kayit) return;
    try { window.fxCue?.('muhur'); } catch (_) {}
    kutu.outerHTML = `<p class="doc-note doc-note--gold">${escapeHTML(
      t('gb.witness_thanks', 'Yazıldı. Bir sonraki ayna bu sözü taşır.'))}</p>`;
  });
}

/** Paylaş butonu — kartı 13g çizer, bu modül yalnız veriyi verir.
 *  Payload render'daki kapıyla AYNI fonksiyondan doğar: buton görünüyorsa
 *  kart da vardır; ikisi ayrı hesaplansaydı biri diğerini yalanlayabilirdi. */
function _bagliPaylas(body, data) {
  const btn = body.querySelector('#gb-share');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const kart = gbPaylasimKarti(data);
    if (!kart) return;
    try { window.shrShareStory?.(kart); } catch (_) {}
  });
}

/** Studio oda alt-satırı — wsSyncStudio çağırır (10s/13s kalıbı). */
export function gbSyncRoomSub() {
  const el = document.getElementById('studio-gecisaynasi-sub');
  if (!el) return;
  if (gbShouldShow()) { el.textContent = t('gb.sub_ready', 'yol hazır — 90 gün doldu'); return; }
  const remaining = gbDaysUntilReady();
  el.textContent = remaining > 0
    ? t('gb.sub_waiting', '{n} gün sonra').replace('{n}', remaining)
    : t('gb.sub_seen', 'geçmişine bak');
}

/* ── window expose (TDZ-güvenli, main.js import + init bağlar) ── */
if (typeof window !== 'undefined') {
  window.gbInit = gbInit;
  window.gbOpen = gbOpen;
  window.gbShouldShow = gbShouldShow;
  window.gbAccountAgeDays = gbAccountAgeDays;
  window.gbDaysUntilReady = gbDaysUntilReady;
  window.gbSyncRoomSub = gbSyncRoomSub;
  window.gbEnsureStyles = gbEnsureStyles;
  window.gbPaylasimKarti = gbPaylasimKarti;
}
