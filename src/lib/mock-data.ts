import type { Card, EtapaId, Fluxo } from "@/types";

/**
 * Seed inicial (adaptado das planilhas reais). Em produção virá da API; aqui
 * popula o store e persiste no localStorage. São objetos `Card` completos.
 */

function checklistPadrao(fluxo: Fluxo, etapa: EtapaId) {
  if (fluxo !== "IMPLANTACAO") {
    return [
      { id: "ck1", etapa, rotulo: "Serviço executado", concluido: false, obrigatorio: true },
    ];
  }
  return [
    { id: "ck-tec-1", etapa: "TECNICA" as EtapaId, rotulo: "Instalação executada", concluido: false, obrigatorio: true },
    { id: "ck-tec-2", etapa: "TECNICA" as EtapaId, rotulo: "Conexão testada", concluido: false, obrigatorio: true },
  ];
}

/** Completa um card "resumido" com os campos obrigatórios do modelo. */
function full(base: Partial<Card> & Pick<Card, "id" | "codigo" | "fluxo" | "etapa" | "status" | "prioridade" | "cliente" | "valores">): Card {
  return {
    datas: { abertura: "2026-01-06" },
    materiais: [],
    checklist: checklistPadrao(base.fluxo, base.etapa),
    historico: [
      { id: `${base.id}-h0`, data: "2026-01-06T09:00:00", setor: "COMERCIAL", autor: base.responsavelAtual?.pessoa ?? "Comercial", acao: "Card criado", para: base.etapa },
    ],
    ...base,
  };
}

/** Detalhe completo: card de VENDA atualmente na Técnica (com gates resolvidos). */
const DETALHE: Card = {
  id: "imp-5",
  codigo: "25",
  fluxo: "IMPLANTACAO",
  etapa: "TECNICA",
  status: "EM_ANDAMENTO",
  prioridade: "URGENTE",
  cliente: { nome: "COND. ED. ESCORIAL", documento: "02.778.279/0001-64", contato: "Marisa (51) 9.8456-8797", endereco: "Rua Barão de Ubá, Porto Alegre/RS" },
  cr: "56007",
  cc: "41201001",
  chamado: "11266",
  modalidade: "VENDA",
  natureza: "INVESTIMENTO",
  valores: { maoDeObra: 4219.5, equipamentos: 16780.5, total: 21000, mensal: 500 },
  pagamento: { forma: "PARCELADO", parcelas: 3 },
  responsavelAtual: { setor: "TECNICA", pessoa: "Jessi Diemes" },
  datas: { abertura: "2026-01-06", aprovacao: "2026-01-08", previsaoInstalacao: "2026-01-20" },
  aprovacaoInicial: { aprovado: true, por: "Coordenação", em: "2026-01-08T11:00:00", observacao: "Escopo OK." },
  almoxarifado: { verificado: true, temTudoEmEstoque: false, listaDoQueFalta: "4x Sensor de quebra de vidro; 1x Fonte 12V 3A", verificadoPor: "Murilo Souza", verificadoEm: "2026-01-10T09:30:00" },
  materiais: [
    { id: "m1", descricao: "CENTRAL VIA WEB 16z", quantidade: 1, natureza: "INVESTIMENTO", statusAlmox: "SEPARADO", fornecedor: "TECLINE", sc: "004787", pc: "057214" },
    { id: "m2", descricao: "TECLADO PLUS 128 LCD", quantidade: 7, natureza: "INVESTIMENTO", statusAlmox: "SEPARADO", fornecedor: "TECLINE" },
    { id: "m3", descricao: "SENSOR DE QUEBRA DE VIDRO", quantidade: 4, natureza: "INVESTIMENTO", statusAlmox: "RETIRADO", fornecedor: "MERCOSAT" },
  ],
  checklist: [
    { id: "c1", etapa: "COMERCIAL", rotulo: "Contrato assinado", concluido: true, obrigatorio: true },
    { id: "c2", etapa: "SUPRIMENTOS", rotulo: "Estoque conferido + compras OK", concluido: true, obrigatorio: true },
    { id: "c3", etapa: "MONITORAMENTO", rotulo: "Conta criada no Sigma", concluido: true, obrigatorio: true },
    { id: "c4", etapa: "TECNICA", rotulo: "Instalação executada", concluido: true, obrigatorio: true },
    { id: "c5", etapa: "TECNICA", rotulo: "Conexão testada + fotos anexadas", concluido: false, obrigatorio: true },
  ],
  historico: [
    { id: "h1", data: "2026-01-06T09:12:00", setor: "COMERCIAL", autor: "Daniela Zimiani", acao: "Projeto cadastrado (Venda)", para: "COMERCIAL" },
    { id: "h2", data: "2026-01-08T11:00:00", setor: "COORDENACAO", autor: "Coordenação", acao: "Aprovação inicial concedida", de: "COMERCIAL", para: "COORDENACAO_APROVACAO" },
    { id: "h3", data: "2026-01-10T09:30:00", setor: "ALMOXARIFADO", autor: "Murilo Souza", acao: "Estoque conferido + lista do que falta", de: "COORDENACAO_APROVACAO", para: "SUPRIMENTOS" },
    { id: "h4", data: "2026-01-12T16:40:00", setor: "MONITORAMENTO", autor: "Felipe Saldanha", acao: "Conta Sigma 7800 criada", de: "SUPRIMENTOS", para: "MONITORAMENTO" },
    { id: "h5", data: "2026-01-13T08:20:00", setor: "TECNICA", autor: "Jessi Diemes", acao: "Recebido para execução", de: "MONITORAMENTO", para: "TECNICA" },
  ],
  sigma: { contaCriada: true, contaSigma: "7800", dadosConexao: "IP 192.168.0.108 · TCP 37777 · HTTP 8085", statusSync: "SINCRONIZADO", ultimaSincronizacao: "2026-01-12T16:40:00" },
  observacoes: "Cliente solicitou instalação em horário comercial. Acesso pela portaria.",
};

