// Sentinel Pro Service Worker
// Handles push notifications even when browser is closed

const CACHE_NAME = 'sentinel-pro-v1';
const SUPABASE_URL = 'https://tztydfegheocwlruyncb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dHlkZmVnaGVvY3dscnV5bmNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMTA0NjksImV4cCI6MjA5MTY4NjQ2OX0.pmbPwj-_HzIBVt1fs-YwQ7Sc-ziQqxnXL02AQAC4R0M';

// ─── INSTALL ──────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// ─── PUSH NOTIFICATION RECEIVED ───────────────────────────────────────────────
self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: '🔔 New Request', body: 'A guest needs assistance' };
  }

  const options = {
    body: data.body || 'A guest needs assistance. Open app to view.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    // ✅ 3 sharp vibration bursts — different from normal phone ringtone
    vibrate: [300, 100, 300, 100, 300],
    requireInteraction: true, // stays on screen until staff taps it
    tag: 'sentinel-request-' + Date.now(),
    data: {
      url: data.url || '/',
      department: data.department || '',
      room: data.room || '',
    },
    actions: [
      { action: 'open', title: '👁 View Request' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || '🔔 Sentinel Pro — New Request',
      options
    )
  );
});

// ─── NOTIFICATION CLICK ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // If app is already open, focus it
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          return;
        }
      }
      // Otherwise open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// ─── BACKGROUND SYNC — checks for new requests every 30 seconds ──────────────
// This keeps checking even when app is closed (on supported browsers)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-requests') {
    event.waitUntil(checkForNewRequests());
  }
});

async function checkForNewRequests() {
  try {
    // Get stored staff info
    const cache = await caches.open(CACHE_NAME);
    const staffResponse = await cache.match('staff-info');
    if (!staffResponse) return;

    const staffInfo = await staffResponse.json();
    if (!staffInfo.department) return;

    // Check for pending requests in their department
    const since = new Date(Date.now() - 60000).toISOString(); // last 60 seconds
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/requests?department=eq.${encodeURIComponent(staffInfo.department)}&status=eq.Pending&created_at=gte.${since}&select=id,service,guest_room`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      }
    );

    if (!response.ok) return;
    const requests = await response.json();

    if (requests.length > 0) {
      const req = requests[0];
      await self.registration.showNotification('🔔 Sentinel Pro — New Request', {
        body: `Room ${req.guest_room} — ${req.service}`,
        vibrate: [300, 100, 300, 100, 300],
        requireInteraction: true,
        tag: 'sentinel-bg-' + req.id,
      });
    }
  } catch (e) {
    // Silent fail
  }
}

// ─── MESSAGE FROM APP ─────────────────────────────────────────────────────────
self.addEventListener('message', async event => {
  if (event.data?.type === 'STORE_STAFF_INFO') {
    // Store staff department for background sync
    const cache = await caches.open(CACHE_NAME);
    await cache.put('staff-info', new Response(JSON.stringify(event.data.payload)));
  }

  if (event.data?.type === 'PLAY_SOUND') {
    // Tell all open clients to play sound
    const clients = await self.clients.matchAll();
    clients.forEach(client => client.postMessage({ type: 'PLAY_NOTIFICATION_SOUND' }));
  }
});
