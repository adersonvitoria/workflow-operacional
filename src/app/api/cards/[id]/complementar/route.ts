import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obterSessao } from "@/lib/server-auth";
import { podeExecutarEtapa } from "@/lib/perfis";
import { carregarConfigPerfis } from "@/lib/perfis-server";
import { rowToCard } from "@/lib/mappers";

/**
 * Gera um Orçamento Complementar a partir de um card de Manutenção que está na
 * Execução. O card novo nasce na coluna Orçamento (com a tag Complementar) e
 * herda apenas: nome do cliente, tipo de cliente, nº da conta, região e técnico.
 * Os demais campos (Setor, valores, CR, chamado, competência, turno, etc.)
 * ficam em branco para serem preenchidos depois.
 *
 * Permissão: executar a etapa Execução (Supervisor Técnico / Coordenador) — é
 * uma ação da Execução, não um "cadastro" comum de card.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  await carregarConfigPerfis();

  const origem = await prisma.card.findUnique({ where: { id: params.id } });
  if (!origem) return NextResponse.json({ erro: "Card de origem não encontrado." }, { status: 404 });

  if (origem.fluxo !== "MANUTENCAO" || origem.etapa !== "EXECUCAO") {
    return NextResponse.json(
      { erro: "O orçamento complementar só pode ser gerado de um card de Manutenção na Execução." },
      { status: 422 },
    );
  }
  if (!podeExecutarEtapa(s.perfil, "EXECUCAO")) {
    return NextResponse.json({ erro: "Seu perfil não pode gerar orçamento complementar nesta etapa." }, { status: 403 });
  }

  const man = (origem.manutencao as { regiao?: string; tecnico?: string } | null) ?? {};
  const agora = new Date().toISOString();
  const qtd = await prisma.card.count({ where: { fluxo: "MANUTENCAO" } });

  const novo = await prisma.card.create({
    data: {
      codigo: `${origem.codigo}-C${qtd + 1}`,
      fluxo: "MANUTENCAO",
      etapa: "ORCAMENTO",
      status: "EM_ANDAMENTO",
      prioridade: "NORMAL",
      complementar: true,
      // Campos herdados (somente os solicitados)
      clienteNome: origem.clienteNome,
      clienteTipo: origem.clienteTipo,
      numeroConta: origem.numeroConta,
      manutencao: { regiao: man.regiao, tecnico: man.tecnico },
      // Demais campos ficam em branco para edição posterior (Setor, valores, etc.)
      responsavelSetor: "ADMINISTRATIVO",
      responsavelPessoa: s.nome,
      observacoes: `Orçamento complementar da OS #${origem.codigo}.`,
      historico: [
        {
          id: "h0",
          data: agora,
          setor: "TECNICA",
          autor: s.nome,
          acao: `Orçamento complementar gerado a partir da OS #${origem.codigo} (Execução)`,
          para: "ORCAMENTO",
        },
      ],
    },
  });

  // Registra na OS de origem que um complementar foi gerado (rastreabilidade).
  const histOrigem = Array.isArray(origem.historico) ? (origem.historico as unknown[]) : [];
  await prisma.card.update({
    where: { id: origem.id },
    data: {
      historico: [
        ...histOrigem,
        {
          id: `h${histOrigem.length}`,
          data: agora,
          setor: "TECNICA",
          autor: s.nome,
          acao: `Orçamento complementar gerado (#${novo.codigo})`,
          de: "EXECUCAO",
          para: "EXECUCAO",
        },
      ] as unknown as object[],
    },
  });

  return NextResponse.json({ card: rowToCard(novo) }, { status: 201 });
}
