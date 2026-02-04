/**
 * Hebcal API service
 * Fetches sunset times and Hebrew dates
 */

import type { SunsetData } from "@/types";

const HEBCAL_API = "https://www.hebcal.com";

interface HebcalZmanimResponse {
  times?: {
    sunset?: string;
  };
}

interface HebcalConverterResponse {
  heDateParts?: {
    d?: string;
    m?: string;
    y?: string;
  };
  hebrew?: string;
  hd?: number; // Day number (e.g., 17)
  hm?: string; // Month name in English (e.g., "Sh'vat")
}

/**
 * Fetch sunset time for a given date and location
 * @param dateStr - Date string (YYYY-MM-DD)
 * @param coords - Latitude and longitude
 * @returns Sunset data with hour and minute
 */
export async function fetchSunset(
  dateStr: string,
  coords: { latitude: number; longitude: number },
): Promise<SunsetData> {
  const url = `${HEBCAL_API}/zmanim?cfg=json&latitude=${coords.latitude}&longitude=${coords.longitude}&date=${dateStr}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Zmanim API failed: ${res.status}`);
  }

  const data: HebcalZmanimResponse = await res.json();

  if (data.times?.sunset) {
    // Parse time directly from ISO string to avoid timezone conversion
    // HebCal returns time in the location's timezone, we want to display that exact time
    // e.g., "2026-02-04T17:16:00+02:00" - extract 17:16 directly
    const isoString = data.times.sunset;
    const timeMatch = isoString.match(/T(\d{2}):(\d{2})/);

    if (timeMatch) {
      return {
        hour: parseInt(timeMatch[1], 10),
        minute: parseInt(timeMatch[2], 10),
        date: dateStr,
      };
    }

    // Fallback: use Date parsing (but this may have timezone issues)
    const sunsetTime = new Date(isoString);
    return {
      hour: sunsetTime.getHours(),
      minute: sunsetTime.getMinutes(),
      date: dateStr,
    };
  }

  // Fallback to 18:00 if no sunset data
  return {
    hour: 18,
    minute: 0,
    date: dateStr,
  };
}

export interface HebrewDateResult {
  he: string; // Hebrew date (e.g., "י״ז שבט")
  en: string; // English date (e.g., "17 Sh'vat")
}

/**
 * Fetch Hebrew date for a given Gregorian date
 * @param dateStr - Gregorian date string (YYYY-MM-DD)
 * @returns Hebrew date in both Hebrew and English
 */
export async function fetchHebrewDate(
  dateStr: string,
): Promise<HebrewDateResult | null> {
  const url = `${HEBCAL_API}/converter?cfg=json&date=${dateStr}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Converter API failed: ${res.status}`);
  }

  const data: HebcalConverterResponse = await res.json();

  // Build Hebrew date
  let heDate: string | null = null;
  if (data.heDateParts?.d && data.heDateParts?.m) {
    heDate = `${data.heDateParts.d} ${data.heDateParts.m}`;
  } else if (data.hebrew) {
    heDate = data.hebrew;
  }

  // Build English date
  let enDate: string | null = null;
  if (data.hd && data.hm) {
    enDate = `${data.hd} ${data.hm}`;
  }

  if (heDate && enDate) {
    return { he: heDate, en: enDate };
  }

  return null;
}

/**
 * Fetch both sunset and Hebrew date in parallel
 * @param dateStr - Date string (YYYY-MM-DD)
 * @param coords - Latitude and longitude
 * @returns Object with sunset and hebrewDate (bilingual)
 */
export async function fetchDateInfo(
  dateStr: string,
  coords: { latitude: number; longitude: number },
): Promise<{ sunset: SunsetData; hebrewDate: HebrewDateResult | null }> {
  const [sunset, hebrewDate] = await Promise.all([
    fetchSunset(dateStr, coords),
    fetchHebrewDate(dateStr),
  ]);

  return { sunset, hebrewDate };
}
