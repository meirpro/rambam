/**
 * Offline-first initialization
 * Run once on app startup to set up IndexedDB, migrations, and background sync
 */

import { runMigrations } from "./migration";
import {
  clearStaleData,
  cleanupCompletedDays,
  getDatabaseStats,
} from "./database";
import { startBackgroundSync } from "./backgroundSync";
import { useAppStore } from "@/stores/appStore";

// Track if initialization has been done
let initialized = false;

/**
 * Initialize the offline-first infrastructure
 * Should be called once when the app loads
 */
export async function initializeOffline(): Promise<void> {
  if (initialized) {
    return;
  }

  initialized = true;

  try {
    // 1. Run any pending migrations (localStorage → IndexedDB)
    await runMigrations();

    // 2. Clean up stale data (older than 30 days)
    const cleared = await clearStaleData(30);
    if (cleared > 0) {
      console.log(`Cleaned up ${cleared} stale entries from IndexedDB`);
    }

    // 2b. Clean up completed, non-bookmarked old days
    const { done, bookmarks, activePaths, daysAhead, cleanupOldDays } =
      useAppStore.getState();
    const cleanedDays = await cleanupCompletedDays(
      done,
      bookmarks,
      activePaths,
      daysAhead,
    );
    if (cleanedDays > 0) {
      // Also clean up the Zustand store
      cleanupOldDays(daysAhead);
      console.log(`Cleaned up ${cleanedDays} completed days from IndexedDB`);
    }

    // 3. Log database stats (for debugging)
    const stats = await getDatabaseStats();
    console.log(
      `IndexedDB: ${stats.textsCount} texts, ${stats.calendarCount} calendar entries`,
    );

    // 4. Start background sync (will sync every 30 min when online)
    startBackgroundSync();
  } catch (error) {
    console.error("Failed to initialize offline infrastructure:", error);
    // Don't throw - app should still work even if this fails
  }
}
