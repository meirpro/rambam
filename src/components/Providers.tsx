"use client";

import { ReactNode } from "react";
import { ConfirmDialogProvider } from "@/components/ui/ConfirmDialog";
import { OfflineProvider } from "@/components/pwa/OfflineProvider";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ConfirmDialogProvider>
      <OfflineProvider>{children}</OfflineProvider>
    </ConfirmDialogProvider>
  );
}
