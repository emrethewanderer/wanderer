/* ═══════════════════════════════════════════════════════════════════
   10C — KİŞİLERİN KİŞİLERİ · Sosyal Feed (Geçiş Kartım paylaşımları)
   ───────────────────────────────────────────────────────────────────
   FELSEFE: "Mesele Sensin" tezi başkaları üzerinden değil sende
   yankılanır. Ama "olmak istediğim kişi"yi tasarlarken başka gezginlerin
   nasıl bir kişiyi seçtiğini görmek bir kıvılcımdır — onlardan birinin
   kartı sende de bir şeyin adını koyabilir.
   2026-06-21 — paylaşılan kartlar artık 10A "Geçiş Kartım"ın lapis
   kutbudur (eski "İlham Kartı" sınıfı 10A omurgasına gömüldü).
   `kind:'ilham'` DB enum geri uyum için korundu.

   VİZYON (Emre): Sosyal feed bir takipçi sayacı değil — paylaşılan
   kartlar bir "halka pazarı"dır. Gerçek ad yoktur, yalnız anonim
   wanderer-rumuzu (sabit, user_id türevli). Beğen / yorum yap /
   kendi koleksiyonuna ekle — üç ses. Hafta başı yeniden başlayan
   bir "EN BEĞENİLEN BU HAFTA" rafı en üstte; altında kronolojik akış.

   Üç görünüm:
   • #sosyal-view (kendi view) — bottom drawer + arşiv akışı
   • Kart detay overlay'i (yorumlar + tek tek kart sahnesi)
   • Boş-durum: "Henüz paylaşılan kart yok — sen ilk kıvılcımı ver"

   2.0 (2026-07-02 — Geçiş Kartım 2.0):
   • CSS statik eve taşındı → css/parts/sosyal.css (JS-enjekte stil YOK).
   • Dördüncü sessiz ses: ⚑ BİLDİR — iki-vuruşlu, halkayı korur;
     paylasim_raporlari + report_count (mig 025). Admin "HALKA ·
     RAPORLAR" sayfası (renderHalkaRaporlarAdmin) buradan beslenir.
   • Rumuz artık sunucu mührü (mig 025 BEFORE INSERT trigger'ı);
     client gönderimi yalnız migration'sız kurulum fallback'i.
   • Yeni paylaşımlar kind:'benim' (10A yazar); feed kind'a bakmaz.

   3.0 (2026-09-05 — İç Çalışma 12 · FAZ 11, sosyal bildirim altyapısı):
   • Oda köşesinde taze nokta (#ws-sf-pulse) — 09d/ws-om-pulse ve
     09h/ws-ay-pulse ile AYNI dil (`sfRefreshRoomPulse`, wsSyncStudio çağırır).
     Kartına biri dokunduysa yanar, halka pazarına girilince söner.
   • Sunucu tarafı (send-push) merdivenine 'sosyal' tipi eklendi — bu modül
     yalnız uygulama-içi işareti taşır, push metnini üretmez.

   Veri: paylasilan_kartlar / paylasim_begenileri / paylasim_yorumlari /
         paylasim_kayitlari / paylasim_raporlari + paylasilan_haftanin_topu
   ═══════════════════════════════════════════════════════════════════ */

import { S }                       from '../state.js';
import { sb }                      from '../config.js';
import { showToast, escapeHTML, SafeStorage }  from './00a-infrastructure.js';
import { t }                       from './15-i18n.js';

const PAGE_SIZE = 24;
/* Rozetin "görüldü" damgası — SafeStorage per-uid (09d/09h'nin lastSeenWeek
   kalıbıyla aynı dil, bkz. ws-om-pulse/ws-ay-pulse). */
const SOSYAL_GORULEN_KEY = 'etw_sosyal_gorulen_v1';

/* Tek kaynak: escapeHTML (00a). Eskiden bu modülün kendi ikizi vardı;
   ikizler birbirinden de farklıydı (bir kısmı tek tırnağı kaçırmıyordu). */
const esc = escapeHTML;

/* ── 12c motoruyla paylaşım kartı yüzü ─────────────────────────
   snapshot şeması: {baslik, whisper, glyph, virtue, dusunceler...} */
function _shareCardFace(snapshot, opts = {}) {
  const ikvCardFace = window.ikvCardFace;
  if (typeof ikvCardFace !== 'function') {
    return `<div class="sf-card-fallback"><div class="sf-cf-name">${esc(snapshot?.baslik || '')}</div></div>`;
  }
  return ikvCardFace(
    {
      id: 'sf_' + (snapshot?.baslik || 'kart'),
      name: snapshot?.baslik || t('gk.my_card_name', 'Geçiş Kartım'),
      whisper: snapshot?.whisper || '',
      virtue: snapshot?.virtue || 'odak',
      glyph: snapshot?.glyph || 'wanderer',
    },
    Object.assign({ palette: 'lapis', stage: 'pencere', kicker: t('gk.share_card_kicker', 'OLMAK İSTEDİĞİN'), sub: '' }, opts)
  );
}

/* ══════════════════════════════════════════════════════════════
   SUNUCUDAN VERİ — haftanın topu + akış + beğeni cache
══════════════════════════════════════════════════════════════ */
async function _fetchHaftaninTop(limit = 8) {
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from('paylasilan_haftanin_topu')
      .select('*')
      .limit(limit);
    if (error) { console.warn('haftaTop:', error.message); return []; }
    return Array.isArray(data) ? data : [];
  } catch (e) { console.warn('haftaTop:', e?.message); return []; }
}

