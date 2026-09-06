/* ═══════════════════════════════════════════════════════════════════
   13n — UYGULAMA İNDİRME BAĞLANTILARI · Admin paneli + Kitaplık paylaşım
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Kitaplık'tan paylaşılan kart görsellerinin altında "uygulamayı
     indir" ayakizi olmalı. Cazibe Motoru'nun Toplumsal Kanıt ilkesinin
     etik hâli: paylaşan kişi kendi yolculuğunu gösterirken, izleyen
     için doğal bir köprü açılır.

   AKIŞ:
     1) Admin "İndirme Bağlantıları" sekmesinden iOS / Android / Web
        bağlantılarını girer (app_download_links · migration 021).
     2) Kitaplık Okur'daki paylaş düğmesi getAppDownloadLinks() ile
        kayıtlı bağlantıları çeker, paylaşım metnine ekler.

   TEK GİRİŞ:
     getAppDownloadLinks()       → { ios_url, android_url, web_url }
     renderDownloadLinksAdmin()  → admin sayfasını doldurur
     saveAppDownloadLinks(btn)   → upsert + toast

   Konvansiyon: hardcoded TR; window.* expose; tablo yoksa sessizce
   varsayılan boş döner (özellik bozulmaz, sadece footer'da link olmaz).
═══════════════════════════════════════════════════════════════════ */


import { sb } from '../config.js';
import { showToast, escapeHTML } from './00a-infrastructure.js';

/* Süreç boyu cache — paylaşım her tıklamada DB'ye gitmesin. */
let _cache = null;
let _cachePromise = null;

/** Kayıtlı indirme bağlantılarını döner. Hata/boş tablo durumunda
 *  bütün alanları boş string olan obje döner — paylaşım metni
 *  bağlantıyı atlar, kart yine paylaşılır. */
export async function getAppDownloadLinks() {
  if (_cache) return _cache;
  if (_cachePromise) return _cachePromise;
  _cachePromise = (async () => {
    try {
      const { data, error } = await sb
        .from('app_download_links')
        .select('ios_url, android_url, web_url')
        .eq('id', 1)
        .maybeSingle();
      if (error) {
        // Tablo yoksa sessizce geç — uygulama çalışmaya devam etsin
        if (!/relation.*app_download_links.*does not exist|could not find the table/i.test(error.message)) {
          console.warn('app_download_links:', error.message);
        }
        _cache = { ios_url: '', android_url: '', web_url: '' };
      } else {
        _cache = {
          ios_url:     (data && data.ios_url)     || '',
          android_url: (data && data.android_url) || '',
          web_url:     (data && data.web_url)     || '',
        };
      }
    } catch (e) {
      console.warn('app_download_links fetch:', e && e.message);
      _cache = { ios_url: '', android_url: '', web_url: '' };
    }
    return _cache;
  })();
  return _cachePromise;
}

/** Paylaşım metninde gösterilecek tek satır link bloğu.
 *  Web URL > iOS > Android sırasıyla; hiçbiri yoksa boş string. */
export function downloadLinkLine(links) {
  const l = links || _cache || {};
  const parts = [];
  if (l.ios_url)     parts.push(`iOS: ${l.ios_url}`);
  if (l.android_url) parts.push(`Android: ${l.android_url}`);
  const main = l.web_url || l.ios_url || l.android_url;
  if (!main && !parts.length) return '';
  if (l.web_url) return `📲 Uygulamayı indir: ${l.web_url}`;
  return '📲 Uygulamayı indir → ' + parts.join('  ·  ');
}

/** Görsel (canvas) altbilgisi için tek kısa bağlantı dizisi.
 *  Karakter sayısı sınırlı — web > ios > android tek bir tane. */
export function downloadFooterUrl(links) {
  const l = links || _cache || {};
  return l.web_url || l.ios_url || l.android_url || '';
}

/* ════════════════════════════════════════════════════════════════════
   ADMIN — "İndirme Bağlantıları" sekmesi
════════════════════════════════════════════════════════════════════ */

