"use client";

import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { PerfisProvider } from "@/lib/perfis-client";
import { CatalogoProvider } from "@/lib/catalogo-store";
import { TecnicosProvider } from "@/lib/tecnicos-store";
import { CardsProvider } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PerfisProvider>
          <CatalogoProvider>
            <TecnicosProvider>
              <CardsProvider>{children}</CardsProvider>
            </TecnicosProvider>
          </CatalogoProvider>
        </PerfisProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