async function _fetchFeed({ before = null, limit = PAGE_SIZE } = {}) {
  if (!sb) return [];
  try {
    let q = sb.from('paylasilan_kartlar')
      .select('*').eq('hidden', false)
      .order('shared_at', { ascending: false })
      .limit(limit);
    if (before) q = q.lt('shared_at', before);
    const { data, error } = await q;
    if (error) { console.warn('feed:', error.message); return []; }
    return Array.isArray(data) ? data : [];
  } catch (e) { console.warn('feed:', e?.message); return []; }
}

async function _hydrateLikedSet() {
  if (S._ilhamLikedSet) return;
  const uid = S.currentUser?.id;
  if (!sb || !uid) { S._ilhamLikedSet = new Set(); return; }
  try {
    const { data, error } = await sb.from('paylasim_begenileri')
      .select('card_id').eq('user_id', uid);
    S._ilhamLikedSet = new Set((data || []).map(r => r.card_id));
  } catch (_) { S._ilhamLikedSet = new Set(); }
}

async function _hydrateSavedSet() {
  if (S._ilhamSavedSet) return;
  const uid = S.currentUser?.id;
  if (!sb || !uid) { S._ilhamSavedSet = new Set(); return; }
  try {
    const { data, error } = await sb.from('paylasim_kayitlari')
      .select('card_id').eq('user_id', uid);
    S._ilhamSavedSet = new Set((data || []).map(r => r.card_id));
  } catch (_) { S._ilhamSavedSet = new Set(); }
}

async function _hydrateReportedSet() {
  if (S._ilhamReportedSet) return;
  const uid = S.currentUser?.id;
  if (!sb || !uid) { S._ilhamReportedSet = new Set(); return; }
  try {
    const { data } = await sb.from('paylasim_raporlari')
      .select('card_id').eq('user_id', uid);
    S._ilhamReportedSet = new Set((data || []).map(r => r.card_id));
  } catch (_) { S._ilhamReportedSet = new Set(); }
}

/* ══════════════════════════════════════════════════════════════
   BEĞENİ / YORUM / KOPYALA (saf işlem fonksiyonları)
══════════════════════════════════════════════════════════════ */
export async function sfToggleLike(cardId) {
  const uid = S.currentUser?.id;
  if (!sb || !uid) { showToast?.(t('gk.toast_login_first', 'Önce giriş yap')); return null; }
  await _hydrateLikedSet();
  const liked = S._ilhamLikedSet.has(cardId);
  try {
    if (liked) {
      await sb.from('paylasim_begenileri').delete()
        .eq('user_id', uid).eq('card_id', cardId);
      S._ilhamLikedSet.delete(cardId);
      return false;
    } else {
      await sb.from('paylasim_begenileri').insert([{ user_id: uid, card_id: cardId }]);
      S._ilhamLikedSet.add(cardId);
      return true;
    }
  } catch (e) { console.warn('sfLike:', e?.message); return null; }
}

export async function sfPostComment(cardId, body) {
  const uid = S.currentUser?.id;
  if (!sb || !uid) { showToast?.(t('gk.toast_login_first', 'Önce giriş yap')); return null; }
  const clean = String(body || '').trim().slice(0, 600);
  if (clean.length < 1) return null;
  /* Ön süzgeç (10F) — yorum herkese açık akışa iner; kimlik bilgisi ve kriz
     yayın ANINDA tutulur, sonradan gelen ⚑ raporuyla değil (İç Çalışma 12·A).
     Geçmezse INSERT hiç denenmez: yayınlanmamış bir satırı geri almak yoktur. */
  const sz = window.szDenetle?.(clean);
  if (sz && sz.gecer === false) { showToast?.(sz.mesaj, true); return null; }
  const r = window.ilhamRumuz?.() || { name: 'GEZGİN', color: '#F5A623' };
  try {
    const { data, error } = await sb.from('paylasim_yorumlari').insert([{
      user_id: uid, card_id: cardId, rumuz: r.name, rumuz_color: r.color, body: clean,
    }]).select('*').single();
    if (error) { console.warn('sfComment:', error.message); return null; }
    return data;
  } catch (e) { console.warn('sfComment:', e?.message); return null; }
}

/* ⚑ Bildir — sessiz koruma. Kullanıcı-başına-kart tek rapor (DB UNIQUE);
   report_count trigger'ı artar, admin "HALKA · RAPORLAR"da görür. */
export async function sfReportCard(cardId) {
  const uid = S.currentUser?.id;
  if (!sb || !uid) { showToast?.(t('gk.toast_login_first', 'Önce giriş yap')); return null; }
  await _hydrateReportedSet();
  if (S._ilhamReportedSet.has(cardId)) return 'already';
  try {
    const { error } = await sb.from('paylasim_raporlari')
      .insert([{ user_id: uid, card_id: cardId, reason: '' }]);
    if (error) {
      // 23505 = UNIQUE ihlali — başka cihazdan zaten bildirilmiş; "zaten" say
      if (error.code === '23505') { S._ilhamReportedSet.add(cardId); return 'already'; }
      console.warn('sfReport:', error.message);
      return null;
    }
    S._ilhamReportedSet.add(cardId);
    return true;
  } catch (e) { console.warn('sfReport:', e?.message); return null; }
}

/* "Bana" eylemi — paylasim_kayitlari'na INSERT (save_count trigger'ı artar),
   ardından 10A Atölye'sini bu kart snapshot'ından bir tohumla aç:
   kullanıcı kendi iki kutuplu Geçiş Kartım'ını kazır.
   Eski `paylasilan_kart_kopyala` RPC + `ilham_kartlari` tablosuna doğrudan
   klonlama akışı 2026-06-21'de emekli; tek kart şeması 10A. */
