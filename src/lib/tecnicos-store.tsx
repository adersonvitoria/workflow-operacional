"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";

export type TipoTecnico = "TECNICO" | "TERCEIRO";

export interface Tecnico {
  id: string;
  nome: string;
  tipo: TipoTecnico;
  ativo: boolean;
}

interface TecnicosContextValue {
  tecnicos: Tecnico[];
  ativos: Tecnico[];
  carregado: boolean;
  criar: (nome: string, tipo?: TipoTecnico) => Promise<{ ok: boolean; motivo?: string }>;
  atualizar: (id: string, patch: { nome?: string; ativo?: boolean }) => Promise<void>;
  remover: (id: string) => Promise<void>;
}

const TecnicosContext = createContext<TecnicosContextValue | null>(null);

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, { credentials: "same-origin", headers: { "Content-Type": "application/json" }, ...init });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, json };
}

export function TecnicosProvider({ children }: { children: React.ReactNode }) {
  const { atual } = useAuth();
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [carregado, setCarregado] = useState(false);

  const recarregar = useCallback(async () => {
    const { ok, json } = await api("/api/tecnicos");
    if (ok) setTecnicos(json.tecnicos as Tecnico[]);
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (atual) void recarregar();
    else { setTecnicos([]); setCarregado(true); }
  }, [atual, recarregar]);

  const criar = useCallback(async (nome: string, tipo: TipoTecnico = "TECNICO") => {
    const { ok, json } = await api("/api/tecnicos", { method: "POST", body: JSON.stringify({ nome, tipo }) });
    if (!ok) return { ok: false, motivo: json.erro as string };
    await recarregar();
    return { ok: true };
  }, [recarregar]);

  const atualizar = useCallback(async (id: string, patch: { nome?: string; ativo?: boolean }) => {
    await api(`/api/tecnicos/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    await recarregar();
  }, [recarregar]);

  const remover = useCallback(async (id: string) => {
    await api(`/api/tecnicos/${id}`, { method: "DELETE" });
    await recarregar();
  }, [recarregar]);

  const ativos = useMemo(() => tecnicos.filter((t) => t.ativo), [tecnicos]);

  const value = useMemo<TecnicosContextValue>(
    () => ({ tecnicos, ativos, carregado, criar, atualizar, remover }),
    [tecnicos, ativos, carregado, criar, atualizar, remover],
  );

  return <TecnicosContext.Provider value={value}>{children}</TecnicosContext.Provider>;
}

export function useTecnicos(): TecnicosContextValue {
  const ctx = useContext(TecnicosContext);
  if (!ctx) throw new Error("useTecnicos deve ser usado dentro de <TecnicosProvider>");
  return ctx;
}
