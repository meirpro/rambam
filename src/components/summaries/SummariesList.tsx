"use client";

import { useLocale, useTranslations } from "next-intl";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { SummaryItem } from "./SummaryItem";
import { useAppStore, getSummariesArray } from "@/stores/appStore";

interface SummariesListProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SummariesList({ isOpen, onClose }: SummariesListProps) {
  const locale = useLocale();
  const t = useTranslations("summary");
  const isHebrew = locale === "he";

  const summaries = useAppStore((state) => state.summaries);
  const summariesArray = getSummariesArray(summaries);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t("viewAll")}>
      <div dir={isHebrew ? "rtl" : "ltr"}>
        {summariesArray.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">💭</div>
            <p className="text-gray-600 font-medium">{t("noSummaries")}</p>
            <p className="text-sm text-gray-400 mt-1">{t("noSummariesHint")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {summariesArray.map((summary) => (
              <SummaryItem key={summary.id} summary={summary} />
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
