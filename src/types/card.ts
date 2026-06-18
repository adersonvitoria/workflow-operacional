/**
 * Modelos de dados centrais do Workflow Operacional.
 *
 * Vocabulário extraído das planilhas reais (COMERCIAL 2026, COMPRA DE MATERIAL,
 * TECNICA): CR (Centro de Resultado), CC (Centro de Custo), Conta Sigma,
 * Chamado/OS, SC (Solicitação de Compra), PC (Pedido de Compra).
 *
 * A regra de negócio do fluxo de Implantação está modelada de forma explícita
 * — a transição entre etapas é determinística e governada pelo motor em
 * `lib/routing.ts`. A UI nunca decide o próximo passo por conta própria.
 */

// ---------------------------------------------------------------------------
// Setores e fluxos
// ---------------------------------------------------------------------------

export type Setor =
  | "COMERCIAL"
  | "COORDENACAO"
  | "ALMOXARIFADO"
  | "COMPRAS"
  | "MONITORAMENTO"
  | "TECNICA"
  | "MEDICAO";

export type Fluxo = "IMPLANTACAO" | "MANUTENCAO";

/** Modalidade — define a bifurcação de suprimentos. Obrigatória na Implantação. */
export type Modalidade = "LOCACAO" | "VENDA";

/**
 * Etapas do Fluxo de Implantação (ordem canônica).
 * Observe que COORDENACAO aparece em dois momentos: aprovação inicial e
 * auditoria final — por isso são duas etapas distintas.
 */
export type EtapaImplantacao =
  | "COMERCIAL" // 1. Start: cadastro + modalidade
  | "COORDENACAO_APROVACAO" // 2. Aprovação inicial do escopo
  | "ALMOXARIFADO" // 3. (só VENDA) confere item a item: em estoque x faltante
  | "SUPRIMENTOS" // 4. Compra os faltantes (Venda) / 100% dos itens (Locação)
  | "MONITORAMENTO" // 5. Cria conta no software central + dados de conexão
  | "TECNICA" // 6. Execução da instalação e teste de conexão
  | "COORDENACAO_AUDITORIA" // 7. OK de qualidade / checklist de obra
  | "MEDICAO"; // 8. Faturamento

/** Etapas do Fluxo de Manutenção (serviços extras / orçamentos). */
export type EtapaManutencao =
  | "APONTAMENTO"
  | "ORCAMENTACAO"
  | "APROVACAO_CLIENTE"
  | "COMPRAS_ALMOX"
  | "EXECUCAO"
  | "MEDICAO";

export type EtapaId = EtapaImplantacao | EtapaManutencao;

// ---------------------------------------------------------------------------
// Status semânticos (governam a cor das tags de status)
// ---------------------------------------------------------------------------

export type CardStatus =
  | "EM_ANDAMENTO" // azul/slate — fluindo normalmente
  | "AGUARDANDO_APROVACAO" // âmbar      — parado num gate de Coordenação
  | "CONCLUIDO" // esmeralda  — fluxo concluído
  | "FINALIZADO" // verde      — medição registrada / faturado
  | "TRAVADO"; // rosa       — problema / bloqueado

export type Prioridade = "BAIXA" | "NORMAL" | "ALTA" | "URGENTE";

export type Natureza = "INVESTIMENTO" | "DESPESA" | "ESTOQUE";
export type FormaPagamento = "A_VISTA" | "PARCELADO" | "BOLETO" | "PIX";

// ---------------------------------------------------------------------------
// Sub-entidades
// ---------------------------------------------------------------------------

export interface Cliente {
  nome: string;
  documento?: string; // CNPJ ou CPF
  contato?: string;
  endereco?: string;
}

export interface Valores {
  maoDeObra?: number; // VALOR DE M.O
  equipamentos?: number; // VALOR DE EQUIPAMENTOS
  total?: number; // VALOR TOTAL
  mensal?: number; // MENSAL (recorrência de monitoramento)
}

export type StatusMaterial =
  | "PENDENTE"
  | "EM_COMPRAS"
  | "SEPARADO"
  | "RETIRADO"
  | "UTILIZADO";

