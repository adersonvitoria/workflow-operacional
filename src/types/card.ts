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
  | "ADMINISTRATIVO" // Manutenção: lança rotina (Adm 1) e gera orçamento (Adm 2)
  | "SUPERVISAO" // Manutenção: dá o "cheque" em cada OS
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

/**
 * Etapas do Fluxo de Manutenção (ordem canônica do board).
 *
 * O gate é o CHEQUE: a Supervisão classifica cada OS em uma de três saídas —
 * ENCERRADOS (OK, sem serviço extra), MEDICAO (RQ, pequeno reparo já feito no
 * ato) ou ORCAMENTO (reparo maior, vai orçar). O orçamento, depois de enviado
 * ao cliente, fica explícito em três colunas (aguardando/não aprovado/aprovado)
 * para dar visão de distribuição. ORC_APROVADO libera SEPARACAO ⇄ COMPRA e,
 * com o material pronto, EXECUCAO → MEDICAO.
 */
export type EtapaManutencao =
  | "ROTINA" // 1. Administrativo 1 lança todas as OS do dia
  | "CHEQUE" // 2. Supervisão confere cada OS (gate de 3 saídas)
  | "ORCAMENTO" // 3. Administrativo 2 gera o orçamento e envia ao cliente
  | "ORC_AGUARDANDO" // 4. Aguardando retorno do cliente
  | "ORC_NAO_APROVADO" // 5. Cliente reprovou (arquiva)
  | "ORC_APROVADO" // 6. Cliente aprovou — libera a execução
  | "SEPARACAO" // 7. Almoxarifado separa os itens
  | "COMPRA" // 8. Suprimentos compra os faltantes e devolve ao Almox.
  | "EXECUCAO" // 9. Técnica executa o serviço
  | "MEDICAO" // 10. Faturamento + relatório (também recebe a RQ do Cheque)
  | "ENCERRADOS"; // 11. OS de rotina encerrada no Cheque (OK)

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
export type FormaPagamento = "A_VISTA" | "PARCELADO";

/** Turno da visita (Manutenção). */
export type Turno = "MANHA" | "TARDE" | "DIA";

/** Dados específicos de uma entrada de Manutenção. */
export interface DadosManutencao {
  visitaCobrada?: boolean;
  turno?: Turno;
  numeroConta?: string;
  regiao?: string;
  ordemServico?: boolean;
  tecnico?: string;
  auxiliarTecnico?: string;
  tipoAtendimento?: string;
  setor?: string;
  agendado?: boolean;
}

// ---------------------------------------------------------------------------
// Sub-entidades
// ---------------------------------------------------------------------------

/** Tipo de cliente — define a criticidade do atendimento. */
export type TipoCliente = "CORPORATIVO" | "COMERCIAL" | "VAREJO";

/** Criticidade derivada do tipo de cliente. */
export type Criticidade = "ALTA" | "MEDIA" | "BAIXA";

export interface Cliente {
  nome: string;
  documento?: string; // CNPJ ou CPF
  contato?: string;
  endereco?: string;
  tipo?: TipoCliente; // Corporativo=Alta · Comercial=Média · Varejo=Baixa
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
  manutencao?: DadosManutencao;
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
