import { isDayComplete, isHalakhaDone } from "@/stores/appStore";
import type { StudyPath, DayData, CompletionMap } from "@/types";

interface FirstIncompleteResult {
  date: string | null;
  path: StudyPath | null;
  index: number | null;
}

/**
 * Find the first incomplete halakha across all active paths
 * Returns the date, path, and index of the first incomplete item
 */
export function findFirstIncomplete(
  activePaths: StudyPath[],
  days: Record<StudyPath, Record<string, DayData>>,
  done: CompletionMap,
  sortedDates: string[],
): FirstIncompleteResult {
  // Iterate through dates in order (oldest to newest for natural reading order)
  const chronologicalDates = [...sortedDates].reverse();

  for (const date of chronologicalDates) {
    for (const path of activePaths) {
      const dayData = days[path][date];
      if (!dayData) continue;

      // Check if this day is complete
      if (isDayComplete(done, path, date, dayData.count)) continue;

      // Find the first incomplete halakha in this day
      for (let i = 0; i < dayData.count; i++) {
        if (!isHalakhaDone(done, path, date, i)) {
          return { date, path, index: i };
        }
      }
    }
  }

  return { date: null, path: null, index: null };
}

/**
 * Get the element ID for a specific halakha card
 */
export function getHalakhaCardId(
  path: StudyPath,
  date: string,
  index: number,
): string {
  return `halakha-${path}-${date}-${index}`;
}
