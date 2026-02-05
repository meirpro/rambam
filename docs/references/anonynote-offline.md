# Anonynote Offline Architecture Reference

**Source:** https://anonynote.org/
**GitHub:** https://github.com/jasonpetersen/anonynote
**Type:** Real-world PWA Example

A mobile-first Progressive Web App for anonymous note-taking that works fully offline. Excellent example of offline-first architecture with sync capabilities.

---

## Overview

Anonynote demonstrates a mature offline-first pattern with:
- **IndexedDB** for local persistence (using `idb` library)
- **Workbox** service worker for caching
- **Dual-state sync tracking** on every object
- **Deferred commit pattern** with throttling
- **Graceful offline degradation** with multiple offline states

### Key Characteristics

- No login required - anonymous access
- Works 100% offline after first visit
- Syncs when back online
- Scores 90-100% on Lighthouse PWA audit
- Mobile-first, installable on all platforms

---

## IndexedDB Schema

### Database Structure

```javascript
// Database: "anonynote"
// Multiple object stores for different data types

const stores = {
  // Application state
  snapshot: {
    // position, counters, connection status, language, dark mode
  },

  // Notepad metadata catalog
  catalog: {
    // name, hash, description, lastEdit, synced
    indexes: ['npname', 'nphash', 'lastEdit', 'synced']
  },

  // Dynamic stores: one per notepad (numeric ID)
  // Each contains note objects
};
```

### Note Object Schema

```javascript
const noteSchema = {
  idLocal: number,      // Local ID (offline-generated)
  idRemote: number,     // Server ID (0 until synced)
  org: number,          // Organization/order position
  color: string,        // Note color
  isChecked: boolean,   // Checkbox state
  text: string,         // Note content
  lastEdit: timestamp,  // Last modification time
  deleted: boolean,     // Soft delete flag (for sync)
  synced: number        // 0 = pending, 1 = synced
};
```

### Notepad Catalog Schema

```javascript
const notepadSchema = {
  name: string,         // Notepad name
  hash: string,         // Unique identifier/URL slug
  description: string,  // Optional description
  lastEdit: timestamp,  // Last modification time
  synced: number        // 0 = pending, 1 = synced
};
```

---

## Offline State Machine

Anonynote tracks four distinct offline states:

```javascript
const offlineState = {
  0: 'online',           // Normal operation, sync enabled
  1: 'system-offline',   // Network unavailable (detected)
  2: 'user-offline',     // User chose to work offline
  3: 'unavailable'       // Service unavailable
};
```

### State Transitions

```
┌─────────────────────────────────────────────────────────────┐
│                    OFFLINE STATE MACHINE                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────┐    network lost    ┌──────────────────┐      │
│   │  ONLINE  │ ─────────────────► │  SYSTEM OFFLINE  │      │
│   │   (0)    │                    │       (1)        │      │
│   └────┬─────┘ ◄───────────────── └──────────────────┘      │
│        │         network restored                            │
│        │         + no pending sync                           │
│        │                                                     │
│   user toggle                                                │
│        │                                                     │
│        ▼                                                     │
│   ┌──────────────────┐                                       │
│   │  USER OFFLINE    │  User explicitly chose offline mode   │
│   │       (2)        │                                       │
│   └──────────────────┘                                       │
│                                                              │
│   ┌──────────────────┐                                       │
│   │   UNAVAILABLE    │  Server/service down                  │
│   │       (3)        │                                       │
│   └──────────────────┘                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Reconnection Guard

Critical pattern: Don't auto-switch to online if there's unsynced data:

```javascript
// When network returns
if (wasOffline && nowOnline && hasUnsyncedData) {
  // DON'T switch to online yet
  // Show sync modal to user first
  // Let user decide when to sync
  showSyncModal();
} else {
  // Safe to go online
  setOnlineState();
}
```

---

## Local ID Generation

For offline-first creation, maintain local counters:

```javascript
// Stored in IndexedDB 'snapshot' store
const counters = {
  localPadCounter: number,   // Next notepad ID
  localNoteCounter: number   // Next note ID
};

