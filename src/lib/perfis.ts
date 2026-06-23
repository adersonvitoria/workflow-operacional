/**
 * Perfis de usuário e suas permissões.
 *
 * Cada perfil é dono de etapas específicas do fluxo de Implantação e só pode
 * executar os gates (aprovações/ações) das suas etapas. ADMINISTRATIVO é o
 * perfil administrador (acesso total + gestão de usuários).
 */

import type { EtapaImplantacao, Fluxo, Modalidade } from "@/types";

export type Perfil =
  | "COORDENADOR"
  | "SUPERVISOR_TECNICO"
  | "SUPERVISOR_MONITORAMENTO"
  | "COMERCIAL"
  | "ADMINISTRATIVO"
  | "ASSISTENTE_1"
  | "ASSISTENTE_2"
  | "ALMOXARIFADO"
  | "SUPRIMENTOS"
  | "MEDICAO";

export interface PerfilMeta {
  rotulo: string;
  descricao: string;
  /** Etapas que o perfil opera/aprova. */
  etapas: EtapaImplantacao[];
  /** Aprovações e ações pertinentes (exibidas no login e na gestão). */
  acoes: string[];
  /** Cores da credencial (tag). */
  classe: string;
  /** Cor sólida (avatar/realces). */
  cor: string;
}

export const PERFIL_META: Record<Perfil, PerfilMeta> = {
  COORDENADOR: {
    rotulo: "Coordenador",
    descricao: "Aprova o escopo inicial e audita a qualidade final das obras.",
    etapas: ["COORDENACAO_APROVACAO", "COORDENACAO_AUDITORIA"],
    acoes: [
      "Aprovar escopo (liberação inicial)",
      "Dar OK de qualidade / checklist de obra",
      "Visão geral de todas as esteiras",
    ],
    classe: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30",
    cor: "bg-amber-500",
  },
  COMERCIAL: {
    rotulo: "Comercial",
    descricao: "Cadastra novos projetos, define modalidade e valores.",
    etapas: ["COMERCIAL"],
    acoes: [
      "Cadastrar venda/locação (start do fluxo)",
      "Definir modalidade e valores",
      "Editar dados comerciais do card",
    ],
    classe: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/30",
    cor: "bg-blue-600",
  },
  ALMOXARIFADO: {
    rotulo: "Almoxarifado",
    descricao: "Nas Vendas, confere item a item o que há em estoque e o que falta, enviando os faltantes ao Suprimentos.",
    etapas: ["ALMOXARIFADO"],
    acoes: [
      "Conferir estoque item a item (Venda)",
      "Marcar itens em estoque x faltantes",
      "Enviar os faltantes para o Suprimentos comprar",
    ],
    classe: "bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:ring-purple-500/30",
    cor: "bg-purple-500",
  },
  SUPRIMENTOS: {
    rotulo: "Suprimentos",
    descricao: "Compra os itens faltantes apontados pelo Almoxarifado (Venda) e adquire 100% dos itens na Locação.",
    etapas: ["SUPRIMENTOS"],
    acoes: [
      "Comprar os itens faltantes (Venda)",
      "Adquirir 100% dos itens (Locação)",
      "Liberar para o Monitoramento",
    ],
    classe: "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/30",
    cor: "bg-indigo-500",
  },
  SUPERVISOR_MONITORAMENTO: {
    rotulo: "Supervisor de Monitoramento",
    descricao: "Cria a conta no software central e gera os dados de conexão.",
    etapas: ["MONITORAMENTO"],
    acoes: [
      "Criar conta no software central (Sigma)",
      "Registrar dados de conexão",
      "Liberar para a equipe técnica",
    ],
    classe: "bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:ring-cyan-500/30",
    cor: "bg-cyan-500",
  },
  SUPERVISOR_TECNICO: {
    rotulo: "Supervisor Técnico",
    descricao: "Executa a instalação, testa a conexão e aponta a conclusão.",
    etapas: ["TECNICA"],
    acoes: [
      "Despachar equipe e executar a instalação",
      "Testar conexão e concluir checklist",
      "Devolver para auditoria da Coordenação",
    ],
    classe: "bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:ring-teal-500/30",
    cor: "bg-teal-500",
  },
  MEDICAO: {
    rotulo: "Medição",
    descricao: "Registra os dados de medição/faturamento e finaliza o card; gera relatórios por competência.",
    etapas: ["MEDICAO"],
    acoes: [
      "Registrar competência, valor, forma de pagamento e parcelas",
      "Finalizar o card após o faturamento",
      "Gerar relatórios por competência ou por card",
    ],
    classe: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30",
    cor: "bg-emerald-600",
  },
  ADMINISTRATIVO: {
    rotulo: "Administrativo",
    descricao: "Administra os usuários do sistema e o catálogo de itens.",
    etapas: [],
    acoes: [
      "Gerir usuários e perfis (cadastro/edição)",
      "Gerir o catálogo de itens",
      "Gerar relatórios",
    ],
    classe: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-500/30",
    cor: "bg-slate-700",
  },
  ASSISTENTE_1: {
    rotulo: "Assistente 1",
    descricao: "Cria e edita as rotinas na coluna Rotina (Manutenção).",
    etapas: [],
    acoes: [
      "Cadastrar rotinas de Manutenção",
      "Editar os dados das rotinas na coluna Rotina",
      "Acompanhar a esteira de Manutenção",
    ],
    classe: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30",
    cor: "bg-sky-500",
  },
  ASSISTENTE_2: {
    rotulo: "Assistente 2",
    descricao: "Cria e edita os orçamentos na coluna Orçamento (Manutenção).",
    etapas: [],
    acoes: [
      "Gerar e editar orçamentos na coluna Orçamento",
      "Acompanhar a esteira de Manutenção",
    ],
    classe: "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/30",
    cor: "bg-indigo-500",
  },
};