export interface ItemMaterial {
  id: string;
  descricao: string;
  quantidade: number;
  natureza: Natureza;
  statusAlmox: StatusMaterial;
  precoUnitario?: number; // preço do catálogo no momento da seleção
  alocacao?: string; // preenchido pela Coordenação (obrigatório p/ aprovar)
  cr?: string; // CR do item, preenchido pela Coordenação (obrigatório)
  fornecedor?: string;
  sc?: string; // nº Solicitação de Compra
  pc?: string; // nº Pedido de Compra
}

/** Registro de uma aprovação/auditoria da Coordenação (gate do fluxo). */
export interface Aprovacao {
  aprovado: boolean;
  por?: string; // coordenador responsável
  em?: string; // ISO 8601
  observacao?: string;
}

/**
 * Dados da etapa de Almoxarifado (somente VENDA).
 * O operador verifica o estoque físico e descreve manualmente o que falta —
 * esse texto livre vira a base do pedido de Compras.
 */
export interface DadosAlmoxarifado {
  verificado: boolean;
  temTudoEmEstoque: boolean; // se true, "listaDoQueFalta" pode ficar vazia
  listaDoQueFalta: string; // campo de texto livre obrigatório p/ avançar
  verificadoPor?: string;
  verificadoEm?: string; // ISO 8601
}

export interface ItemChecklist {
  id: string;
  etapa: EtapaId;
  rotulo: string;
  concluido: boolean;
  obrigatorio: boolean;
}

export interface EventoHistorico {
  id: string;
  data: string; // ISO 8601
  setor: Setor;
  autor: string;
  acao: string;
  de?: EtapaId;
  para?: EtapaId;
}

/** Dados de Medição/Faturamento (preenchidos pelo setor de Medição). */
export interface DadosMedicao {
  numeroImplantar?: string;
  competencia?: string; // ex.: "06/2026" ou "JUNHO/2026"
  valorMedicao?: number;
  chamado?: string;
  dataAbertura?: string; // ISO 8601
  formaPagamento?: FormaPagamento;
  parcelas?: number;
  finalizadoEm?: string; // ISO 8601
  finalizadoPor?: string;
}

/**
 * Dados do Monitoramento + sincronização com o Sigma Cloud (integração futura).
 * O setor de Monitoramento cria a conta no software central e gera os dados
 * de conexão antes do card descer para a Técnica.
 */
export interface SigmaSync {
  contaCriada: boolean;
  contaSigma?: string; // nº da conta gerada
  dadosConexao?: string; // IP, portas, serial — texto livre por enquanto
  ultimaSincronizacao?: string;
  statusSync?: "PENDENTE" | "SINCRONIZADO" | "ERRO";
}

// ---------------------------------------------------------------------------
// Entidade principal: Card (Ordem de Trabalho)
// ---------------------------------------------------------------------------

export interface Card {
  id: string;
  codigo: string;

  // Discriminadores de fluxo
  fluxo: Fluxo;
  etapa: EtapaId;
  status: CardStatus;
  prioridade: Prioridade;

  // Identificação
  cliente: Cliente;
  cr?: string;
  cc?: string;
  chamado?: string;
  numeroOrcamento?: string;

  /** Bifurcação de suprimentos. Obrigatória quando fluxo === "IMPLANTACAO". */
  modalidade?: Modalidade;
  natureza?: Natureza;
  valores: Valores;
  pagamento?: { forma: FormaPagamento; parcelas?: number };

  // Gates da Coordenação (à prova de erros)
  aprovacaoInicial?: Aprovacao;
  auditoriaFinal?: Aprovacao;
  medicao?: DadosMedicao;

  // Etapa de Almoxarifado (só VENDA)
  almoxarifado?: DadosAlmoxarifado;

  // Responsabilidade e prazos
  responsavelAtual?: { setor: Setor; pessoa?: string };
  datas: {
    abertura: string;
    aprovacao?: string;
    previsaoInstalacao?: string;
    conclusao?: string;
  };

  // Esteira de produção
  materiais: ItemMaterial[];
  checklist: ItemChecklist[];
  historico: EventoHistorico[];

  sigma?: SigmaSync;
  observacoes?: string;
}

/** Resumo enxuto usado para renderizar os cards no board. */
export type CardResumo = Pick<
  Card,
  | "id"
  | "codigo"
  | "fluxo"
  | "etapa"
  | "status"
  | "prioridade"
  | "cliente"
  | "cr"
  | "modalidade"
  | "valores"
  | "responsavelAtual"
>;
