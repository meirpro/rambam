"use client";

import { useLocale, useTranslations } from "next-intl";
import { CalendarDay, EmptyDay } from "./CalendarDay";
import type { DayCompletionStatus } from "@/hooks/useMonthCompletion";
import type { HebrewDayData } from "@/lib/hebrewCalendar";

interface CalendarGridProps {
  /** Array of Hebrew days for the current month */
  hebrewDays: HebrewDayData[];
  today: string;
  selectedDate: string;
  startDate: string;
  completionMap: Record<string, DayCompletionStatus>;
  onDateSelect: (date: string) => void;
}

/**
 * Calendar grid showing Hebrew month with day headers and completion indicators
 * Days are displayed using Hebrew gematriya (א׳, ב׳, ג׳... כ״ט, ל׳)
 */
export function CalendarGrid({
  hebrewDays,
  today,
  selectedDate,
  startDate,
  completionMap,
  onDateSelect,
}: CalendarGridProps) {
  const locale = useLocale();
  const t = useTranslations("calendar");
  const isHebrew = locale === "he";

  // Day names - Hebrew weeks start on Sunday
  const dayNames: string[] = t.raw("dayNamesShort") as string[];

  // Build grid with empty cells for alignment
  // First day of Hebrew month tells us where to start
  const firstDayOfWeek = hebrewDays.length > 0 ? hebrewDays[0].dayOfWeek : 0;

  // Create grid data with leading empty cells
  const gridData: (HebrewDayData | null)[] = [];

  // Add empty cells before the 1st of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    gridData.push(null);
  }

  // Add the actual days
  for (const day of hebrewDays) {
    gridData.push(day);
  }

  // Pad to complete the last row
  while (gridData.length % 7 !== 0) {
    gridData.push(null);
  }

  return (
    <div className="p-4">
      {/* Day names header */}
      <div
        className="grid grid-cols-7 gap-1 mb-2"
        dir={isHebrew ? "rtl" : "ltr"}
      >
        {dayNames.map((name, index) => (
          <div
            key={index}
            className="w-10 h-8 flex items-center justify-center text-xs font-medium text-gray-500"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        className="grid grid-cols-7 gap-1"
        dir={isHebrew ? "rtl" : "ltr"}
        role="grid"
        aria-label={t("title")}
      >
        {gridData.map((day, index) => {
          if (day === null) {
            return <EmptyDay key={`empty-${index}`} />;
          }

          const dateStr = day.gregorianDate;
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const isFuture = dateStr > today;
          const isBeforeStart = dateStr < startDate;

          // Display Hebrew day number (gematriya) or English number based on locale
          const dayDisplay = isHebrew ? day.display.he : day.display.en;

          return (
            <CalendarDay
              key={dateStr}
              date={dateStr}
              dayDisplay={dayDisplay}
              isToday={isToday}
              isSelected={isSelected}
              isFuture={isFuture}
              isBeforeStart={isBeforeStart}
              completionStatus={completionMap[dateStr] || null}
              onClick={() => onDateSelect(dateStr)}
            />
          );
        })}
      </div>
    </div>
  );
}
