/**
 * Hebrew Calendar utilities using @hebcal/core
 *
 * This module provides functions for converting between Gregorian and Hebrew dates,
 * navigating Hebrew months, and formatting dates in gematriya (Hebrew numerals).
 */

import { HDate } from "@hebcal/core";

/** Hebrew month data for display */
export interface HebrewMonthData {
  /** Hebrew month number (1-13, with 13 for Adar II in leap years) */
  month: number;
  /** Hebrew year (e.g., 5786) */
  year: number;
  /** Month name in Hebrew and English */
  monthName: { he: string; en: string };
  /** Year display in Hebrew and English */
  yearDisplay: { he: string; en: string };
  /** Number of days in this Hebrew month */
  daysInMonth: number;
  /** Array of days in this month */
  days: HebrewDayData[];
  /** First Gregorian date of the Hebrew month */
  firstGregorianDate: string;
}

/** Individual day data */
export interface HebrewDayData {
  /** Hebrew day of month (1-30) */
  hebrewDay: number;
  /** Hebrew day in gematriya and English numerals */
  display: { he: string; en: string };
  /** Gregorian date (YYYY-MM-DD format) */
  gregorianDate: string;
  /** Day of week (0=Sunday, 6=Saturday) */
  dayOfWeek: number;
}

/**
 * Convert a number to Hebrew gematriya (Hebrew numerals)
 * Handles numbers 1-30 (for day of month)
 */
function toGematriya(num: number): string {
  const units = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  const tens = ["", "י", "כ", "ל"];

  if (num <= 0) return "";

  // Handle special cases for 15 and 16 (to avoid divine name)
  if (num === 15) return "ט״ו";
  if (num === 16) return "ט״ז";

  // Numbers 1-30 (day of month range)
  if (num < 10) {
    return units[num] + "׳";
  } else if (num < 40) {
    const ten = Math.floor(num / 10);
    const unit = num % 10;
    if (unit === 0) {
      return tens[ten] + "׳";
    }
    return tens[ten] + "״" + units[unit];
  }

  return String(num);
}

/**
 * Extract Hebrew month name from HDate's renderGematriya output
 * Format: "י״ז שבט תשפ״ו" → "שבט"
 */
function getHebrewMonthName(hdate: HDate): string {
  const rendered = hdate.renderGematriya(true); // true = no nikud
  const parts = rendered.split(" ");
  // Format is "day month year", month is second part
  return parts.length >= 2 ? parts[1] : "";
}

/**
 * Extract Hebrew year from HDate's renderGematriya output
 * Format: "י״ז שבט תשפ״ו" → "תשפ״ו"
 */
function getHebrewYear(hdate: HDate): string {
  const rendered = hdate.renderGematriya(true);
  const parts = rendered.split(" ");
  return parts.length >= 3 ? parts[2] : "";
}

/**
 * Format a Gregorian date as YYYY-MM-DD
 */
function formatGregorianDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get Hebrew month data from a Gregorian date
 * Returns information about the Hebrew month that contains this date
 */
export function getHebrewMonthData(gregorianDate: Date): HebrewMonthData {
  const hdate = new HDate(gregorianDate);
  const hebrewMonth = hdate.getMonth();
  const hebrewYear = hdate.getFullYear();
  const daysInMonth = HDate.daysInMonth(hebrewMonth, hebrewYear);

  // Get month and year names using hebcal's built-in formatting
  const hebrewMonthName = getHebrewMonthName(hdate);
  const hebrewYearStr = getHebrewYear(hdate);
  const englishMonthName = hdate.getMonthName();

  // Build days array
  const days: HebrewDayData[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const hd = new HDate(day, hebrewMonth, hebrewYear);
    const greg = hd.greg();

    days.push({
      hebrewDay: day,
      display: {
        he: toGematriya(day),
        en: String(day),
      },
      gregorianDate: formatGregorianDate(greg),
      dayOfWeek: greg.getDay(),
    });
  }

  // Get first day's Gregorian date
  const firstDay = new HDate(1, hebrewMonth, hebrewYear);

  return {
    month: hebrewMonth,
    year: hebrewYear,
    monthName: {
      he: hebrewMonthName,
      en: englishMonthName,
    },
    yearDisplay: {
      he: "ה׳" + hebrewYearStr,
      en: String(hebrewYear),
    },
    daysInMonth,
    days,
    firstGregorianDate: formatGregorianDate(firstDay.greg()),
  };
}

/**
 * Get the previous Hebrew month's data
 * Uses absolute day calculation to avoid month numbering edge cases
 */
export function getPrevHebrewMonth(current: HebrewMonthData): HebrewMonthData {
  // Get the first day of current month and go back one day
  const firstDayOfCurrent = new HDate(1, current.month, current.year);
  const lastDayOfPrev = new HDate(firstDayOfCurrent.abs() - 1);
  return getHebrewMonthData(lastDayOfPrev.greg());
}

/**
 * Get the next Hebrew month's data
 * Uses absolute day calculation to avoid month numbering edge cases
 */
export function getNextHebrewMonth(current: HebrewMonthData): HebrewMonthData {
  // Get the last day of current month and go forward one day
  const lastDayOfCurrent = new HDate(
    current.daysInMonth,
    current.month,
    current.year,
  );
  const firstDayOfNext = new HDate(lastDayOfCurrent.abs() + 1);
  return getHebrewMonthData(firstDayOfNext.greg());
}

/**
 * Convert a Gregorian date string to Hebrew date display
 * Returns the Hebrew day number in gematriya
 */
export function getHebrewDayDisplay(gregorianDateStr: string): {
  he: string;
  en: string;
} {
  const [year, month, day] = gregorianDateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const hdate = new HDate(date);
  const hebrewDay = hdate.getDate();

  return {
    he: toGematriya(hebrewDay),
    en: String(hebrewDay),
  };
}

/**
 * Get full Hebrew date string for a Gregorian date
 * Format: "י״ז שבט ה׳תשפ״ו" or "17 Sh'vat 5786"
 */
export function formatFullHebrewDate(
  gregorianDateStr: string,
  locale: "he" | "en",
): string {
  const [year, month, day] = gregorianDateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const hdate = new HDate(date);

  if (locale === "he") {
    const rendered = hdate.renderGematriya(true);
    const parts = rendered.split(" ");
    // Add ה׳ prefix to year
    if (parts.length >= 3) {
      parts[2] = "ה׳" + parts[2];
    }
    return parts.join(" ");
  } else {
    const hebrewDay = hdate.getDate();
    const monthName = hdate.getMonthName();
    const hebrewYear = hdate.getFullYear();
    return `${hebrewDay} ${monthName} ${hebrewYear}`;
  }
}
