/* ═══════════════════════════════════════════════════════════════
   10b — W2 GAMIFICATION
   User level, mezuniyet sertifikası, referral, proaktif check-in.
   10-features-w2.js'ten extract edildi.
═══════════════════════════════════════════════════════════════ */
import { S } from '../state.js';
import { EMRE_IMG } from '../config.js';
import { SafeStorage, showToast } from './00a-infrastructure.js';
import { nowTR } from './00-config-tracking.js';
import { t } from './15-i18n.js';
import { p } from './16-i18n-prompts.js';
import { getContextualNotificationBody } from './09-reports-tracks.js';

export function getUserLevel() {
  const totalSessions = Object.keys(S.allSessions).length;
  const lvl = totalSessions >= 30 ? 3 : totalSessions >= 10 ? 2 : 1;
  return { level: lvl, name: t(`level.${lvl}.name`), desc: t(`level.${lvl}.desc`) };
}

export function getLevelContext() {
  const lvl = getUserLevel();
  if (lvl.level === 3) return p('prompt.level.master');
  if (lvl.level === 2) return p('prompt.level.traveler');
  return '';
}

/* ═══ MEZUNİYET SERTİFİKASI ═══ */
export function showGraduation(title, desc) {
  document.getElementById('grad-title').textContent = title;
  document.getElementById('grad-desc').textContent = desc;
  drawGradCert(title, desc);
  document.getElementById('graduation-overlay').classList.add('open');
}

export function drawGradCert(title, desc) {
  const c = document.getElementById('grad-canvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1080, 1080);
  ctx.fillStyle = '#B8953C'; ctx.fillRect(80, 80, 920, 1); ctx.fillRect(80, 1000, 920, 1);
  ctx.font = '500 28px Georgia'; ctx.fillStyle = '#B8953C'; ctx.letterSpacing = '8px';
  ctx.fillText('EMRE THE WANDERER', 80, 160);
  ctx.font = '300 20px sans-serif'; ctx.fillStyle = '#52504A'; ctx.textAlign = 'right';
  ctx.fillText(t('cert.title', 'Tamamlama Sertifikası'), 1000, 160); ctx.textAlign = 'left';
  ctx.font = '500 56px Georgia'; ctx.fillStyle = '#E8E6E0';
  ctx.fillText(title, 80, 480);
  ctx.font = '300 30px Georgia'; ctx.fillStyle = '#8A887F';
  ctx.fillText(desc, 80, 560);
  ctx.font = '300 24px sans-serif'; ctx.fillStyle = '#2A2A2A';
  ctx.fillText(new Date().toLocaleDateString(S._currentLang || 'tr', { timeZone: 'Europe/Istanbul', day:'numeric', month:'long', year:'numeric' }), 80, 940);
}

export function downloadGradCert() {
  const c = document.getElementById('grad-canvas'); if (!c) return;
  const a = document.createElement('a'); a.download = 'sertifika.png'; a.href = c.toDataURL('image/png'); a.click();
}

export function shareGradCert() {
  const c = document.getElementById('grad-canvas'); if (!c) return;
  c.toBlob(blob => {
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], 'sertifika.png', { type:'image/png' });
      if (navigator.canShare({ files:[file] })) { navigator.share({ files:[file], title: t('cert.share_title', 'Sertifika') }).catch(()=>{}); return; }
    }
    downloadGradCert();
  }, 'image/png');
}

/* ═══ REFERRAL ═══ */
export function shareReferral() {
  const url = window.location.origin + '?ref=' + (S.currentUser?.id?.slice(0,8) || '');
  const text = t('referral.share_text', 'Emre the Wanderer — benim dönüşüm yolculuğum burada başladı. Sen de dene: {url}').replace('{url}', url);
  if (navigator.share) navigator.share({ title:'Emre the Wanderer', text, url }).catch(()=>{});
  else { navigator.clipboard.writeText(text).then(()=>showToast(t('toast.invite_copied'))).catch(()=>{}); }
}

/* ═══ PROAKTİF CHECK-IN ═══ */
export function scheduleProactiveCheckin() {
  const TARGET_HOURS = [10, 20];

  function nextTargetTime() {
    const now = new Date();
    const candidates = [];
    for (const h of TARGET_HOURS) {
      const t = new Date(now);
      t.setHours(h, 0, 0, 0);
      if (t <= now) t.setDate(t.getDate() + 1);
      candidates.push(t);
    }
    return Math.min(...candidates.map(d => d.getTime()));
  }

  function fire() {
    try {
      if (Notification.permission === 'granted') {
        const key = `etw_checkin_${nowTR().toDateString()}_${nowTR().getHours()}`;
        if (!SafeStorage.getRaw(key)) {
          SafeStorage.setRaw(key, '1');
          const body = getContextualNotificationBody();
          new Notification(S.settings.persona_name || 'Emre the Wanderer',
            { body, icon: EMRE_IMG, badge: EMRE_IMG });
        }
      }
    } catch (e) { console.warn('Check-in hatası:', e); }
    scheduleNext();
  }

  function scheduleNext() {
    const delay = nextTargetTime() - Date.now();
    setTimeout(fire, Math.max(1000, delay));
  }

  scheduleNext();
}
