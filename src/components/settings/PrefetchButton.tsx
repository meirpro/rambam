"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/stores/appStore";
import { getTodayInIsrael } from "@/lib/dates";
import {
  prefetchWeekAhead,
  canPrefetch,
  type PrefetchProgress,
} from "@/services/prefetch";

type PrefetchState = "idle" | "prefetching" | "success" | "error";

export function PrefetchButton() {
  const t = useTranslations("offline");
  const studyPath = useAppStore((state) => state.studyPath);
  const [state, setState] = useState<PrefetchState>("idle");
  const [progress, setProgress] = useState<PrefetchProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePrefetch = useCallback(async () => {
    if (!canPrefetch()) {
      setErrorMessage(t("noConnection"));
      setState("error");
      return;
    }

    setState("prefetching");
    setErrorMessage(null);

    try {
      const today = getTodayInIsrael();
      const result = await prefetchWeekAhead(today, studyPath, (p) => {
        setProgress(p);
      });

      if (result.success) {
        setState("success");
      } else {
        setState("error");
        setErrorMessage(
          t("downloadFailed", {
            failed: result.failedDays,
            total: result.totalDays,
          }),
        );
      }

      // Reset to idle after 3 seconds
      setTimeout(() => {
        setState("idle");
        setProgress(null);
        setErrorMessage(null);
      }, 3000);
    } catch (error) {
      setState("error");
      setErrorMessage(error instanceof Error ? error.message : t("tryAgain"));
    }
  }, [studyPath, t]);

  const isDisabled = state === "prefetching";
  const progressPercent = progress
    ? Math.round(
        ((progress.completed + progress.failed) / progress.total) * 100,
      )
    : 0;

  return (
    <div className="space-y-2">
      <Button
        variant={state === "success" ? "primary" : "secondary"}
        fullWidth
        onClick={handlePrefetch}
        disabled={isDisabled}
      >
        {state === "idle" && t("downloadWeek")}
        {state === "prefetching" &&
          t("downloading", { percent: progressPercent })}
        {state === "success" && t("downloadComplete")}
        {state === "error" && t("downloadRetry")}
      </Button>

      {/* Progress bar */}
      {state === "prefetching" && progress && (
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Status messages */}
      {state === "prefetching" && progress?.currentDate && (
        <p className="text-xs text-gray-500 text-center">
          {t("downloadingDate", { date: progress.currentDate })}
        </p>
      )}

      {state === "success" && (
        <p className="text-xs text-green-600 text-center">
          {t("downloadSuccess")}
        </p>
      )}

      {state === "error" && errorMessage && (
        <p className="text-xs text-red-600 text-center">{errorMessage}</p>
      )}
    </div>
  );
}
