/**
 * Motor de roteamento do Fluxo de Implantação — a "fonte da verdade".
 *
 * Toda transição passa por aqui. A UI (drag-and-drop ou botão "Avançar") apenas
 * consulta `proximaEtapa` e `podeAvancar`; nunca decide o caminho. Isso torna o
 * fluxo determinístico e à prova de erros:
 *
 *   COMERCIAL
 *     → COORDENACAO_APROVACAO              (precisa de aprovação)
 *       → SUPRIMENTOS                      (bifurcação por modalidade)
 *           · VENDA: Almoxarifado confere estoque + "lista do que falta"
 *           · LOCAÇÃO: vai direto à fila de Compras (100% dos itens)
 *         → MONITORAMENTO                  (cria conta no software central)
 *           → TECNICA                      (executa, testa conexão, conclui)
 *             → COORDENACAO_AUDITORIA       (OK de qualidade)
 *               → MEDICAO                  (faturamento)
 */

import type { Card, EtapaCompras, EtapaImplantacao, EtapaManutencao, Modalidade } from "@/types";

/** Itens obrigatórios do checklist da etapa Técnica · Execução. */
export const CHECKLIST_TECNICA: { id: string; rotulo: string }[] = [
  { id: "tec-conclusao", rotulo: "Conclusão do projeto" },
  { id: "tec-comunicando", rotulo: "Sistema comunicando" },
];

/** Flags obrigatórios da etapa Cheque · Monitoramento (Implantação). */
export const CHECKLIST_CHEQUE_MONITORAMENTO: { id: string; rotulo: string }[] = [
  { id: "cm-usuarios-senhas", rotulo: "Revisados usuários e senhas" },
  { id: "cm-setorizacao", rotulo: "Revisados setorização" },
  { id: "cm-localizacao", rotulo: "Localização dos equipamentos" },
  { id: "cm-senha-conexao", rotulo: "Senha de conexão" },
  { id: "cm-vias-comunicacao", rotulo: "Vias de comunicação" },
];

/**
 * Ordem visual das colunas no board de Implantação. ALMOXARIFADO e SUPRIMENTOS
 * saíram do board: a fase de material roda na esteira de COMPRAS (o cheque da
 * Coordenação envia o card para lá; a Entrega devolve ao Monitoramento).
 */
export const ORDEM_IMPLANTACAO: EtapaImplantacao[] = [
  "COMERCIAL",
  "COORDENACAO_APROVACAO",
  "MONITORAMENTO",
  "TECNICA",
  "CHEQUE_MONITORAMENTO",
  "COORDENACAO_AUDITORIA",
  "MEDICAO",
  "ENCERRADOS",
];

/** True se mover de `de` para `para` é um retrocesso (raia anterior) na Implantação. */
export function ehRetrocessoImplantacao(de: EtapaImplantacao, para: EtapaImplantacao): boolean {
  const a = ORDEM_IMPLANTACAO.indexOf(de);
  const b = ORDEM_IMPLANTACAO.indexOf(para);
  return a >= 0 && b >= 0 && b < a;
}

/** Etapa imediatamente anterior na ordem do board de Implantação (ou null). */
export function etapaAnteriorImplantacao(etapa: EtapaImplantacao): EtapaImplantacao | null {
  const i = ORDEM_IMPLANTACAO.indexOf(etapa);
  return i > 0 ? ORDEM_IMPLANTACAO[i - 1] : null;
}

/**
 * Próxima etapa segundo a regra de negócio. Bifurcação após a aprovação:
 * VENDA passa pelo Almoxarifado (conferência de estoque); LOCAÇÃO vai direto
 * para Suprimentos.
 */
export function proximaEtapa(
  etapa: EtapaImplantacao,
  modalidade: Modalidade | undefined,
  conferencia = false,
  tudoEmEstoque = false,
): EtapaImplantacao | null {
  switch (etapa) {
    case "COMERCIAL":
      return "COORDENACAO_APROVACAO";
    case "COORDENACAO_APROVACAO":
      // O cheque da Coordenação envia o card à esteira de COMPRAS (endpoint
      // /enviar-compras); ao concluir a Entrega lá, ele volta ao Monitoramento.
      return null;
    case "ALMOXARIFADO": // legado (coluna extinta — material roda em Compras)
      return conferencia || tudoEmEstoque ? "MONITORAMENTO" : "SUPRIMENTOS";
    case "SUPRIMENTOS": // legado (coluna extinta)
      return "ALMOXARIFADO";
    case "MONITORAMENTO":
      return "TECNICA";
    case "TECNICA":
      return "CHEQUE_MONITORAMENTO";
    case "CHEQUE_MONITORAMENTO":
      return "COORDENACAO_AUDITORIA";
    case "COORDENACAO_AUDITORIA":
      return "MEDICAO";
    case "MEDICAO":
      // Após registrar o faturamento, Medição/Coordenação movem para Encerrados.
      return "ENCERRADOS";
    case "ENCERRADOS":
      return null;
  }
}

