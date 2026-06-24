"use client";

import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { PerfisProvider } from "@/lib/perfis-client";
import { CatalogoProvider } from "@/lib/catalogo-store";
import { CardsProvider } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PerfisProvider>
          <CatalogoProvider>
            <CardsProvider>{children}</CardsProvider>
          </CatalogoProvider>
        </PerfisProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
