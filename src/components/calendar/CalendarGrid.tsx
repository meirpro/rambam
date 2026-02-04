"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDay, EmptyDay } from "./CalendarDay";
import type { DayCompletionStatus } from "@/hooks/useMonthCompletion";

interface CalendarGridProps {
  year: number;
  month: number; // 0-indexed
  today: string;
  selectedDate: string;
  startDate: string;
  completionMap: Record<string, DayCompletionStatus>;
  onDateSelect: (date: string) => void;
}

/**
 * Format a date as YYYY-MM-DD
 */
function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Calendar grid showing month with day headers and completion indicators
 */
export function CalendarGrid({
  year,
  month,
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

  // Calculate grid layout
  const gridData = useMemo(() => {
    // First day of the month (0 = Sunday, 6 = Saturday)
    const firstDay = new Date(year, month, 1).getDay();
    // Number of days in the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Build grid rows
    const days: (number | null)[] = [];

    // Add empty cells for days before the 1st
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    // Pad to complete the last row
    while (days.length % 7 !== 0) {
      days.push(null);
    }

    return days;
  }, [year, month]);

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

          const dateStr = formatDate(year, month, day);
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const isFuture = dateStr > today;
          const isBeforeStart = dateStr < startDate;

          return (
            <CalendarDay
              key={dateStr}
              date={dateStr}
              dayOfMonth={day}
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