export interface ResultadoTransicao {
  ok: boolean;
  motivo?: string; // por que NÃO pode avançar (pronto para a UI)
  proxima?: EtapaImplantacao | EtapaManutencao | EtapaCompras | null;
}

/**
 * Valida os "gates" antes de liberar o avanço. A bifurcação Locação/Venda é
 * aplicada dentro de SUPRIMENTOS: a Venda exige a conferência do Almoxarifado.
 */
export function podeAvancar(card: Card): ResultadoTransicao {
  if (card.fluxo !== "IMPLANTACAO") {
    return { ok: false, motivo: "Roteamento de implantação não se aplica." };
  }
  const etapa = card.etapa as EtapaImplantacao;

  switch (etapa) {
    case "COMERCIAL":
      if (!card.modalidade) {
        return { ok: false, motivo: "Defina a modalidade (Locação ou Venda)." };
      }
      if (!card.valores.total && !card.valores.mensal) {
        return { ok: false, motivo: "Informe os valores do projeto." };
      }
      break;

    case "COORDENACAO_APROVACAO":
      // O cheque da Coordenação move o card para a esteira de Compras
      // (botão dedicado no painel — endpoint /enviar-compras).
      return { ok: false, motivo: "O cheque da Coordenação envia o card para a esteira de Compras.", proxima: null };

    case "ALMOXARIFADO":
      // Só Venda chega aqui. O Almoxarifado precisa conferir todos os itens
      // (cada um marcado como em estoque ou faltante).
      if (card.materiais.some((m) => m.statusAlmox === "PENDENTE")) {
        return { ok: false, motivo: "Confira cada item: em estoque ou faltante." };
      }
      break;

    case "SUPRIMENTOS":
      // Os faltantes precisam ter sido adquiridos (nada PENDENTE/EM_COMPRAS).
      if (card.materiais.some((m) => m.statusAlmox === "PENDENTE" || m.statusAlmox === "EM_COMPRAS")) {
        return { ok: false, motivo: "Há itens faltantes a adquirir." };
      }
      break;

    case "MONITORAMENTO":
      if (!card.sigma?.contaCriada) {
        return { ok: false, motivo: "Monitoramento precisa criar a conta no software central." };
      }
      break;

    case "TECNICA":
      // Período de execução alimenta o calendário — obrigatório antes de seguir.
      if (!card.dataInicioExecucao || !card.dataFimExecucao) {
        return { ok: false, motivo: "Informe as datas de início e fim da execução (calendário)." };
      }
      // a Técnica não encerra: precisa concluir o checklist da execução
      if (!CHECKLIST_TECNICA.every((it) => card.checklist.some((c) => c.id === it.id && c.concluido))) {
        return { ok: false, motivo: "Conclua o checklist da Técnica (conclusão do projeto e sistema comunicando)." };
      }
      break;

    case "CHEQUE_MONITORAMENTO":
      // Monitoramento precisa revisar os 5 itens antes da auditoria.
      if (!CHECKLIST_CHEQUE_MONITORAMENTO.every((it) => card.checklist.some((c) => c.id === it.id && c.concluido))) {
        return { ok: false, motivo: "Conclua os 5 itens do Cheque · Monitoramento antes de avançar." };
      }
      break;

    case "COORDENACAO_AUDITORIA":
      if (!card.auditoriaFinal?.aprovado) {
        return { ok: false, motivo: "Aguardando OK de qualidade da Coordenação." };
      }
      break;

    case "MEDICAO":
      // Só dá para encerrar depois que a Medição registrou o faturamento.
      if (!(card.status === "FINALIZADO" || card.medicao?.finalizadoEm)) {
        return { ok: false, motivo: "Registre o faturamento antes de encerrar.", proxima: "ENCERRADOS" };
      }
      break;

    case "ENCERRADOS":
      return { ok: false, motivo: "Projeto encerrado.", proxima: null };
  }

  // "Tudo em estoque": nenhum item faltante (EM_COMPRAS) nem pendente. No
  // Almoxarifado, isso libera o atalho direto para o Monitoramento.
  const tudoEmEstoque = !card.materiais.some((m) => m.statusAlmox === "EM_COMPRAS" || m.statusAlmox === "PENDENTE");
  return { ok: true, proxima: proximaEtapa(etapa, card.modalidade, card.conferenciaSuprimentos, tudoEmEstoque) };
}

