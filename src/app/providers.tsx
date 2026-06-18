"use client";

import { CardsProvider } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return <CardsProvider>{children}</CardsProvider>;
}
