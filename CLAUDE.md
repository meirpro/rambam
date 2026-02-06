# Rambam Daily Study App

## Development

- **Dev server port**: 3613 (http://localhost:3613)
- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State management**: Zustand with persist middleware
- **i18n**: next-intl (Hebrew and English)

## Project Structure

- `src/app/[locale]/` - Next.js App Router pages
- `src/components/` - React components
- `src/hooks/` - Custom React hooks
- `src/stores/` - Zustand stores
- `src/services/` - API services (Sefaria, Hebcal)
- `src/i18n/messages/` - Translation files (en.json, he.json)
- `src/types/` - TypeScript types
- `public/` - Static assets (logo, icons, manifest)

## Shell Commands

- Don't use `git -C` — the working directory is already the project root. Just use `git` directly.

## Key Features

- Multi-path study tracking (Rambam 3 chapters, Rambam 1 chapter, Sefer HaMitzvot)
- Hebrew calendar integration
- Swipe gestures for marking completion
- PWA with offline support
- Hide completed items setting
