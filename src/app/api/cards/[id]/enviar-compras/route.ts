import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obterSessao } from "@/lib/server-auth";
import { podeExecutarEtapa } from "@/lib/perfis";
import { carregarConfigPerfis } from "@/lib/perfis-server";
import { extracaoConfigurada, extrairOrcamentoPdf } from "@/lib/extrair-orcamento";
import { rowToCard } from "@/lib/mappers";
import type { ItemMaterial } from "@/types";

export const maxDuration = 60; // extração de itens do PDF pode levar alguns segundos

/**
 * Envia um card para a esteira de COMPRAS (coluna Separação), guardando a
 * esteira de origem para a volta ao concluir a Entrega:
 * - MANUTENÇÃO · Aprovado → origem MANUTENCAO (volta ao Agendamento);
 * - IMPLANTAÇÃO · Coordenação → o cheque da Coordenação aprova o escopo e
 *   envia — origem IMPLANTACAO (volta ao Monitoramento).
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  await carregarConfigPerfis();

  const original = await prisma.card.findUnique({ where: { id: id } });
  if (!original) return NextResponse.json({ erro: "Card não encontrado." }, { status: 404 });

  const deManutencao = original.fluxo === "MANUTENCAO" && original.etapa === "ORC_APROVADO";
  const deImplantacao = original.fluxo === "IMPLANTACAO" && original.etapa === "COORDENACAO_APROVACAO";
  if (!deManutencao && !deImplantacao) {
    return NextResponse.json({ erro: "Só cards Aprovados (Manutenção) ou na Coordenação (Implantação) vão para Compras." }, { status: 422 });
  }
  if (!podeExecutarEtapa(s.perfil, original.etapa, original.modalidade ?? undefined)) {
    return NextResponse.json({ erro: "Seu perfil não pode executar a ação desta etapa." }, { status: 403 });
  }

  const agora = new Date().toISOString();

  // Itens da esteira de Compras: os já existentes no card; na falta,
  // Implantação usa os itens do projeto (materiais) e Manutenção extrai do
  // PDF do orçamento anexado via IA (melhor esforço).
  let itens = Array.isArray(original.itensCompra) ? (original.itensCompra as object[]) : [];
  if (itens.length === 0 && deImplantacao) {
    const materiais = (Array.isArray(original.materiais) ? original.materiais : []) as unknown as ItemMaterial[];
    itens = materiais
      .filter((m) => m && typeof m.descricao === "string" && m.descricao.trim())
      .map((m, idx) => ({
        id: `ic-${idx}-${agora.slice(-6)}`,
        quantidade: Number.isFinite(Number(m.quantidade)) && Number(m.quantidade) > 0 ? Number(m.quantidade) : 1,
        material: m.descricao.trim(),
        statusPagamento: "PENDENTE",
      }));
  }
  if (itens.length === 0 && deManutencao && extracaoConfigurada()) {
    const anexo = await prisma.orcamentoPdf.findUnique({ where: { cardId: original.id } });
    if (anexo) {
      try {
        const extraido = await extrairOrcamentoPdf(anexo.dados);
        itens = (extraido.itens ?? [])
          .filter((i) => i && typeof i.material === "string" && i.material.trim())
          .map((i, idx) => ({
            id: `ic-${idx}-${agora.slice(-6)}`,
            quantidade: Number.isFinite(Number(i.quantidade)) && Number(i.quantidade) > 0 ? Number(i.quantidade) : 1,
            material: i.material.trim(),
            setor: i.setor?.toString().trim() || undefined,
            statusPagamento: "PENDENTE",
          }));
      } catch {
        // melhor esforço — segue sem itens
      }
    }
  }

  const origem = deImplantacao ? "IMPLANTACAO" : "MANUTENCAO";
  const acao = deImplantacao
    ? "Cheque da Coordenação: escopo aprovado e card enviado à esteira de Compras (Separação)"
    : "Aprovado: card enviado à esteira de Compras (Separação)";
  const hist = Array.isArray(original.historico) ? (original.historico as unknown[]) : [];
  const atualizado = await prisma.card.update({
    where: { id: original.id },
    data: {
      fluxo: "COMPRAS",
      etapa: "SEPARACAO",
      origemCompras: origem,
      responsavelSetor: "ALMOXARIFADO",
      itensCompra: itens,
      // Implantação: o cheque também registra a aprovação do escopo.
      ...(deImplantacao
        ? { aprovacaoInicial: { aprovado: true, por: s.nome, em: agora }, status: "EM_ANDAMENTO" }
        : {}),
      historico: [
        ...hist,
        { id: `h${hist.length}`, data: agora, setor: "ALMOXARIFADO", autor: s.nome, acao, de: original.etapa, para: "SEPARACAO" },
      ] as unknown as object[],
    },
  });

  return NextResponse.json({ card: rowToCard(atualizado) });
}
