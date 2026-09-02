// Wanderer AI Service Worker
// CACHE adı her deploy'da değişmelidir; build.sh bu satırı bundle hash'iyle
// otomatik damgalar (const CACHE = 'etw-<bundlehash>'). Elle düzenlemeye gerek yok.
// Stale-while-revalidate stratejisi: önce cache'ten ver, arkada güncelle.
const CACHE = 'etw-qx2Ava1B';

// HTML her zaman fresh: navigate isteklerinde network-first.
const NAV_TIMEOUT_MS = 3000;

// Install'da precache edilen kararlı varlıklar (hash'siz; ikon offline'da hazır).
// JS bundle hash'li olduğundan precache EDİLMEZ — staleWhileRevalidate ilk
// online yüklemede yakalar (standart PWA app-shell deseni).
const PRECACHE = ['./icon-192.png', './icon-512.png'];

// Bağlantı yokken + cache boşken navigasyona dönen markalı offline sayfası.
const OFFLINE_HTML = `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Bağlantı yok</title><style>
*{margin:0;box-sizing:border-box}html,body{height:100%}
body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;
padding:32px;background:#0B0B0B;color:#E8E2D6;font-family:Georgia,'Times New Roman',serif;text-align:center}
.g{font-size:40px;color:#F5A623;line-height:1}
h1{font-size:21px;font-weight:500;color:#F5A623}
p{font-size:15px;color:#9b948a;line-height:1.7;max-width:320px}
button{margin-top:8px;padding:12px 28px;background:transparent;border:1px solid rgba(245,166,35,.45);
color:#F5A623;border-radius:2px;font:inherit;font-size:14px;cursor:pointer}
button:active{transform:scale(.97)}
</style></head><body>
<div class="g">✦</div>
<h1>Bağlantı yok</h1>
<p>Şu an çevrimdışısın. Yola devam etmek için internete bağlanıp tekrar dene.</p>
<button onclick="location.reload()">Tekrar dene</button>
</body></html>`;

function offlineResponse() {
  return new Response(OFFLINE_HTML, {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    try { const cache = await caches.open(CACHE); await cache.addAll(PRECACHE); }
    catch (_) { /* ikon yoksa install'ı düşürme */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function networkFirst(req) {
  return new Promise((resolve) => {
    const timer = setTimeout(async () => {
      const c = await caches.match(req);
      if (c) resolve(c);
    }, NAV_TIMEOUT_MS);
    fetch(req).then(async res => {
      clearTimeout(timer);
      if (res && res.ok) {
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone());
      }
      resolve(res);
    }).catch(async () => {
      clearTimeout(timer);
      const c = await caches.match(req) || await caches.match('./index.html');
      resolve(c || offlineResponse());
    });
  });
}

function staleWhileRevalidate(req) {
  return caches.open(CACHE).then(cache =>
    cache.match(req).then(cached => {
      const fresh = fetch(req).then(res => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || fresh;
    })
  );
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // Navigate isteklerinde (HTML) network-first ile stale bundle bug'larını önle.
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(networkFirst(e.request));
    return;
  }
  e.respondWith(staleWhileRevalidate(e.request));
});

// Yeni SW yüklendiğinde sayfaya bildir — UI prompt'u açabilir.
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

// ─────────────────────────────────────────────────────────────────────────────
// WEB PUSH — uygulama KAPALIYKEN bile kullanıcıyı geri çağıran bildirimler.
// Payload (send-push edge function tarafından gönderilir, JSON):
//   { title, body, url, tag, type, icon }
// ─────────────────────────────────────────────────────────────────────────────
const PUSH_ICON = './icon-192.png'; // yerel marka ikonu (SW scope kökünde; dış bağımlılık yok)

self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; }
  catch (_) { try { data = { body: e.data.text() }; } catch (__) { data = {}; } }

  const title = data.title || 'Emre the Wanderer';
  const body  = data.body  || 'Bugün kendinle yüzleşmeye hazır mısın?';
  // tag: tip başına tekilleştirir (aynı tür bildirim üst üste yığılmaz).
  const tag   = data.tag || data.type || 'wndr';
  const url   = data.url || './index.html';

  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      renotify: true,
      icon: data.icon || PUSH_ICON,
      badge: PUSH_ICON,
      data: { url, type: data.type || 'generic' },
      vibrate: [80, 40, 80],
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || './index.html';
  const ntype  = (e.notification.data && e.notification.data.type) || 'generic';

  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Açık bir pencere varsa onu öne al + deep-link mesajı gönder.
    for (const c of all) {
      if (c.url && new URL(c.url).origin === self.location.origin) {
        try { await c.focus(); } catch (_) {}
        try { c.postMessage({ type: 'wndr-notif-click', url: target, ntype }); } catch (_) {}
        return;
      }
    }
    // Açık pencere yoksa yeni aç (hedef URL'i hash ile taşı — sayfa açılınca okur).
    const openUrl = target.includes('#') ? target : `${target}#notif=${encodeURIComponent(ntype)}`;
    if (self.clients.openWindow) await self.clients.openWindow(openUrl);
  })());
});
