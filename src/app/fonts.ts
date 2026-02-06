/**
 * Font configuration using next/font/google
 * Self-hosts Noto Sans Hebrew to eliminate render-blocking Google Fonts request
 */

import { Noto_Sans_Hebrew } from "next/font/google";

export const notoSansHebrew = Noto_Sans_Hebrew({
  subsets: ["hebrew", "latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-noto-sans-hebrew",
});
