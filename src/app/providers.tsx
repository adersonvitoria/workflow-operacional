"use client";

import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { CardsProvider } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CardsProvider>{children}</CardsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
