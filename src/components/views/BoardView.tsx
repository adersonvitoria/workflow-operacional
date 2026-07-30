"use client";

import { useEffect, useMemo, useState } from "react";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { CardSlideOver } from "@/components/kanban/CardSlideOver";
import { CardForm } from "@/components/forms/CardForm";
import { BoardFiltros } from "@/components/kanban/BoardFiltros";
import { ImportarOrcamento, type OrcamentoImportado } from "@/components/forms/ImportarOrcamento";
import { useCards, type NovoCardInput } from "@/lib/store";
import { ehRetrocessoImplantacao, movimentoValido, movimentoValidoCompras, movimentoValidoManutencao } from "@/lib/routing";
import { mesDoCard } from "@/lib/flows";
import { cardCorrespondeFiltros, FILTROS_VAZIO, temFiltroAtivo, type FiltrosBoard } from "@/lib/board-filtros";
import { useAuth } from "@/lib/auth";
import { podeCriarCard } from "@/lib/perfis";
import type { Card, EtapaCompras, EtapaId, EtapaImplantacao, EtapaManutencao, Fluxo } from "@/types";

function paraPatch(v: NovoCardInput): Partial<Card> {
  return {
    cliente: { nome: v.clienteNome, documento: v.documento, contato: v.contato, endereco: v.endereco, tipo: v.tipoCliente },
    modalidade: v.modalidade,
    prioridade: v.prioridade,
    cr: v.cr,
    cc: v.cc,
    crMonitoramento: v.crMonitoramento,
    crLocacao: v.crLocacao,
    crServico: v.crServico,
    crMaterial: v.crMaterial,
    crMensalidade: v.crMensalidade,
    margemVenda: v.margem,
    temContrato: v.temContrato,
    crDedicado: v.crDedicado,
    temInvestimento: v.temInvestimento,
    chamadoInvestimento: v.chamadoInvestimento,
    chamado: v.chamado,
    numeroOrcamento: v.numeroOrcamento,
    numeroConta: v.numeroConta,
    regiao: v.regiao,
    manutencao: v.manutencao,
    valores: { maoDeObra: v.maoDeObra, equipamentos: v.equipamentos, total: v.total, mensal: v.mensal, locacao: v.locacao },
    observacoes: v.observacoes,
    materiais: v.materiais,
    itensCompra: v.itensCompra,
  };
}

