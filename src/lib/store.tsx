"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { SEED_CARDS } from "@/lib/mock-data";
import { podeAvancar } from "@/lib/routing";
import type {
  Card,
  CardStatus,
  EtapaId,
  Fluxo,
  Modalidade,
  Prioridade,
  Setor,
} from "@/types";

const STORAGE_KEY = "workflow-operacional:cards:v1";

/** Campos mínimos para cadastrar um novo card pelo Comercial. */
export interface NovoCardInput {
  fluxo: Fluxo;
  clienteNome: string;
  documento?: string;
  contato?: string;
  endereco?: string;
  modalidade?: Modalidade;
  prioridade: Prioridade;
  cr?: string;
  cc?: string;
  chamado?: string;
  maoDeObra?: number;
  equipamentos?: number;
  total?: number;
  mensal?: number;
  observacoes?: string;
}

interface CardsContextValue {
  cards: Card[];
  carregado: boolean;
  porFluxo: (f: Fluxo) => Card[];
  obter: (id: string) => Card | undefined;
  criar: (input: NovoCardInput) => Card;
  atualizar: (id: string, patch: Partial<Card>) => void;
  avancar: (id: string) => { ok: boolean; motivo?: string };
  remover: (id: string) => void;
  resetar: () => void;
}

const CardsContext = createContext<CardsContextValue | null>(null);

const SETOR_DA_ETAPA: Record<string, Setor> = {
  COMERCIAL: "COMERCIAL",
  COORDENACAO_APROVACAO: "COORDENACAO",
  SUPRIMENTOS: "COMPRAS",
  MONITORAMENTO: "MONITORAMENTO",
  TECNICA: "TECNICA",
  COORDENACAO_AUDITORIA: "COORDENACAO",
  MEDICAO: "MEDICAO",
};

export function CardsProvider({ children }: { children: React.ReactNode }) {
  const [cards, setCards] = useState<Card[]>(SEED_CARDS);
  const [carregado, setCarregado] = useState(false);

  // Hidrata do localStorage no cliente (evita mismatch de SSR).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setCards(JSON.parse(raw) as Card[]);
    } catch {
      /* ignora storage corrompido */
    }
    setCarregado(true);
  }, []);

  // Persiste a cada mudança (depois de carregado).
  useEffect(() => {
    if (!carregado) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    } catch {
      /* quota cheia / modo privado */
    }
  }, [cards, carregado]);

  const porFluxo = useCallback((f: Fluxo) => cards.filter((c) => c.fluxo === f), [cards]);
  const obter = useCallback((id: string) => cards.find((c) => c.id === id), [cards]);

  const criar = useCallback((input: NovoCardInput): Card => {
    const id = `c-${Math.abs(hash(input.clienteNome + input.prioridade + cards.length))}-${cards.length + 1}`;
    const codigo = String(
      cards.filter((c) => c.fluxo === input.fluxo).length + 1,
    );
    const novo: Card = {
      id,
      codigo,
      fluxo: input.fluxo,
      etapa: input.fluxo === "IMPLANTACAO" ? "COMERCIAL" : "APONTAMENTO",
      status: "EM_ANDAMENTO",
      prioridade: input.prioridade,
      cliente: {
        nome: input.clienteNome,
        documento: input.documento,
        contato: input.contato,
        endereco: input.endereco,
      },
      cr: input.cr,
      cc: input.cc,
      chamado: input.chamado,
      modalidade: input.modalidade,
      valores: {
        maoDeObra: input.maoDeObra,
        equipamentos: input.equipamentos,
        total: input.total,
        mensal: input.mensal,
      },
      responsavelAtual: { setor: "COMERCIAL", pessoa: "Comercial" },
      datas: { abertura: hojeISO() },
      materiais: [],
      checklist: [],
      historico: [
        { id: `${id}-h0`, data: hojeISO(), setor: "COMERCIAL", autor: "Comercial", acao: "Projeto cadastrado", para: input.fluxo === "IMPLANTACAO" ? "COMERCIAL" : "APONTAMENTO" },
      ],
      observacoes: input.observacoes,
    };
    setCards((prev) => [novo, ...prev]);
    return novo;
  }, [cards]);

  const atualizar = useCallback((id: string, patch: Partial<Card>) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const avancar = useCallback((id: string) => {
    const card = cards.find((c) => c.id === id);
    if (!card) return { ok: false, motivo: "Card não encontrado." };
    const r = podeAvancar(card);
    if (!r.ok || !r.proxima) return { ok: false, motivo: r.motivo };
    const destino = r.proxima as EtapaId;
    const status: CardStatus =
      destino === "MEDICAO" ? "CONCLUIDO" : "EM_ANDAMENTO";
    setCards((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              etapa: destino,
              status,
              responsavelAtual: { setor: SETOR_DA_ETAPA[destino] ?? c.responsavelAtual?.setor ?? "TECNICA" },
              historico: [
                ...c.historico,
                { id: `${id}-h${c.historico.length}`, data: hojeISO(), setor: SETOR_DA_ETAPA[destino] ?? "TECNICA", autor: "Sistema", acao: `Avançou para ${destino}`, de: c.etapa, para: destino },
              ],
            }
          : c,
      ),
    );
    return { ok: true };
  }, [cards]);

  const remover = useCallback((id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const resetar = useCallback(() => setCards(SEED_CARDS), []);

  const value = useMemo<CardsContextValue>(
    () => ({ cards, carregado, porFluxo, obter, criar, atualizar, avancar, remover, resetar }),
    [cards, carregado, porFluxo, obter, criar, atualizar, avancar, remover, resetar],
  );

  return <CardsContext.Provider value={value}>{children}</CardsContext.Provider>;
}

export function useCards(): CardsContextValue {
  const ctx = useContext(CardsContext);
  if (!ctx) throw new Error("useCards deve ser usado dentro de <CardsProvider>");
  return ctx;
}

// Helpers — evitam Date.now()/Math.random() não-determinísticos no seed.
function hojeISO(): string {
  return new Date().toISOString();
}
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
