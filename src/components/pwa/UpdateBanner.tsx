"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useOfflineStore } from "@/stores/offlineStore";

export function UpdateBanner() {
  const t = useTranslations("update");
  const [hasAppUpdate, setHasAppUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null,
  );
  const [dismissed, setDismissed] = useState<"app" | "content" | null>(null);

  // Content update from background sync
  const hasContentUpdate = useOfflineStore((s) => s.hasContentUpdate);
  const setHasContentUpdate = useOfflineStore((s) => s.setHasContentUpdate);

  // Derive banner type from state (app update takes priority)
  const showAppBanner = hasAppUpdate && dismissed !== "app";
  const showContentBanner =
    hasContentUpdate && !showAppBanner && dismissed !== "content";

  // Service worker update detection
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handleControllerChange = () => {
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );

    navigator.serviceWorker.ready.then((registration) => {
      // Check for updates periodically
      registration.update();

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // New app version available
            setWaitingWorker(newWorker);
            setHasAppUpdate(true);
            setDismissed(null); // Reset dismissed state for new update
          }
        });
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
    };
  }, []);

  const handleAppUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
    setHasAppUpdate(false);
  }, [waitingWorker]);

  const handleContentRefresh = useCallback(() => {
    setHasContentUpdate(false);
    // Soft refresh - just reload the page to pick up new data
    window.location.reload();
  }, [setHasContentUpdate]);

  const handleDismissApp = useCallback(() => {
    setDismissed("app");
  }, []);

  const handleDismissContent = useCallback(() => {
    setHasContentUpdate(false);
    setDismissed("content");
  }, [setHasContentUpdate]);

  if (!showAppBanner && !showContentBanner) return null;

  // App update banner (blue)
  if (showAppBanner) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white px-4 py-3 z-[1001] shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <span className="text-sm font-medium">{t("appAvailable")}</span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAppUpdate}
              className="text-white hover:bg-white/20"
            >
              {t("refresh")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismissApp}
              className="text-white/70 hover:bg-white/20"
            >
              {t("later")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Content update banner (green)
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-green-600 text-white px-4 py-3 z-[1001] shadow-lg">
      <div className="max-w-md mx-auto flex items-center justify-between gap-4">
        <span className="text-sm font-medium">{t("contentAvailable")}</span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleContentRefresh}
            className="text-white hover:bg-white/20"
          >
            {t("refreshContent")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismissContent}
            className="text-white/70 hover:bg-white/20"
          >
            {t("later")}
          </Button>
        </div>
      </div>
    </div>
  );
}
