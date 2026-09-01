/* ═══════════════════════════════════════════════════
   13c — GÖRSEL EKLEME (Vision client)
   Composer ataç butonu → client-side küçültme (canvas, max 1280px,
   JPEG 0.82) → Supabase Storage 'chat-images' bucket → public URL.
   Gönderimde mesaja `![görsel](url)` markdown'ı eklenir:
   • render her yerde otomatik (marked + DOMPurify img allowlist)
   • sunucu yaması (SETUP-LLM-CHAT.md) bu markdown'ı multimodal
     içeriğe çevirir — yama yoksa hiçbir şey kırılmaz.
   Birincil senaryo: ilişki mesajlaşması ekran görüntüsü analizi.
═══════════════════════════════════════════════════ */
import { S } from '../state.js';
import { sb } from '../config.js';
import { showToast } from './00a-infrastructure.js';
import { t } from './15-i18n.js';
import { sendMessageHooks } from './06-summary-chat.js';

const _MAX_DIM = 1280;
const _JPEG_Q  = 0.82;
const _MAX_PENDING = 3;

let _pending = []; // [{ url, path }]

/* ─── Küçültme — büyük fotoğraflar token/band genişliği yakmasın ─── */
async function _decode(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file); } catch (_) { /* Safari fallback'e düş */ }
  }
  // Eski Safari: HTMLImageElement üzerinden çöz
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('görsel çözülemedi')); };
    img.src = url;
  });
}

async function _shrink(file) {
  const src = await _decode(file);
  const sw = src.width || src.naturalWidth;
  const sh = src.height || src.naturalHeight;
  const scale = Math.min(1, _MAX_DIM / Math.max(sw, sh));
  const w = Math.round(sw * scale);
  const h = Math.round(sh * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(src, 0, 0, w, h);
  src.close?.();
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob boş döndü')), 'image/jpeg', _JPEG_Q);
  });
}

/* Önizleme chip'leri — hem composer'da hem Ritüel Kartı'nda host var */
function _renderPendingChips() {
  document.querySelectorAll('.gorsel-host').forEach(host => {
    host.innerHTML = _pending.map((p, i) => `
      <span class="gorsel-chip">
        <img src="${p.url}" alt="">
        <button onclick="gorselRemove(${i})" aria-label="Görseli kaldır">✕</button>
      </span>`).join('');
    host.style.display = _pending.length ? 'flex' : 'none';
  });
}

export function gorselRemove(i) {
  _pending.splice(i, 1);
  _renderPendingChips();
}

export function gorselPick() {
  if (_pending.length >= _MAX_PENDING) {
    showToast(t('gorsel.max', 'En fazla 3 görsel ekleyebilirsin.'), true);
    return;
  }
  const fi = document.createElement('input');
  fi.type = 'file';
  fi.accept = 'image/*';
  fi.onchange = () => { if (fi.files?.[0]) _upload(fi.files[0]); };
  fi.click();
}

async function _upload(file) {
  if (!S.currentUser?.id) return;
  const btns = document.querySelectorAll('.ws-attach-btn');
  btns.forEach(b => b.classList.add('busy'));
  try {
    const blob = await _shrink(file);
    const path = `${S.currentUser.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await sb.storage.from('chat-images')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
    if (error) throw error;
    const { data } = sb.storage.from('chat-images').getPublicUrl(path);
    if (!data?.publicUrl) throw new Error('public URL alınamadı');
    _pending.push({ url: data.publicUrl, path });
    _renderPendingChips();
  } catch (e) {
    console.warn('gorsel upload:', e);
    // Bucket kurulmamışsa en olası hata — SETUP belgesine işaret et
    showToast(t('gorsel.fail', 'Görsel yüklenemedi. (chat-images bucket kurulumu gerekli olabilir — SETUP-LLM-CHAT.md)'), true);
  } finally {
    btns.forEach(b => b.classList.remove('busy'));
  }
}

/* Gönderimde bekleyen görselleri mesaj metnine markdown olarak işle —
   06 hooks.runBefore'u input okunmadan çağırır, ek API gerekmez.
   Boot'ta register edilir (14-boot.js) — modül load time TDZ riskini önler. */
export function registerGorselHooks() {
  sendMessageHooks.before(() => {
    if (!_pending.length) return;
    const inp = document.getElementById('chat-input');
    if (!inp) return;
    const imgsMd = _pending.map(p => `![görsel](${p.url})`).join('\n');
    inp.value = (inp.value.trim() ? inp.value.trim() + '\n\n' : '') + imgsMd;
    _pending = [];
    _renderPendingChips();
  });
}

/* Inline onclick erişimi */
window.gorselPick   = gorselPick;
window.gorselRemove = gorselRemove;