export async function sfCopyToMine(cardId) {
  const uid = S.currentUser?.id;
  if (!sb || !uid) { showToast?.(t('gk.toast_login_first', 'Önce giriş yap')); return null; }
  await _hydrateSavedSet();
  if (S._ilhamSavedSet.has(cardId)) {
    showToast?.(t('sf.already_saved', 'Bu kartı zaten koleksiyonuna aldın'));
    return null;
  }
  try {
    const { error } = await sb.from('paylasim_kayitlari')
      .insert([{ user_id: uid, card_id: cardId }]);
    if (error) { console.warn('sfCopy:', error.message); showToast?.(t('sf.add_failed', 'Eklenemedi')); return null; }
    S._ilhamSavedSet.add(cardId);
    // Paylaşım Nabzı: feed'den koleksiyona kopyalama GERÇEKTEN tamamlandı (12·C).
    try { window.wtLogPaylasim?.('kopyala', { tur: 'kart' }); } catch (_) {}

    // Kart snapshot'ından Atölye tohumu kur → 10A iki kutuplu omurgada doğsun
    const card = _viewState.feed.find(c => c.id === cardId) || _viewState.top.find(c => c.id === cardId);
    const snap = card?.card_snapshot || {};
    const seedBits = [snap.baslik, snap.whisper,
      ...(Array.isArray(snap.davranislar) ? snap.davranislar.slice(0, 2)
        .map(e => typeof e === 'string' ? e : (e?.text || '')) : [])
    ].filter(Boolean).join(' · ').slice(0, 280);
    setTimeout(() => {
      try { window.gkOnboard?.(seedBits || t('sf.seed_fallback', 'İlham aldığım bir kart'), { source: 'sohbet' }); }
      catch (_) {}
    }, 60);

    showToast?.(t('sf.workshop_opening', "Atölye açılıyor — kendi Geçiş Kartım'ını kaz"));
    return cardId;
  } catch (e) { console.warn('sfCopy:', e?.message); return null; }
}

/* ══════════════════════════════════════════════════════════════
   SIRALAMA — saf, test edilebilir (haftalık top için fallback)
══════════════════════════════════════════════════════════════ */
export function _rankScore(card) {
  return (card.like_count || 0) * 2 + (card.comment_count || 0) + (card.save_count || 0);
}

export function _sortByRank(cards) {
  return [...(cards || [])].sort((a, b) => {
    const sa = _rankScore(a), sb = _rankScore(b);
    if (sa !== sb) return sb - sa;
    return String(b.shared_at || '').localeCompare(String(a.shared_at || ''));
  });
}

/* ══════════════════════════════════════════════════════════════
   ROZET — oda köşesindeki taze nokta (ws-sf-pulse)
   ───────────────────────────────────────────────────────────
   09d/09h'nin ".ws-XX-pulse" kalıbıyla AYNI dil (oruntu.css/ayna-ani.css'in
   kendi yorumlarının dediği gibi): kartına biri dokunduysa (beğeni/yorum)
   sessiz bir işaret yanar, halka pazarına girildiğinde söner. Rozet bir
   sahne değil bir işarettir — 13B tören kuyruğuna hiç sormaz.

   RLS TUZAĞI (dosya başındaki not: "Sayaçlar paylasilan_kartlar'ın trigger
   kolonlarından okunur; client kendi satırını çeker"): `paylasim_begenileri`
   RLS'i yalnız "own read" verir (`user_id = auth.uid()`) — bu istemci
   başkasının beğeni SATIRINI hiç göremez, `neq('user_id', uid)` filtresi
   RLS'ten SONRA hiç etki etmeyen ölü bir filtre olurdu. Yorum tablosu ise
   herkese açıktır (`all read`, `hidden=false`) — o yüzden iki sinyal FARKLI
   yollardan okunur: yorum satır bazında (gerçek), beğeni AGREGAT sayaç
   delta'sıyla (`like_count` — herkese açık tek beğeni kanalı). */
function _sosyalGorulenKey() {
  return `${SOSYAL_GORULEN_KEY}_${(S.currentUser && S.currentUser.id) || 'anon'}`;
}
function _sosyalBegeniTabanKey() {
  return `etw_sosyal_begeni_taban_v1_${(S.currentUser && S.currentUser.id) || 'anon'}`;
}

/** Kullanıcının paylaştığı kartlar — id + herkese açık beğeni sayacı. */
async function _sosyalKendiKartlari(uid) {
  try {
    const { data } = await sb.from('paylasilan_kartlar').select('id, like_count').eq('owner_user_id', uid);
    return data || [];
  } catch (_) { return []; }
}

/** Rozetin "görüldü" damgasını VE beğeni tabanını şimdiki duruma çeker —
 *  loadSosyalView girişinde ve ilk hiç-görülmemiş çalıştırmada çağrılır. */
function _sosyalGorulduIsaretle(kartlar) {
  const toplam = (kartlar || []).reduce((s, k) => s + (k.like_count || 0), 0);
  SafeStorage.set(_sosyalGorulenKey(), new Date().toISOString());
  SafeStorage.set(_sosyalBegeniTabanKey(), toplam);
}

/** Kartlarına son görüldüğünden SONRA biri dokundu mu (kendi etkileşimi
 *  hariç). İlk çalıştırmada damga yoksa geçmişi "yeni" saymayız — damga
 *  şimdi kurulur, yalnız BUNDAN SONRAKİ etkileşimler işaretlenir (§6.10:
 *  uydurulmuş bir geçmiş aciliyet üretilmez). */
