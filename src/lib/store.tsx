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
import type { Card, DadosManutencao, Fluxo, ItemMaterial, Modalidade, Prioridade, TipoCliente } from "@/types";

/** Campos mínimos para cadastrar um novo card pelo Comercial. */
export interface NovoCardInput {
  fluxo: Fluxo;
  clienteNome: string;
  documento?: string;
  contato?: string;
  endereco?: string;
  tipoCliente?: TipoCliente;
  modalidade?: Modalidade;
  prioridade: Prioridade;
  cr?: string;
  cc?: string;
  chamado?: string;
  numeroOrcamento?: string;
  numeroConta?: string;
  manutencao?: DadosManutencao;
  maoDeObra?: number;
  equipamentos?: number;
  total?: number;
  mensal?: number;
  observacoes?: string;
  /** Itens do projeto selecionados pelo Comercial (Qtd + Item). */
  materiais?: ItemMaterial[];
}

interface CardsContextValue {
  cards: Card[];
  carregado: boolean;
  porFluxo: (f: Fluxo) => Card[];
  obter: (id: string) => Card | undefined;
  criar: (input: NovoCardInput) => Promise<Card | null>;
  atualizar: (id: string, patch: Partial<Card>) => Promise<void>;
  avancar: (id: string) => Promise<{ ok: boolean; motivo?: string }>;
  remover: (id: string) => Promise<void>;
  recarregar: () => Promise<void>;
}

const CardsContext = createContext<CardsContextValue | null>(null);

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, { credentials: "same-origin", headers: { "Content-Type": "application/json" }, ...init });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

export function CardsProvider({ children }: { children: React.ReactNode }) {
  const { atual } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [carregado, setCarregado] = useState(false);

  const recarregar = useCallback(async () => {
    const { ok, json } = await api("/api/cards");
    if (ok) setCards(json.cards as Card[]);
    setCarregado(true);
  }, []);

  // Recarrega quando há sessão (e limpa ao sair).
  useEffect(() => {
    if (atual) void recarregar();
    else { setCards([]); setCarregado(true); }
  }, [atual, recarregar]);

  const porFluxo = useCallback((f: Fluxo) => cards.filter((c) => c.fluxo === f), [cards]);
  const obter = useCallback((id: string) => cards.find((c) => c.id === id), [cards]);

  const criar = useCallback(async (input: NovoCardInput) => {
    const { ok, json } = await api("/api/cards", { method: "POST", body: JSON.stringify(input) });
    if (!ok) return null;
    const novo = json.card as Card;
    setCards((prev) => [novo, ...prev]);
    return novo;
  }, []);

  const atualizar = useCallback(async (id: string, patch: Partial<Card>) => {
    const { ok, json } = await api(`/api/cards/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    if (ok) setCards((prev) => prev.map((c) => (c.id === id ? (json.card as Card) : c)));
  }, []);

  const avancar = useCallback(async (id: string) => {
    const { ok, json } = await api(`/api/cards/${id}/avancar`, { method: "POST" });
    if (ok) {
      setCards((prev) => prev.map((c) => (c.id === id ? (json.card as Card) : c)));
      return { ok: true };
    }
    return { ok: false, motivo: json.erro as string };
  }, []);

  const remover = useCallback(async (id: string) => {
    const { ok } = await api(`/api/cards/${id}`, { method: "DELETE" });
    if (ok) setCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const value = useMemo<CardsContextValue>(
    () => ({ cards, carregado, porFluxo, obter, criar, atualizar, avancar, remover, recarregar }),
    [cards, carregado, porFluxo, obter, criar, atualizar, avancar, remover, recarregar],
  );

  return <CardsContext.Provider value={value}>{children}</CardsContext.Provider>;
}

export function useCards(): CardsContextValue {
  const ctx = useContext(CardsContext);
  if (!ctx) throw new Error("useCards deve ser usado dentro de <CardsProvider>");
  return ctx;
}
