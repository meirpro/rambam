"use client";

import { useLocale, useTranslations } from "next-intl";

interface CalendarHeaderProps {
  /** Hebrew month name for display */
  hebrewMonthName: { he: string; en: string };
  /** Hebrew year for display */
  hebrewYearDisplay: { he: string; en: string };
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}

/**
 * Calendar header with Hebrew month/year display and navigation arrows
 * In RTL: flex reverses visual order, so Previous appears on right, Next on left
 * Arrow symbols have universal meaning: ‹ = back, › = forward
 */
export function CalendarHeader({
  hebrewMonthName,
  hebrewYearDisplay,
  onPreviousMonth,
  onNextMonth,
}: CalendarHeaderProps) {
  const locale = useLocale();
  const t = useTranslations("calendar");
  const isHebrew = locale === "he";

  // Format display: "שבט ה׳תשפ״ו" or "Sh'vat 5786"
  const displayText = isHebrew
    ? `${hebrewMonthName.he} ${hebrewYearDisplay.he}`
    : `${hebrewMonthName.en} ${hebrewYearDisplay.en}`;

  return (
    <div
      className="flex items-center justify-between px-4 py-3 border-b border-gray-200"
      dir={isHebrew ? "rtl" : "ltr"}
    >
      {/* Previous month button - in RTL appears on right side */}
      <button
        type="button"
        onClick={onPreviousMonth}
        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
        aria-label={t("previousMonth")}
      >
        <span className="text-xl">‹</span>
      </button>

      {/* Month/year display */}
      <span className="text-lg font-semibold text-gray-800">{displayText}</span>

      {/* Next month button - in RTL appears on left side */}
      <button
        type="button"
        onClick={onNextMonth}
        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
        aria-label={t("nextMonth")}
      >
        <span className="text-xl">›</span>
      </button>
    </div>
  );
}