async function _sosyalYeniEtkilesimVarMi() {
  const uid = S.currentUser?.id;
  if (!sb || !uid) return false;
  try {
    const kartlar = await _sosyalKendiKartlari(uid);
    if (!kartlar.length) return false;

    const gorulen = SafeStorage.get(_sosyalGorulenKey());
    if (!gorulen) { _sosyalGorulduIsaretle(kartlar); return false; }

    const cardIds = kartlar.map(k => k.id);
    const { data: yorum } = await sb.from('paylasim_yorumlari').select('id')
      .in('card_id', cardIds).gt('created_at', gorulen).neq('user_id', uid).limit(1);
    if (yorum?.length) return true;

    const toplam = kartlar.reduce((s, k) => s + (k.like_count || 0), 0);
    const taban = SafeStorage.get(_sosyalBegeniTabanKey(), 0);
    return toplam > taban;
  } catch (e) { console.warn('sfRozet:', e?.message); return false; }
}

/** Studio oda köşesindeki taze noktayı günceller — wsSyncStudio çağırır
 *  (09d omRefreshRoomSub / 09h ayRefreshRoomSub kalıbı). Nokta DOM'da yoksa
 *  (henüz "Bugün" ekranına gelinmedi) sessizce düşer. */
export async function sfRefreshRoomPulse() {
  const pulse = document.getElementById('ws-sf-pulse');
  if (!pulse) return;
  const yeni = await _sosyalYeniEtkilesimVarMi();
  pulse.classList.toggle('active', yeni);
  /* ROZETİN "METNİ" ERİŞİLEBİLİR ADIDIR (FAZ 12). Nokta yalnız görsel bir
     sinyaldi: boş bir `<span>` ekran okuyucuda hiç duyurulmaz, yani haber
     yalnız GÖREN kullanıcıya ulaşıyordu. Ad JS'ten verilir, `data-i18n-aria`
     ile DEĞİL: statik bir anahtar sönükken de duyururdu (`opacity: 0` ekran
     okuyucuyu susturmaz) ve tests/15-i18n-aria.test.js zaten JS-yönetimli
     elemanlara statik anahtar takılmasını yasaklıyor. Sönerken ad KALKAR —
     olmayan bir haberi duyurmayız (§6.10). Metin de push'la aynı sınırı
     taşır: sayı yok, kimlik yok, dokunuşun türü yok. */
  if (yeni) pulse.setAttribute('aria-label', t('sf.rozet.aria', 'Kartında yeni bir dokunuş var'));
  else pulse.removeAttribute('aria-label');
}

/* ══════════════════════════════════════════════════════════════
   ANA GÖRÜNÜM — Kişilerin Kişileri (view loader)
══════════════════════════════════════════════════════════════ */
let _viewState = { feed: [], top: [], lastCursor: null, loading: false, ended: false };

export async function loadSosyalView() {
  const body = document.getElementById('sosyal-body');
  if (!body) return;

  body.innerHTML = `
    <div class="sf-loading">
      <div class="sf-loading-sigil" aria-hidden="true">✦</div>
      <div class="sf-loading-txt">${t('sf.loading', 'Halka pazarı yükleniyor…')}</div>
    </div>`;

  // Halka pazarına girildi — rozetin "görüldü" damgasını VE beğeni tabanını
  // şimdiye çek (09d'nin panel-açılışında lastSeenWeek'i güncellemesiyle aynı an).
  try {
    const uid = S.currentUser?.id;
    if (uid && sb) _sosyalGorulduIsaretle(await _sosyalKendiKartlari(uid));
    document.getElementById('ws-sf-pulse')?.classList.remove('active');
  } catch (_) {}

  // Hidrasyon
  await Promise.all([_hydrateLikedSet(), _hydrateSavedSet()]);
  _viewState = { feed: [], top: [], lastCursor: null, loading: false, ended: false };

  const [top, feed] = await Promise.all([
    _fetchHaftaninTop(8),
    _fetchFeed({ limit: PAGE_SIZE }),
  ]);
  _viewState.top = top;
  _viewState.feed = feed;
  _viewState.lastCursor = feed.length ? feed[feed.length - 1].shared_at : null;
  _viewState.ended = feed.length < PAGE_SIZE;

  _renderView(body);
}

