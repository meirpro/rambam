# Google Codelabs: Complete PWA Training Series

**Source:** https://developers.google.com/codelabs/pwa-training
**Type:** Official Google Tutorial Series

Comprehensive training for building Progressive Web Apps covering offline functionality, caching strategies, IndexedDB, installation, advanced APIs, and web workers.

---

## Table of Contents

1. [Going Offline - Service Workers & Cache API](#1-going-offline---service-workers--cache-api)
2. [Working with Workbox](#2-working-with-workbox)
3. [IndexedDB for Data Persistence](#3-indexeddb-for-data-persistence)
4. [Tab to Taskbar - Installation & Manifest](#4-tab-to-taskbar---installation--manifest)
5. [Prompt & Measure Install](#5-prompt--measure-install)
6. [Empowering Your PWA - Advanced APIs](#6-empowering-your-pwa---advanced-apis)
7. [Service Worker Includes & Streaming](#7-service-worker-includes--streaming)
8. [Working with Web Workers](#8-working-with-web-workers)

---

## 1. Going Offline - Service Workers & Cache API

### Core Concepts

- **Service Workers**: JavaScript files acting as network proxies between app and server
- **Precaching**: Proactively loading essential resources during service worker install
- **Cache Storage API**: Browser API for managing cached responses
- **Cache-First Strategy**: Serve from cache immediately, fall back to network

### Service Worker Registration

```javascript
// js/main.js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      let reg;
      // Development mode with ES modules
      if (import.meta.env?.DEV) {
        reg = await navigator.serviceWorker.register('/service-worker.js', {
          type: 'module',
        });
      } else {
        reg = await navigator.serviceWorker.register('/service-worker.js');
      }
      console.log('Service worker registered!', reg);
    } catch (err) {
      console.log('Service worker registration failed:', err);
    }
  });
}
```

### Precache Resources on Install

```javascript
// service-worker.js
const cacheName = 'cache-v1';
const precacheResources = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/main.js',
  '/images/logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(cacheName).then((cache) => {
      return cache.addAll(precacheResources);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
```

### Fetch Interception (Cache-First)

```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
```

### Service Worker Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    SERVICE WORKER LIFECYCLE                  │
├─────────────────────────────────────────────────────────────┤
│   1. REGISTRATION → navigator.serviceWorker.register()      │
│                    ↓                                         │
│   2. INSTALL → Precache resources, event.waitUntil()        │
│                    ↓                                         │
│   3. WAITING → Waits for old SW (skipWaiting() bypasses)    │
│                    ↓                                         │
│   4. ACTIVATE → Clean old caches, clients.claim()           │
│                    ↓                                         │
│   5. RUNNING → Listens for fetch, push, sync events         │
└─────────────────────────────────────────────────────────────┘
```

### Cache API Methods

```javascript
// Open/create a cache
const cache = await caches.open('my-cache-v1');

// Add resources
await cache.add('/page.html');
await cache.addAll(['/index.html', '/styles.css']);

// Manual cache with custom response
await cache.put('/api/data', new Response(JSON.stringify(data)));

// Retrieve from cache
const response = await cache.match('/index.html');

// Delete entry or entire cache
await cache.delete('/old-page.html');
await caches.delete('old-cache-v1');

// List all caches
const cacheNames = await caches.keys();
```

---

## 2. Working with Workbox

### Core Workbox Modules

| Module | Purpose |
|--------|---------|
| `workbox-strategies` | Caching strategies (CacheFirst, StaleWhileRevalidate, etc.) |
| `workbox-routing` | Route registration with `registerRoute()` |
| `workbox-recipes` | Pre-built solutions (warmStrategyCache, offlineFallback) |
| `workbox-cacheable-response` | Plugin ensuring only valid responses cached |
| `workbox-expiration` | Plugin managing cache lifecycle and TTL |

### Cache-First with Workbox

```javascript
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { registerRoute } from 'workbox-routing';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { warmStrategyCache, offlineFallback } from 'workbox-recipes';

// Page cache with Cache-First strategy
const pageCache = new CacheFirst({
  cacheName: 'page-cache',
  plugins: [
    new CacheableResponsePlugin({ statuses: [0, 200] }),
    new ExpirationPlugin({ maxAgeSeconds: 30 * 24 * 60 * 60 })  // 30 days
  ]
});

// Warm the cache with critical pages
warmStrategyCache({
  urls: ['/index.html', '/'],
  strategy: pageCache
});

// Register route for navigation requests
registerRoute(
  ({ request }) => request.mode === 'navigate',
  pageCache
);
```

### Stale-While-Revalidate for Assets

```javascript
// For CSS, JS, and worker files
registerRoute(
  ({ request }) =>
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'worker',
  new StaleWhileRevalidate({
    cacheName: 'asset-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] })
    ]
  })
);
```

### Offline Fallback

```javascript
// Automatic offline handling with fallback pages
offlineFallback({
  pageFallback: '/offline.html',
  imageFallback: '/images/offline.png',
  fontFallback: false
});
```

### Caching Strategies Comparison

| Strategy | Behavior | Best For |
|----------|----------|----------|
| **CacheFirst** | Cache → Network fallback | Static assets, app shell |
| **NetworkFirst** | Network → Cache fallback | API calls, dynamic content |
| **StaleWhileRevalidate** | Cache immediately, update in background | Frequently updated assets |
| **CacheOnly** | Cache only, no network | Fully offline apps |
| **NetworkOnly** | Network only, no cache | Non-cacheable requests |

---

## 3. IndexedDB for Data Persistence

### Using the `idb` Library

The `idb` library provides a Promise-based wrapper around IndexedDB's callback interface.

### Database Creation

```javascript
import { openDB } from 'idb';

const db = await openDB('settings-store', 1, {
  upgrade(db) {
    // Create object store on first open or version upgrade
    db.createObjectStore('settings');
  },
});
```

### CRUD Operations

```javascript
// CREATE/UPDATE - put() stores or updates
await db.put('settings', content, 'content');
await db.put('settings', 'dark', 'theme');

// READ - get() retrieves by key
const content = await db.get('settings', 'content') || defaultText;
const theme = await db.get('settings', 'theme') || 'light';

// DELETE - delete() removes by key
await db.delete('settings', 'content');

// CLEAR - clear() removes all entries
await db.clear('settings');
```

### Complex Object Stores

```javascript
const db = await openDB('my-database', 1, {
  upgrade(db) {
    // Key-value store
    db.createObjectStore('settings');

    // Auto-incrementing key
    const notesStore = db.createObjectStore('notes', {
      keyPath: 'id',
      autoIncrement: true
    });

    // Create index for querying
    notesStore.createIndex('by-date', 'createdAt');
    notesStore.createIndex('by-category', 'category');
  },
});

// Using indexes
const tx = db.transaction('notes', 'readonly');
const index = tx.store.index('by-date');
const recentNotes = await index.getAll(IDBKeyRange.lowerBound(lastWeek));
```

### Offline Data Persistence Pattern

```javascript
class OfflineStorage {
  constructor() {
    this.dbPromise = openDB('app-data', 1, {
      upgrade(db) {
        db.createObjectStore('content');
        db.createObjectStore('user-prefs');
      }
    });
  }

  async saveContent(key, data) {
    const db = await this.dbPromise;
    await db.put('content', data, key);
  }

  async loadContent(key, defaultValue = null) {
    const db = await this.dbPromise;
    return await db.get('content', key) ?? defaultValue;
  }

  async savePreference(key, value) {
    const db = await this.dbPromise;
    await db.put('user-prefs', value, key);
  }
}
```

---

## 4. Tab to Taskbar - Installation & Manifest

### Web App Manifest

The manifest file describes your PWA to browsers and enables installation.

```json
{
  "name": "My Progressive Web App",
  "short_name": "MyPWA",
  "description": "An awesome PWA",
  "start_url": "/?source=pwa",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#282c34",
  "orientation": "portrait-primary",
  "categories": ["productivity", "utilities"],
  "icons": [
    {
      "src": "/icons/icon-48.png",
      "sizes": "48x48",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "Night Mode",
      "url": "/?theme=night",
      "icons": [{ "src": "/icons/night.png", "sizes": "96x96" }]
    },
    {
      "name": "Day Mode",
      "url": "/?theme=day",
      "icons": [{ "src": "/icons/day.png", "sizes": "96x96" }]
    }
  ]
}
```

### Display Modes

| Mode | Description |
|------|-------------|
| `fullscreen` | Entire screen, no browser UI |
| `standalone` | App-like window, no browser chrome |
| `minimal-ui` | Minimal browser controls |
| `browser` | Standard browser tab |

### Link Manifest in HTML

```html
<head>
  <link rel="manifest" href="/manifest.json">
  <!-- iOS compatibility -->
  <link rel="apple-touch-icon" href="/icons/icon-192.png">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="theme-color" content="#282c34">
</head>
```

### Icon Sizes to Include

- **48x48** - Minimum required
- **72x72** - Older Android
- **96x96** - Shortcuts
- **128x128** - Chrome Web Store
- **192x192** - Android home screen
- **512x512** - Splash screen
- **Maskable** - Adaptive icons (safe zone required)

---

## 5. Prompt & Measure Install

### Capturing the Install Prompt

```javascript
// js/lib/install.js
class Install {
  constructor() {
    this.deferredPrompt = null;
    this.installButton = document.getElementById('install-button');

    // Initially hide the button
    this.toggleInstallButton('hide');

    // Capture the prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.toggleInstallButton('show');
    });

    // Handle successful installation
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.toggleInstallButton('hide');
      console.log('PWA installed successfully');
    });

    // Attach click handler
    this.installButton?.addEventListener('click', () => this.install());
  }

  toggleInstallButton(action) {
    if (this.installButton) {
      this.installButton.hidden = action === 'hide';
    }
  }

  async install() {
    if (!this.deferredPrompt) return;

    // Show the prompt
    this.deferredPrompt.prompt();

    // Wait for user response
    const { outcome } = await this.deferredPrompt.userChoice;
    console.log(`User ${outcome} the install prompt`);

    // Reset the prompt
    this.deferredPrompt = null;
    this.toggleInstallButton('hide');
  }
}

export default Install;
```

### Usage in Main App

```javascript
// js/main.js
import Install from './lib/install.js';

// Initialize install handler
new Install();
```

### Measuring Installation

```javascript
window.addEventListener('appinstalled', () => {
  // Track installation analytics
  if (typeof gtag !== 'undefined') {
    gtag('event', 'pwa_install', {
      event_category: 'engagement',
      event_label: 'PWA Installation'
    });
  }
});

// Track install prompt shown
window.addEventListener('beforeinstallprompt', () => {
  // Track that user saw install option
  console.log('Install prompt available');
});
```

### Best Practices

1. **Don't show immediately** - Wait for user engagement
2. **Custom UI** - Use your own button instead of browser default
3. **Contextual prompts** - Show after meaningful interaction
4. **Track outcomes** - Measure accept/dismiss rates
5. **Respect dismissal** - Don't repeatedly prompt

---

## 6. Empowering Your PWA - Advanced APIs

### File System Access API

```javascript
// Open file picker
async function openFile() {
  const [fileHandle] = await window.showOpenFilePicker({
    types: [{
      description: 'Markdown Files',
      accept: { 'text/markdown': ['.md', '.markdown'] }
    }],
    multiple: false
  });

  // Store handle for later saves
  this.fileHandle = fileHandle;

  // Read content
  const file = await fileHandle.getFile();
  const content = await file.text();

  // Persist handle to IndexedDB for reload recovery
  await db.put('settings', fileHandle, 'fileHandle');

  return content;
}

// Save to file
async function saveFile(content) {
  if (!this.fileHandle) {
    return this.saveFileAs(content);
  }

  const writable = await this.fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

// Save As (new file)
async function saveFileAs(content) {
  const fileHandle = await window.showSaveFilePicker({
    types: [{
      description: 'Markdown Files',
      accept: { 'text/markdown': ['.md'] }
    }]
  });

  this.fileHandle = fileHandle;
  await this.saveFile(content);
}
```

### File Handling API (Manifest)

Register as file handler in manifest.json:

```json
{
  "file_handlers": [
    {
      "action": "/",
      "accept": {
        "text/markdown": [".md", ".markdown"]
      }
    }
  ]
}
```

Handle file launch in service worker or app:

```javascript
if ('launchQueue' in window) {
  window.launchQueue.setConsumer(async (launchParams) => {
    if (launchParams.files.length) {
      const fileHandle = launchParams.files[0];
      const file = await fileHandle.getFile();
      const content = await file.text();
      // Load content into editor
    }
  });
}
```

### Screen Wake Lock API

```javascript
class FocusMode {
  constructor() {
    this.wakeLock = null;
  }

  async enable() {
    try {
      // Request wake lock
      this.wakeLock = await navigator.wakeLock.request('screen');

      // Enter fullscreen
      await document.documentElement.requestFullscreen();

      // Handle visibility change (re-acquire if tab becomes visible)
      document.addEventListener('visibilitychange', this.handleVisibility);
    } catch (err) {
      console.error('Wake lock failed:', err);
    }
  }

  async disable() {
    // Release wake lock
    if (this.wakeLock) {
      await this.wakeLock.release();
      this.wakeLock = null;
    }

    // Exit fullscreen
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  }

  handleVisibility = async () => {
    if (document.visibilityState === 'visible' && !this.wakeLock) {
      this.wakeLock = await navigator.wakeLock.request('screen');
    }
  }
}
```

### Multi-Screen Window Placement

```javascript
async function openPreviewWindow() {
  // Get screen information
  const screenDetails = await window.getScreenDetails();
  const primaryScreen = screenDetails.screens.find(s => s.isPrimary);

  // Calculate right half of screen
  const width = primaryScreen.availWidth / 2;
  const height = primaryScreen.availHeight;
  const left = primaryScreen.availLeft + width;
  const top = primaryScreen.availTop;

  // Open window on right half
  const previewWindow = window.open(
    '/preview',
    'preview',
    `width=${width},height=${height},left=${left},top=${top}`
  );

  return previewWindow;
}
```

---

## 7. Service Worker Includes & Streaming

### Streaming Responses with workbox-streams

```javascript
import { strategy as streamsStrategy } from 'workbox-streams';
import { registerRoute } from 'workbox-routing';
import { openDB } from 'idb';
import { marked } from 'marked';

// Register streaming route BEFORE navigation handler
registerRoute(
  ({ url }) => url.pathname === '/preview',
  streamsStrategy([
    // Part 1: Static HTML head
    () => caches.match('/preview/index.html').then(response => {
      const reader = response.body.getReader();
      return new ReadableStream({
        async pull(controller) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
          } else {
            controller.enqueue(value);
          }
        }
      });
    }),

    // Part 2: Dynamic content from IndexedDB
    async () => {
      const db = await openDB('settings-store', 1);
      const content = await db.get('settings', 'content') || '';
      const html = marked.parse(content);
      return new Response(html);
    },

    // Part 3: Closing tags
    () => new Response('</main></body></html>')
  ])
);
```

### Why Streaming?

- **Faster TTFB** - Send known content immediately
- **Progressive rendering** - Browser can paint while data loads
- **Efficient** - Don't wait for all async operations to complete

---

## 8. Working with Web Workers

### Shared Workers vs Dedicated Workers

| Type | Scope | Use Case |
|------|-------|----------|
| **Dedicated** | Single page | Heavy computation for one page |
| **Shared** | Multiple pages/tabs | State coordination between tabs |

### Creating a Shared Worker

```javascript
// worker.js
import { expose } from 'comlink';

class Compiler {
  constructor() {
    this.rawContent = '';
    this.compiledContent = '';
    this.subscribers = [];
  }

  setContent(content) {
    this.rawContent = content;
    this.compiledContent = this.compile(content);
    this.notifySubscribers();
  }

  compile(markdown) {
    // Markdown to HTML compilation
    return marked.parse(markdown);
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    // Send current state immediately
    callback(this.compiledContent);
  }

  notifySubscribers() {
    this.subscribers.forEach(cb => cb(this.compiledContent));
  }
}

// Expose to main thread via Comlink
expose(new Compiler(), self);
```

### Using the Worker with Comlink

```javascript
// main.js
import { wrap, proxy } from 'comlink';

// Create shared worker
const worker = new SharedWorker(
  new URL('./worker.js', import.meta.url),
  { type: 'module' }
);

// Wrap with Comlink for easy communication
const compiler = wrap(worker.port);

// Subscribe to updates (proxy needed for callbacks)
await compiler.subscribe(proxy((html) => {
  // SECURITY: Always sanitize HTML before rendering
  // Use DOMPurify: previewElement.innerHTML = DOMPurify.sanitize(html);
  updatePreview(html);
}));

// Send content updates
editor.addEventListener('input', async (e) => {
  await compiler.setContent(e.target.value);
});
```

### Key Comlink Methods

```javascript
import { wrap, expose, proxy, transfer } from 'comlink';

// wrap() - Make worker methods callable from main thread
const api = wrap(worker.port);

// expose() - Make class available to other threads
expose(new MyClass(), self);

// proxy() - Enable callback functions across boundary
await api.subscribe(proxy(callback));

// transfer() - Transfer ownership of transferable objects
await api.processData(transfer(buffer, [buffer]));
```

### Communication Flow

```
┌─────────────────┐     Comlink     ┌─────────────────┐
│   Editor Tab    │ ◄─────────────► │  Shared Worker  │
│   (main.js)     │   setContent()  │   (worker.js)   │
└─────────────────┘                 └────────┬────────┘
                                             │
                                    subscribe(callback)
                                             │
┌─────────────────┐                 ┌────────▼────────┐
│  Preview Tab    │ ◄───────────────│  Compiled HTML  │
│  (preview.js)   │   proxy(cb)     │                 │
└─────────────────┘                 └─────────────────┘
```

---

## Security Considerations

When rendering dynamic HTML content (like compiled markdown):

1. **Sanitize HTML** - Use DOMPurify or similar before rendering to DOM
2. **Content Security Policy** - Restrict inline scripts via CSP headers
3. **Never execute untrusted code** - Parse data safely with JSON.parse()
4. **Validate input** - Check data from IndexedDB/workers before use

```javascript
import DOMPurify from 'dompurify';

// Safe HTML rendering
const cleanHTML = DOMPurify.sanitize(compiledMarkdown);
container.innerHTML = cleanHTML;
```

---

## Key Lessons for Rambam

### 1. Layered Caching Strategy

```javascript
// App shell: Cache First
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new CacheFirst({ cacheName: 'pages' })
);

// API data: Network First with cache fallback
registerRoute(
  ({ url }) => url.origin === 'https://www.sefaria.org',
  new NetworkFirst({
    cacheName: 'sefaria-api',
    plugins: [new ExpirationPlugin({ maxEntries: 100 })]
  })
);

// Static assets: Stale While Revalidate
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({ cacheName: 'images' })
);
```

### 2. IndexedDB for User Data

```javascript
// Store completion status, preferences, cached texts
const db = await openDB('rambam-data', 1, {
  upgrade(db) {
    db.createObjectStore('completions');  // User progress
    db.createObjectStore('texts');        // Cached halakhot
    db.createObjectStore('preferences');  // Settings
  }
});
```

### 3. Custom Install Experience

- Show install button after user reads a few halakhot
- Track installation for analytics
- Provide clear value proposition

### 4. Offline-First Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    RAMBAM PWA                                │
├─────────────────────────────────────────────────────────────┤
│  UI Layer          │ React/Next.js Components               │
├─────────────────────────────────────────────────────────────┤
│  Cache Layer       │ Workbox + Service Worker               │
├─────────────────────────────────────────────────────────────┤
│  Data Layer        │ IndexedDB (idb library)                │
├─────────────────────────────────────────────────────────────┤
│  Network Layer     │ Sefaria API (when online)              │
└─────────────────────────────────────────────────────────────┘
```

---

## References

- [PWA Training - Going Offline](https://developers.google.com/codelabs/pwa-training/pwa03--going-offline)
- [PWA Training - Working with Workbox](https://developers.google.com/codelabs/pwa-training/pwa03--working-with-workbox)
- [PWA Training - IndexedDB](https://developers.google.com/codelabs/pwa-training/pwa03--indexeddb)
- [PWA Training - Tab to Taskbar](https://developers.google.com/codelabs/pwa-training/pwa04--tab-to-taskbar)
- [PWA Training - Prompt & Measure Install](https://developers.google.com/codelabs/pwa-training/pwa04--prompt-measure-install)
- [PWA Training - Empowering Your PWA](https://developers.google.com/codelabs/pwa-training/pwa05--empowering-your-pwa)
- [PWA Training - Service Worker Includes](https://developers.google.com/codelabs/pwa-training/pwa06--service-worker-includes)
- [PWA Training - Working with Workers](https://developers.google.com/codelabs/pwa-training/pwa06--working-with-workers)
- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [MDN IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Comlink Library](https://github.com/GoogleChromeLabs/comlink)
