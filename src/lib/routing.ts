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

import type { Card, EtapaImplantacao, Modalidade } from "@/types";

/** Ordem visual das 7 colunas no board de Implantação. */
export const ORDEM_IMPLANTACAO: EtapaImplantacao[] = [
  "COMERCIAL",
  "COORDENACAO_APROVACAO",
  "SUPRIMENTOS",
  "MONITORAMENTO",
  "TECNICA",
  "COORDENACAO_AUDITORIA",
  "MEDICAO",
];

/** Próxima etapa segundo a regra de negócio (sequência linear de 7 colunas). */
export function proximaEtapa(
  etapa: EtapaImplantacao,
  _modalidade: Modalidade | undefined,
): EtapaImplantacao | null {
  const i = ORDEM_IMPLANTACAO.indexOf(etapa);
  if (i === -1 || i === ORDEM_IMPLANTACAO.length - 1) return null;
  return ORDEM_IMPLANTACAO[i + 1];
}

export interface ResultadoTransicao {
  ok: boolean;
  motivo?: string; // por que NÃO pode avançar (pronto para a UI)
  proxima?: EtapaImplantacao | null;
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
      if (!card.aprovacaoInicial?.aprovado) {
        return { ok: false, motivo: "Aguardando aprovação da Coordenação." };
      }
      break;

    case "SUPRIMENTOS": {
      // Bifurcação: a Venda passa pela conferência do Almoxarifado.
      if (card.modalidade === "VENDA") {
        const a = card.almoxarifado;
        if (!a?.verificado) {
          return { ok: false, motivo: "Almoxarifado ainda não conferiu o estoque (Venda)." };
        }
        if (!a.temTudoEmEstoque && a.listaDoQueFalta.trim().length === 0) {
          return {
            ok: false,
            motivo: 'Preencha a "lista do que falta" ou marque que há tudo em estoque.',
          };
        }
      }
      // Locação e Venda: Compras precisa ter resolvido os itens.
      if (card.materiais.some((m) => m.statusAlmox === "PENDENTE" || m.statusAlmox === "EM_COMPRAS")) {
        return { ok: false, motivo: "Ainda há itens pendentes de compra/separação." };
      }
      break;
    }

    case "MONITORAMENTO":
      if (!card.sigma?.contaCriada) {
        return { ok: false, motivo: "Monitoramento precisa criar a conta no software central." };
      }
      break;

    case "TECNICA":
      // a Técnica não encerra: precisa concluir o checklist da execução
      if (card.checklist.some((c) => c.etapa === "TECNICA" && c.obrigatorio && !c.concluido)) {
        return { ok: false, motivo: "Conclua o checklist de execução." };
      }
      break;

    case "COORDENACAO_AUDITORIA":
      if (!card.auditoriaFinal?.aprovado) {
        return { ok: false, motivo: "Aguardando OK de qualidade da Coordenação." };
      }
      break;

    case "MEDICAO":
      return { ok: false, motivo: "Card no fim do fluxo.", proxima: null };
  }

  return { ok: true, proxima: proximaEtapa(etapa, card.modalidade) };
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

export function rotuloEtapa(etapa: string | null | undefined): string {
  if (!etapa) return "—";
  const mapa: Record<string, string> = {
    COMERCIAL: "Comercial",
    COORDENACAO_APROVACAO: "Coordenação · Aprovação",
    SUPRIMENTOS: "Suprimentos",
    MONITORAMENTO: "Monitoramento",
    TECNICA: "Técnica",
    COORDENACAO_AUDITORIA: "Coordenação · Auditoria",
    MEDICAO: "Medição",
    // Manutenção
    APONTAMENTO: "Apontamento",
    ORCAMENTACAO: "Orçamentação",
    APROVACAO_CLIENTE: "Aprovação",
    COMPRAS_ALMOX: "Compras / Almox",
    EXECUCAO: "Execução",
  };
  return mapa[etapa] ?? etapa;
}
