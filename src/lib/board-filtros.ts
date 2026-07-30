/**
 * Filtros do board (busca + filtros avançados). Lógica pura, reutilizada pelo
 * componente <BoardFiltros /> e pelo <BoardView />.
 */
import { criticidadeDoCard, mesDoCard } from "@/lib/flows";
import type { Card, Fluxo } from "@/types";

export interface FiltrosBoard {
  busca: string;
  status: string; // CardStatus | ""
  turno: string; // Turno | "" (Manutenção)
  modalidade: string; // Modalidade | "" (Implantação)
  criticidade: string; // Criticidade | "" (Manutenção)
  prioridade: string; // Prioridade | ""
  competencia: string; // YYYY-MM | ""
}

export const FILTROS_VAZIO: FiltrosBoard = {
  busca: "",
  status: "",
  turno: "",
  modalidade: "",
  criticidade: "",
  prioridade: "",
  competencia: "",
};

/** Quantos filtros avançados (fora a busca) estão ativos. */
export function contarFiltrosAvancados(f: FiltrosBoard): number {
  return [f.status, f.turno, f.modalidade, f.criticidade, f.prioridade, f.competencia].filter(Boolean).length;
}

/** Há qualquer filtro ativo (busca ou avançado)? */
export function temFiltroAtivo(f: FiltrosBoard): boolean {
  return !!f.busca.trim() || contarFiltrosAvancados(f) > 0;
}

/** Normaliza para busca: minúsculas e sem acentos. */
function norm(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Texto pesquisável do card (todos os campos relevantes concatenados). */
function textoBusca(card: Card): string {
  return norm(
    [
      card.codigo,
      card.cliente.nome,
      card.cliente.documento,
      card.cr,
      card.cc,
      card.chamado,
      card.chamadoInvestimento,
      card.numeroConta,
      card.numeroOrcamento,
      card.regiao,
      card.manutencao?.regiao,
      card.manutencao?.tecnico,
      card.manutencao?.auxiliarTecnico,
      card.manutencao?.ordemServico,
      card.observacoes,
      // Compras: material, fornecedor e nº do pedido de cada item
      ...(card.itensCompra ?? []).flatMap((i) => [i.material, i.fornecedor, i.numeroPedido, i.centroCusto]),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

/** True se o card passa por todos os filtros ativos. */
export function cardCorrespondeFiltros(card: Card, f: FiltrosBoard, fluxo: Fluxo): boolean {
  if (f.status && card.status !== f.status) return false;
  if (f.prioridade && card.prioridade !== f.prioridade) return false;
  if (f.competencia && mesDoCard(card) !== f.competencia) return false;

  if (fluxo === "MANUTENCAO") {
    if (f.turno && card.manutencao?.turno !== f.turno) return false;
    if (f.criticidade && criticidadeDoCard(card) !== f.criticidade) return false;
  }
  if (fluxo === "IMPLANTACAO" && f.modalidade && card.modalidade !== f.modalidade) return false;

  const termo = f.busca.trim();
  if (termo) {
    const hay = textoBusca(card);
    const tokens = norm(termo).split(/\s+/).filter(Boolean);
    if (!tokens.every((t) => hay.includes(t))) return false;
  }
  return true;
}
