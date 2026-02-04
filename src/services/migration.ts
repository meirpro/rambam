/**
 * Migration service for transitioning data from localStorage to IndexedDB
 * Runs once on app startup to migrate existing cached texts
 */

import { saveTextToDB, setMeta, getMeta } from "./database";
import type { StudyPath, DayData } from "@/types";

const MIGRATION_KEY = "migration-v1-complete";

interface LegacyAppState {
  days: Record<StudyPath, Record<string, DayData>>;
}

/**
 * Check if migration has already been completed
 */
export async function hasMigrated(): Promise<boolean> {
  const migrated = await getMeta<boolean>(MIGRATION_KEY);
  return migrated === true;
}

/**
 * Mark migration as complete
 */
export async function markMigrationComplete(): Promise<void> {
  await setMeta(MIGRATION_KEY, true);
}

/**
 * Migrate texts from localStorage to IndexedDB
 *
 * This function:
 * 1. Reads the existing app state from localStorage
 * 2. Extracts all texts and chapterBreaks from days data
 * 3. Saves them to IndexedDB
 * 4. Does NOT modify localStorage (appStore will handle that separately)
 *
 * @returns Number of texts migrated
 */
export async function migrateTextsToIndexedDB(): Promise<number> {
  // Check if already migrated
  if (await hasMigrated()) {
    return 0;
  }

  // Get existing data from localStorage
  const stored = localStorage.getItem("rambam-app-storage");
  if (!stored) {
    // No existing data, mark as migrated and return
    await markMigrationComplete();
    return 0;
  }

  let state: { state: LegacyAppState } | null = null;
  try {
    state = JSON.parse(stored);
  } catch {
    // Invalid JSON, skip migration
    await markMigrationComplete();
    return 0;
  }

  if (!state?.state?.days) {
    await markMigrationComplete();
    return 0;
  }

  const { days } = state.state;
  let migratedCount = 0;

  // Track refs we've already migrated to avoid duplicates
  const migratedRefs = new Set<string>();

  // Iterate through all paths and dates
  const paths: StudyPath[] = ["rambam3", "rambam1", "mitzvot"];

  for (const path of paths) {
    const pathDays = days[path];
    if (!pathDays) continue;

    for (const [, dayData] of Object.entries(pathDays)) {
      // Skip if no texts or already migrated this ref
      if (!dayData.texts || !dayData.ref || migratedRefs.has(dayData.ref)) {
        continue;
      }

      try {
        await saveTextToDB(
          dayData.ref,
          dayData.texts,
          dayData.chapterBreaks || [],
        );
        migratedRefs.add(dayData.ref);
        migratedCount++;
      } catch (error) {
        console.error(`Failed to migrate text ${dayData.ref}:`, error);
      }
    }
  }

  await markMigrationComplete();
  console.log(
    `Migration complete: ${migratedCount} texts migrated to IndexedDB`,
  );
  return migratedCount;
}

/**
 * Run all migrations
 * Call this on app startup
 */
export async function runMigrations(): Promise<void> {
  try {
    await migrateTextsToIndexedDB();
  } catch (error) {
    console.error("Migration failed:", error);
    // Don't throw - app should still work even if migration fails
  }
}