function _renderView(body) {
  const top = _viewState.top;
  const feed = _viewState.feed;

  const myRumuz = window.ilhamRumuz?.() || { name: 'GEZGİN', color: '#F5A623' };

  const topRail = top.length ? `
    <div class="sf-sec sf-sec--top" data-reveal>
      <div class="sf-sec-head">
        <div class="sf-sec-kicker">${t('sf.top.kicker', 'EN BEĞENİLEN BU HAFTA')}</div>
        <div class="sf-sec-sub">${t('sf.top.sub', 'Bu hafta en çok titreşim alan kartlar')}</div>
      </div>
      <div class="sf-top-rail">
        ${top.map((c, i) => _topRailCellHTML(c, i)).join('')}
      </div>
    </div>` : '';

  const feedGrid = feed.length ? `
    <div class="sf-sec sf-sec--feed" data-reveal style="--reveal-i:1">
      <div class="sf-sec-head">
        <div class="sf-sec-kicker">${t('sf.feed.kicker', 'HALKA')}</div>
        <div class="sf-sec-sub">${t('sf.feed.sub', 'Gezginlerin paylaştığı kartlar')}</div>
      </div>
      <div class="sf-feed-grid">
        ${feed.map((c, i) => _feedCellHTML(c, i)).join('')}
      </div>
      ${!_viewState.ended ? `
        <div class="sf-more-wrap">
          <button class="ik-btn ik-btn--ghost" id="sf-load-more">${t('sf.more', 'Daha fazla')}</button>
        </div>` : ''}
    </div>` : '';

  const empty = (!top.length && !feed.length) ? `
    <div class="sf-empty">
      <div class="sf-empty-kicker">${t('sf.title_kicker', 'KİŞİLERİN KİŞİLERİ')}</div>
      <div class="sf-empty-title">${t('sf.empty.title', 'Henüz paylaşılan kart yok.')}</div>
      <p class="sf-empty-sub">${t('sf.empty.sub', "Atölye'de kazıdığın bir Geçiş Kartım'ı paylaştığında, anonim rumuzunla burada doğar.")}</p>
      <button class="ik-btn ik-btn--seal" onclick="switchView('bugun')">
        ${t('sf.empty.cta', "Bugün'e Git")}
      </button>
    </div>` : '';

  body.innerHTML = `
    <div class="sf-head">
      <div class="sf-head-kicker">${t('sf.title_kicker', 'KİŞİLERİN KİŞİLERİ')}</div>
      <h2 class="sf-head-title">${t('sf.head.title', 'Halka pazarı')}</h2>
      <p class="sf-head-tag">${t('sf.head.tag', 'Gezginlerin yarattığı "olmak istediği kişi" kartları — gerçek isim yok, yalnız {rumuz} gibi anonim rumuzlar.').replace('{rumuz}', `<span class="sf-rumuz" style="--rmz:${esc(myRumuz.color)};">${esc(myRumuz.name)}</span>`)}</p>
    </div>
    ${topRail}
    ${feedGrid}
    ${empty}
  `;

  // Bölümler kaydırıldıkça uyansın (00a wnRevealScan). innerHTML her
  // "daha fazla"da yeniden kurulduğu için tarama da burada tekrarlanır;
  // motor kendi çift-gözlem korumasını taşır (data-wn-reveal-on).
  try { window.wnRevealScan?.(body); } catch (_) {}

  // Beğeni / yorum / kopyala / aç delegasyonu — onclick (addEventListener değil):
  // _renderView her "daha fazla"da yeniden çağrılır; onclick mükerrer dinleyici
  // birikimini engeller.
  body.onclick = _onBodyClick;

  // Daha fazla yükle
  body.querySelector('#sf-load-more')?.addEventListener('click', async () => {
    const btn = body.querySelector('#sf-load-more');
    if (!btn || _viewState.loading) return;
    btn.disabled = true; btn.textContent = t('wg.admin.loading', 'Yükleniyor…');
    _viewState.loading = true;
    const more = await _fetchFeed({ before: _viewState.lastCursor, limit: PAGE_SIZE });
    _viewState.feed = _viewState.feed.concat(more);
    _viewState.lastCursor = more.length ? more[more.length - 1].shared_at : _viewState.lastCursor;
    _viewState.ended = more.length < PAGE_SIZE;
    _viewState.loading = false;
    _renderView(body);
  });
}

function _onBodyClick(e) {
  const t = e.target.closest('[data-sf]');
  if (!t) return;
  const act = t.dataset.sf;
  const id  = +t.dataset.id;
  if (!id) return;
  if (act === 'open')  sfOpenCardDetail(id);
  if (act === 'like')  _handleLikeClick(t, id);
  if (act === 'copy')  _handleCopyClick(t, id);
}

async function _handleLikeClick(btnEl, id) {
  const before = !!S._ilhamLikedSet?.has(id);
  const after = await sfToggleLike(id);
  if (after === null) return;
  // Optimistic UI — say
  const card = _viewState.feed.find(c => c.id === id) || _viewState.top.find(c => c.id === id);
  if (card) card.like_count = Math.max(0, (card.like_count || 0) + (after ? 1 : -1));
  _refreshCellLikeUI(id);
}

async function _handleCopyClick(btnEl, id) {
  btnEl.disabled = true;
  const newId = await sfCopyToMine(id);
  if (newId) {
    const card = _viewState.feed.find(c => c.id === id) || _viewState.top.find(c => c.id === id);
    if (card) card.save_count = (card.save_count || 0) + 1;
    btnEl.classList.add('sf-act--done');
    btnEl.querySelector('.sf-act-txt').textContent = t('sf.added', '✓ Eklendi');
  } else {
    btnEl.disabled = false;
  }
}

function _refreshCellLikeUI(id) {
  document.querySelectorAll(`[data-sf-cell="${id}"]`).forEach(cell => {
    const liked = !!S._ilhamLikedSet?.has(id);
    const card = _viewState.feed.find(c => c.id === id) || _viewState.top.find(c => c.id === id);
    if (!card) return;
    const cnt = cell.querySelector('.sf-like-count');
    if (cnt) cnt.textContent = String(card.like_count || 0);
    const btn = cell.querySelector('[data-sf="like"]');
    if (btn) btn.classList.toggle('sf-act--on', liked);
  });
}

/* ── Top rail (haftanın topu) — büyük yüzde mini kart + sayılar ─ */
function _topRailCellHTML(c, i) {
  const liked = !!S._ilhamLikedSet?.has(c.id);
  const saved = !!S._ilhamSavedSet?.has(c.id);
  return `
    <article class="sf-top-cell" data-sf-cell="${c.id}" style="--i:${Math.min(i | 0, 24)}">
      <button class="sf-card-btn" data-sf="open" data-id="${c.id}" aria-label="Aç">
        <div class="sf-top-card">${_shareCardFace(c.card_snapshot)}</div>
      </button>
      <div class="sf-cell-meta">
        <span class="sf-cell-rumuz" style="--rmz:${esc(c.rumuz_color || '#F5A623')};">${esc(c.rumuz)}</span>
        <span class="sf-cell-score">✦ ${(c.like_count|0) + (c.comment_count|0) + (c.save_count|0)}</span>
      </div>
      <div class="sf-acts">
        <button class="sf-act ${liked ? 'sf-act--on' : ''}" data-sf="like" data-id="${c.id}" aria-label="Beğen">
          <span aria-hidden="true">♥</span>
          <span class="sf-like-count">${c.like_count|0}</span>
        </button>
        <button class="sf-act" data-sf="open" data-id="${c.id}" aria-label="Yorumlar">
          <span aria-hidden="true">✎</span>
          <span>${c.comment_count|0}</span>
        </button>
        <button class="sf-act ${saved ? 'sf-act--done' : ''}" data-sf="copy" data-id="${c.id}" aria-label="Koleksiyonuma">
          <span aria-hidden="true">+</span>
          <span class="sf-act-txt">${saved ? t('sf.added', '✓ Eklendi') : t('sf.to_me', 'Bana')}</span>
        </button>
      </div>
    </article>`;
}

