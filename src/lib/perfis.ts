/**
 * Perfis de usuário e suas permissões.
 *
 * Cada perfil é dono de etapas específicas do fluxo de Implantação e só pode
 * executar os gates (aprovações/ações) das suas etapas. ADMINISTRATIVO é o
 * perfil administrador (acesso total + gestão de usuários).
 */

import type { EtapaId, EtapaImplantacao, Fluxo, Modalidade } from "@/types";

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
      "Dar o cheque na Manutenção (Encerrar / Medição / Orçar)",
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
  CHEQUE_MONITORAMENTO: "SUPERVISOR_MONITORAMENTO",
  COORDENACAO_AUDITORIA: "COORDENADOR",
  MEDICAO: "MEDICAO",
  ENCERRADOS: "MEDICAO", // etapa final (arquivo) — sem gate a executar
};

/** Dono da etapa — usado apenas para o rótulo "Esta etapa é do setor X". */
export function donoDaEtapa(etapa: string, _modalidade?: Modalidade): Perfil | undefined {
  return DONO_DA_ETAPA[etapa as EtapaImplantacao];
}

// ---------------------------------------------------------------------------
// Permissões dirigidas por dados (editáveis pelo Coordenador na tela Perfis)
// ---------------------------------------------------------------------------

/** Capacidades gerais (flags) de um perfil. */
export interface Capacidades {
  criarImplantacao: boolean;
  criarManutencao: boolean;
  editarCard: boolean;
  excluirCard: boolean;
  gerarRelatorio: boolean;
  gerenciarItens: boolean;
  gerenciarUsuarios: boolean;
}

/** Configuração editável de um perfil. */
export interface PerfilConfig {
  /** Etapas que o perfil executa (gates/avanço) e onde pode editar o card. */
  etapas: EtapaId[];
  capacidades: Capacidades;
  /** Lista descritiva de ações do perfil. */
  acoes: string[];
}

/** Todas as etapas das duas esteiras (MEDICAO/ENCERRADOS são compartilhadas). */
export const TODAS_ETAPAS: EtapaId[] = [
  "COMERCIAL", "COORDENACAO_APROVACAO", "ALMOXARIFADO", "SUPRIMENTOS", "MONITORAMENTO", "TECNICA", "CHEQUE_MONITORAMENTO", "COORDENACAO_AUDITORIA",
  "AGENDAMENTO", "ROTINA", "CHEQUE", "ORCAMENTO", "ORC_AGUARDANDO", "ORC_NAO_APROVADO", "ORC_APROVADO", "SEPARACAO", "COMPRA",
  "CLASSIFICACAO", "PEDIDO_FORNECEDOR", "ENTREGA", "PAGAMENTO", "TABELA_VALORES", "REVISAO_VALORES", "SOLICITACAO_COMPRA", "PEDIDO_COMPRA", "PC_ENVIADO",
  "MEDICAO", "ENCERRADOS",
];

const CAP_ZERO: Capacidades = {
  criarImplantacao: false, criarManutencao: false, editarCard: false, excluirCard: false,
  gerarRelatorio: false, gerenciarItens: false, gerenciarUsuarios: false,
};
function cap(p: Partial<Capacidades>): Capacidades {
  return { ...CAP_ZERO, ...p };
}

/** Configuração padrão = comportamento atual codificado como dados. */
export const CONFIG_PADRAO: Record<Perfil, PerfilConfig> = {
  COORDENADOR: { etapas: [...TODAS_ETAPAS], capacidades: cap({ criarImplantacao: true, criarManutencao: true, editarCard: true, excluirCard: true, gerarRelatorio: true, gerenciarItens: true, gerenciarUsuarios: true }), acoes: PERFIL_META.COORDENADOR.acoes },
  COMERCIAL: { etapas: ["COMERCIAL"], capacidades: cap({ criarImplantacao: true, criarManutencao: true, editarCard: true, excluirCard: true, gerenciarItens: true }), acoes: PERFIL_META.COMERCIAL.acoes },
  ASSISTENTE_1: { etapas: ["AGENDAMENTO", "ROTINA"], capacidades: cap({ criarManutencao: true, editarCard: true }), acoes: PERFIL_META.ASSISTENTE_1.acoes },
  ASSISTENTE_2: { etapas: ["ORCAMENTO", "ORC_AGUARDANDO", "ORC_NAO_APROVADO"], capacidades: cap({ editarCard: true }), acoes: PERFIL_META.ASSISTENTE_2.acoes },
  ALMOXARIFADO: { etapas: ["ALMOXARIFADO", "SEPARACAO"], capacidades: cap({}), acoes: PERFIL_META.ALMOXARIFADO.acoes },
  // Compras: o Coordenador só classifica (CLASSIFICACAO); o Suprimentos toca o resto.
  SUPRIMENTOS: { etapas: ["SUPRIMENTOS", "COMPRA", "PEDIDO_FORNECEDOR", "ENTREGA", "PAGAMENTO", "TABELA_VALORES", "REVISAO_VALORES", "SOLICITACAO_COMPRA", "PEDIDO_COMPRA", "PC_ENVIADO"], capacidades: cap({}), acoes: PERFIL_META.SUPRIMENTOS.acoes },
  SUPERVISOR_MONITORAMENTO: { etapas: ["MONITORAMENTO", "CHEQUE_MONITORAMENTO"], capacidades: cap({}), acoes: PERFIL_META.SUPERVISOR_MONITORAMENTO.acoes },
  SUPERVISOR_TECNICO: { etapas: ["TECNICA", "CHEQUE"], capacidades: cap({}), acoes: PERFIL_META.SUPERVISOR_TECNICO.acoes },
  MEDICAO: { etapas: ["MEDICAO", "ENCERRADOS"], capacidades: cap({ editarCard: true, gerarRelatorio: true }), acoes: PERFIL_META.MEDICAO.acoes },
  ADMINISTRATIVO: { etapas: [], capacidades: cap({ gerarRelatorio: true, gerenciarItens: true, gerenciarUsuarios: true }), acoes: PERFIL_META.ADMINISTRATIVO.acoes },
};

