/**
 * Hook for computing completion status for all days in a month
 * Efficiently batch-computes completion data for calendar display
 */

import { useMemo } from "react";
import { useAppStore } from "@/stores/appStore";
import type { StudyPath } from "@/types";

export interface DayCompletionStatus {
  percent: number;
  isComplete: boolean;
  doneCount: number;
  totalCount: number;
}

/**
 * Format a date as YYYY-MM-DD
 */
function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Get all days in a given month
 */
function getDaysInMonth(year: number, month: number): number {
  // Month is 0-indexed, so we get the last day of the month by going to day 0 of next month
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Hook to compute completion status for all days in a month
 * Returns a Record mapping date strings to their completion status
 *
 * @param year - Full year (e.g., 2026)
 * @param month - Month (0-indexed, 0 = January)
 */
export function useMonthCompletion(
  year: number,
  month: number,
): Record<string, DayCompletionStatus> {
  const studyPath = useAppStore((state) => state.studyPath);
  const days = useAppStore((state) => state.days);
  const done = useAppStore((state) => state.done);

  return useMemo(() => {
    const result: Record<string, DayCompletionStatus> = {};
    const pathDays = days[studyPath] || {};
    const pathPrefix = `${studyPath}:`;
    const daysInMonth = getDaysInMonth(year, month);

    // Pre-filter done keys by path prefix for efficiency
    const pathDoneKeys = Object.keys(done).filter((key) =>
      key.startsWith(pathPrefix),
    );

    // Build date-indexed completion counts
    // Key format: "path:date:index"
    const dateCompletionCounts: Record<string, number> = {};

    for (const key of pathDoneKeys) {
      // Extract date from key "path:YYYY-MM-DD:index"
      const parts = key.split(":");
      if (parts.length === 3) {
        const date = parts[1];
        dateCompletionCounts[date] = (dateCompletionCounts[date] || 0) + 1;
      }
    }

    // Compute status for each day in the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(year, month, day);
      const dayData = pathDays[dateStr];

      if (dayData && dayData.count > 0) {
        const doneCount = dateCompletionCounts[dateStr] || 0;
        const totalCount = dayData.count;
        const percent = Math.round((doneCount / totalCount) * 100);

        result[dateStr] = {
          percent,
          isComplete: doneCount >= totalCount,
          doneCount,
          totalCount,
        };
      }
      // If no dayData, the date won't have an entry (null completion status)
    }

    return result;
  }, [studyPath, days, done, year, month]);
}

/**
 * Get completion status for a single day (utility function)
 */
export function getDayCompletion(
  done: Record<string, string>,
  days: Record<StudyPath, Record<string, { count: number }>>,
  studyPath: StudyPath,
  dateStr: string,
): DayCompletionStatus | null {
  const dayData = days[studyPath]?.[dateStr];
  if (!dayData || dayData.count === 0) {
    return null;
  }

  const prefix = `${studyPath}:${dateStr}:`;
  const doneCount = Object.keys(done).filter((key) =>
    key.startsWith(prefix),
  ).length;
  const totalCount = dayData.count;
  const percent = Math.round((doneCount / totalCount) * 100);

  return {
    percent,
    isComplete: doneCount >= totalCount,
    doneCount,
    totalCount,
  };
}