/* ── Feed cell — ızgara hücresi ─────────────────────────────── */
function _feedCellHTML(c, i) {
  const liked = !!S._ilhamLikedSet?.has(c.id);
  const saved = !!S._ilhamSavedSet?.has(c.id);
  return `
    <article class="sf-feed-cell" data-sf-cell="${c.id}" style="--i:${Math.min(i | 0, 24)}">
      <button class="sf-card-btn" data-sf="open" data-id="${c.id}" aria-label="Aç">
        ${_shareCardFace(c.card_snapshot, { mini: true })}
      </button>
      <div class="sf-cell-meta">
        <span class="sf-cell-rumuz" style="--rmz:${esc(c.rumuz_color || '#F5A623')};">${esc(c.rumuz)}</span>
      </div>
      <div class="sf-acts">
        <button class="sf-act ${liked ? 'sf-act--on' : ''}" data-sf="like" data-id="${c.id}" aria-label="Beğen">
          <span aria-hidden="true">♥</span>
          <span class="sf-like-count">${c.like_count|0}</span>
        </button>
        <button class="sf-act" data-sf="open" data-id="${c.id}" aria-label="Yorumlar">
          <span aria-hidden="true">✎</span>
          <span>${c.comment_count|0}</span>
        </button>
        <button class="sf-act ${saved ? 'sf-act--done' : ''}" data-sf="copy" data-id="${c.id}" aria-label="Koleksiyonuma">
          <span aria-hidden="true">+</span>
          <span class="sf-act-txt">${saved ? '✓' : t('sf.to_me', 'Bana')}</span>
        </button>
      </div>
    </article>`;
}

