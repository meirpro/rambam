"use client";

import { useLocale, useTranslations } from "next-intl";

interface CalendarHeaderProps {
  year: number;
  month: number; // 0-indexed
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  hebrewMonthYear?: string; // Optional Hebrew calendar display
}

// English month names
const ENGLISH_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Hebrew month names (Gregorian)
const HEBREW_MONTH_NAMES = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

/**
 * Calendar header with month/year display and navigation arrows
 */
export function CalendarHeader({
  year,
  month,
  onPreviousMonth,
  onNextMonth,
  hebrewMonthYear,
}: CalendarHeaderProps) {
  const locale = useLocale();
  const t = useTranslations("calendar");
  const isHebrew = locale === "he";

  // Format month/year display
  const monthName = isHebrew
    ? HEBREW_MONTH_NAMES[month]
    : ENGLISH_MONTHS[month];
  const displayText = `${monthName} ${year}`;

  return (
    <div
      className="flex items-center justify-between px-4 py-3 border-b border-gray-200"
      dir={isHebrew ? "rtl" : "ltr"}
    >
      {/* Previous month button */}
      <button
        type="button"
        onClick={onPreviousMonth}
        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
        aria-label={t("previousMonth")}
      >
        <span className="text-xl">{isHebrew ? "›" : "‹"}</span>
      </button>

      {/* Month/year display */}
      <div className="flex flex-col items-center">
        <span className="text-lg font-semibold text-gray-800">
          {displayText}
        </span>
        {hebrewMonthYear && (
          <span className="text-sm text-gray-500">{hebrewMonthYear}</span>
        )}
      </div>

      {/* Next month button */}
      <button
        type="button"
        onClick={onNextMonth}
        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
        aria-label={t("nextMonth")}
      >
        <span className="text-xl">{isHebrew ? "‹" : "›"}</span>
      </button>
    </div>
  );
}
