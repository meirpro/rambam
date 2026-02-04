# Offline-First & Local-First Reference

Reference materials for building a truly offline-capable PWA.

---

## Source 1: 2Brew PWA

**URL:** https://2brew.github.io/
**GitHub:** https://github.com/2brew/2brew.github.io

A simple coffee brewing timer PWA that works fully offline. Good example of a minimal, effective offline-first implementation.

### What It Does Well

1. **Pre-caches all assets on install** - App works immediately offline after first visit
2. **Stores recipe data as static JSON** - No API dependency
3. **Cache-first strategy** - Instant loading, even on slow networks
4. **Minimal manifest** - Clean PWA install experience

### Service Worker Pattern (Cache-First)

```javascript
const PRECACHE = 'cache-v3';
const RUNTIME = 'runtime-1';

// All assets needed for offline use
const PRECACHE_URLS = [
  'index.html',
  './',
  '/public/favicon.png',
  '/public/aeropress.json',    // Recipe data as static files
  '/public/moka.json',
  '/public/v_60.json',
  '/public/frenchPress.json',
  '/public/audio/end.wav',      // Even audio files cached
  '/public/audio/stage.wav',
  '/public/audio/tick.wav',
  '/public/build/bundle.css',
  '/public/build/bundle.js',
  '/public/global.css'
];

// Install: Pre-cache everything
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(self.skipWaiting())
  );
});

// Activate: Clean old caches
self.addEventListener('activate', event => {
  const currentCaches = [PRECACHE, RUNTIME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
    }).then(cachesToDelete => {
      return Promise.all(cachesToDelete.map(cacheToDelete => {
        return caches.delete(cacheToDelete);
      }));
    }).then(() => self.clients.claim())
  );
});

// Fetch: Cache-first, then network
self.addEventListener('fetch', event => {
  if (event.request.url.startsWith(self.location.origin) && self.location.hostname !== 'localhost') {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;  // Return cached version immediately
        }

        // Not in cache - fetch and cache for next time
        return caches.open(RUNTIME).then(cache => {
          return fetch(event.request).then(response => {
            return cache.put(event.request, response.clone()).then(() => {
              return response;
            });
          });
        });
      })
    );
  }
});
```

### Key Takeaways for Rambam App

| 2Brew Pattern | Rambam Application |
|---------------|-------------------|
| Static JSON recipes | Pre-fetch week's halakhot as JSON in localStorage/IndexedDB |
| Pre-cache on install | Cache app shell + last week's content on install |
| Cache-first fetch | Serve cached halakhot instantly, update in background |
| Version in cache name | `rambam-v{VERSION}` for cache invalidation |
| Skip waiting | Immediately activate new SW for updates |

---

## Source 2: Local-First Software (Ink & Switch)

**Essay:** https://www.inkandswitch.com/local-first/
**PDF:** https://www.inkandswitch.com/local-first/static/local-first.pdf
**Authors:** Martin Kleppmann, Adam Wiggins, Peter van Hardenberg, Mark McGranaghan

A foundational essay on building software where users own their data. Published 2019, still highly relevant.

### The 7 Ideals of Local-First Software

| # | Ideal | Description | Rambam Relevance |
|---|-------|-------------|------------------|
| 1 | **Fast** | Instant response, no network latency | Load halakhot from local storage immediately |
| 2 | **Multi-Device** | Data syncs across devices | Future: Cloudflare KV sync with user code |
| 3 | **Offline** | Full read/write without network | Core requirement - study anywhere |
| 4 | **Collaboration** | Real-time multi-user editing | Not needed (single-user app) |
| 5 | **Longevity** | Data survives the app/company | Export to JSON, open format |
| 6 | **Privacy** | End-to-end encryption | Data stays on device by default |
| 7 | **User Control** | No vendor lock-in | No account required, exportable data |

### Key Principles

**1. The Cloud is a Backup, Not the Source of Truth**
```
Traditional:  Client ←→ Server (source of truth) ←→ Database
Local-first:  Local DB (source of truth) ←→ Sync layer ←→ Other devices
```

**2. Optimistic UI by Default**
- User action → immediate local state update → UI reflects change
- Sync happens in background, conflicts resolved later
- Never block UI on network

**3. Conflict Resolution with CRDTs**
- Conflict-free Replicated Data Types
- Multiple devices can edit simultaneously
- Automatic merge without conflicts
- For Rambam: Completion timestamps are idempotent (last-write-wins is fine)

**4. Data Ownership**
- User can export all their data
- App works without any account
- No "phone home" requirements

### Recommended Technologies