export async function renderDownloadLinksAdmin() {
  const host = document.getElementById('download-links-admin-host');
  if (!host) return;
  host.innerHTML = '<div style="color:var(--text-dim);font-size:13px;">Yükleniyor…</div>';

  // Cache'i temizle — admin her açışta taze veri görsün
  _cache = null;
  _cachePromise = null;
  const cfg = await getAppDownloadLinks();

  host.innerHTML = `
    <div style="font-size:9px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">App Store (iOS)</div>
    <div style="font-size:12px;color:var(--text-mid);margin-bottom:10px;line-height:1.6;">
      Örn: <code style="font-size:11px;">https://apps.apple.com/app/idXXXXXXXXXX</code>
    </div>
    <input class="field-input" type="url" id="dl-ios"
      placeholder="https://apps.apple.com/..."
      value="${escapeHTML(cfg.ios_url || '')}"
      style="margin-bottom:20px;">

    <div style="font-size:9px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">Google Play (Android)</div>
    <div style="font-size:12px;color:var(--text-mid);margin-bottom:10px;line-height:1.6;">
      Örn: <code style="font-size:11px;">https://play.google.com/store/apps/details?id=...</code>
    </div>
    <input class="field-input" type="url" id="dl-android"
      placeholder="https://play.google.com/..."
      value="${escapeHTML(cfg.android_url || '')}"
      style="margin-bottom:20px;">

    <div style="font-size:9px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">Web / Landing (Tek Bağlantı)</div>
    <div style="font-size:12px;color:var(--text-mid);margin-bottom:10px;line-height:1.6;">
      Tek bir kısa bağlantı (örn: <code style="font-size:11px;">https://wanderer.app</code>).
      Doldurulduğunda paylaşım metninde sadece bu görünür; iOS / Android boş kalsa bile
      paylaşım yine de "uygulamayı indir" ayakizi taşır.
    </div>
    <input class="field-input" type="url" id="dl-web"
      placeholder="https://wanderer.app"
      value="${escapeHTML(cfg.web_url || '')}"
      style="margin-bottom:8px;">
  `;
}

export async function saveAppDownloadLinks(btn) {
  const norm = (v) => {
    const s = (v || '').trim();
    if (!s) return null;
    if (!/^https?:\/\//i.test(s)) return null;  // geçersiz → null
    return s;
  };
  const ios     = norm(document.getElementById('dl-ios')?.value);
  const android = norm(document.getElementById('dl-android')?.value);
  const web     = norm(document.getElementById('dl-web')?.value);

  // Boş bir alan girilmişse ama http(s):// ile başlamıyorsa kullanıcıyı uyar
  const raw = [
    ['dl-ios',     'iOS'],
    ['dl-android', 'Android'],
    ['dl-web',     'Web'],
  ];
  for (const [id, label] of raw) {
    const v = (document.getElementById(id)?.value || '').trim();
    if (v && !/^https?:\/\//i.test(v)) {
      showToast(`${label} bağlantısı http:// veya https:// ile başlamalı`, true);
      return;
    }
  }

  if (btn) btn.disabled = true;
  const { error } = await sb.from('app_download_links').upsert({
    id: 1, ios_url: ios, android_url: android, web_url: web, updated_at: new Date().toISOString()
  }, { onConflict: 'id' });
  if (btn) btn.disabled = false;

  if (error) {
    if (/relation.*app_download_links.*does not exist|could not find the table/i.test(error.message)) {
      showToast('app_download_links tablosu yok — migrations/000_wanderer_schema.sql çalıştırılmalı.', true);
    } else {
      showToast('Kayıt hatası: ' + error.message, true);
    }
    return;
  }

  // Cache'i tazele ki bir sonraki paylaşımda yeni linkler kullanılsın
  _cache = { ios_url: ios || '', android_url: android || '', web_url: web || '' };
  _cachePromise = null;
  showToast('İndirme bağlantıları kaydedildi.');
}

/* ── window expose ── */
if (typeof window !== 'undefined') {
  window.saveAppDownloadLinks = saveAppDownloadLinks;
  window.getAppDownloadLinks  = getAppDownloadLinks;
}
