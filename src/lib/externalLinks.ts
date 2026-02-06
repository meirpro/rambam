/**
 * Build a Sefaria URL for a given reference
 * Sefaria uses underscores for spaces in URLs
 */
export function sefariaUrl(ref: string): string {
  const encodedRef = encodeURIComponent(ref.replace(/ /g, "_"));
  return `https://www.sefaria.org/${encodedRef}`;
}

/**
 * Build a Sefaria URL that links directly to a specific halacha
 * Sefaria format: Book_Name.Chapter.Halacha?lang=bi
 *
 * @param baseRef - Full reference like "Mishneh Torah, Human Dispositions 1-3"
 * @param halakhaIndex - 0-based index of the halacha in the day's list
 * @param chapterBreaks - Indices where new chapters start (e.g., [0, 5, 12])
 */
export function sefariaHalakhaUrl(
  baseRef: string,
  halakhaIndex: number,
  chapterBreaks?: number[],
): string {
  // Parse the base reference to get book name and chapter(s)
  // "Mishneh Torah, Human Dispositions 1-3" -> book: "Mishneh Torah, Human Dispositions", start: 1
  const match = baseRef.match(/^(.+)\s+(\d+)(?:-(\d+))?$/);

  if (!match) {
    // Fallback to base URL if we can't parse (e.g., intro sections)
    return sefariaUrl(baseRef);
  }

  const bookName = match[1];
  const startChapter = parseInt(match[2], 10);

  let chapter: number;
  let halakhaNum: number;

  if (!chapterBreaks || chapterBreaks.length === 0) {
    // Single chapter case
    chapter = startChapter;
    halakhaNum = halakhaIndex + 1;
  } else {
    // Multiple chapters: determine which chapter and halacha number within it
    // chapterBreaks contains indices where chapters 2, 3, etc. start
    // e.g., [23, 43] means: chapter 1 has indices 0-22, chapter 2 has 23-42, chapter 3 has 43+

    // Check if halakhaIndex is in the first chapter (before any break)
    if (halakhaIndex < chapterBreaks[0]) {
      chapter = startChapter;
      halakhaNum = halakhaIndex + 1;
    } else {
      // Find which chapter (offset from start)
      let chapterOffset = 1; // At least chapter 2 since we're past chapterBreaks[0]
      for (let i = 1; i < chapterBreaks.length; i++) {
        if (halakhaIndex < chapterBreaks[i]) {
          break;
        }
        chapterOffset = i + 1;
      }

      chapter = startChapter + chapterOffset;
      const chapterStartIndex = chapterBreaks[chapterOffset - 1];
      halakhaNum = halakhaIndex - chapterStartIndex + 1;
    }
  }

  // Build URL with dot notation: Book_Name.Chapter.Halacha?lang=bi
  const encodedBook = encodeURIComponent(bookName.replace(/ /g, "_"));
  return `https://www.sefaria.org/${encodedBook}.${chapter}.${halakhaNum}?lang=bi`;
}

/**
 * Format a date string (YYYY-MM-DD) to Chabad.org format (M/D/YYYY)
 */
function formatDateForChabad(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  // Remove leading zeros
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  return `${m}/${d}/${year}`;
}

/**
 * Build a Chabad.org URL for Rambam daily study
 * @param date - Date in YYYY-MM-DD format
 * @param chapters - Number of chapters (1 or 3)
 */
export function chabadRambamUrl(date: string, chapters: 1 | 3 = 3): string {
  const tdate = formatDateForChabad(date);
  return `https://www.chabad.org/dailystudy/rambam.asp?rambamChapters=${chapters}&tdate=${tdate}`;
}

/**
 * Strip HTML tags and get clean text for URL text fragment
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/&nbsp;/g, " ") // Replace nbsp
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

/**
 * Extract Hebrew words from text (filters out punctuation-only tokens)
 */
function extractWords(text: string): string[] {
  return text.split(/\s+/).filter((word) => /[\u0590-\u05FF]/.test(word)); // Keep only words with Hebrew chars
}

/**
 * Find unique text snippet that identifies this halakha among all texts
 * Starts with few words, adds more if there are duplicates
 */
function findUniqueSnippet(
  targetText: string,
  allTexts: string[],
  minWords = 2,
  maxWords = 6,
): string {
  const cleanTarget = stripHtml(targetText);
  const targetWords = extractWords(cleanTarget);

  if (targetWords.length === 0) {
    return cleanTarget.slice(0, 30);
  }

  // Try progressively longer snippets until unique
  for (let wordCount = minWords; wordCount <= maxWords; wordCount++) {
    const snippet = targetWords.slice(0, wordCount).join(" ");

    // Check if this snippet appears in other texts
    const isDuplicate = allTexts.some((text) => {
      if (text === targetText) return false; // Skip self
      const cleanOther = stripHtml(text);
      return cleanOther.includes(snippet);
    });

    if (!isDuplicate) {
      return snippet;
    }
  }

  // Fallback: use max words
  return targetWords.slice(0, maxWords).join(" ");
}

/**
 * Build a Chabad.org URL that scrolls to a specific halacha using text fragments
 * @param date - Date in YYYY-MM-DD format
 * @param chapters - Number of chapters (1 or 3)
 * @param halakhaText - Hebrew text to scroll to (from dayData.texts[i].he)
 * @param allTexts - All halakha texts for the day (to find unique snippet)
 */
export function chabadRambamHalakhaUrl(
  date: string,
  chapters: 1 | 3,
  halakhaText: string,
  allTexts: string[] = [],
): string {
  const baseUrl = chabadRambamUrl(date, chapters);

  if (!halakhaText) {
    return baseUrl;
  }

  // Find a unique snippet that won't match other halakhot
  const textSnippet = findUniqueSnippet(halakhaText, allTexts);

  // Encode for URL (text fragments use percent encoding)
  const encodedText = encodeURIComponent(textSnippet);

  return `${baseUrl}#:~:text=${encodedText}`;
}

/**
 * Build a Chabad.org URL for Sefer HaMitzvot that scrolls to specific text
 * @param date - Date in YYYY-MM-DD format
 * @param mitzvahText - Hebrew text to scroll to
 * @param allTexts - All mitzvah texts for the day (to find unique snippet)
 */
export function chabadMitzvotHalakhaUrl(
  date: string,
  mitzvahText: string,
  allTexts: string[] = [],
): string {
  const baseUrl = chabadMitzvotUrl(date);

  if (!mitzvahText) {
    return baseUrl;
  }

  const textSnippet = findUniqueSnippet(mitzvahText, allTexts);
  const encodedText = encodeURIComponent(textSnippet);

  return `${baseUrl}#:~:text=${encodedText}`;
}

/**
 * Build a Chabad.org URL for Sefer HaMitzvot daily study
 * @param date - Date in YYYY-MM-DD format
 */
export function chabadMitzvotUrl(date: string): string {
  const tdate = formatDateForChabad(date);
  return `https://www.chabad.org/dailystudy/seferHamitzvos.asp?tdate=${tdate}`;
}
