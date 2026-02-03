# Daily Rambam API - Quick Reference

## Step 1: Get today's ref

```
GET https://www.sefaria.org/api/calendars
```

Or for a specific date:

```
GET https://www.sefaria.org/api/calendars?day=1&month=2&year=2026
```

**Parameters:**
- `day` - 1-based day of month
- `month` - 1-based month
- `year` - 4-digit year

```js
const url = response.calendar_items.find(x => x.title.en === "Daily Rambam (3 Chapters)")?.url
```

## Step 2: Get the text

```
GET https://www.sefaria.org/api/v3/texts/{url}
```

### Response structure

- `versions[0].text` → array of הלכות (Hebrew with nikud)
- Each array element = one הלכה