/* ══════════════════════════════════════════════════════════════
   KART DETAY OVERLAY — büyük kart + tüm yorumlar + yorum yaz
══════════════════════════════════════════════════════════════ */
export async function sfOpenCardDetail(cardId) {
  if (!sb) return;
  await Promise.all([_hydrateLikedSet(), _hydrateSavedSet(), _hydrateReportedSet()]);

  // Kartı viewState'ten al; yoksa direkt çek
  let card = _viewState.feed.find(c => c.id === cardId) || _viewState.top.find(c => c.id === cardId);
  if (!card) {
    try {
      const { data } = await sb.from('paylasilan_kartlar').select('*').eq('id', cardId).single();
      card = data;
    } catch (_) {}
  }
  if (!card) { showToast?.(t('sf.card_not_found', 'Kart bulunamadı')); return; }

  const overlay = document.createElement('div');
  overlay.className = 'onb-ritual sf-detail-overlay';
  overlay.id = 'sf-detail-' + cardId;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('onb-open'));

  // ⚑ metinleri — click handler'da `t` DOM elementiyle gölgelenir; burada çöz
  const RPT = {
    report: t('sf.report', 'Bildir'),
    arm:    t('sf.report_arm', 'Emin misin? Bir daha dokun'),
    done:   t('sf.reported_short', 'Bildirildi'),
    toast:  t('sf.reported_toast', 'Bildirildi — sessizce bakacağız.'),
  };

  overlay.innerHTML = `
    <div class="sf-detail-stage">
      <button class="sf-detail-close" data-act="close" aria-label="Kapat">×</button>
      <div class="sf-detail-card-wrap">${_shareCardFace(card.card_snapshot)}</div>
      <div class="sf-detail-meta">
        <span class="sf-cell-rumuz" style="--rmz:${esc(card.rumuz_color || '#F5A623')};">${esc(card.rumuz)}</span>
        <span class="sf-detail-when">${esc(_humanTime(card.shared_at))}</span>
      </div>
      <div class="sf-detail-snap">${_renderSnapshotBody(card.card_snapshot)}</div>

      <div class="sf-detail-acts">
        <button class="sf-act sf-act--lg ${S._ilhamLikedSet?.has(cardId) ? 'sf-act--on' : ''}"
                data-sf="like" data-id="${cardId}">
          <span aria-hidden="true">♥</span>
          <span class="sf-like-count">${card.like_count|0}</span>
        </button>
        <button class="sf-act sf-act--lg ${S._ilhamSavedSet?.has(cardId) ? 'sf-act--done' : ''}"
                data-sf="copy" data-id="${cardId}">
          <span aria-hidden="true">+</span>
          <span class="sf-act-txt">${S._ilhamSavedSet?.has(cardId) ? t('sf.added', '✓ Eklendi') : t('sf.to_me', 'Bana')}</span>
        </button>
      </div>
      <div class="sf-detail-foot">
        ${S._ilhamReportedSet?.has(cardId)
          ? `<span class="sf-report sf-report--done">⚑ ${t('sf.reported_short', 'Bildirildi')}</span>`
          : `<button class="sf-report" data-sf="report" data-id="${cardId}"
                     aria-label="${esc(t('sf.report_aria', 'Bu kartı bildir'))}">⚑ ${t('sf.report', 'Bildir')}</button>`}
      </div>

      <section class="sf-comments">
        <div class="sf-comments-head">${t('sf.comments', 'YORUMLAR')} · <span id="sf-comment-count">${card.comment_count|0}</span></div>
        <div class="sf-comments-list" id="sf-comments-list">
          <div class="sf-loading-txt">${t('wg.admin.loading', 'Yükleniyor…')}</div>
        </div>
        <form class="sf-comment-form" id="sf-comment-form">
          <textarea class="sf-comment-inp" id="sf-comment-inp" maxlength="600"
                    placeholder="${esc(t('sf.comment_ph', 'Bir yorum bırak (anonim rumuzunla görünecek)…'))}"></textarea>
          <button class="ik-btn ik-btn--seal" type="submit">${t('sf.add_comment', 'Yorum Ekle')}</button>
        </form>
      </section>
    </div>`;

  // Yorumları çek + bas
  try {
    const { data } = await sb.from('paylasim_yorumlari').select('*')
      .eq('card_id', cardId).order('created_at', { ascending: true });
    _renderComments(overlay, data || []);
  } catch (_) {
    _renderComments(overlay, []);
  }

  // Aksiyon delegasyonu — detay sayfası kendi (standalone) like/copy işleyicisi
  // kullanır; _handleLikeClick feed hücrelerine özgüdür ve burada çağrılırsa
  // sayaç çift güncellenirdi.
  overlay.addEventListener('click', async e => {
    const close = e.target.closest('[data-act="close"]');
    if (close) { _closeOverlay(overlay); return; }
    const t = e.target.closest('[data-sf]');
    if (!t) return;
    const act = t.dataset.sf;
    const id  = +t.dataset.id;
    if (act === 'like') {
      if (t.disabled) return;
      t.disabled = true;
      const after = await sfToggleLike(id);   // true=beğenildi, false=geri alındı, null=hata
      t.disabled = false;
      if (after === null) return;
      card.like_count = Math.max(0, (card.like_count || 0) + (after ? 1 : -1));
      const cnt = t.querySelector('.sf-like-count');
      if (cnt) cnt.textContent = String(card.like_count);
      t.classList.toggle('sf-act--on', after);
      _refreshCellLikeUI(id);                 // feed'deki aynı kartı da senkronla
    } else if (act === 'copy') {
      _handleCopyClick(t, id);
    } else if (act === 'report') {
      // İki-vuruşlu sessiz bildirim (10A "yolu bırak" kalıbı — yanlış tık
      // koruması). NOT: bu handler'da `t` DOM elementi (closest sonucu) —
      // i18n metinleri RPT closure'ında önceden çözüldü.
      if (!t.classList.contains('sf-report--armed')) {
        t.classList.add('sf-report--armed');
        t.textContent = '⚑ ' + RPT.arm;
        setTimeout(() => {
          if (t.isConnected && t.classList.contains('sf-report--armed')) {
            t.classList.remove('sf-report--armed');
            t.textContent = '⚑ ' + RPT.report;
          }
        }, 4000);
        return;
      }
      t.disabled = true;
      const res = await sfReportCard(id);
      if (res === true || res === 'already') {
        if (res === true) card.report_count = (card.report_count || 0) + 1;
        t.outerHTML = `<span class="sf-report sf-report--done">⚑ ${esc(RPT.done)}</span>`;
        showToast?.(RPT.toast);
      } else {
        t.disabled = false;
        t.classList.remove('sf-report--armed');
        t.textContent = '⚑ ' + RPT.report;
      }
    }
  });

  // Yorum gönder
  overlay.querySelector('#sf-comment-form')?.addEventListener('submit', async ev => {
    ev.preventDefault();
    const inp = overlay.querySelector('#sf-comment-inp');
    if (!inp) return;
    const v = inp.value.trim();
    if (!v) return;
    inp.disabled = true;
    const row = await sfPostComment(cardId, v);
    inp.disabled = false;
    if (row) {
      inp.value = '';
      const list = overlay.querySelector('#sf-comments-list');
      const isEmpty = list.querySelector('.sf-loading-txt') || list.querySelector('.sf-empty-comments');
      if (isEmpty) list.innerHTML = '';
      list.insertAdjacentHTML('beforeend', _commentRowHTML(row));
      const cc = overlay.querySelector('#sf-comment-count');
      if (cc) cc.textContent = String(((+cc.textContent || 0) + 1));
      card.comment_count = (card.comment_count || 0) + 1;
    }
  });
}

function _renderComments(overlay, rows) {
  const list = overlay.querySelector('#sf-comments-list');
  if (!list) return;
  if (!rows.length) {
    list.innerHTML = `<div class="sf-empty-comments">${t('sf.first_comment', '— ilk yorum senin olsun —')}</div>`;
    return;
  }
  list.innerHTML = rows.map(_commentRowHTML).join('');
}

function _commentRowHTML(row) {
  return `<article class="sf-comment-row">
    <header class="sf-comment-head">
      <span class="sf-cell-rumuz" style="--rmz:${esc(row.rumuz_color || '#F5A623')};">${esc(row.rumuz)}</span>
      <span class="sf-detail-when">${esc(_humanTime(row.created_at))}</span>
    </header>
    <div class="sf-comment-body">${esc(row.body)}</div>
  </article>`;
}

function _renderSnapshotBody(snap) {
  if (!snap) return '';
  const CAT = [
    { key: 'dusunceler',  badge: t('por.cat.dusunceler.badge', 'DÜŞÜNCELER'),   sigil: '☉' },
    { key: 'inanclar',    badge: t('por.cat.inanclar.badge', 'İNANÇLAR'),       sigil: '✷' },
    { key: 'duygular',    badge: t('por.cat.duygular.badge', 'DUYGULAR'),       sigil: '❍' },
    { key: 'davranislar', badge: t('por.cat.davranislar.badge', 'DAVRANIŞLAR'), sigil: '✺' },
  ];
  const blocks = CAT.map(c => {
    const arr = snap[c.key];
    if (!Array.isArray(arr) || !arr.length) return '';
    const items = arr.map(e => `<li>${esc(e?.text || e || '')}</li>`).join('');
    return `<section class="sf-snap-cat">
      <div class="sf-snap-cat-head"><span>${c.sigil}</span><span>${c.badge}</span></div>
      <ul>${items}</ul></section>`;
  }).filter(Boolean).join('');
  return blocks || '';
}

