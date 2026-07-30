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
    descricao: "Cheque da Coordenação — envia o card para a esteira de Compras",
    accent: "bg-amber-500",
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
    id: "CHEQUE_MONITORAMENTO",
    titulo: "Cheque · Monitoramento",
    setorResponsavel: "MONITORAMENTO",
    descricao: "Revisa usuários/senhas, setorização, equipamentos e comunicação",
    accent: "bg-cyan-600",
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
  { id: "AGENDAMENTO", titulo: "Agendamento", setorResponsavel: "ADMINISTRATIVO", descricao: "Agenda a OS antes de entrar na rotina do dia", accent: "bg-sky-500" },
  { id: "ROTINA", titulo: "Rotina", setorResponsavel: "ADMINISTRATIVO", descricao: "Administrativo lança todas as OS do dia", accent: "bg-blue-600" },
  { id: "CHEQUE", titulo: "Cheque", setorResponsavel: "SUPERVISAO", descricao: "Supervisão confere cada OS: OK · RQ · Orçar", accent: "bg-amber-500" },
  { id: "ORCAMENTO", titulo: "Orçamento", setorResponsavel: "ADMINISTRATIVO", descricao: "Administrativo gera o orçamento e envia ao cliente", accent: "bg-indigo-500" },
  { id: "ORC_AGUARDANDO", titulo: "Aguardando", setorResponsavel: "ADMINISTRATIVO", descricao: "Aguardando o retorno do cliente (7 dias → Não Aprovado)", accent: "bg-amber-500", grupo: "Orçamentos" },
  { id: "ORC_NAO_APROVADO", titulo: "Não Aprovado", setorResponsavel: "ADMINISTRATIVO", descricao: "Cliente reprovou — volta ao Orçamento p/ renegociar", accent: "bg-rose-500", grupo: "Orçamentos" },
  { id: "ORC_APROVADO", titulo: "Aprovado", setorResponsavel: "ADMINISTRATIVO", descricao: "Cliente aprovou — o card segue para a esteira de Compras", accent: "bg-emerald-500", grupo: "Orçamentos" },
  { id: "MEDICAO", titulo: "Medição", setorResponsavel: "MEDICAO", descricao: "Faturamento e geração do relatório", accent: "bg-emerald-600" },
  { id: "ENCERRADOS", titulo: "Encerrados", setorResponsavel: "SUPERVISAO", descricao: "OS de rotina encerrada no Cheque (OK)", accent: "bg-slate-500" },
];

/**
 * Fluxo de Compras: um card por orçamento aprovado (itens dentro). O Coordenador
 * classifica os itens (tipo de custo + CC); o Suprimentos toca o restante. Da
 * Tabela de Valores em diante são processos internos em outro portal.
 */
export const COLUNAS_COMPRAS: ColunaConfig[] = [
  { id: "SEPARACAO", titulo: "Separação", setorResponsavel: "ALMOXARIFADO", descricao: "Almoxarifado marca cada item: em estoque ou falta comprar", accent: "bg-purple-500" },
  { id: "CLASSIFICACAO", titulo: "Classificação", setorResponsavel: "COORDENACAO", descricao: "Coordenador aponta tipo de custo + centro de custo de cada item", accent: "bg-amber-500" },
  { id: "PEDIDO_FORNECEDOR", titulo: "Pedido ao Fornecedor", setorResponsavel: "COMPRAS", descricao: "Suprimentos faz o pedido: fornecedor e nº do pedido por item", accent: "bg-indigo-500" },
  { id: "TABELA_VALORES", titulo: "Tabela de Valores", setorResponsavel: "COMPRAS", descricao: "Processo interno (outro portal)", accent: "bg-slate-400", grupo: "Portal interno" },
  { id: "REVISAO_VALORES", titulo: "Revisão de Valores", setorResponsavel: "COMPRAS", descricao: "Processo interno (outro portal)", accent: "bg-slate-400", grupo: "Portal interno" },
  { id: "SOLICITACAO_COMPRA", titulo: "Solicitação de Compra", setorResponsavel: "COMPRAS", descricao: "Processo interno (outro portal)", accent: "bg-slate-400", grupo: "Portal interno" },
  { id: "PEDIDO_COMPRA", titulo: "Pedido de Compra", setorResponsavel: "COMPRAS", descricao: "Abertura de chamado para o pedido de compra", accent: "bg-indigo-500" },
  { id: "PC_ENVIADO", titulo: "PC enviado", setorResponsavel: "COMPRAS", descricao: "Pedido de compra enviado ao fornecedor", accent: "bg-emerald-600" },
  { id: "ENTREGA", titulo: "Entrega", setorResponsavel: "COMPRAS", descricao: "Data de entrega por item · concluída, a OS volta ao Agendamento da Manutenção", accent: "bg-teal-500" },
];