export function BoardView({ fluxo }: { fluxo: Fluxo }) {
  const { porFluxo, obter, criar, criarComplementar, enviarParaCompras, enviarParaManutencao, atualizar, avancar, remover } = useCards();
  const { atual } = useAuth();
  const cards = porFluxo(fluxo);
  const [filtros, setFiltros] = useState<FiltrosBoard>(FILTROS_VAZIO);
  const competencias = useMemo(() => Array.from(new Set(cards.map(mesDoCard).filter(Boolean))).sort().reverse(), [cards]);
  const cardsVisiveis = cards.filter((c) => cardCorrespondeFiltros(c, filtros, fluxo));
  const filtrando = temFiltroAtivo(filtros);
  const podeCriar = podeCriarCard(atual?.perfil, fluxo);

  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [importAberto, setImportAberto] = useState(false);
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
    if (fluxo === "COMPRAS") {
      const card = obter(id);
      if (!card) return;
      const podeRetroceder = atual?.perfil === "COORDENADOR";
      const v = movimentoValidoCompras(card, destino as EtapaCompras, podeRetroceder);
      if (!v.ok) {
        setToast(v.motivo ?? "Movimento não permitido.");
        return;
      }
      await atualizar(id, { etapa: destino });
      return;
    }
    if (fluxo === "MANUTENCAO") {
      const card = obter(id);
      if (!card) return;
      const podeRetroceder = atual?.perfil === "COORDENADOR";
      const v = movimentoValidoManutencao(card, destino as EtapaManutencao, podeRetroceder);
      if (!v.ok) {
        setToast(v.motivo ?? "Movimento não permitido.");
        return;
      }
      await atualizar(id, { etapa: destino });
      return;
    }
    const card = obter(id);
    if (!card) return;
    // O Coordenador pode retroceder o card para qualquer coluna anterior.
    if (atual?.perfil === "COORDENADOR" && ehRetrocessoImplantacao(card.etapa as EtapaImplantacao, destino as EtapaImplantacao)) {
      await atualizar(id, { etapa: destino });
      return;
    }
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

  const titulo = fluxo === "IMPLANTACAO" ? "Esteira de Implantação" : fluxo === "COMPRAS" ? "Esteira de Compras" : "Esteira de Manutenção";
  const subtitulo = fluxo === "IMPLANTACAO" ? "Novos projetos · Comercial → Medição" : fluxo === "COMPRAS" ? "Orçamentos aprovados · Separação → Entrega" : "Serviços extras e orçamentos";

  async function criarDeOrcamento(dados: OrcamentoImportado) {
    const novo = await criar({
      fluxo: "COMPRAS",
      clienteNome: dados.cliente,
      prioridade: "NORMAL",
      numeroOrcamento: dados.numeroOrcamento,
      dataCadastro: dados.dataAprovacao,
      itensCompra: dados.itens,
    });
    if (!novo) throw new Error("Não foi possível criar o card.");
    setToast(`Orçamento de ${dados.cliente} criado com ${dados.itens.length} item(ns) na Separação.`);
  }

  return (
    <>
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-slate-900 dark:text-white">{titulo}</h1>
          <p className="truncate text-xs text-slate-400">
            {subtitulo} · {cardsVisiveis.length}{filtrando ? ` de ${cards.length}` : ""} cards
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <BoardFiltros fluxo={fluxo} competencias={competencias} filtros={filtros} setFiltros={setFiltros} />
          {podeCriar && fluxo === "COMPRAS" && (
            <button onClick={() => setImportAberto(true)} className="shrink-0 rounded-lg border border-brand bg-brand/10 px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand/20">
              📄 Importar orçamento (PDF)
            </button>
          )}
          {podeCriar && (
            <button onClick={() => { setEditId(null); setFormAberto(true); }} className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">
              + Nova entrada
            </button>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <KanbanBoard fluxo={fluxo} cards={cardsVisiveis} onAbrirCard={setAbertoId} onMoverCard={handleMover} />
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
        onOrcamentoComplementar={async () => {
          if (!abertoId) return;
          const r = await criarComplementar(abertoId);
          setToast(r.ok ? `Orçamento complementar criado (#${r.card?.codigo}) na coluna Orçamento.` : (r.motivo ?? "Não foi possível gerar o complementar."));
        }}
        onEnviarCompras={async () => {
          if (!abertoId) return;
          const r = await enviarParaCompras(abertoId);
          setToast(r.ok ? `OS #${r.card?.codigo} enviada para a esteira de Compras (Separação).` : (r.motivo ?? "Não foi possível enviar para Compras."));
        }}
        onEnviarManutencao={async () => {
          if (!abertoId) return;
          const r = await enviarParaManutencao(abertoId);
          setToast(r.ok ? `OS #${r.card?.codigo} devolvida à Manutenção (Agendamento).` : (r.motivo ?? "Não foi possível devolver à Manutenção."));
        }}
        onEditar={() => { if (abertoId) { setEditId(abertoId); setFormAberto(true); } }}
        onExcluir={() => {
          if (!abertoId) return;
          const c = obter(abertoId);
          if (window.confirm(`Excluir o card "${c?.cliente.nome ?? ""}"? Esta ação não pode ser desfeita.`)) {
            void remover(abertoId);
            setAbertoId(null);
          }
        }}
      />

      <CardForm
        aberto={formAberto}
        fluxo={fluxo}
        inicial={editId ? obter(editId) : null}
        onFechar={() => { setFormAberto(false); setEditId(null); }}
        onSubmit={handleSubmit}
      />

      {fluxo === "COMPRAS" && (
        <ImportarOrcamento aberto={importAberto} onFechar={() => setImportAberto(false)} onCriar={criarDeOrcamento} />
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[70] -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}
