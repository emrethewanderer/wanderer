/* ═══════════════════════════════════════════════════════
   13C — POSTANE · Bülten + Posta Akışları · Admin
   ───────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Eşik artık tek anahtarla açılıyor — e-posta. Ama numara ya da adres
     yalnız bir kapı değil, bir ADRESTİR: Wanderer'ın kullanıcıya
     uygulamanın dışından da ulaşabildiği tek yer. Bu modül o adrese
     giden İKİ yolu yönetir: Emre'nin elle yazıp gönderdiği BÜLTEN
     (mühür) ve kodun kendiliğinden tetiklediği POSTA AKIŞLARI (hoş
     geldin, geri çağrı). İkisi de aynı deftere (eposta_gonderimleri)
     yazar — tek motor, iki musluk.

   MEKANİK / MİMARİ / TEK GİRİŞ:
     Şema: migrations/047 (eposta_kampanyalari · eposta_akislari ·
     eposta_gonderimleri · bulten_ozet() RPC). Gönderim TEK edge
     function'dan geçer: supabase/functions/eposta-gonder (mod: kampanya
     | akis | sinama) — bu modül yalnız admin JWT'siyle onu çağırır,
     gönderim mantığının kendisi burada TEKRARLANMAZ.
       switchAdmin('bulten')      → pstRenderBulten()
       switchAdmin('posta-akis')  → pstRenderAkislar()
       03-auth-shell post-auth    → pstInit() (yalnız admin, kadran ısıtma)
     GERÇEKLİK KURALI (§6.10): "izinli" ile "gönderilebilir" AYRI
     sayılır — ikisini tek sayıya katlamak panelde olmayan bir kitleyi
     varmış gibi gösterir. "Adressiz" bir eksikliktir, davet olarak
     yazılır (sıfır değil, lapis rengiyle "henüz" çerçevesinde).
     GÖNDER geri alınamaz bir eylemdir: confirm() ile iki adımlı onay
     ister (emsal: 10x-w2-bildirimler.js bildirimBroadcast). Sınama
     yalnız admin'in KENDİ oturum e-postasına gider (K9 — 2026-08-27'da
     uydurma adreslere gönderim Supabase'den bounce uyarısı getirmişti).

   Kalıcılık: yok (her render taze veri çeker; pstInit yalnız ısıtma
   cache'idir, gerçeği DAİMA sunucudan okur).
   Konvansiyon: admin-verili iş → kendiliğinden boot ETMEZ; pstInit()
   03-auth-shell post-auth'tan çağrılır. i18n t(key,fallback) + TR/EN
   dict parite; window.pst* expose; stiller css/parts/postane.css;
   panel iskeleti .field-input/.field-textarea/.section-label/
   .admin-stat-row/.doc-tablebox/.doc-pill/.btn-outline-gold/
   .btn-primary — yeni panel dili İCAT EDİLMEZ.
═══════════════════════════════════════════════════════ */
import { sb, EDGE_FN_BASE } from '../config.js';
import { S } from '../state.js';
import { showToast, escapeHTML } from './00a-infrastructure.js';
import { t } from './15-i18n.js';

/* Tablo/RPC henüz yoksa (047 uygulanmadı) tek regex'le yakala — 13d/13n
   deseni. Fonksiyon ve tablo eksikliği farklı cümlelerle gelir, ikisi de
   burada kapsanır. */
const _PST_TABLO_YOK = /relation.*does not exist|could not find the (table|function)/i;

/* `tur` şart: `bulten_ozet` bir TABLO değil RPC fonksiyonudur ve "tablosu
   yok" demek Emre'yi olmayan bir tabloyu aramaya gönderirdi. Hata mesajı
   yanlış bir şey söylüyorsa dürüst değildir — yalnız "bir şey söylemiş"
   olur (§6.2). */
function _pstHataMesaj(error, ad, tur = 'tablo') {
  const msg = (error && error.message) || String(error || '');
  if (!_PST_TABLO_YOK.test(msg)) return msg;
  // Tür bir ANAHTAR seçer, kelime taşımaz: kelime taşısaydı Türkçe metin
  // İngilizce cümlenin ortasına düşerdi ([[tr-en-i18n-tamamlama]]).
  return (tur === 'rpc'
    ? t('pst.no_rpc',   '{ad} RPC fonksiyonu yok — migrations/047_telefon_kimlik_ve_posta.sql Supabase SQL editöründe çalıştırılmalı.')
    : t('pst.no_table', '{ad} tablosu yok — migrations/047_telefon_kimlik_ve_posta.sql Supabase SQL editöründe çalıştırılmalı.')
  ).replace('{ad}', ad || 'eposta_*');
}