// Cache de configuração efetiva (defaults + overrides do banco/cliente). Cada
// ambiente (servidor/cliente) popula o seu via definirConfigPerfis().
let CONFIG_ATUAL: Record<Perfil, PerfilConfig> = CONFIG_PADRAO;

/** Aplica overrides sobre os padrões (parcial por perfil). */
export function definirConfigPerfis(overrides: Partial<Record<Perfil, PerfilConfig>>): void {
  const merged = {} as Record<Perfil, PerfilConfig>;
  for (const p of PERFIS) merged[p] = overrides[p] ?? CONFIG_PADRAO[p];
  CONFIG_ATUAL = merged;
}

export function obterConfigPerfis(): Record<Perfil, PerfilConfig> {
  return CONFIG_ATUAL;
}

export function configDoPerfil(perfil: Perfil): PerfilConfig {
  return CONFIG_ATUAL[perfil] ?? CONFIG_PADRAO[perfil];
}

/**
 * Executar o GATE de uma etapa (aprovar/checar/avançar). O Coordenador é
 * super-usuário; os demais conforme a configuração do perfil.
 */
export function podeExecutarEtapa(perfil: Perfil | undefined, etapa: string, _modalidade?: Modalidade): boolean {
  if (!perfil) return false;
  if (perfil === "COORDENADOR") return true;
  return configDoPerfil(perfil).etapas.includes(etapa as EtapaId);
}

/** Cadastrar novo card (por esteira). */
export function podeCriarCard(perfil: Perfil | undefined, fluxo?: Fluxo): boolean {
  if (!perfil) return false;
  if (perfil === "COORDENADOR") return true;
  // Compras: Suprimentos alimenta a esteira (importa/cadastra os orçamentos).
  if (fluxo === "COMPRAS") return perfil === "SUPRIMENTOS";
  const c = configDoPerfil(perfil).capacidades;
  if (fluxo === "MANUTENCAO") return c.criarManutencao;
  if (fluxo === "IMPLANTACAO") return c.criarImplantacao;
  return c.criarImplantacao || c.criarManutencao;
}

/** Editar os dados do card: precisa da capacidade e da etapa estar na sua lista. */
export function podeEditarCard(perfil: Perfil | undefined, etapa: string, _fluxo?: Fluxo): boolean {
  if (!perfil) return false;
  if (perfil === "COORDENADOR") return true;
  const cfg = configDoPerfil(perfil);
  return cfg.capacidades.editarCard && cfg.etapas.includes(etapa as EtapaId);
}

/** Excluir card: precisa da capacidade e da etapa estar na sua lista. */
export function podeExcluirCard(perfil: Perfil | undefined, etapa: string): boolean {
  if (!perfil) return false;
  if (perfil === "COORDENADOR") return true;
  const cfg = configDoPerfil(perfil);
  return cfg.capacidades.excluirCard && cfg.etapas.includes(etapa as EtapaId);
}

export function podeGerenciarUsuarios(perfil: Perfil | undefined): boolean {
  if (!perfil) return false;
  if (perfil === "COORDENADOR") return true;
  return configDoPerfil(perfil).capacidades.gerenciarUsuarios;
}

export function podeGerenciarItens(perfil: Perfil | undefined): boolean {
  if (!perfil) return false;
  if (perfil === "COORDENADOR") return true;
  return configDoPerfil(perfil).capacidades.gerenciarItens;
}

export function podeGerarRelatorio(perfil: Perfil | undefined): boolean {
  if (!perfil) return false;
  if (perfil === "COORDENADOR") return true;
  return configDoPerfil(perfil).capacidades.gerarRelatorio;
}

/** Editar a tela de Perfis: somente o Coordenador (fixo, evita lockout). */
export function podeGerenciarPerfis(perfil: Perfil | undefined): boolean {
  return perfil === "COORDENADOR";
}

/** Cadastro de técnicos: somente o Coordenador. */
export function podeGerenciarTecnicos(perfil: Perfil | undefined): boolean {
  return perfil === "COORDENADOR";
}
