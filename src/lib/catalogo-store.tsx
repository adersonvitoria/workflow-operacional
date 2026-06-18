"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/lib/auth";

export interface ItemCatalogo {
  id: string;
  descricao: string;
  unidade: string;
  preco: number;
  ativo: boolean;
}

export interface NovoItem {
  descricao: string;
  unidade?: string;
  preco?: number;
  ativo?: boolean;
}

interface CatalogoContextValue {
  itens: ItemCatalogo[];
  carregado: boolean;
  ativos: ItemCatalogo[];
  criar: (i: NovoItem) => Promise<{ ok: boolean; motivo?: string }>;
  atualizar: (id: string, patch: Partial<NovoItem>) => Promise<void>;
  remover: (id: string) => Promise<void>;
}

const CatalogoContext = createContext<CatalogoContextValue | null>(null);

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, { credentials: "same-origin", headers: { "Content-Type": "application/json" }, ...init });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, json };
}

export function CatalogoProvider({ children }: { children: React.ReactNode }) {
  const { atual } = useAuth();
  const [itens, setItens] = useState<ItemCatalogo[]>([]);
  const [carregado, setCarregado] = useState(false);

  const recarregar = useCallback(async () => {
    const { ok, json } = await api("/api/itens");
    if (ok) setItens(json.itens as ItemCatalogo[]);
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (atual) void recarregar();
    else { setItens([]); setCarregado(true); }
  }, [atual, recarregar]);

  const criar = useCallback(async (i: NovoItem) => {
    const { ok, json } = await api("/api/itens", { method: "POST", body: JSON.stringify(i) });
    if (!ok) return { ok: false, motivo: json.erro as string };
    await recarregar();
    return { ok: true };
  }, [recarregar]);

  const atualizar = useCallback(async (id: string, patch: Partial<NovoItem>) => {
    await api(`/api/itens/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    await recarregar();
  }, [recarregar]);

  const remover = useCallback(async (id: string) => {
    await api(`/api/itens/${id}`, { method: "DELETE" });
    await recarregar();
  }, [recarregar]);

  const ativos = useMemo(() => itens.filter((i) => i.ativo), [itens]);

  const value = useMemo<CatalogoContextValue>(
    () => ({ itens, carregado, ativos, criar, atualizar, remover }),
    [itens, carregado, ativos, criar, atualizar, remover],
  );

  return <CatalogoContext.Provider value={value}>{children}</CatalogoContext.Provider>;
}

export function useCatalogo(): CatalogoContextValue {
  const ctx = useContext(CatalogoContext);
  if (!ctx) throw new Error("useCatalogo deve ser usado dentro de <CatalogoProvider>");
  return ctx;
}
