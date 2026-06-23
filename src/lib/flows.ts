/**
 * Definição declarativa dos quadros Kanban + mapas de apresentação.
 * O componente <KanbanBoard /> apenas lê esta configuração.
 */

import type {
  Card,
  CardStatus,
  Criticidade,
  EtapaId,
  Fluxo,
  Modalidade,
  Setor,
  TipoCliente,
  Turno,
} from "@/types";

/** Limite (horas) que um card pode ficar parado na mesma coluna. */
export const LIMITE_PARADO_HORAS = 96;

/**
 * SLA específico por etapa (horas), sobrepondo o limite padrão.
 * "Aguardando" o retorno do cliente tem 5 dias (120h) antes de estourar.
 */
export const SLA_ETAPA_HORAS: Partial<Record<string, number>> = {
  ORC_AGUARDANDO: 120,
};

/** Limite de horas da etapa (override por etapa ou o padrão). */
export function limiteEtapaHoras(etapa: string): number {
  return SLA_ETAPA_HORAS[etapa] ?? LIMITE_PARADO_HORAS;
}

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
  const limite = limiteEtapaHoras(card.etapa);
  const h = horasParado(card);
  if (h > limite * 1.25) return "roxo";
  if (h > limite) return "vermelho";
  if (h >= limite * 0.5) return "amarelo";
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
  /** Colunas consecutivas com o mesmo `grupo` são agrupadas sob um cabeçalho. */
  grupo?: string;
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
  {
    id: "ENCERRADOS",
    titulo: "Encerrados",
    setorResponsavel: "MEDICAO",
    descricao: "Projetos faturados e concluídos",
    accent: "bg-slate-500",
  },
];

/**
 * Fluxo de Manutenção (rotina + RQ + orçamentos).
 * O CHEQUE é o gate: a Supervisão classifica cada OS em Encerrados (OK),
 * Medição (RQ) ou Orçamento (reparo maior). As três colunas de orçamento
 * ficam explícitas para dar visão de distribuição (contador + soma por estado).
 */
