"use client";

import { useTranslations } from "next-intl";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";

/**
 * Non-blocking banner shown when the app is offline
 * Displays at the top of the screen with a yellow/amber color
 */
export function OfflineIndicator() {
  const t = useTranslations("offline");
  const { isOffline } = useOfflineStatus();

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white px-4 py-2 z-[1002] shadow-md">
      <div className="max-w-md mx-auto flex items-center justify-center gap-2 text-sm font-medium">
        <span className="text-lg">📴</span>
        <span>{t("indicator")}</span>
      </div>
    </div>
  );
}