// Creating a note offline
function createNoteOffline(notepad, text) {
  const note = {
    idLocal: ++localNoteCounter,  // Generate local ID
    idRemote: 0,                   // No server ID yet
    text: text,
    synced: 0,                     // Mark as unsynced
    // ...
  };

  // Save to IndexedDB
  await db.put(notepadStore, note);

  // Update counter in snapshot
  await db.put('snapshot', localNoteCounter, 'localNoteCounter');
}
```

---

## Dual-State Sync Tracking

Every object has a `synced` flag:

```javascript
// synced = 1: Object matches server state
// synced = 0: Object has local changes pending sync

async function updateNote(noteId, changes) {
  const note = await db.get(notepadStore, noteId);

  Object.assign(note, changes, {
    lastEdit: Date.now(),
    synced: 0  // Mark as needing sync
  });

  await db.put(notepadStore, note);

  if (isOnline) {
    await syncToServer(note);
    note.synced = 1;
    await db.put(notepadStore, note);
  }
}
```

### Soft Deletes for Sync

Never hard-delete locally - use soft delete flag:

```javascript
async function deleteNote(noteId) {
  const note = await db.get(notepadStore, noteId);

  note.deleted = true;   // Soft delete
  note.synced = 0;       // Needs to sync deletion
  note.lastEdit = Date.now();

  await db.put(notepadStore, note);

  // When online, sync deletion to server
  // Then can optionally hard-delete locally
}
```

---

## Deferred Commit Pattern

Throttle writes to prevent rapid-fire database operations:

```javascript
class CommitHandler {
  constructor(commitFn, delay = 3000) {
    this.commitFn = commitFn;
    this.delay = delay;
    this.timeout = null;
    this.actionQueue = [];
  }

  // Schedule a commit
  schedule(action, mode = 'delay') {
    this.actionQueue.push(action);

    switch (mode) {
      case 'offline':
        // Immediate local commit (no server)
        this.commitNow();
        break;

      case 'delay':
        // Throttled commit
        this.scheduleDelayed();
        break;

      case 'now':
      case 'resolve':
        // Clear pending and commit immediately
        clearTimeout(this.timeout);
        this.commitNow();
        break;
    }
  }

  scheduleDelayed() {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.commitNow();
    }, this.delay);
  }

  async commitNow() {
    const actions = [...this.actionQueue];
    this.actionQueue = [];

    // Batch process all queued actions
    await this.commitFn(actions);
  }
}

// Usage
const noteCommitHandler = new CommitHandler(batchSaveNotes, 3000);

// On user input
noteCommitHandler.schedule({ noteId, changes }, 'delay');

// On blur/leave
noteCommitHandler.schedule(null, 'resolve');
```

---

## Service Worker (Workbox)

### Caching Strategy

```javascript
// sw.js - Using Workbox

// Precache core assets on install
workbox.precaching.precacheAndRoute([
  '/',
  '/site.webmanifest',
  '/css/main.css',
  '/js/main.js',
  // fonts, favicons...
]);

// Stale-While-Revalidate for dynamic assets
workbox.routing.registerRoute(
  /\.(json|js|css)$/,
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'dynamic-assets'
  })
);

// Cache-First for fonts (long-lived)
workbox.routing.registerRoute(
  /^https:\/\/fonts\.googleapis\.com/,
  new workbox.strategies.CacheFirst({
    cacheName: 'google-fonts-stylesheets'
  })
);

workbox.routing.registerRoute(
  /^https:\/\/fonts\.gstatic\.com/,
  new workbox.strategies.CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200]  // Cache opaque responses
      }),
      new workbox.expiration.ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 365,  // 1 year
        maxEntries: 30
      })
    ]
  })
);

