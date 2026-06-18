/**
 * Definição declarativa dos quadros Kanban + mapas de apresentação.
 * O componente <KanbanBoard /> apenas lê esta configuração.
 */

import type {
  CardStatus,
  EtapaId,
  Fluxo,
  Modalidade,
  Setor,
} from "@/types";

export interface ColunaConfig {
  id: EtapaId;
  titulo: string;
  setorResponsavel: Setor;
  descricao: string;
  accent: string; // cor do "trilho" no topo da coluna
}

/** Fluxo de Implantação (regra de negócio definitiva). */
export const COLUNAS_IMPLANTACAO: ColunaConfig[] = [
  {
    id: "COMERCIAL",
    titulo: "Comercial",
    setorResponsavel: "COMERCIAL",
    descricao: "Cadastro do projeto, valores e modalidade (Locação/Venda)",
    accent: "bg-blue-600",
  },
  {
    id: "COORDENACAO_APROVACAO",
    titulo: "Coordenação · Aprovação",
    setorResponsavel: "COORDENACAO",
    descricao: "Avaliação do escopo — precisa de aprovação para seguir",
    accent: "bg-amber-500",
  },
  {
    id: "ALMOXARIFADO",
    titulo: "Almoxarifado",
    setorResponsavel: "ALMOXARIFADO",
    descricao: "Somente Venda · confere item a item (em estoque x faltante)",
    accent: "bg-purple-500",
  },
  {
    id: "SUPRIMENTOS",
    titulo: "Suprimentos",
    setorResponsavel: "COMPRAS",
    descricao: "Compra os faltantes (Venda) / 100% dos itens (Locação)",
    accent: "bg-indigo-500",
  },
  {
    id: "MONITORAMENTO",
    titulo: "Monitoramento",
    setorResponsavel: "MONITORAMENTO",
    descricao: "Cria a conta no software central e gera os dados de conexão",
    accent: "bg-cyan-500",
  },
  {
    id: "TECNICA",
    titulo: "Técnica · Execução",
    setorResponsavel: "TECNICA",
    descricao: "Instala, testa a conexão e aponta a conclusão",
    accent: "bg-teal-500",
  },
  {
    id: "COORDENACAO_AUDITORIA",
    titulo: "Coordenação · Auditoria",
    setorResponsavel: "COORDENACAO",
    descricao: "OK de qualidade e checklist de obra pronta",
    accent: "bg-emerald-500",
  },
  {
    id: "MEDICAO",
    titulo: "Medição",
    setorResponsavel: "MEDICAO",
    descricao: "Faturamento do cliente",
    accent: "bg-emerald-600",
  },
];

/** Fluxo de Manutenção (serviços extras / orçamentos). */
export const COLUNAS_MANUTENCAO: ColunaConfig[] = [
  { id: "APONTAMENTO", titulo: "Apontamento de Campo", setorResponsavel: "TECNICA", descricao: "Técnico aponta a necessidade", accent: "bg-blue-600" },
  { id: "ORCAMENTACAO", titulo: "Orçamentação", setorResponsavel: "COMERCIAL", descricao: "Orçamentista gera a proposta", accent: "bg-indigo-500" },
  { id: "APROVACAO_CLIENTE", titulo: "Aprovação", setorResponsavel: "COMERCIAL", descricao: "Aguardando OK do cliente", accent: "bg-amber-500" },
  { id: "COMPRAS_ALMOX", titulo: "Compras / Almoxarifado", setorResponsavel: "COMPRAS", descricao: "Separação do material", accent: "bg-purple-500" },
  { id: "EXECUCAO", titulo: "Execução", setorResponsavel: "TECNICA", descricao: "Retorno à fila técnica", accent: "bg-teal-500" },
  { id: "MEDICAO", titulo: "Medição", setorResponsavel: "MEDICAO", descricao: "Faturamento do serviço extra", accent: "bg-emerald-600" },
];

export function colunasDoFluxo(fluxo: Fluxo): ColunaConfig[] {
  return fluxo === "IMPLANTACAO" ? COLUNAS_IMPLANTACAO : COLUNAS_MANUTENCAO;
}

// ---------------------------------------------------------------------------
// Mapas de apresentação
// ---------------------------------------------------------------------------

/** Tag de MODALIDADE — Locação = verde esmeralda, Venda = roxo. */
export const MODALIDADE_META: Record<
  Modalidade,
  { rotulo: string; classe: string }
> = {
  LOCACAO: {
    rotulo: "Locação",
    classe: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30",
  },
  VENDA: {
    rotulo: "Venda",
    classe: "bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:ring-purple-500/30",
  },
};

/** Tag de STATUS — âmbar para "Aguardando aprovação". */
export const STATUS_META: Record<
  CardStatus,
  { rotulo: string; classe: string; ponto: string }
> = {
  EM_ANDAMENTO: {
    rotulo: "Em andamento",
    classe: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-600",
    ponto: "bg-slate-500",
  },
  AGUARDANDO_APROVACAO: {
    rotulo: "Aguardando aprovação",
    classe: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30",
    ponto: "bg-amber-500",
  },
  CONCLUIDO: {
    rotulo: "Concluído",
    classe: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30",
    ponto: "bg-emerald-500",
  },
  TRAVADO: {
    rotulo: "Travado",
    classe: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30",
    ponto: "bg-rose-500",
  },
};

export const SETOR_ROTULO: Record<Setor, string> = {
  COMERCIAL: "Comercial",
  COORDENACAO: "Coordenação",
  ALMOXARIFADO: "Almoxarifado",
  COMPRAS: "Compras",
  MONITORAMENTO: "Monitoramento",
  TECNICA: "Técnica",
  MEDICAO: "Medição",
};

export function formatarBRL(valor?: number): string {
  if (valor == null) return "—";
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