export const PERFIS: Perfil[] = [
  "COORDENADOR",
  "COMERCIAL",
  "ASSISTENTE_1",
  "ASSISTENTE_2",
  "ALMOXARIFADO",
  "SUPRIMENTOS",
  "SUPERVISOR_MONITORAMENTO",
  "SUPERVISOR_TECNICO",
  "MEDICAO",
  "ADMINISTRATIVO",
];

/** Qual perfil é dono (executor) de cada etapa do gate. */
const DONO_DA_ETAPA: Record<EtapaImplantacao, Perfil> = {
  COMERCIAL: "COMERCIAL",
  COORDENACAO_APROVACAO: "COORDENADOR",
  ALMOXARIFADO: "ALMOXARIFADO",
  SUPRIMENTOS: "SUPRIMENTOS",
  MONITORAMENTO: "SUPERVISOR_MONITORAMENTO",
  TECNICA: "SUPERVISOR_TECNICO",
  COORDENACAO_AUDITORIA: "COORDENADOR",
  MEDICAO: "MEDICAO",
};

/**
 * Executar o GATE de uma etapa (aprovar/checar para seguir o fluxo).
 * O Coordenador supervisiona e pode agir em qualquer etapa; os demais perfis
 * só executam o gate da etapa que lhes pertence.
 */
export function podeExecutarEtapa(perfil: Perfil | undefined, etapa: string, modalidade?: Modalidade): boolean {
  if (!perfil) return false;
  if (perfil === "COORDENADOR") return true;
  // Assistente 1 pode avançar a própria etapa de Rotina (Rotina -> Cheque).
  if (perfil === "ASSISTENTE_1" && etapa === "ROTINA") return true;
  return donoDaEtapa(etapa, modalidade) === perfil;
}

/** Dono da etapa (o parâmetro modalidade é mantido por compatibilidade). */
export function donoDaEtapa(etapa: string, _modalidade?: Modalidade): Perfil | undefined {
  return DONO_DA_ETAPA[etapa as EtapaImplantacao];
}

/**
 * Cadastrar novo card:
 * - Coordenador e Comercial: qualquer fluxo;
 * - Assistente: somente rotinas de Manutenção.
 */
export function podeCriarCard(perfil: Perfil | undefined, fluxo?: Fluxo): boolean {
  if (perfil === "COORDENADOR" || perfil === "COMERCIAL") return true;
  // Assistente 1 cria rotinas (cards de Manutenção, que começam na coluna Rotina).
  if (perfil === "ASSISTENTE_1") return fluxo === "MANUTENCAO";
  return false;
}

/**
 * Editar os dados (comerciais/cadastrais) de um card:
 * - Coordenador: em qualquer etapa;
 * - Comercial: somente enquanto o card está na etapa Comercial;
 * - Assistente 1: rotinas na coluna Rotina (Manutenção);
 * - Assistente 2: orçamentos na coluna Orçamento (Manutenção);
 * - demais perfis: não editam (apenas executam o gate da sua etapa).
 */
export function podeEditarCard(perfil: Perfil | undefined, etapa: string, fluxo?: Fluxo): boolean {
  if (perfil === "COORDENADOR") return true;
  if (perfil === "COMERCIAL") return etapa === "COMERCIAL";
  if (perfil === "ASSISTENTE_1") return fluxo === "MANUTENCAO" && etapa === "ROTINA";
  if (perfil === "ASSISTENTE_2") return fluxo === "MANUTENCAO" && etapa === "ORCAMENTO";
  return false;
}

/** Excluir card: apenas Coordenador (qualquer etapa) e Comercial (etapa Comercial). */
export function podeExcluirCard(perfil: Perfil | undefined, etapa: string): boolean {
  if (perfil === "COORDENADOR") return true;
  if (perfil === "COMERCIAL") return etapa === "COMERCIAL";
  return false;
}

export function podeGerenciarUsuarios(perfil: Perfil | undefined): boolean {
  return perfil === "ADMINISTRATIVO" || perfil === "COORDENADOR";
}

/** Gerir o catálogo de itens do projeto: Comercial, Coordenador e Administrativo. */
export function podeGerenciarItens(perfil: Perfil | undefined): boolean {
  return perfil === "COMERCIAL" || perfil === "COORDENADOR" || perfil === "ADMINISTRATIVO";
}

/** Acesso aos relatórios de medição: Medição, Coordenador e Administrativo. */
export function podeGerarRelatorio(perfil: Perfil | undefined): boolean {
  return perfil === "MEDICAO" || perfil === "COORDENADOR" || perfil === "ADMINISTRATIVO";
}