export function colunasDoFluxo(fluxo: Fluxo): ColunaConfig[] {
  if (fluxo === "IMPLANTACAO") return COLUNAS_IMPLANTACAO;
  if (fluxo === "COMPRAS") return COLUNAS_COMPRAS;
  return COLUNAS_MANUTENCAO;
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

/** Tag de ORÇAMENTO COMPLEMENTAR (Manutenção) — violeta. */
export const COMPLEMENTAR_META = {
  rotulo: "Complementar",
  classe: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/30",
  ponto: "bg-violet-500",
} as const;

/** Tag de CONFERÊNCIA (Implantação) — card voltou do Suprimentos ao Almoxarifado. */
export const CONFERENCIA_META = {
  rotulo: "Conferência",
  classe: "bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:ring-cyan-500/30",
  ponto: "bg-cyan-500",
} as const;

/** Tag de origem IMPLANTAÇÃO (esteira de Compras) — azul. */
export const ORIGEM_IMPLANTACAO_META = {
  rotulo: "Implantação",
  classe: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/30",
  ponto: "bg-blue-600",
} as const;

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

/** Valor da visita (Manutenção): só conta quando a visita é cobrada. */
export function valorVisitaDoCard(c: Pick<Card, "manutencao">): number {
  return c.manutencao?.visitaCobrada ? c.manutencao.valorVisita ?? 0 : 0;
}

/**
 * Valor de referência do card:
 * 1. Medição (faturado), quando registrada — é o valor definitivo;
 * 2. senão, o total do orçamento/projeto + a visita cobrada (Manutenção);
 * 3. sem total, a recorrência (locação + mensalidade) + a visita cobrada.
 */
export function valorDoCard(c: Pick<Card, "medicao" | "valores" | "manutencao">): number {
  if (c.medicao?.valorMedicao != null) return c.medicao.valorMedicao;
  const recorrente = (c.valores?.locacao ?? 0) + (c.valores?.mensal ?? 0);
  const base = c.valores?.total ?? recorrente;
  return base + valorVisitaDoCard(c);
}

type CardCr = Pick<
  Card,
  "fluxo" | "modalidade" | "cr" | "crServico" | "crMaterial" | "crMensalidade" | "crMonitoramento" | "crLocacao" | "valores" | "medicao" | "manutencao"
>;

export interface ValorPorCr {
  cr: string;
  origem: string;
  valor: number;
}

const SEM_CR = "Sem CR";

/**
 * Vincula os valores do card aos seus CRs (Centros de Resultado):
 * - Implantação · Venda: serviço → CR de serviço, material → CR de material,
 *   mensalidade → CR de mensalidade;
 * - Implantação · Locação: mensalidade → CR de monitoramento, locação → CR de locação;
 * - Demais casos (Manutenção, Compras, sem CRs específicos): o valor de
 *   referência inteiro vai para o CR do card (ou "Sem CR").
 */
export function valoresPorCr(c: CardCr): ValorPorCr[] {
  const norm = (cr?: string) => cr?.trim() || SEM_CR;
  if (c.fluxo === "IMPLANTACAO" && c.modalidade === "VENDA" && (c.crServico || c.crMaterial || c.crMensalidade)) {
    const partes = [
      { cr: norm(c.crServico), origem: "Serviço (M.O.)", valor: c.valores?.maoDeObra ?? 0 },
      { cr: norm(c.crMaterial), origem: "Material", valor: c.valores?.equipamentos ?? 0 },
      { cr: norm(c.crMensalidade), origem: "Mensalidade", valor: c.valores?.mensal ?? 0 },
    ].filter((p) => p.cr !== SEM_CR || p.valor > 0);
    if (partes.length) return partes;
  }
  if (c.fluxo === "IMPLANTACAO" && c.modalidade === "LOCACAO" && (c.crMonitoramento || c.crLocacao)) {
    const partes = [
      { cr: norm(c.crMonitoramento), origem: "Mensalidade (monitoramento)", valor: c.valores?.mensal ?? 0 },
      { cr: norm(c.crLocacao), origem: "Locação", valor: c.valores?.locacao ?? 0 },
    ].filter((p) => p.cr !== SEM_CR || p.valor > 0);
    if (partes.length) return partes;
  }
  return [{ cr: norm(c.cr), origem: origemValorDoCard(c), valor: valorDoCard(c) }];
}

/** CRs do card para exibição (lista única, na ordem da alocação). */
export function crsDoCard(c: CardCr): string {
  const crs = Array.from(new Set(valoresPorCr(c).map((v) => v.cr).filter((cr) => cr !== SEM_CR)));
  return crs.length ? crs.join(" · ") : "—";
}

/** De onde veio o valor de referência (exibido nos relatórios). */
export function origemValorDoCard(c: Pick<Card, "medicao" | "valores" | "manutencao">): string {
  if (c.medicao?.valorMedicao != null) return "Medição";
  const partes: string[] = [];
  if (c.valores?.total != null) partes.push("Orçamento/Total");
  else if ((c.valores?.locacao ?? 0) + (c.valores?.mensal ?? 0) > 0) partes.push("Locação/Mensal");
  if (valorVisitaDoCard(c) > 0) partes.push("Visita");
  return partes.join(" + ") || "—";
}

/**
 * Competência do card para relatórios: a competência (mês/ano) informada na
 * Medição. OS encerradas sem competência de medição caem, como fallback, no
 * mês do encerramento (data de conclusão). Sem medição e sem conclusão → ""
 * (fora dos relatórios por competência).
 */
export function competenciaDoCard(c: Pick<Card, "medicao" | "datas">): string {
  if (c.medicao?.competencia) return c.medicao.competencia;
  const m = c.datas?.conclusao ? String(c.datas.conclusao).match(/^(\d{4})-(\d{2})/) : null;
  return m ? `${m[2]}/${m[1]}` : "";
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
