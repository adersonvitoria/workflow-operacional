"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { CONFIG_PADRAO, PERFIS, definirConfigPerfis, obterConfigPerfis, type PerfilConfig } from "@/lib/perfis";
import type { Perfil } from "@/lib/perfis";

interface PerfisContextValue {
  config: Record<Perfil, PerfilConfig>;
  recarregar: () => Promise<void>;
  salvar: (perfil: Perfil, cfg: PerfilConfig) => Promise<{ ok: boolean; motivo?: string }>;
  restaurar: (perfil: Perfil) => Promise<{ ok: boolean; motivo?: string }>;
}

const PerfisContext = createContext<PerfisContextValue | null>(null);

/**
 * Carrega as permissões por perfil no cliente e alimenta o cache síncrono
 * (definirConfigPerfis) para que as funções pode* reflitam os overrides.
 */
export function PerfisProvider({ children }: { children: React.ReactNode }) {
  const { atual } = useAuth();
  const [config, setConfig] = useState<Record<Perfil, PerfilConfig>>(CONFIG_PADRAO);

  const recarregar = useCallback(async () => {
    const res = await fetch("/api/perfis", { credentials: "same-origin" });
    if (!res.ok) return;
    const json = await res.json().catch(() => ({}));
    if (json.config) {
      definirConfigPerfis(json.config as Partial<Record<Perfil, PerfilConfig>>);
      setConfig(obterConfigPerfis());
    }
  }, []);

  useEffect(() => {
    if (atual) void recarregar();
    else { definirConfigPerfis({}); setConfig(CONFIG_PADRAO); }
  }, [atual, recarregar]);

  const salvar = useCallback(async (perfil: Perfil, cfg: PerfilConfig) => {
    if (!PERFIS.includes(perfil)) return { ok: false, motivo: "Perfil inválido." };
    const res = await fetch(`/api/perfis/${perfil}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(cfg),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, motivo: (json.erro as string) ?? "Falha ao salvar." };
    await recarregar();
    return { ok: true };
  }, [recarregar]);

  const restaurar = useCallback(async (perfil: Perfil) => {
    const res = await fetch(`/api/perfis/${perfil}`, { method: "DELETE", credentials: "same-origin" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, motivo: (json.erro as string) ?? "Falha ao restaurar." };
    await recarregar();
    return { ok: true };
  }, [recarregar]);

  const value = useMemo<PerfisContextValue>(() => ({ config, recarregar, salvar, restaurar }), [config, recarregar, salvar, restaurar]);
  return <PerfisContext.Provider value={value}>{children}</PerfisContext.Provider>;
}

export function usePerfis(): PerfisContextValue {
  const ctx = useContext(PerfisContext);
  if (!ctx) throw new Error("usePerfis deve ser usado dentro de <PerfisProvider>");
  return ctx;
}