/* ── boot ısıtması (yalnız admin) ──────────────────────────────────── */
let _pstOzetCache = null;   // bulten_ozet() son sonucu
let _pstAkisCache = null;   // eposta_akislari satırları

/** 03-auth-shell post-auth'tan çağrılır. Admin değilse hiçbir şey
 *  yapmaz — bu veri kimseyi ilgilendirmez ve gereksiz bir sorgu
 *  yaratmanın anlamı yok (asla bloklama, asla gereksiz ağ). Panel ilk
 *  açıldığında "Yükleniyor…" yerine ısınmış veriyle başlasın diye
 *  arka planda önden çeker; render yine de taze veriyle tazeler. */
export async function pstInit() {
  if (!S?.isAdmin) return;
  try {
    const [ozetRes, akisRes] = await Promise.all([
      sb.rpc('bulten_ozet'),
      sb.from('eposta_akislari').select('*').order('anahtar'),
    ]);
    if (!ozetRes.error) _pstOzetCache = ozetRes.data || null;
    if (!akisRes.error) _pstAkisCache = akisRes.data || null;
  } catch (e) { console.warn('pstInit:', e && e.message); }
}

/* ── edge function çağrısı — eposta-gonder'in TEK giriş kapısı ──────── */
async function _pstEdgeCall(payload) {
  try {
    const { data: sess } = await sb.auth.getSession();
    const token = sess?.session?.access_token;
    if (!token) return { ok: false, error: t('pst.oturum_yok', 'Oturum bulunamadı — yeniden giriş yap.') };
    const res = await fetch(`${EDGE_FN_BASE}/eposta-gonder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: sb.supabaseKey },
      body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: out.message || out.error || String(res.status) };
    return { ok: true, data: out };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

/* ═══════════════════════════════════════════════════════════════════
   1) BÜLTEN — kadran + sayı yaz + geçmiş sayılar + gönderim tablosu
═══════════════════════════════════════════════════════════════════ */

let _pstAktifKampanya = null;   // şu an formda yüklü kampanya | null (yeni taslak)

/** Kadran kartları. "izinli" ve "gönderilebilir" BİLEREK ayrı satırda —
 *  ikisini birleştirmek panelde olmayan bir kitleyi varmış gibi gösterir
 *  (§6.10). "Adres Bırakmamış" lapis renginde: bu bir hata değil, henüz
 *  ulaşılamayan bir davettir. */
export function _pstKadranHTML(ozet) {
  const o = ozet || {};
  const n = (v) => Number.isFinite(v) ? v : 0;
  const stat = (val, label, cls) => `<div class="pst-stat${cls ? ' ' + cls : ''}">
    <div class="pst-stat-num">${n(val)}</div><div class="pst-stat-label">${label}</div></div>`;
  return `<div class="pst-stat-grid">
    ${stat(o.toplam, t('pst.stat.toplam', 'Toplam Üye'))}
    ${stat(o.adresli, t('pst.stat.adresli', 'Adresi Var'))}
    ${stat(o.adressiz, t('pst.stat.adressiz', 'Adres Bırakmamış'), 'pst-stat--invite')}
    ${stat(o.izinli, t('pst.stat.izinli', 'İzinli (Rıza Var)'))}
    ${stat(o.gonderilebilir, t('pst.stat.gonderilebilir', 'Gönderilebilir'))}
    ${stat(o.sekmis, t('pst.stat.sekmis', 'Sekmiş'), 'pst-stat--warn')}
    ${stat(o.cikmis, t('pst.stat.cikmis', 'Çıkmış'))}
    ${stat(o.studio, t('pst.stat.studio', 'Studio'))}
    ${stat(o.ucretsiz, t('pst.stat.ucretsiz', 'Ücretsiz'))}
  </div>`;
}

const PST_DURUM_ETIKET = {
  taslak:       () => t('pst.bulten.durum.taslak', 'Taslak'),
  gonderiliyor: () => t('pst.bulten.durum.gonderiliyor', 'Gönderiliyor'),
  gonderildi:   () => t('pst.bulten.durum.gonderildi', 'Gönderildi'),
  durduruldu:   () => t('pst.bulten.durum.durduruldu', 'Durduruldu'),
};
function _pstDurumPill(durum) {
  const cls = durum === 'gonderildi' ? 'doc-pill--ok' : durum === 'durduruldu' ? 'doc-pill--crit' : 'doc-pill--mid';
  const etiket = (PST_DURUM_ETIKET[durum] || (() => durum || '—'))();
  return `<span class="doc-pill ${cls}">${escapeHTML(etiket)}</span>`;
}

/** Sayı yaz formu. `k` = yüklü kampanya objesi | null (yeni taslak).
 *  GÖNDER, kampanya zaten gönderildiyse KİLİTLİDİR — kısıt şemada da var
 *  (UNIQUE), panel bunu ÖNCE söyler (§6.2: sahte başarı yok). */
export function _pstFormHTML(k) {
  const gonderildi = !!k && k.durum === 'gonderildi';
  const adminEmail = escapeHTML(S?.currentUser?.email || '—');
  const hedefSecenek = (v, label) => `<option value="${v}"${(k?.hedef || 'tumu') === v ? ' selected' : ''}>${label}</option>`;
  return `
    <div class="section-label">${k ? t('pst.bulten.duzenle', 'Sayıyı Düzenle') : t('pst.bulten.yeni_sayi', 'Yeni Sayı')}</div>
    ${k ? `<div class="pst-form-meta">${_pstDurumPill(k.durum)} <button type="button" class="pst-link-btn" onclick="pstYeniSayi()">${t('pst.bulten.yeni_sayi', 'Yeni Sayı')}</button></div>` : ''}

    <div style="font-size:9px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">${t('pst.bulten.baslik_label', 'Başlık (iç ad)')}</div>
    <input class="field-input" type="text" id="pst-baslik" value="${escapeHTML(k?.baslik || '')}" placeholder="${escapeHTML(t('pst.bulten.baslik_ph', 'Örn: Ağustos Sayısı'))}" ${gonderildi ? 'disabled' : ''}>

    <div style="font-size:9px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">${t('pst.bulten.konu_label', 'Konu')}</div>
    <input class="field-input" type="text" id="pst-konu" value="${escapeHTML(k?.konu || '')}" placeholder="${escapeHTML(t('pst.bulten.konu_ph', "E-postanın konu satırı"))}" ${gonderildi ? 'disabled' : ''}>

    <div style="font-size:9px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">${t('pst.bulten.govde_label', 'Gövde')}</div>
    <div style="font-size:12px;color:var(--text-mid);margin-bottom:10px;line-height:1.6;">${t('pst.bulten.govde_desc', 'Boş satır yeni paragraf açar.')}</div>
    <textarea class="field-textarea" id="pst-govde" rows="10" ${gonderildi ? 'disabled' : ''}>${escapeHTML(k?.govde || '')}</textarea>

    <div style="font-size:9px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">${t('pst.bulten.hedef_label', 'Hedef')}</div>
    <select class="field-input" id="pst-hedef" ${gonderildi ? 'disabled' : ''}>
      ${hedefSecenek('tumu', t('pst.bulten.hedef_tumu', 'Tümü'))}
      ${hedefSecenek('studio', t('pst.bulten.hedef_studio', 'Studio'))}
      ${hedefSecenek('ucretsiz', t('pst.bulten.hedef_ucretsiz', 'Ücretsiz'))}
    </select>

    <div id="pst-onizle-host"></div>

    <div class="pst-btn-row">
      <button type="button" class="btn-outline-gold" onclick="pstOnizle()" ${gonderildi ? 'disabled' : ''}>${t('pst.bulten.onizle', 'Önizle')}</button>
      <button type="button" class="btn-outline-gold" id="pst-kaydet-btn" onclick="pstKaydetTaslak(this)" ${gonderildi ? 'disabled' : ''}>${k ? t('pst.bulten.guncelle', 'Taslağı Güncelle') : t('pst.bulten.kaydet', 'Taslağı Kaydet')}</button>
    </div>

    ${k ? `
    <div class="pst-btn-row" style="margin-top:14px;">
      <button type="button" class="btn-outline-gold" id="pst-sinama-btn" onclick="pstSinamaGonder(this)">${t('pst.bulten.sinama_gonder', 'Kendine Sınama Gönder')}</button>
      <span class="pst-hint">${t('pst.bulten.sinama_hedef', 'Sınama {email} adresine gider.').replace('{email}', adminEmail)}</span>
    </div>
    <div class="pst-btn-row" style="margin-top:14px;">
      <button type="button" class="btn-primary" id="pst-gonder-btn" onclick="pstGonderKampanya(this)" ${gonderildi ? 'disabled' : ''} style="width:auto;padding:16px 32px;">${t('pst.bulten.gonder_btn', 'GÖNDER')}</button>
      ${gonderildi ? `<span class="pst-hint">${t('pst.bulten.zaten_gonderildi', 'Bu sayı zaten gönderildi.')}</span>` : ''}
    </div>` : ''}
  `;
}

function _pstTarih(x) {
  try { return new Date(x).toLocaleDateString(S._currentLang || 'tr', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch (_) { return '—'; }
}

/** Geçmiş sayılar listesi — tıklanınca forma yüklenir (pstSayiSec). */
export function _pstListHTML(rows) {
  if (!rows || !rows.length) return `<div class="pst-empty">${t('pst.bulten.gecmis_bos', 'Henüz sayı yazılmadı.')}</div>`;
  return rows.map(k => `
    <div class="pst-camp-card" data-pst-id="${k.id}" onclick="pstSayiSec(${k.id})">
      <div class="pst-camp-top">
        <span class="pst-camp-title">${escapeHTML(k.baslik || '—')}</span>
        ${_pstDurumPill(k.durum)}
      </div>
      <div class="pst-camp-meta">${escapeHTML(k.konu || '')} · ${_pstTarih(k.created_at)}${k.alici_sayisi != null ? ' · ' + k.alici_sayisi + ' ' + t('pst.bulten.alici', 'alıcı') : ''}</div>
    </div>`).join('');
}

const PST_GONDERIM_ETIKET = {
  kuyrukta:   () => t('pst.gonderim.durum.kuyrukta', 'Kuyrukta'),
  gonderildi: () => t('pst.gonderim.durum.gonderildi', 'Gönderildi'),
  hata:       () => t('pst.gonderim.durum.hata', 'Hata'),
  sekti:      () => t('pst.gonderim.durum.sekti', 'Sekti'),
};
function _pstGonderimPill(durum) {
  const cls = durum === 'gonderildi' ? 'doc-pill--ok' : (durum === 'hata' || durum === 'sekti') ? 'doc-pill--crit' : 'doc-pill--mid';
  const etiket = (PST_GONDERIM_ETIKET[durum] || (() => durum || '—'))();
  return `<span class="doc-pill ${cls}">${escapeHTML(etiket)}</span>`;
}

/** Gönderim tablosu — hem kampanya hem akış defterinde AYNI şekil
 *  (eposta_gonderimleri), tek render fonksiyonu ikisine de hizmet eder. */
export function _pstGonderimTabloHTML(rows) {
  if (!rows || !rows.length) return `<div class="pst-empty">${t('pst.gonderim.bos', 'Henüz gönderim yok.')}</div>`;
  const trs = rows.map(r => `<tr>
      <td>${escapeHTML(r.email || '—')}</td>
      <td>${_pstGonderimPill(r.durum)}</td>
      <td>${_pstTarih(r.sent_at || r.created_at)}</td>
      <td>${r.hata ? escapeHTML(String(r.hata).slice(0, 140)) : ''}</td>
    </tr>`).join('');
  return `<div class="doc-tablebox"><table>
    <thead><tr><th>${t('pst.gonderim.th_adres', 'Adres')}</th><th>${t('pst.gonderim.th_durum', 'Durum')}</th><th>${t('pst.gonderim.th_tarih', 'Tarih')}</th><th>${t('pst.gonderim.th_hata', 'Hata')}</th></tr></thead>
    <tbody>${trs}</tbody>
  </table></div>`;
}

/* Basit paragraf bölücü — sunucudaki govdeParagraflari ile AYNI mantık
   (boş satır = yeni paragraf). Önizleme ağa gitmeden anında görünsün diye
   istemcide TEKRAR yazıldı; edge fonksiyonlarının bu repodaki deseni
   (kendi içine kapalı dosyalar) burada da geçerli. */
function _pstGovdeParagraf(govde) {
  return String(govde || '')
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p class="doc-lead">${escapeHTML(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/** Formdaki güncel değerlerden anında önizleme — ağa gitmez. */
export function pstOnizle() {
  const host = document.getElementById('pst-onizle-host');
  if (!host) return;
  if (host.dataset.open === '1') { host.innerHTML = ''; host.dataset.open = ''; return; }
  const konu = (document.getElementById('pst-konu')?.value || '').trim();
  const govde = (document.getElementById('pst-govde')?.value || '').trim();
  if (!konu && !govde) { showToast(t('pst.bulten.eksik', 'Başlık, konu ve gövde boş olamaz.'), true); return; }
  host.dataset.open = '1';
  host.innerHTML = `<div class="pst-onizle doc-rise">
    <div class="doc-eyebrow">Wanderer</div>
    <h1 class="doc-title">${escapeHTML(konu || '—')}</h1>
    ${_pstGovdeParagraf(govde) || `<p class="doc-lead">—</p>`}
    <div class="doc-foot">${t('pst.bulten.onizle_not', 'Bu mektup sana geldi çünkü eşikte adresini bıraktın. · Bültenden çık')}</div>
  </div>`;
}

/** Yeni-taslak durumuna döner — form boşalır. */
export function pstYeniSayi() {
  _pstAktifKampanya = null;
  pstRenderBulten();
}

/** Geçmiş listeden bir sayıyı forma yükler. */
export async function pstSayiSec(id) {
  try {
    const { data, error } = await sb.from('eposta_kampanyalari').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return;
    _pstAktifKampanya = data;
    await pstRenderBulten();
  } catch (e) { showToast(_pstHataMesaj(e, 'eposta_kampanyalari'), true); }
}

/** Taslak kaydı — yüklü bir taslak varsa GÜNCELLER, yoksa YENİ satır açar.
 *  Zaten gönderilmiş bir kampanya asla buradan yazılmaz (form kilitli). */
export async function pstKaydetTaslak(btn) {
  const baslik = (document.getElementById('pst-baslik')?.value || '').trim();
  const konu   = (document.getElementById('pst-konu')?.value || '').trim();
  const govde  = (document.getElementById('pst-govde')?.value || '').trim();
  const hedef  = document.getElementById('pst-hedef')?.value || 'tumu';
  if (!baslik || !konu || !govde) { showToast(t('pst.bulten.eksik', 'Başlık, konu ve gövde boş olamaz.'), true); return; }

  if (btn) btn.disabled = true;
  try {
    if (_pstAktifKampanya && _pstAktifKampanya.durum === 'taslak') {
      const { error } = await sb.from('eposta_kampanyalari')
        .update({ baslik, konu, govde, hedef, updated_at: new Date().toISOString() })
        .eq('id', _pstAktifKampanya.id);
      if (error) throw error;
      _pstAktifKampanya = { ..._pstAktifKampanya, baslik, konu, govde, hedef };
      showToast(t('pst.bulten.guncellendi', 'Taslak güncellendi.'));
    } else {
      const { data, error } = await sb.from('eposta_kampanyalari')
        .insert({ baslik, konu, govde, hedef, olusturan: S?.currentUser?.id || null })
        .select().single();
      if (error) throw error;
      _pstAktifKampanya = data || { baslik, konu, govde, hedef, durum: 'taslak' };
      showToast(t('pst.bulten.kaydedildi', 'Taslak kaydedildi.'));
    }
    await pstRenderBulten();
  } catch (e) {
    showToast(_pstHataMesaj(e, 'eposta_kampanyalari'), true);
  } finally {
    if (btn) btn.disabled = false;
  }
}

/** Kendine sınama — K9: yalnız admin'in KENDİ oturum e-postasına gider,
 *  serbest metin alanı YOK. Deftere yazmaz (mod:'sinama' — bkz. edge fn). */
export async function pstSinamaGonder(btn) {
  const email = S?.currentUser?.email;
  if (!email) { showToast(t('pst.oturum_yok', 'Oturum bulunamadı — yeniden giriş yap.'), true); return; }
  if (!_pstAktifKampanya?.id) { showToast(t('pst.bulten.once_kaydet', 'Önce taslağı kaydet.'), true); return; }
  const old = btn?.textContent;
  if (btn) { btn.disabled = true; btn.textContent = t('pst.bulten.sinama_gonderiliyor', 'Gönderiliyor…'); }
  const sonuc = await _pstEdgeCall({ mod: 'sinama', hedef_email: email, kampanya_id: _pstAktifKampanya.id });
  if (btn) { btn.disabled = false; btn.textContent = old; }
  if (sonuc.ok) showToast(t('pst.bulten.sinama_gitti', 'Sınama gönderildi.'));
  else showToast(t('pst.bulten.sinama_basarisiz', 'Sınama gönderilemedi') + ': ' + sonuc.error, true);
}

/** GÖNDER — geri alınamaz. İki adımlı onay (confirm) şart; tek tıkla
 *  gönderme YOK (emsal: 10x bildirimBroadcast). */
export async function pstGonderKampanya(btn) {
  if (!_pstAktifKampanya?.id) { showToast(t('pst.bulten.once_kaydet', 'Önce taslağı kaydet.'), true); return; }
  if (_pstAktifKampanya.durum === 'gonderildi') { showToast(t('pst.bulten.zaten_gonderildi', 'Bu sayı zaten gönderildi.'), true); return; }
  if (!confirm(t('pst.bulten.gonder_confirm', 'Bu sayı gönderilebilir listesindeki herkese gidecek ve bu geri alınamaz. Emin misin?'))) return;

  const old = btn?.textContent;
  if (btn) { btn.disabled = true; btn.textContent = t('pst.bulten.gonderiliyor', 'Gönderiliyor…'); }
  const sonuc = await _pstEdgeCall({ mod: 'kampanya', kampanya_id: _pstAktifKampanya.id });
  if (btn) btn.textContent = old;
  if (sonuc.ok) {
    if (sonuc.data?.already_sent) showToast(t('pst.bulten.zaten_gonderildi', 'Bu sayı zaten gönderildi.'));
    else showToast(t('pst.bulten.gonderildi_ok', 'Gönderim başladı — {n} kişiye ulaştı.').replace('{n}', sonuc.data?.gonderildi ?? 0));
  } else {
    showToast(t('pst.bulten.gonderilemedi', 'Gönderilemedi') + ': ' + sonuc.error, true);
  }
  await pstSayiSec(_pstAktifKampanya.id);
}

/** BÜLTEN odası ana render — switchAdmin('bulten') buradan girer. */
export async function pstRenderBulten() {
  const host = document.getElementById('bulten-admin-host');
  if (!host) return;
  // pstInit() ısıttıysa kadran anında görünür (esInit deseni: cache önce,
  // DB'den tazele sonra) — boş değilse "Yükleniyor…" hiç görünmez.
  host.innerHTML = _pstOzetCache
    ? _pstKadranHTML(_pstOzetCache)
    : `<div class="pst-empty">${t('pst.yukleniyor', 'Yükleniyor…')}</div>`;

  const [ozetRes, listRes] = await Promise.all([
    sb.rpc('bulten_ozet'),
    sb.from('eposta_kampanyalari').select('*').order('created_at', { ascending: false }).limit(20),
  ]);

  if (ozetRes.error) {
    host.innerHTML = `<div class="pst-empty">${t('pst.kadran_hata', 'Kadran açılamadı')}: ${escapeHTML(_pstHataMesaj(ozetRes.error, 'bulten_ozet', 'rpc'))}</div>`;
    return;
  }
  _pstOzetCache = ozetRes.data || null;

  // Aktif kampanya listede güncellenmiş olabilir (ör. gönderim sonrası) —
  // formu güncel satırla senkron tut.
  const rows = listRes.error ? [] : (listRes.data || []);
  if (_pstAktifKampanya) {
    const guncel = rows.find(r => r.id === _pstAktifKampanya.id);
    if (guncel) _pstAktifKampanya = guncel;
  }

  let gonderimHTML = '';
  if (_pstAktifKampanya?.id) {
    const { data: gRows, error: gErr } = await sb.from('eposta_gonderimleri')
      .select('email, durum, hata, sent_at, created_at')
      .eq('kampanya_id', _pstAktifKampanya.id)
      .order('created_at', { ascending: false })
      .limit(100);
    gonderimHTML = `<div class="section-label" style="margin-top:32px;">${t('pst.gonderim.tablo_baslik', 'Gönderim Tablosu')}</div>
      ${gErr ? escapeHTML(_pstHataMesaj(gErr, 'eposta_gonderimleri')) : _pstGonderimTabloHTML(gRows)}`;
  }

  host.innerHTML = `
    ${_pstKadranHTML(_pstOzetCache)}
    ${_pstFormHTML(_pstAktifKampanya)}
    ${gonderimHTML}
    <div class="section-label" style="margin-top:32px;">${t('pst.bulten.gecmis_baslik', 'Geçmiş Sayılar')}</div>
    ${listRes.error ? escapeHTML(_pstHataMesaj(listRes.error, 'eposta_kampanyalari')) : _pstListHTML(rows)}
  `;
}

/* ═══════════════════════════════════════════════════════════════════
   2) POSTA AKIŞLARI — metin/gecikme/aç-kapa + tetikleyici + gönderim geçmişi
═══════════════════════════════════════════════════════════════════ */

/** Tek akış kartı. Ad/açıklama DB'den gelir ve DÜZENLENEMEZ — yalnız
 *  metin, gecikme ve aç/kapa admin'in elindedir (K7: "akış anahtarı
 *  admin'den EKLENEMEZ"). Metni boş bir akış AÇILAMAZ — kilit görünür ve
 *  gerekçesi yazılıdır (§6.2: olmayan bir yeteneği göstermek sahte
 *  başarıdır; burada tersi — var olan bir kısıt gizlenmez). */
export function _pstAkisCardHTML(row) {
  const a = row || {};
  const metinBos = !((a.konu || '').trim() && (a.govde || '').trim());
  const id = a.anahtar;
  return `<div class="pst-akis-card" data-pst-akis="${escapeHTML(id)}">
    <div class="pst-akis-head">
      <div>
        <div class="pst-akis-name">${escapeHTML(a.ad || id)}</div>
        <div class="pst-akis-desc">${escapeHTML(a.aciklama || '')}</div>
      </div>
      <label class="pst-toggle">
        <input type="checkbox" id="pst-akis-${escapeHTML(id)}-aktif" ${a.aktif ? 'checked' : ''} ${metinBos ? 'disabled' : ''}>
        <span>${t('pst.akis.aktif_lbl', 'Aktif')}</span>
      </label>
    </div>
    ${metinBos ? `<div class="pst-akis-locked">${t('pst.akis.kilitli', 'Konu ve gövde doldurulmadan bu akış açılamaz.')}</div>` : ''}

    <div style="font-size:9px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin:14px 0 6px;">${t('pst.akis.gecikme_label', 'Gecikme (saat)')}</div>
    <input class="field-input" type="number" min="0" max="8760" id="pst-akis-${escapeHTML(id)}-gecikme" value="${Number.isFinite(a.gecikme_saat) ? a.gecikme_saat : 2}" style="max-width:140px;">

    <div style="font-size:9px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">${t('pst.akis.konu_label', 'Konu')}</div>
    <input class="field-input" type="text" id="pst-akis-${escapeHTML(id)}-konu" value="${escapeHTML(a.konu || '')}">

    <div style="font-size:9px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">${t('pst.akis.govde_label', 'Gövde')}</div>
    <textarea class="field-textarea" id="pst-akis-${escapeHTML(id)}-govde" rows="6">${escapeHTML(a.govde || '')}</textarea>

    <button type="button" class="btn-outline-gold" onclick="pstAkisKaydet('${escapeHTML(id)}', this)">${t('pst.akis.kaydet', 'Kaydet')}</button>
  </div>`;
}

/** Bir akışın metin/gecikme/aç-kapa alanlarını kaydeder. Metin boşken
 *  aktif=true gönderilirse SUNUCUYA GÜVENMEDEN burada da düzeltilir —
 *  savunmacı stil (§5.2): hazır değilse sessizce düş, çökme. */
export async function pstAkisKaydet(anahtar, btn) {
  const konu    = (document.getElementById(`pst-akis-${anahtar}-konu`)?.value || '').trim();
  const govde   = (document.getElementById(`pst-akis-${anahtar}-govde`)?.value || '').trim();
  const gecikme = parseInt(document.getElementById(`pst-akis-${anahtar}-gecikme`)?.value, 10);
  let aktif     = !!document.getElementById(`pst-akis-${anahtar}-aktif`)?.checked;

  let uyari = '';
  if (aktif && (!konu || !govde)) { aktif = false; uyari = t('pst.akis.aktif_engellendi', 'Konu ve gövde boşken akış açılamaz — pasif kaydedildi.'); }

  if (btn) btn.disabled = true;
  try {
    const { error } = await sb.from('eposta_akislari').update({
      konu, govde, aktif,
      gecikme_saat: Number.isFinite(gecikme) ? gecikme : 2,
      updated_at: new Date().toISOString(),
    }).eq('anahtar', anahtar);
    if (error) throw error;
    showToast(uyari || t('pst.akis.kaydedildi', 'Akış kaydedildi.'), !!uyari);
    await pstRenderAkislar();
  } catch (e) {
    showToast(_pstHataMesaj(e, 'eposta_akislari'), true);
  } finally {
    if (btn) btn.disabled = false;
  }
}

/** "Akışları şimdi işlet" — tüm AKTİF akışları tek çağrıda tetikler.
 *  Otonom cron burada YOK (FAZ 6 duraklarının kararı #6) — akış yalnız
 *  admin JWT'siyle, elle çalışır. */
export async function pstAkisIsleGoster(btn) {
  const old = btn?.textContent;
  if (btn) { btn.disabled = true; btn.textContent = t('pst.akis.isleniyor', 'İşleniyor…'); }
  const sonuc = await _pstEdgeCall({ mod: 'akis' });
  if (btn) { btn.disabled = false; btn.textContent = old; }
  if (sonuc.ok) showToast(t('pst.akis.islendi', 'İşlendi.'));
  else showToast(t('pst.akis.islenemedi', 'İşlenemedi') + ': ' + sonuc.error, true);
  await pstRenderAkislar();
}

/** POSTA AKIŞLARI odası ana render — switchAdmin('posta-akis') buradan girer. */
export async function pstRenderAkislar() {
  const host = document.getElementById('posta-akis-admin-host');
  if (!host) return;
  // pstInit() ısıttıysa akış kartları anında görünür, DB'den tazelenene dek.
  host.innerHTML = _pstAkisCache
    ? _pstAkisCache.map(_pstAkisCardHTML).join('')
    : `<div class="pst-empty">${t('pst.yukleniyor', 'Yükleniyor…')}</div>`;

  const [akisRes, gonderimRes] = await Promise.all([
    sb.from('eposta_akislari').select('*').order('anahtar'),
    sb.from('eposta_gonderimleri').select('email, durum, hata, sent_at, created_at')
      .not('akis_anahtar', 'is', null).order('created_at', { ascending: false }).limit(100),
  ]);

  if (akisRes.error) {
    host.innerHTML = `<div class="pst-empty">${escapeHTML(_pstHataMesaj(akisRes.error, 'eposta_akislari'))}</div>`;
    return;
  }
  _pstAkisCache = akisRes.data || [];

  host.innerHTML = `
    <div class="pst-akis-not">${t('pst.akis.aciklama_ust', "Akış anahtarı burada eklenemez — her akışın tetikleyicisi kodda yaşar. Var olan akışları yönetebilirsin: metin, gecikme, açık/kapalı.")}</div>
    ${_pstAkisCache.map(_pstAkisCardHTML).join('')}
    <button type="button" class="btn-outline-gold" onclick="pstAkisIsleGoster(this)" style="margin-top:8px;">${t('pst.akis.isle_btn', 'Akışları Şimdi İşlet')}</button>

    <div class="section-label" style="margin-top:32px;">${t('pst.akis.gonderim_baslik', 'Son Otomatik Gönderimler')}</div>
    ${gonderimRes.error ? escapeHTML(_pstHataMesaj(gonderimRes.error, 'eposta_gonderimleri')) : _pstGonderimTabloHTML(gonderimRes.data)}
  `;
}

/* ── window expose (dosya sonu, TDZ-güvenli) ── */
if (typeof window !== 'undefined') {
  window.pstInit             = pstInit;
  window.pstRenderBulten     = pstRenderBulten;
  window.pstYeniSayi         = pstYeniSayi;
  window.pstSayiSec          = pstSayiSec;
  window.pstOnizle           = pstOnizle;
  window.pstKaydetTaslak     = pstKaydetTaslak;
  window.pstSinamaGonder     = pstSinamaGonder;
  window.pstGonderKampanya   = pstGonderKampanya;
  window.pstRenderAkislar    = pstRenderAkislar;
  window.pstAkisKaydet       = pstAkisKaydet;
  window.pstAkisIsleGoster   = pstAkisIsleGoster;
}
