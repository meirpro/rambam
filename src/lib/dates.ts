/**
 * Date utilities for Jewish calendar calculations
 */

import type { SunsetData } from "@/types";

/**
 * Parse a YYYY-MM-DD string to a Date in local timezone
 * (avoids UTC interpretation issues)
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Generate an array of date strings between start and end (inclusive)
 * @param start - Start date (YYYY-MM-DD)
 * @param end - End date (YYYY-MM-DD)
 * @returns Array of date strings
 */
export function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = parseLocalDate(start);
  const endDate = parseLocalDate(end);

  while (current <= endDate) {
    dates.push(formatDateString(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Format a Date object to YYYY-MM-DD string
 */
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get today's civil date in user's local timezone
 * Used for sunset API calls which need civil calendar dates
 * @returns Date string (YYYY-MM-DD)
 */
export function getLocalDate(): string {
  return formatDateString(new Date());
}

/**
 * @deprecated Use getLocalDate() instead
 */
export function getTodayInIsrael(): string {
  return getLocalDate();
}

/**
 * Get the current Jewish date, accounting for sunset
 * Jewish day starts at sunset, so after sunset we're in the next day
 * Uses user's LOCAL time and their location's sunset
 * @param sunset - Sunset time data from user's location (optional)
 * @returns Date string for the current Jewish day (YYYY-MM-DD)
 */
export function getJewishDate(sunset?: SunsetData | null): string {
  const now = new Date();

  const hour = now.getHours();
  const minute = now.getMinutes();

  // Default sunset to 18:00 if not provided
  const sunsetHour = sunset?.hour ?? 18;
  const sunsetMinute = sunset?.minute ?? 0;

  // Check if we're past sunset
  const isPastSunset =
    hour > sunsetHour || (hour === sunsetHour && minute >= sunsetMinute);

  // If past sunset, advance to next day
  if (isPastSunset) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateString(tomorrow);
  }

  return formatDateString(now);
}

/**
 * Format a Gregorian date string for display
 * @param dateStr - Date string (YYYY-MM-DD)
 * @returns Formatted date (DD/MM/YYYY)
 */
export function formatGregorianDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${d}/${m}/${y}`;
}

/**
 * Check if a date string is today (in Jewish calendar terms)
 */
export function isToday(dateStr: string, sunset?: SunsetData | null): boolean {
  return dateStr === getJewishDate(sunset);
}

/**
 * Check if a date is in the past (before today in Jewish calendar)
 */
export function isPastDate(
  dateStr: string,
  sunset?: SunsetData | null,
): boolean {
  return dateStr < getJewishDate(sunset);
}

/**
 * Check if a date is in the future (after today in Jewish calendar)
 */
export function isFutureDate(
  dateStr: string,
  sunset?: SunsetData | null,
): boolean {
  return dateStr > getJewishDate(sunset);
}

/**
 * Parse a date string to Date object (in local timezone)
 */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get the number of days between two dates
 */
export function daysBetween(start: string, end: string): number {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  const diffTime = endDate.getTime() - startDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
