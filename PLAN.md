# Daily Rambam Tracker — Single HTML Page

## Overview
Single `index.html` file, no server, mobile-first RTL Hebrew. Uses Sefaria API + localStorage.

## File
- **Create:** `/Users/shuki/dev/rambam/index.html`
- **Reference:** `/Users/shuki/dev/rambam/QUICK_REFERENCE.md`

## localStorage Schema

### `rambam_start` → ISO date string
```
"2026-02-03"
```
Set once on first load.

### `rambam_days` → `{ [date]: { he, ref, count } }`
```json
{
  "2026-02-03": { "he": "מסירת תורה שבעל פה א׳-מ״ה", "ref": "Mishneh_Torah,_Transmission_of_the_Oral_Law.1-45", "count": 45 },
  "2026-02-04": { "he": "הלכות יסודי התורה א׳-ג׳", "ref": "Mishneh_Torah,_Foundations_of_the_Torah.1-3", "count": 30 }
}
```
Lightweight (~100B/day). Populated incrementally — only missing dates are fetched.

### `rambam_done` → `{ [date:index]: timestamp }`
```json
{
  "2026-02-03:0": "2026-02-03T09:15:00Z",
  "2026-02-03:1": "2026-02-03T09:16:00Z"
}
```
Key = `date:flatHalakhaIndex`. Tracks each individual halakha.

## Page Load Flow

1. Read `rambam_start` (or set to today if first visit)
2. Read `rambam_days` and `rambam_done`
3. Generate date range: start → today
4. Find dates not in `rambam_days`
5. For each missing date (parallel):
   - `GET /api/calendars?day=D&month=M&year=Y` → extract `he`, `ref` from "Daily Rambam (3 Chapters)"
   - `GET /api/v3/texts/{ref}` → count halakhot (flatten if spanning), keep text in memory cache
   - Save `{ he, ref, count }` to `rambam_days`
6. Save updated `rambam_days` to localStorage
7. Compute stats from `rambam_days` + `rambam_done`
8. Render page

## UI Structure

```
┌──────────────────────────────┐
│  רמב"ם יומי              ⚙  │  header
├──────────────────────────────┤
│  🔥 12 ימים │ 67% │ +5 להשלים │  stats
├──────────────────────────────┤
│                              │
│ ▶ מסירת תורה שבעל פה א׳-מ״ה │  <details> per day (today first)
│   ┌────────────────────────┐ │
│   │ בימי אנוש טעו בני...  │ │  halakha card (swipeable)
│   └────────────────────────┘ │
│   ┌────────────────────────┐ │
│   │ בימי תרח טעו בני...   │ │
│   └────────────────────────┘ │
│   ...                        │
│                              │
│ ▶ הלכות יסודי התורה א׳-ג׳   │  backlog day
│                              │
└──────────────────────────────┘
```

- One `<details>/<summary>` per day, today first, older backlog below
- Opening `<details>` fetches text from API (or in-memory cache) and renders halakha cards
- Each halakha = swipeable box with full Hebrew HTML text
- Swiped halakhot are removed from DOM + saved to `rambam_done`
- Days where all halakhot are done are not shown (or shown as completed)

## Stats (computed, not stored)

- **רצף** (streak): count consecutive days backward from today where all halakhot are done (`count` matches done entries for that date)
- **היום** (today %): `done_today / rambam_days[today].count * 100`
- **להשלים** (backlog): sum of `(count - done)` for all dates before today

## Swipe

Pure JS touch events (~15 lines):
- `touchstart` → record startX
- `touchmove` → translate card by deltaX (only positive = rightward in RTL)
- `touchend` → if deltaX > 100px: animate out, remove, mark done; else snap back
- CSS `transition: transform 0.3s, opacity 0.3s` on cards

## Text Normalization

API response `versions[0].text` varies:
- `isSpanning: true` → `string[][]` (chapters × halakhot) → flatten to single array
- `textDepth === 1` or single chapter → `string[]` → use as-is

Each string is HTML (Hebrew with nikud, may contain `<b>`, `<small>`, `<br>`). Render as innerHTML.

## Settings

Minimal: a `⚙` button that toggles a panel with:
- Reset button (clears localStorage, reloads)

## Verification

1. Open `index.html` on mobile (or mobile emulator)
2. First load: should fetch today's data, show one `<details>` group
3. Open it: halakhot appear as cards with Hebrew text
4. Swipe a card right: it dismisses, stats update
5. Reload: swiped halakhot stay gone, stats persist
6. Next day: new day appears, backlog shows if previous day incomplete
