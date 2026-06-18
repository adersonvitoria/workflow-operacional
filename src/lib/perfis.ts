/**
 * Perfis de usuário e suas permissões.
 *
 * Cada perfil é dono de etapas específicas do fluxo de Implantação e só pode
 * executar os gates (aprovações/ações) das suas etapas. ADMINISTRATIVO é o
 * perfil administrador (acesso total + gestão de usuários).
 */

import type { EtapaImplantacao } from "@/types";

export type Perfil =
  | "COORDENADOR"
  | "SUPERVISOR_TECNICO"
  | "SUPERVISOR_MONITORAMENTO"
  | "COMERCIAL"
  | "ADMINISTRATIVO"
  | "ALMOXARIFADO";

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
    descricao: "Confere o estoque físico (Venda) e aponta a lista do que falta.",
    etapas: ["SUPRIMENTOS"],
    acoes: [
      "Conferir estoque físico (modalidade Venda)",
      'Preencher a "lista do que falta"',
      "Liberar para Compras",
    ],
    classe: "bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:ring-purple-500/30",
    cor: "bg-purple-500",
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
  ADMINISTRATIVO: {
    rotulo: "Administrativo",
    descricao: "Realiza a medição/faturamento e administra os usuários do sistema.",
    etapas: ["MEDICAO"],
    acoes: [
      "Medir e faturar o cliente",
      "Gerir usuários e perfis (cadastro/edição)",
      "Acesso administrativo a todas as etapas",
    ],
    classe: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-500/30",
    cor: "bg-slate-700",
  },
};

export const PERFIS: Perfil[] = [
  "COORDENADOR",
  "COMERCIAL",
  "ALMOXARIFADO",
  "SUPERVISOR_MONITORAMENTO",
  "SUPERVISOR_TECNICO",
  "ADMINISTRATIVO",
];

/** Qual perfil é dono (executor) de cada etapa do gate. */
const DONO_DA_ETAPA: Record<EtapaImplantacao, Perfil> = {
  COMERCIAL: "COMERCIAL",
  COORDENACAO_APROVACAO: "COORDENADOR",
  SUPRIMENTOS: "ALMOXARIFADO",
  MONITORAMENTO: "SUPERVISOR_MONITORAMENTO",
  TECNICA: "SUPERVISOR_TECNICO",
  COORDENACAO_AUDITORIA: "COORDENADOR",
  MEDICAO: "ADMINISTRATIVO",
};

/** O ADMINISTRATIVO é admin: pode executar qualquer gate. */
export function podeExecutarEtapa(perfil: Perfil | undefined, etapa: string): boolean {
  if (!perfil) return false;
  if (perfil === "ADMINISTRATIVO") return true;
  return DONO_DA_ETAPA[etapa as EtapaImplantacao] === perfil;
}

export function donoDaEtapa(etapa: string): Perfil | undefined {
  return DONO_DA_ETAPA[etapa as EtapaImplantacao];
}

export function podeCriarCard(perfil: Perfil | undefined): boolean {
  return perfil === "COMERCIAL" || perfil === "ADMINISTRATIVO" || perfil === "COORDENADOR";
}

export function podeGerenciarUsuarios(perfil: Perfil | undefined): boolean {
  return perfil === "ADMINISTRATIVO" || perfil === "COORDENADOR";
}