/**
 * Para o drag-and-drop: dado um card e a coluna de destino, diz se o movimento
 * é válido. Só permite avançar 1 etapa por vez.
 */
export function movimentoValido(card: Card, destino: EtapaImplantacao): ResultadoTransicao {
  const r = podeAvancar(card);
  if (!r.ok) return r;
  if (r.proxima !== destino) {
    return {
      ok: false,
      motivo: `A próxima etapa válida é "${rotuloEtapa(r.proxima)}", não "${rotuloEtapa(destino)}".`,
    };
  }
  return r;
}

// ---------------------------------------------------------------------------
// Fluxo de Manutenção — gate do Cheque e laço Separação ⇄ Suprimentos
// ---------------------------------------------------------------------------

/**
 * Transições permitidas na Manutenção. O AGENDAMENTO alimenta a ROTINA; o CHEQUE
 * é o gate de 3 saídas.
 *
 * Regras de negócio:
 * - AGENDAMENTO → ROTINA (entra na rotina do dia).
 * - ORC_NAO_APROVADO volta para ORCAMENTO (renegociar).
 * - ORC_APROVADO envia o card para a esteira de COMPRAS (coluna Separação),
 *   via endpoint /enviar-compras. Sem destinos de drag a partir daqui.
 * - MEDICAO, depois de faturar, arquiva em ENCERRADOS.
 * - ENCERRADOS é a única etapa final.
 */
export const TRANSICOES_MANUTENCAO: Record<EtapaManutencao, EtapaManutencao[]> = {
  AGENDAMENTO: ["ROTINA"],
  ROTINA: ["CHEQUE"],
  CHEQUE: ["ENCERRADOS", "MEDICAO", "ORCAMENTO"],
  ORCAMENTO: ["ORC_AGUARDANDO"],
  ORC_AGUARDANDO: ["ORC_NAO_APROVADO", "ORC_APROVADO"],
  ORC_NAO_APROVADO: ["ORCAMENTO"], // renegociar
  ORC_APROVADO: [],
  MEDICAO: ["ENCERRADOS"], // após faturar
  ENCERRADOS: [],
};

/** Destinos válidos a partir da etapa atual de um card de manutenção. */
export function destinosManutencao(etapa: EtapaManutencao): EtapaManutencao[] {
  return TRANSICOES_MANUTENCAO[etapa] ?? [];
}

/**
 * Destinos válidos de um card de manutenção. Os orçamentos complementares seguem
 * exatamente o mesmo fluxo dos cards comuns (a tag "Complementar" é só para
 * identificação, não altera o roteamento). Cards do tipo "Visita" não passam
 * pelo caminho de orçamento: no Cheque vão direto para Medição ou Encerrados.
 */
export function destinosManutencaoCard(
  card: Pick<Card, "etapa" | "complementar" | "manutencao">,
): EtapaManutencao[] {
  const etapa = card.etapa as EtapaManutencao;
  if (etapa === "CHEQUE" && card.manutencao?.tipo === "VISITA") return ["ENCERRADOS", "MEDICAO"];
  return destinosManutencao(etapa);
}

/** Ordem das raias da Manutenção (esquerda → direita), para detectar retrocesso. */
export const ORDEM_MANUTENCAO: EtapaManutencao[] = [
  "AGENDAMENTO", "ROTINA", "CHEQUE", "ORCAMENTO", "ORC_AGUARDANDO", "ORC_NAO_APROVADO", "ORC_APROVADO",
  "MEDICAO", "ENCERRADOS",
];

