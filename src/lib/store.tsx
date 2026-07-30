"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/lib/auth";
import type { Card, DadosManutencao, Fluxo, ItemCompra, ItemMaterial, Modalidade, Prioridade, TipoCliente } from "@/types";

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
  // Implantação · CRs por modalidade
  crMonitoramento?: string;
  crLocacao?: string;
  crServico?: string;
  crMaterial?: string;
  crMensalidade?: string; // Venda: CR de mensalidade
  margem?: number; // Venda: % de margem (margemVenda)
  // Implantação · perguntas básicas (comuns a Locação e Venda)
  temContrato?: boolean;
  crDedicado?: boolean;
  temInvestimento?: boolean;
  chamadoInvestimento?: string;
  chamado?: string;
  numeroOrcamento?: string;
  numeroConta?: string;
  regiao?: string;
  /** Data de cadastro (abertura) — YYYY-MM-DD; default é hoje. */
  dataCadastro?: string;
  manutencao?: DadosManutencao;
  maoDeObra?: number;
  equipamentos?: number;
  total?: number;
  mensal?: number;
  locacao?: number; // Locação: valor de locação
  observacoes?: string;
  /** Itens do projeto selecionados pelo Comercial (Qtd + Item). */
  materiais?: ItemMaterial[];
  /** Compras: itens do orçamento (um card por orçamento). */
  itensCompra?: ItemCompra[];
}

interface CardsContextValue {
  cards: Card[];
  carregado: boolean;
  porFluxo: (f: Fluxo) => Card[];
  obter: (id: string) => Card | undefined;
  criar: (input: NovoCardInput) => Promise<Card | null>;
  criarComplementar: (id: string) => Promise<{ ok: boolean; card?: Card; motivo?: string }>;
  /** Envia o card à esteira de Compras (Manutenção·Aprovado ou Implantação·Coordenação). */
  enviarParaCompras: (id: string) => Promise<{ ok: boolean; card?: Card; motivo?: string }>;
  /** Entrega (Compras): devolve o card à esteira de origem (Manutenção ou Implantação). */
  concluirEntrega: (id: string) => Promise<{ ok: boolean; card?: Card; motivo?: string }>;
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

  // Tempo real (polling leve): a cada 5s consulta a versão da base; se algum
  // card foi criado/movido/editado por OUTRO usuário, recarrega a lista para
  // todos os perfis verem a movimentação. Também atualiza ao voltar o foco.
  const versaoRef = useRef<string | null>(null);
  useEffect(() => {
    if (!atual) return;
    let ativo = true;
    async function checar() {
      if (!ativo || document.hidden) return;
      try {
        const res = await fetch("/api/cards/versao", { credentials: "same-origin" });
        if (!res.ok) return;
        const { versao } = (await res.json()) as { versao: string };
        if (versaoRef.current !== null && versaoRef.current !== versao) void recarregar();
        versaoRef.current = versao;
      } catch {
        // rede instável — tenta no próximo ciclo
      }
    }
    const timer = setInterval(() => void checar(), 5000);
    const aoFocar = () => void checar();
    window.addEventListener("focus", aoFocar);
    document.addEventListener("visibilitychange", aoFocar);
    return () => {
      ativo = false;
      clearInterval(timer);
      window.removeEventListener("focus", aoFocar);
      document.removeEventListener("visibilitychange", aoFocar);
    };
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

  const criarComplementar = useCallback(async (id: string) => {
    const { ok, json } = await api(`/api/cards/${id}/complementar`, { method: "POST" });
    if (!ok) return { ok: false, motivo: json.erro as string };
    const novo = json.card as Card;
    // O endpoint também atualiza o histórico da OS de origem; recarrega para refletir.
    setCards((prev) => [novo, ...prev]);
    void recarregar();
    return { ok: true, card: novo };
  }, [recarregar]);

  const enviarParaCompras = useCallback(async (id: string) => {
    const { ok, json } = await api(`/api/cards/${id}/enviar-compras`, { method: "POST" });
    if (!ok) return { ok: false, motivo: json.erro as string };
    const card = json.card as Card;
    setCards((prev) => prev.map((c) => (c.id === card.id ? card : c)));
    return { ok: true, card };
  }, []);

  const concluirEntrega = useCallback(async (id: string) => {
    const { ok, json } = await api(`/api/cards/${id}/concluir-entrega`, { method: "POST" });
    if (!ok) return { ok: false, motivo: json.erro as string };
    const card = json.card as Card;
    setCards((prev) => prev.map((c) => (c.id === card.id ? card : c)));
    return { ok: true, card };
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
    () => ({ cards, carregado, porFluxo, obter, criar, criarComplementar, enviarParaCompras, concluirEntrega, atualizar, avancar, remover, recarregar }),
    [cards, carregado, porFluxo, obter, criar, criarComplementar, enviarParaCompras, concluirEntrega, atualizar, avancar, remover, recarregar],
  );

  return <CardsContext.Provider value={value}>{children}</CardsContext.Provider>;
}

export function useCards(): CardsContextValue {
  const ctx = useContext(CardsContext);
  if (!ctx) throw new Error("useCards deve ser usado dentro de <CardsProvider>");
  return ctx;
}