export const COLUNAS_MANUTENCAO: ColunaConfig[] = [
  { id: "ROTINA", titulo: "Rotina", setorResponsavel: "ADMINISTRATIVO", descricao: "Administrativo lança todas as OS do dia", accent: "bg-blue-600" },
  { id: "CHEQUE", titulo: "Cheque", setorResponsavel: "SUPERVISAO", descricao: "Supervisão confere cada OS: OK · RQ · Orçar", accent: "bg-amber-500" },
  { id: "ORCAMENTO", titulo: "Orçamento", setorResponsavel: "ADMINISTRATIVO", descricao: "Administrativo gera o orçamento e envia ao cliente", accent: "bg-indigo-500" },
  { id: "ORC_AGUARDANDO", titulo: "Aguardando", setorResponsavel: "ADMINISTRATIVO", descricao: "Aguardando o retorno do cliente", accent: "bg-amber-500", grupo: "Orçamentos" },
  { id: "ORC_NAO_APROVADO", titulo: "Não Aprovado", setorResponsavel: "ADMINISTRATIVO", descricao: "Cliente reprovou — volta ao Orçamento p/ renegociar", accent: "bg-rose-500", grupo: "Orçamentos" },
  { id: "ORC_APROVADO", titulo: "Aprovado", setorResponsavel: "ADMINISTRATIVO", descricao: "Cliente aprovou — libera a execução", accent: "bg-emerald-500", grupo: "Orçamentos" },
  { id: "SEPARACAO", titulo: "Separação", setorResponsavel: "ALMOXARIFADO", descricao: "Almoxarifado separa os itens em estoque", accent: "bg-purple-500" },
  { id: "COMPRA", titulo: "Suprimentos", setorResponsavel: "COMPRAS", descricao: "Compra os faltantes e devolve ao Almoxarifado", accent: "bg-indigo-500" },
  { id: "EXECUCAO", titulo: "Execução", setorResponsavel: "TECNICA", descricao: "Técnica executa o serviço em campo", accent: "bg-teal-500" },
  { id: "MEDICAO", titulo: "Medição", setorResponsavel: "MEDICAO", descricao: "Faturamento e geração do relatório", accent: "bg-emerald-600" },
  { id: "ENCERRADOS", titulo: "Encerrados", setorResponsavel: "SUPERVISAO", descricao: "OS de rotina encerrada no Cheque (OK)", accent: "bg-slate-500" },
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

/**
 * Tag de TURNO (Manutenção) — cada turno tem cor própria e uma ordem
 * cronológica de prioridade: Manhã (1º) → Tarde (2º) → Dia (3º).
 */
export const TURNO_META: Record<Turno, { rotulo: string; ordem: number; classe: string; ponto: string }> = {
  MANHA: { rotulo: "Manhã", ordem: 0, classe: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30", ponto: "bg-amber-500" },
  TARDE: { rotulo: "Tarde", ordem: 1, classe: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-500/30", ponto: "bg-orange-500" },
  DIA: { rotulo: "Dia", ordem: 2, classe: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30", ponto: "bg-sky-500" },
};

/** Ordem de prioridade do turno (menor = primeiro). Sem turno vai para o fim. */
export function ordemTurno(t?: Turno): number {
  return t ? TURNO_META[t].ordem : 99;
}

/** Dia da visita (YYYY-MM-DD) do card de manutenção; "" se não houver. */
export function diaVisita(c: Pick<Card, "manutencao">): string {
  return c.manutencao?.dataVisita ? c.manutencao.dataVisita.slice(0, 10) : "";
}

/**
 * Ordena a coluna Rotina: visita mais próxima primeiro; sem data por último;
 * dentro do mesmo dia, prioridade por turno (Manhã → Tarde → Dia).
 */
export function compararRotina(a: Pick<Card, "manutencao">, b: Pick<Card, "manutencao">): number {
  const da = diaVisita(a), db = diaVisita(b);
  if (da !== db) {
    if (!da) return 1;
    if (!db) return -1;
    return da < db ? -1 : 1;
  }
  return ordemTurno(a.manutencao?.turno) - ordemTurno(b.manutencao?.turno);
}

/** Rótulo do cabeçalho de dia (ex.: "Seg, 23/06"); "Sem data de visita" se vazio. */
export function rotuloDiaVisita(dia: string): string {
  if (!dia) return "Sem data de visita";
  const d = new Date(`${dia}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dia;
  const s = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Criticidade derivada do tipo de cliente (Corporativo→Alta, etc.). */
export const CRITICIDADE_POR_TIPO: Record<TipoCliente, Criticidade> = {
  CORPORATIVO: "ALTA",
  COMERCIAL: "MEDIA",
  VAREJO: "BAIXA",
};

export const TIPO_CLIENTE_META: Record<TipoCliente, { rotulo: string; criticidade: Criticidade }> = {
  CORPORATIVO: { rotulo: "Corporativo", criticidade: "ALTA" },
  COMERCIAL: { rotulo: "Comercial", criticidade: "MEDIA" },
  VAREJO: { rotulo: "Varejo", criticidade: "BAIXA" },
};

export const CRITICIDADE_META: Record<Criticidade, { rotulo: string; classe: string; ponto: string }> = {
  ALTA: { rotulo: "Alta", classe: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30", ponto: "bg-rose-500" },
  MEDIA: { rotulo: "Média", classe: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30", ponto: "bg-amber-500" },
  BAIXA: { rotulo: "Baixa", classe: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:ring-slate-600", ponto: "bg-slate-400" },
};

/** Criticidade de um card a partir do tipo do cliente (undefined se não definido). */
export function criticidadeDoCard(card: Pick<Card, "cliente">): Criticidade | undefined {
  return card.cliente.tipo ? CRITICIDADE_POR_TIPO[card.cliente.tipo] : undefined;
}

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
  ADMINISTRATIVO: "Administrativo",
  SUPERVISAO: "Supervisão",
  ALMOXARIFADO: "Almoxarifado",
  COMPRAS: "Compras",
  MONITORAMENTO: "Monitoramento",
  TECNICA: "Técnica",
  MEDICAO: "Medição",
};

/** Mês de referência do card (YYYY-MM) — conclusão quando houver, senão abertura. */
export function mesDoCard(c: Pick<Card, "datas">): string {
  const iso = c.datas?.conclusao ?? c.datas?.abertura;
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Valor de referência do card: medição (faturado) > total > mensal. */
export function valorDoCard(c: Pick<Card, "medicao" | "valores">): number {
  return c.medicao?.valorMedicao ?? c.valores?.total ?? c.valores?.mensal ?? 0;
}

/**
 * Competência do card para relatórios: a competência (mês/ano) informada na
 * Medição. Cards ainda não medidos retornam "" (fora dos relatórios por competência).
 */
export function competenciaDoCard(c: Pick<Card, "medicao">): string {
  return c.medicao?.competencia ?? "";
}

/**
 * Tempo total que o card ficou na esteira: do cadastro (abertura) até o
 * encerramento (conclusão). Retorna null enquanto não estiver encerrado.
 */
export function duracaoAteEncerrar(c: Pick<Card, "datas">): string | null {
  const ini = c.datas?.abertura ? Date.parse(c.datas.abertura) : NaN;
  const fim = c.datas?.conclusao ? Date.parse(c.datas.conclusao) : NaN;
  if (Number.isNaN(ini) || Number.isNaN(fim) || fim < ini) return null;
  const ms = fim - ini;
  const dias = Math.floor(ms / 86_400_000);
  const horas = Math.floor((ms % 86_400_000) / 3_600_000);
  if (dias > 0) return `${dias}d ${horas}h`;
  const min = Math.floor((ms % 3_600_000) / 60_000);
  return horas > 0 ? `${horas}h ${min}min` : `${min}min`;
}

export function formatarBRL(valor?: number): string {
  if (valor == null) return "—";
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