/** True se mover de `de` para `para` é um retrocesso (raia anterior). */
export function ehRetrocessoManutencao(de: EtapaManutencao, para: EtapaManutencao): boolean {
  const a = ORDEM_MANUTENCAO.indexOf(de);
  const b = ORDEM_MANUTENCAO.indexOf(para);
  return a >= 0 && b >= 0 && b < a;
}

/** Etapa imediatamente anterior na ordem das raias (ou null se for a primeira). */
export function etapaAnteriorManutencao(etapa: EtapaManutencao): EtapaManutencao | null {
  const i = ORDEM_MANUTENCAO.indexOf(etapa);
  return i > 0 ? ORDEM_MANUTENCAO[i - 1] : null;
}

/**
 * Valida o drag-and-drop na Manutenção: o destino precisa ser uma das saídas
 * permitidas da etapa atual. A escolha (ex.: OK/RQ/Orçar no Cheque) é feita
 * arrastando o card para a coluna desejada.
 */
export function movimentoValidoManutencao(card: Card, destino: EtapaManutencao, retroceder = false): ResultadoTransicao {
  if (card.fluxo !== "MANUTENCAO") {
    return { ok: false, motivo: "Roteamento de manutenção não se aplica." };
  }
  const atual = card.etapa as EtapaManutencao;
  if (destino === atual) return { ok: true, proxima: destino };
  // O Coordenador pode retroceder o card para qualquer raia anterior.
  if (retroceder && ehRetrocessoManutencao(atual, destino)) return { ok: true, proxima: destino };
  const permitidos = destinosManutencaoCard(card);
  if (permitidos.includes(destino)) return { ok: true, proxima: destino };
  if (permitidos.length === 0) {
    return { ok: false, motivo: `"${rotuloEtapa(atual)}" é uma etapa final.` };
  }
  const lista = permitidos.map((e) => `"${rotuloEtapa(e)}"`).join(", ");
  return { ok: false, motivo: `De "${rotuloEtapa(atual)}" só dá para mover para: ${lista}.` };
}

// ---------------------------------------------------------------------------
// Fluxo de Compras — linear; da Tabela de Valores em diante é interno (outro portal)
// ---------------------------------------------------------------------------

/**
 * Transições da esteira de Compras (um card por orçamento, itens dentro).
 * Fluxo linear: Separação (Almoxarifado) → Classificação (Coordenador) →
 * Pedido ao Fornecedor → Tabela de Valores → Revisão → SC → Pedido de Compra →
 * PC enviado → Entrega (final). Concluída a Entrega, a OS volta à Manutenção
 * (Agendamento) via endpoint /enviar-manutencao. O Coordenador pode retroceder
 * para qualquer coluna anterior.
 */
export const TRANSICOES_COMPRAS: Record<EtapaCompras, EtapaCompras[]> = {
  SEPARACAO: ["CLASSIFICACAO"],
  CLASSIFICACAO: ["PEDIDO_FORNECEDOR"],
  PEDIDO_FORNECEDOR: ["TABELA_VALORES"],
  TABELA_VALORES: ["REVISAO_VALORES"],
  REVISAO_VALORES: ["SOLICITACAO_COMPRA"],
  SOLICITACAO_COMPRA: ["PEDIDO_COMPRA"],
  PEDIDO_COMPRA: ["PC_ENVIADO"],
  PC_ENVIADO: ["ENTREGA"],
  ENTREGA: [], // final: sai da esteira pelo /enviar-manutencao
};

/** Destinos válidos a partir da etapa atual de um card de compras. */
export function destinosCompras(etapa: EtapaCompras): EtapaCompras[] {
  return TRANSICOES_COMPRAS[etapa] ?? [];
}

/** Ordem das raias da esteira de Compras (esquerda → direita). */
export const ORDEM_COMPRAS: EtapaCompras[] = [
  "SEPARACAO", "CLASSIFICACAO", "PEDIDO_FORNECEDOR", "TABELA_VALORES",
  "REVISAO_VALORES", "SOLICITACAO_COMPRA", "PEDIDO_COMPRA", "PC_ENVIADO", "ENTREGA",
];

/** True se mover de `de` para `para` é um retrocesso na esteira de Compras. */
export function ehRetrocessoCompras(de: EtapaCompras, para: EtapaCompras): boolean {
  const a = ORDEM_COMPRAS.indexOf(de);
  const b = ORDEM_COMPRAS.indexOf(para);
  return a >= 0 && b >= 0 && b < a;
}

