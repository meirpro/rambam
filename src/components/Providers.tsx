"use client";

import { ReactNode } from "react";
import { ConfirmDialogProvider } from "@/components/ui/ConfirmDialog";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return <ConfirmDialogProvider>{children}</ConfirmDialogProvider>;
}