export const SEED_CARDS: Card[] = [
  full({ id: "imp-1", codigo: "1", fluxo: "IMPLANTACAO", etapa: "COMERCIAL", status: "EM_ANDAMENTO", prioridade: "NORMAL", cliente: { nome: "ELEAGA PARTICIPAÇÕES LTDA" }, modalidade: "VENDA", valores: { total: 7800, mensal: 250 }, responsavelAtual: { setor: "COMERCIAL", pessoa: "Daniela Zimiani" } }),
  full({ id: "imp-2", codigo: "2", fluxo: "IMPLANTACAO", etapa: "COORDENACAO_APROVACAO", status: "AGUARDANDO_APROVACAO", prioridade: "ALTA", cliente: { nome: "CAR HOUSE VEÍCULOS LTDA" }, cr: "76319", modalidade: "LOCACAO", valores: { total: 8098.5, mensal: 250 }, responsavelAtual: { setor: "COORDENACAO", pessoa: "Coordenação" } }),
  full({ id: "imp-3", codigo: "3", fluxo: "IMPLANTACAO", etapa: "SUPRIMENTOS", status: "EM_ANDAMENTO", prioridade: "NORMAL", cliente: { nome: "VOLNEI FLORES" }, cr: "32643", modalidade: "VENDA", valores: { total: 5400, mensal: 300 }, responsavelAtual: { setor: "ALMOXARIFADO", pessoa: "Murilo Souza" } }),
  full({ id: "imp-4", codigo: "6", fluxo: "IMPLANTACAO", etapa: "MONITORAMENTO", status: "EM_ANDAMENTO", prioridade: "ALTA", cliente: { nome: "BAR OCIDENTE LTDA" }, cr: "91940", modalidade: "LOCACAO", valores: { total: 1040.32, mensal: 220 }, responsavelAtual: { setor: "MONITORAMENTO", pessoa: "Felipe Saldanha" } }),
  DETALHE,
  full({ id: "imp-6", codigo: "32", fluxo: "IMPLANTACAO", etapa: "COORDENACAO_AUDITORIA", status: "AGUARDANDO_APROVACAO", prioridade: "NORMAL", cliente: { nome: "DENISE MARIA ZANCANARO" }, cr: "56007", modalidade: "VENDA", valores: { total: 7339.2, mensal: 280 }, responsavelAtual: { setor: "COORDENACAO", pessoa: "Coordenação" } }),
  full({ id: "imp-7", codigo: "31", fluxo: "IMPLANTACAO", etapa: "MEDICAO", status: "CONCLUIDO", prioridade: "NORMAL", cliente: { nome: "ED. DOMINGO" }, cr: "56007", modalidade: "LOCACAO", valores: { total: 22015, mensal: 600 }, responsavelAtual: { setor: "MEDICAO", pessoa: "Samya Cruz" } }),

  full({ id: "man-1", codigo: "OS-11269", fluxo: "MANUTENCAO", etapa: "CHEQUE", status: "EM_ANDAMENTO", prioridade: "NORMAL", cliente: { nome: "DIAMANTINO DUARTE FERNANDES" }, cr: "32643", valores: { total: 260 }, responsavelAtual: { setor: "SUPERVISAO", pessoa: "Daniel Chagas" } }),
  full({ id: "man-2", codigo: "ORÇ-261", fluxo: "MANUTENCAO", etapa: "ORCAMENTO", status: "EM_ANDAMENTO", prioridade: "NORMAL", cliente: { nome: "FIX IT" }, cr: "8133", valores: { total: 639 }, responsavelAtual: { setor: "ADMINISTRATIVO", pessoa: "Eduardo Menezes" } }),
  full({ id: "man-3", codigo: "ORÇ-224", fluxo: "MANUTENCAO", etapa: "ORC_AGUARDANDO", status: "AGUARDANDO_APROVACAO", prioridade: "NORMAL", cliente: { nome: "MARCIA SCARPARO" }, cr: "7500", valores: { total: 978 }, responsavelAtual: { setor: "ADMINISTRATIVO", pessoa: "Aline Guedes" } }),
  full({ id: "man-4", codigo: "OS-9201", fluxo: "MANUTENCAO", etapa: "EXECUCAO", status: "EM_ANDAMENTO", prioridade: "URGENTE", cliente: { nome: "HIGIEFARM" }, cr: "9201", valores: { total: 320 }, responsavelAtual: { setor: "TECNICA", pessoa: "Maurício Fuculo" } }),
  full({ id: "man-5", codigo: "OS-7066", fluxo: "MANUTENCAO", etapa: "MEDICAO", status: "CONCLUIDO", prioridade: "NORMAL", cliente: { nome: "MONTASUL" }, cr: "31453", valores: { total: 162 }, responsavelAtual: { setor: "MEDICAO", pessoa: "Samya Cruz" } }),
];