/** Etapa imediatamente anterior na esteira de Compras (ou null se for a primeira). */
export function etapaAnteriorCompras(etapa: EtapaCompras): EtapaCompras | null {
  const i = ORDEM_COMPRAS.indexOf(etapa);
  return i > 0 ? ORDEM_COMPRAS[i - 1] : null;
}

/**
 * Gate da Classificação: só os itens a COMPRAR (não marcados como em estoque)
 * precisam de tipo de custo + centro de custo — item em estoque dispensa.
 */
export function classificacaoComprasCompleta(card: Pick<Card, "itensCompra">): boolean {
  const itens = card.itensCompra ?? [];
  return itens.length > 0 && itens.every(
    (i) => i.estoque === "EM_ESTOQUE" || (!!i.tipoCusto?.trim() && !!i.centroCusto?.trim()),
  );
}

/** Gate da Entrega: quando há itens, todos precisam da data de entrega. */
export function entregaComprasCompleta(card: Pick<Card, "itensCompra">): boolean {
  const itens = card.itensCompra ?? [];
  return itens.every((i) => !!i.dataEntrega?.trim());
}

/** Gate da Separação: quando há itens, todos marcados (em estoque ou falta). */
export function separacaoComprasCompleta(card: Pick<Card, "itensCompra">): boolean {
  const itens = card.itensCompra ?? [];
  return itens.every((i) => i.estoque === "EM_ESTOQUE" || i.estoque === "FALTA");
}

/** Valida o drag-and-drop na esteira de Compras. */
export function movimentoValidoCompras(card: Card, destino: EtapaCompras, retroceder = false): ResultadoTransicao {
  if (card.fluxo !== "COMPRAS") {
    return { ok: false, motivo: "Roteamento de compras não se aplica." };
  }
  const atual = card.etapa as EtapaCompras;
  if (destino === atual) return { ok: true, proxima: destino };
  if (retroceder && ehRetrocessoCompras(atual, destino)) return { ok: true, proxima: destino };
  const permitidos = destinosCompras(atual);
  if (permitidos.includes(destino)) return { ok: true, proxima: destino };
  if (permitidos.length === 0) {
    return { ok: false, motivo: `"${rotuloEtapa(atual)}" é uma etapa final.` };
  }
  const lista = permitidos.map((e) => `"${rotuloEtapa(e)}"`).join(", ");
  return { ok: false, motivo: `De "${rotuloEtapa(atual)}" só dá para mover para: ${lista}.` };
}

export function rotuloEtapa(etapa: string | null | undefined): string {
  if (!etapa) return "—";
  const mapa: Record<string, string> = {
    COMERCIAL: "Comercial",
    COORDENACAO_APROVACAO: "Coordenação · Aprovação",
    ALMOXARIFADO: "Almoxarifado",
    SUPRIMENTOS: "Suprimentos",
    MONITORAMENTO: "Monitoramento",
    TECNICA: "Técnica",
    CHEQUE_MONITORAMENTO: "Cheque · Monitoramento",
    COORDENACAO_AUDITORIA: "Coordenação · Auditoria",
    MEDICAO: "Medição",
    // Manutenção
    ROTINA: "Rotina",
    CHEQUE: "Cheque",
    ORCAMENTO: "Orçamento",
    ORC_AGUARDANDO: "Aguardando",
    ORC_NAO_APROVADO: "Não Aprovado",
    ORC_APROVADO: "Aprovado",
    SEPARACAO: "Separação",
    COMPRA: "Suprimentos", // legado (etapa extinta da Manutenção — histórico antigo)
    AGENDAMENTO: "Agendamento",
    // Compras
    CLASSIFICACAO: "Classificação",
    PEDIDO_FORNECEDOR: "Pedido ao Fornecedor",
    ENTREGA: "Entrega",
    PAGAMENTO: "Pagamento", // legado (coluna extinta da esteira de Compras)
    TABELA_VALORES: "Tabela de Valores",
    REVISAO_VALORES: "Revisão de Valores",
    SOLICITACAO_COMPRA: "Solicitação de Compra",
    PEDIDO_COMPRA: "Pedido de Compra",
    PC_ENVIADO: "PC enviado ao Fornecedor",
    ENCERRADOS: "Encerrados",
  };
  return mapa[etapa] ?? etapa;
}
