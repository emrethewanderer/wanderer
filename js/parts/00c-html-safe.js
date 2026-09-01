/* ═══════════════════════════════════════════════════════════════
   HTML SAFE — Merkezi XSS koruması
   Tüm dinamik innerHTML atamaları bu modülün safeHTML/setHTML
   helper'larından geçmelidir. DOMPurify ile sanitize edilir.
═══════════════════════════════════════════════════════════════ */
import DOMPurify from 'dompurify';

const DEFAULT_CONFIG = Object.freeze({
  ALLOWED_TAGS: [
    'p','br','strong','em','b','i','u','s','code','pre','blockquote',
    'ul','ol','li','a','span','div','section','article',
    'h1','h2','h3','h4','h5','h6',
    'img','hr','table','thead','tbody','tr','th','td',
    'button','svg','path','circle','rect','line','g','defs','linearGradient','stop'
  ],
  ALLOWED_ATTR: [
    'href','target','rel','class','style','src','alt','title',
    'aria-label','aria-hidden','aria-live','aria-atomic','role',
    'data-id','data-key','data-type','data-mode','data-state','data-day','data-month','data-year',
    'id','tabindex','onclick','onkeydown',
    // SVG
    'viewBox','d','width','height','cx','cy','r','x','y','x1','y1','x2','y2',
    'fill','stroke','stroke-width','transform','opacity','offset','stop-color','gradientUnits'
  ],
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|#|\/|data:image\/)/i,
  FORBID_TAGS: ['script','iframe','object','embed','form','input','textarea','select'],
  FORBID_ATTR: [
    'onerror','onload','onmouseover','onmouseout','onfocus','onblur','onsubmit','onreset','oninput','onchange'
  ],
  ADD_ATTR: ['target']
});

// onclick'i tamamen yasaklamıyoruz çünkü HTML template'leri yaygın olarak onclick="fnName()" kullanıyor.
// Ancak target="_blank" otomatik rel="noopener" eklensin.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

/** Tehlikeli HTML'i temizler ve string olarak döner. */
export function safeHTML(html, opts = {}) {
  if (html == null) return '';
  return DOMPurify.sanitize(String(html), { ...DEFAULT_CONFIG, ...opts });
}

/** Element'in innerHTML'ini güvenli şekilde set eder. */
export function setHTML(el, html, opts) {
  if (!el) return;
  el.innerHTML = safeHTML(html, opts);
}

/** Markdown çıktısı için sıkı sanitize (LLM cevapları). */
export function safeMarkdownHTML(html) {
  return safeHTML(html, {
    FORBID_TAGS: ['script','iframe','object','embed','form','input','textarea','select','style'],
    FORBID_ATTR: ['onerror','onload','onclick','onmouseover','onfocus','onblur','style']
  });
}

/** Plain text - tüm HTML kaçışı yapılır. */
export function setText(el, str) {
  if (!el) return;
  el.textContent = str == null ? '' : String(str);
}

console.info('[Wanderer] HTML safe layer loaded');
