"use client";

import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { CatalogoProvider } from "@/lib/catalogo-store";
import { CardsProvider } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CatalogoProvider>
          <CardsProvider>{children}</CardsProvider>
        </CatalogoProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
