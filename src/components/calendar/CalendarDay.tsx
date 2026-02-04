"use client";

import type { DayCompletionStatus } from "@/hooks/useMonthCompletion";

interface CalendarDayProps {
  date: string;
  dayOfMonth: number;
  isToday: boolean;
  isSelected: boolean;
  isFuture: boolean;
  isBeforeStart: boolean;
  completionStatus: DayCompletionStatus | null;
  onClick: () => void;
}

/**
 * Individual day cell in the calendar grid
 * Shows completion status with visual indicators
 */
export function CalendarDay({
  dayOfMonth,
  isToday,
  isSelected,
  isFuture,
  isBeforeStart,
  completionStatus,
  onClick,
}: CalendarDayProps) {
  // Determine visual state
  const isDisabled = isFuture || isBeforeStart;
  const isComplete = completionStatus?.isComplete ?? false;
  const hasProgress = completionStatus && completionStatus.percent > 0;

  // Base styles
  let containerClasses =
    "relative w-10 h-10 flex flex-col items-center justify-center rounded-lg text-sm font-medium transition-colors";

  // State-based styling
  if (isDisabled) {
    containerClasses += " text-gray-300 cursor-not-allowed";
  } else if (isSelected) {
    containerClasses += " bg-blue-600 text-white cursor-pointer";
  } else if (isComplete) {
    containerClasses += " bg-green-100 text-green-800 cursor-pointer";
  } else if (hasProgress) {
    containerClasses += " bg-amber-50 text-amber-800 cursor-pointer";
  } else {
    containerClasses += " text-gray-700 hover:bg-gray-100 cursor-pointer";
  }

  // Today ring (visible even when selected)
  const todayRing = isToday && !isSelected;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={containerClasses}
      aria-label={`Day ${dayOfMonth}`}
      aria-current={isToday ? "date" : undefined}
      aria-pressed={isSelected}
    >
      {/* Today indicator ring */}
      {todayRing && (
        <div className="absolute inset-0 rounded-lg ring-2 ring-blue-500 ring-offset-1" />
      )}

      {/* Day number */}
      <span className={isComplete && !isSelected ? "font-bold" : ""}>
        {dayOfMonth}
      </span>

      {/* Completion indicator */}
      {!isDisabled && completionStatus && !isSelected && (
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
          {isComplete ? (
            // Checkmark for complete
            <span className="text-green-600 text-[10px] leading-none">✓</span>
          ) : hasProgress ? (
            // Percentage for partial
            <span className="text-[8px] text-amber-600 font-medium">
              {completionStatus.percent}%
            </span>
          ) : null}
        </div>
      )}

      {/* Selected day checkmark (shown on green background) */}
      {isSelected && isComplete && (
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
          <span className="text-white text-[10px] leading-none">✓</span>
        </div>
      )}
    </button>
  );
}

/**
 * Empty day cell for padding at start/end of month
 */
export function EmptyDay() {
  return <div className="w-10 h-10" />;
}