| Technology | Use Case | Notes |
|------------|----------|-------|
| **CRDTs** | Multi-device sync | Automerge, Yjs libraries |
| **IndexedDB** | Large local storage | Better than localStorage for structured data |
| **Service Workers** | Offline capability | Cache-first strategies |
| **WebRTC** | P2P sync | Direct device-to-device, no server |
| **SQLite (WASM)** | Local database | sql.js, wa-sqlite |

### Implementation Spectrum

```
Fully Cloud          Hybrid              Fully Local-First
     |                  |                       |
Google Docs      Notion/Obsidian          Actual CRDTs
     ↓                  ↓                       ↓
Server = truth   Server + local cache   Local = truth
     ↓                  ↓                       ↓
Offline = broken  Offline = read-only   Offline = full app
```

**Rambam Target: Hybrid → Local-First**
- Primary: Fully functional offline with local data
- Secondary: Optional sync via Cloudflare KV (future)

---

## Application to Rambam PWA

### Phase 1: Offline-Capable (Current Plan)

```
User opens app
    ↓
Service Worker intercepts
    ↓
[Cache hit?] ──Yes──→ Return cached halakhot instantly
    ↓ No                      ↓
Fetch from Sefaria      Show cached UI
    ↓                         ↓
Cache response          Background: check for updates
    ↓
Return to user
```

### Phase 2: True Local-First (Future)

```
┌─────────────────────────────────────────────┐
│                Local Device                  │
├─────────────────────────────────────────────┤
│  IndexedDB                                   │
│  ├── halakhot (prefetched week)             │
│  ├── completion (timestamps)                │
│  └── settings (user preferences)            │
│                                              │
│  Service Worker                              │
│  ├── Cache: app shell, static assets        │
│  └── Strategy: cache-first for all          │
└─────────────────────────────────────────────┘
                    ↕ (optional)
┌─────────────────────────────────────────────┐
│           Cloudflare KV (Sync)              │
│  ├── /sync/{user-code} → completion data    │
│  └── Merge strategy: last-write-wins        │
└─────────────────────────────────────────────┘
```

### Checklist for Local-First Rambam

**Immediate (Migration)**
- [ ] Pre-cache app shell on SW install
- [ ] Store prefetched halakhot in IndexedDB (not just localStorage)
- [ ] Cache-first strategy for all Sefaria content
- [ ] Instant UI response for all actions (no spinners)
- [ ] Work fully offline after first load + prefetch

**Future**
- [ ] Export/import JSON backup (longevity)
- [ ] Optional sync code for multi-device
- [ ] Background sync when online
- [ ] Conflict resolution for completion status

---

## Service Worker Strategy Comparison

| Strategy | When to Use | Rambam Use Case |
|----------|-------------|-----------------|
| **Cache-First** | Static assets, prefetched content | Halakha texts, app shell |
| **Network-First** | Fresh data needed | Calendar API (new dates) |
| **Stale-While-Revalidate** | Balance of speed + freshness | Hebrew dates, sunset times |
| **Network-Only** | Real-time required | Not needed |
| **Cache-Only** | Never changes | Icons, fonts |

### Recommended Rambam SW Config

```javascript
// Workbox-style config for next-pwa
runtimeCaching: [
  // App shell - cache only (versioned)
  {
    urlPattern: /\/_next\/static\/.*/,
    handler: 'CacheFirst',
    options: { cacheName: 'static-assets' }
  },

  // Halakha texts - cache first (prefetched)
  {
    urlPattern: /^https:\/\/www\.sefaria\.org\/api\/v3\/texts\/.*/,
    handler: 'CacheFirst',
    options: {
      cacheName: 'sefaria-texts',
      expiration: { maxAgeSeconds: 30 * 24 * 60 * 60 } // 30 days
    }
  },

  // Calendar API - stale-while-revalidate
  {
    urlPattern: /^https:\/\/www\.sefaria\.org\/api\/calendars.*/,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'sefaria-calendar',
      expiration: { maxAgeSeconds: 24 * 60 * 60 } // 1 day
    }
  },

  // Hebcal - stale-while-revalidate
  {
    urlPattern: /^https:\/\/www\.hebcal\.com\/.*/,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'hebcal',
      expiration: { maxAgeSeconds: 24 * 60 * 60 }
    }
  }
]
```

---

## Additional Resources

- [Awesome PWA List](https://github.com/nicholasadamou/awesome-pwa) - Curated PWA examples
- [Workbox](https://developer.chrome.com/docs/workbox/) - Google's SW toolkit
- [Automerge](https://automerge.org/) - CRDT library for JS
- [PowerSync](https://www.powersync.com/) - Local-first sync service
- [Martin Kleppmann's talk](https://martin.kleppmann.com/2019/10/23/local-first-at-onward.html) - Video presentation

---

*Last updated: 2026-02-04*