function _closeOverlay(overlay) {
  overlay.classList.add('onb-closing');
  setTimeout(() => overlay.remove(), 280);
}

function _humanTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(+d)) return '';
  try { return new Intl.DateTimeFormat(S._currentLang || 'tr', { dateStyle: 'medium', timeStyle: 'short' }).format(d); }
  catch (_) { return ''; }
}

/* ══════════════════════════════════════════════════════════════
   ADMIN — HALKA · RAPORLAR (moderasyon listesi)
   ───────────────────────────────────────────────────────────
   switchAdmin('halka-raporlar') → bu render. report_count>0 olan
   (ya da hâlihazırda gizlenmiş) kartlar; Gizle/Aç + Raporları temizle.
   Admin metinleri TR — diğer admin sayfalarıyla aynı konvansiyon.
   Stil evi: css/parts/sosyal.css (.hr-*).
══════════════════════════════════════════════════════════════ */
export async function renderHalkaRaporlarAdmin() {
  const host = document.getElementById('halka-raporlar-host');
  if (!host || !sb) return;
  host.innerHTML = '<div class="sf-loading-txt">Yükleniyor…</div>';

  let rows = [];
  try {
    const { data, error } = await sb.from('paylasilan_kartlar')
      .select('*')
      .or('report_count.gt.0,hidden.eq.true')
      .order('report_count', { ascending: false })
      .order('shared_at', { ascending: false })
      .limit(60);
    if (error) {
      // report_count kolonu yoksa migration koşmamıştır — net söyle
      host.innerHTML = '<div class="hr-empty">Liste alınamadı: ' + esc(error.message) +
        '<br>mig 025 uygulandı mı? (SETUP-GECIS-KARTIM.md)</div>';
      return;
    }
    rows = Array.isArray(data) ? data : [];
  } catch (e) {
    host.innerHTML = '<div class="hr-empty">Liste alınamadı.</div>';
    return;
  }

  if (!rows.length) {
    host.innerHTML = '<div class="hr-empty">Bildirilen kart yok — halka temiz. ✦</div>';
    return;
  }

  host.innerHTML = '<div class="hr-list">' + rows.map(c => {
    const rc = c.report_count | 0;
    const reportPill = rc > 0
      ? `<span class="doc-pill ${rc >= 3 ? 'doc-pill--crit' : 'doc-pill--high'}">${rc} RAPOR</span>`
      : '';
    const hiddenPill = c.hidden ? `<span class="doc-pill doc-pill--crit">GİZLİ</span>` : '';
    return `
    <article class="hr-row ${c.hidden ? 'hr-row--hidden' : ''}" data-hr-cell="${c.id}">
      <div class="hr-card">${_shareCardFace(c.card_snapshot, { mini: true })}</div>
      <div class="hr-info">
        <div class="hr-name">${esc(c.card_snapshot?.baslik || '—')}</div>
        <div class="hr-meta">
          <span class="sf-cell-rumuz" style="--rmz:${esc(c.rumuz_color || '#F5A623')};">${esc(c.rumuz)}</span>
          ${reportPill}
          <span>♥ ${c.like_count | 0} · ✎ ${c.comment_count | 0} · + ${c.save_count | 0}</span>
          <span>${esc(_humanTime(c.shared_at))}</span>
          ${hiddenPill}
        </div>
        <div class="hr-acts">
          <button class="ik-btn ik-btn--ghost" data-hr="toggle-hidden" data-id="${c.id}">
            ${c.hidden ? 'Akışa Geri Aç' : 'Gizle'}
          </button>
          <button class="ik-btn ik-btn--ghost" data-hr="clear-reports" data-id="${c.id}"
                  ${(c.report_count | 0) === 0 ? 'disabled' : ''}>
            Raporları Temizle
          </button>
        </div>
      </div>
    </article>`;
  }).join('') + '</div>';

  // onclick (addEventListener değil) — yeniden render'da dinleyici birikmesin
  host.onclick = async (e) => {
    const btn = e.target.closest('[data-hr]');
    if (!btn || btn.disabled) return;
    const id = +btn.dataset.id;
    const card = rows.find(r => r.id === id);
    if (!id || !card) return;
    btn.disabled = true;
    try {
      if (btn.dataset.hr === 'toggle-hidden') {
        const { error } = await sb.from('paylasilan_kartlar')
          .update({ hidden: !card.hidden }).eq('id', id);
        if (error) { showToast?.('Olmadı: ' + error.message); btn.disabled = false; return; }
      } else if (btn.dataset.hr === 'clear-reports') {
        const { error } = await sb.from('paylasim_raporlari').delete().eq('card_id', id);
        if (error) { showToast?.('Olmadı: ' + error.message); btn.disabled = false; return; }
      }
      renderHalkaRaporlarAdmin(); // taze listeyle yeniden çiz
    } catch (_) { btn.disabled = false; }
  };
}

/* ══════════════════════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════════════════════ */
export function sfInit() {
  try {
    window.loadSosyalView          = loadSosyalView;
    window.sfOpenCardDetail        = sfOpenCardDetail;
    window.sfToggleLike            = sfToggleLike;
    window.sfPostComment           = sfPostComment;
    window.sfCopyToMine            = sfCopyToMine;
    window.sfReportCard            = sfReportCard;
    window.sfRefreshRoomPulse      = sfRefreshRoomPulse;
    window.renderHalkaRaporlarAdmin = renderHalkaRaporlarAdmin;
  } catch (_) {}
}