// Cache-First for images with expiration
workbox.routing.registerRoute(
  /\.(?:png|gif|jpg|jpeg|webp|svg)$/,
  new workbox.strategies.CacheFirst({
    cacheName: 'images',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60  // 30 days
      })
    ]
  })
);

// SPA navigation routing
workbox.routing.registerRoute(
  new workbox.routing.NavigationRoute(
    new workbox.strategies.NetworkFirst({
      cacheName: 'pages'
    }),
    {
      allowlist: [/\/np\//, /\/local\//],
      denylist: [/\/api\//, /\.json$/]
    }
  )
);

// Enable offline Google Analytics
workbox.googleAnalytics.initialize();
```

---

## Web App Manifest

```json
{
  "name": "Anonynote",
  "short_name": "Anonynote",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "theme_color": "#0099cc",
  "background_color": "#0099cc",
  "icons": [
    {
      "src": "/favicons/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/favicons/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## Key Lessons for Rambam

### 1. Multi-Store IndexedDB Schema

Separate concerns into distinct object stores:

```javascript
const rambamSchema = {
  // App state
  snapshot: ['position', 'lastSync', 'preferences'],

  // Content catalog (metadata only)
  catalog: ['bookId', 'chapterId', 'lastAccessed', 'synced'],

  // Full text content (separate for size)
  texts: ['ref', 'content', 'fetchedAt'],

  // User progress
  completions: ['ref', 'completedAt', 'synced']
};
```

### 2. Sync Flag on Every Object

Track sync state at the object level:

```javascript
const completion = {
  ref: 'Mishneh_Torah,_Laws_of_Character_Traits.1.1',
  completedAt: Date.now(),
  synced: 0  // Will be 1 after server confirms
};
```

### 3. Graceful Offline Detection

```javascript
// Track multiple offline reasons
const connectionState = {
  isOnline: navigator.onLine,
  isUserOffline: false,      // User chose offline mode
  hasUnsyncedData: false,    // Pending changes exist
  lastSyncAttempt: null
};

// Listen for changes
window.addEventListener('online', handleOnline);
window.addEventListener('offline', handleOffline);
```

### 4. Deferred Commits for Completion Tracking

```javascript
// Don't save every checkbox immediately
const completionCommitter = new CommitHandler(async (completions) => {
  // Batch save to IndexedDB
  const tx = db.transaction('completions', 'readwrite');
  for (const c of completions) {
    await tx.store.put(c);
  }
  await tx.done;
}, 2000);  // 2 second delay

// On checkbox change
function markComplete(ref) {
  completionCommitter.schedule({
    ref,
    completedAt: Date.now(),
    synced: 0
  });
}
```

### 5. Local-First Content Access

```javascript
async function getHalakha(ref) {
  // Always check local first
  const cached = await db.get('texts', ref);

  if (cached && !isStale(cached.fetchedAt)) {
    return cached.content;
  }

  // If offline, return cached even if stale
  if (!navigator.onLine && cached) {
    return cached.content;
  }

  // Fetch fresh, cache, and return
  const fresh = await fetchFromSefaria(ref);
  await db.put('texts', { ref, content: fresh, fetchedAt: Date.now() });
  return fresh;
}
```

---

## Architecture Comparison

| Aspect | Anonynote | Rambam Equivalent |
|--------|-----------|-------------------|
| Data type | User-created notes | External API content + user progress |
| Sync direction | Bidirectional | Mostly read (content) + write (progress) |
| Offline creation | Yes (notes) | No (content from Sefaria) |
| ID strategy | Local counters | Use Sefaria refs as keys |
| Conflict resolution | Last-write-wins | Progress: merge, Content: Sefaria authoritative |

---

## References

- [Anonynote Live](https://anonynote.org/)
- [Anonynote GitHub](https://github.com/jasonpetersen/anonynote)
- [idb Library](https://github.com/jakearchibald/idb)
- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
