"use client";

import { useEffect, useState } from "react";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { CardSlideOver } from "@/components/kanban/CardSlideOver";
import { CardForm } from "@/components/forms/CardForm";
import { useCards, type NovoCardInput } from "@/lib/store";
import { movimentoValido } from "@/lib/routing";
import { useAuth } from "@/lib/auth";
import { podeCriarCard } from "@/lib/perfis";
import type { Card, EtapaId, EtapaImplantacao, Fluxo } from "@/types";

function paraPatch(v: NovoCardInput): Partial<Card> {
  return {
    cliente: { nome: v.clienteNome, documento: v.documento, contato: v.contato, endereco: v.endereco },
    modalidade: v.modalidade,
    prioridade: v.prioridade,
    cr: v.cr,
    cc: v.cc,
    chamado: v.chamado,
    valores: { maoDeObra: v.maoDeObra, equipamentos: v.equipamentos, total: v.total, mensal: v.mensal },
    observacoes: v.observacoes,
    materiais: v.materiais,
  };
}

export function BoardView({ fluxo }: { fluxo: Fluxo }) {
  const { porFluxo, obter, criar, atualizar, avancar } = useCards();
  const { atual } = useAuth();
  const cards = porFluxo(fluxo);
  const podeCriar = podeCriarCard(atual?.perfil);

  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Deep-link "?card=ID" (vindo de Minhas pendências) abre o slide-over.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("card");
    if (id) setAbertoId(id);
  }, []);

  const aberto = abertoId ? obter(abertoId) ?? null : null;

  async function handleMover(id: string, destino: EtapaId) {
    if (fluxo === "MANUTENCAO") {
      await atualizar(id, { etapa: destino });
      return;
    }
    const card = obter(id);
    if (!card) return;
    const v = movimentoValido(card, destino as EtapaImplantacao);
    if (!v.ok) {
      setToast(v.motivo ?? "Movimento não permitido.");
      return;
    }
    const r = await avancar(id);
    if (!r.ok) setToast(r.motivo ?? "Não foi possível avançar.");
  }

  async function handleSubmit(values: NovoCardInput) {
    if (editId) await atualizar(editId, paraPatch(values));
    else await criar({ ...values, fluxo });
    setFormAberto(false);
    setEditId(null);
  }

  const titulo = fluxo === "IMPLANTACAO" ? "Esteira de Implantação" : "Esteira de Manutenção";
  const subtitulo = fluxo === "IMPLANTACAO" ? "Novos projetos · Comercial → Medição" : "Serviços extras e orçamentos";

  return (
    <>
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{titulo}</h1>
          <p className="text-xs text-slate-400">{subtitulo} · {cards.length} cards</p>
        </div>
        {podeCriar && (
          <button onClick={() => { setEditId(null); setFormAberto(true); }} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">
            + Nova entrada
          </button>
        )}
      </header>

      <div className="min-h-0 flex-1">
        <KanbanBoard fluxo={fluxo} cards={cards} onAbrirCard={setAbertoId} onMoverCard={handleMover} />
      </div>

      <CardSlideOver
        card={aberto}
        onFechar={() => setAbertoId(null)}
        onPatch={(p) => { if (abertoId) void atualizar(abertoId, p); }}
        onAvancar={async () => {
          if (!abertoId) return;
          const r = await avancar(abertoId);
          if (!r.ok) setToast(r.motivo ?? "Não foi possível avançar.");
        }}
        onEditar={() => { if (abertoId) { setEditId(abertoId); setFormAberto(true); } }}
      />

      <CardForm
        aberto={formAberto}
        fluxo={fluxo}
        inicial={editId ? obter(editId) : null}
        onFechar={() => { setFormAberto(false); setEditId(null); }}
        onSubmit={handleSubmit}
      />

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[70] -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}
