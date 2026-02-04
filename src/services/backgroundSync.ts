/**
 * Background sync service for keeping calendar data fresh
 * Syncs data periodically when online and tab is visible
 * Also handles daily prefetch of upcoming content
 */

import type { StudyPath } from "@/types";
import { fetchCalendar, fetchHalakhot } from "./sefaria";
import { fetchHebrewDate } from "./hebcal";
import { getCalendarFromDB, getMeta, setMeta } from "./database";
import { getTodayInIsrael, formatDateString } from "@/lib/dates";
import { useAppStore } from "@/stores/appStore";

// Sync interval: 30 minutes
const SYNC_INTERVAL_MS = 30 * 60 * 1000;

// Daily prefetch: once per day
const PREFETCH_KEY = "lastDailyPrefetch";
const PREFETCH_DAYS_AHEAD = 3; // Prefetch 3 days ahead

// Track if sync is already running
let syncInProgress = false;
let syncIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Check if conditions are right for background sync
 */
function canSync(): boolean {
  // Must be online
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return false;
  }

  // Tab must be visible (respect battery/data)
  if (
    typeof document !== "undefined" &&
    document.visibilityState !== "visible"
  ) {
    return false;
  }

  return true;
}

/**
 * Get the next 3 days (today + 2)
 */
function getUpcomingDates(): string[] {
  const dates: string[] = [];
  const today = new Date(getTodayInIsrael());

  for (let i = 0; i < 3; i++) {
    dates.push(formatDateString(today));
    today.setDate(today.getDate() + 1);
  }

  return dates;
}

/**
 * Sync calendar data for a specific path
 * Returns true if any data was updated
 */
async function syncPath(path: StudyPath): Promise<boolean> {
  const dates = getUpcomingDates();
  let hasUpdates = false;

  for (const date of dates) {
    try {
      // Get current cached data
      const cached = await getCalendarFromDB(path, date);

      // Fetch fresh data (this will also update the cache)
      const fresh = await fetchCalendar(date, path);

      // Check if data changed
      if (cached && fresh.ref !== cached.ref) {
        hasUpdates = true;
      }
    } catch (error) {
      console.error(`Background sync failed for ${path}/${date}:`, error);
    }
  }

  return hasUpdates;
}

/**
 * Check if daily prefetch should run
 */
async function shouldRunDailyPrefetch(): Promise<boolean> {
  const today = getTodayInIsrael();
  const lastPrefetch = await getMeta<string>(PREFETCH_KEY);

  // Run if never prefetched or last prefetch was before today
  return !lastPrefetch || lastPrefetch < today;
}

/**
 * Prefetch upcoming days for the current study path
 * Downloads calendar + full text content for the next few days
 */
async function runDailyPrefetch(): Promise<void> {
  const studyPath = useAppStore.getState().studyPath;
  const today = new Date(getTodayInIsrael());
  const setDayData = useAppStore.getState().setDayData;

  console.log(`[BackgroundSync] Running daily prefetch for ${studyPath}`);

  for (let i = 0; i < PREFETCH_DAYS_AHEAD; i++) {
    const date = formatDateString(today);
    today.setDate(today.getDate() + 1);

    try {
      // Fetch calendar entry
      const calData = await fetchCalendar(date, studyPath);

      // Fetch full halakhot text (this saves to IndexedDB)
      const { halakhot, chapterBreaks } = await fetchHalakhot(calData.ref);

      // Fetch Hebrew date
      const dateResult = await fetchHebrewDate(date);

      // Update app store with metadata
      setDayData(studyPath, date, {
        he: calData.he,
        en: calData.en,
        ref: calData.ref,
        count: halakhot.length,
        heDate: dateResult?.he,
        enDate: dateResult?.en,
        texts: halakhot,
        chapterBreaks,
      });

      console.log(`[BackgroundSync] Prefetched ${date}`);
    } catch (error) {
      console.error(`[BackgroundSync] Failed to prefetch ${date}:`, error);
    }
  }

  // Mark prefetch as done for today
  await setMeta(PREFETCH_KEY, getTodayInIsrael());
}

/**
 * Run a background sync for all paths
 * Content updates are applied silently - no user notification needed
 */
async function runSync(): Promise<void> {
  if (syncInProgress || !canSync()) {
    return;
  }

  syncInProgress = true;

  try {
    // First, check if daily prefetch is needed
    if (await shouldRunDailyPrefetch()) {
      await runDailyPrefetch();
    }

    // Then sync calendar data for all paths
    const paths: StudyPath[] = ["rambam3", "rambam1", "mitzvot"];

    for (const path of paths) {
      await syncPath(path);
      // Content updates are applied silently - cache is already updated
      // Users will see fresh data on next view without interruption
    }
  } catch (error) {
    console.error("Background sync failed:", error);
  } finally {
    syncInProgress = false;
  }
}

/**
 * Start the background sync service
 * Should be called once when the app initializes
 */
export function startBackgroundSync(): void {
  if (syncIntervalId) {
    return; // Already running
  }

  // Run initial sync after a short delay
  setTimeout(() => {
    runSync();
  }, 5000);

  // Set up periodic sync
  syncIntervalId = setInterval(() => {
    runSync();
  }, SYNC_INTERVAL_MS);

  // Also sync when tab becomes visible
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        runSync();
      }
    });
  }

  // Also sync when coming back online
  if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
      runSync();
    });
  }
}

/**
 * Stop the background sync service
 */
export function stopBackgroundSync(): void {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }
}

/**
 * Manually trigger a sync (e.g., from a refresh button)
 */
export async function triggerSync(): Promise<void> {
  await runSync();
}
