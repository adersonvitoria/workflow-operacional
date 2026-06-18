/**
 * Definição declarativa dos quadros Kanban + mapas de apresentação.
 * O componente <KanbanBoard /> apenas lê esta configuração.
 */

import type {
  Card,
  CardStatus,
  EtapaId,
  Fluxo,
  Modalidade,
  Setor,
} from "@/types";

/** Limite (horas) que um card pode ficar parado na mesma coluna. */
export const LIMITE_PARADO_HORAS = 96;

/** Momento (ms) em que o card entrou na etapa atual (último evento do histórico). */
export function entrouNaEtapaEm(card: Pick<Card, "etapa" | "historico" | "datas">): number {
  const evs = card.historico?.filter((e) => e.para === card.etapa) ?? [];
  const iso = evs[evs.length - 1]?.data ?? card.datas?.abertura;
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? Date.now() : t;
}

/** Horas (inteiras) que o card está parado na coluna atual. */
export function horasParado(card: Pick<Card, "etapa" | "historico" | "datas">): number {
  return Math.floor((Date.now() - entrouNaEtapaEm(card)) / 3_600_000);
}

export type NivelSla = "normal" | "amarelo" | "vermelho" | "roxo";

/**
 * Nível de SLA por tempo parado na mesma coluna:
 * < 48h normal · 48–96h amarelo · 96:00:01–120h vermelho · > 120h roxo.
 * Cards encerrados (concluído/finalizado) não têm SLA.
 */
export function nivelSla(card: Pick<Card, "etapa" | "historico" | "datas" | "status">): NivelSla {
  if (card.status === "CONCLUIDO" || card.status === "FINALIZADO") return "normal";
  const h = horasParado(card);
  if (h > 120) return "roxo";
  if (h > 96) return "vermelho";
  if (h >= 48) return "amarelo";
  return "normal";
}

/**
 * Estilo do card por nível de SLA. `fundo` preenche o card inteiro (cor +
 * borda); `selo` é o badge de horas.
 */
export const SLA_META: Record<NivelSla, { fundo: string; selo: string }> = {
  normal: { fundo: "border-slate-200 bg-surface-card hover:border-brand/40 dark:border-slate-700 dark:bg-slate-800", selo: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300" },
  amarelo: { fundo: "border-amber-300 bg-amber-50 dark:border-amber-500/50 dark:bg-amber-500/15", selo: "bg-amber-500 text-white" },
  vermelho: { fundo: "border-rose-300 bg-rose-50 dark:border-rose-500/50 dark:bg-rose-500/15", selo: "bg-rose-500 text-white" },
  roxo: { fundo: "border-purple-300 bg-purple-50 dark:border-purple-500/50 dark:bg-purple-500/15", selo: "bg-purple-600 text-white" },
};

/** True se o card está parado além do limite (vermelho/roxo). */
export function cardParado(card: Pick<Card, "etapa" | "historico" | "datas" | "status">): boolean {
  const n = nivelSla(card);
  return n === "vermelho" || n === "roxo";
}

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
  FINALIZADO: {
    rotulo: "Finalizado",
    classe: "bg-emerald-100 text-emerald-800 ring-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:ring-emerald-500/40",
    ponto: "bg-emerald-600",
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
