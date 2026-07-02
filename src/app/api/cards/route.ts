import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obterSessao } from "@/lib/server-auth";
import { podeCriarCard } from "@/lib/perfis";
import { carregarConfigPerfis } from "@/lib/perfis-server";
import { rowToCard } from "@/lib/mappers";
import type { Fluxo } from "@/types";

const SETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

/** Momento (ms) em que o card entrou na etapa Aguardando (último evento do histórico). */
function entrouEmAguardandoMs(row: { historico: unknown; updatedAt: Date }): number {
  const hist = Array.isArray(row.historico) ? (row.historico as { data?: string; para?: string }[]) : [];
  const evs = hist.filter((e) => e?.para === "ORC_AGUARDANDO");
  const iso = evs.length ? evs[evs.length - 1]?.data : row.updatedAt?.toISOString?.();
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? Date.now() : t;
}

/**
 * Auto-move: todo card há 7+ dias parado em "Aguardando" (sem retorno do cliente)
 * vira "Não Aprovado". Roda de forma preguiçosa a cada carregamento da lista —
 * ao identificar um card nessa condição, ele é movido na hora.
 */
async function moverAguardandoVencidos(rows: { id: string; etapa: string; historico: unknown; updatedAt: Date }[]): Promise<void> {
  const agora = Date.now();
  const vencidos = rows.filter((r) => r.etapa === "ORC_AGUARDANDO" && agora - entrouEmAguardandoMs(r) >= SETE_DIAS_MS);
  if (!vencidos.length) return;
  await Promise.all(
    vencidos.map(async (r) => {
      const hist = Array.isArray(r.historico) ? (r.historico as unknown[]) : [];
      const evento = {
        id: `h${hist.length}`,
        data: new Date().toISOString(),
        setor: "ADMINISTRATIVO",
        autor: "Sistema",
        acao: "Movido automaticamente para Não Aprovado (7 dias sem retorno do cliente)",
        de: "ORC_AGUARDANDO",
        para: "ORC_NAO_APROVADO",
      };
      const atualizado = await prisma.card.update({
        where: { id: r.id },
        data: { etapa: "ORC_NAO_APROVADO", historico: [...hist, evento] as unknown as object[] },
      });
      const idx = rows.findIndex((x) => x.id === r.id);
      if (idx >= 0) rows[idx] = atualizado;
    }),
  );
}

export async function GET(req: Request) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fluxo = searchParams.get("fluxo") as Fluxo | null;
  const rows = await prisma.card.findMany({
    where: fluxo ? { fluxo } : undefined,
    orderBy: { createdAt: "desc" },
  });
  // Item 5: Aguardando há 7+ dias → Não Aprovado (na hora que é identificado).
  await moverAguardandoVencidos(rows);
  return NextResponse.json({ cards: rows.map(rowToCard) });
}

export async function POST(req: Request) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  if (!b.clienteNome) return NextResponse.json({ erro: "Informe o cliente." }, { status: 400 });

  const fluxo: Fluxo = b.fluxo === "MANUTENCAO" ? "MANUTENCAO" : "IMPLANTACAO";
  await carregarConfigPerfis();
  if (!podeCriarCard(s.perfil, fluxo)) return NextResponse.json({ erro: "Sem permissão para cadastrar." }, { status: 403 });
  const etapa = fluxo === "IMPLANTACAO" ? "COMERCIAL" : "ROTINA";
  const qtd = await prisma.card.count({ where: { fluxo } });
  const agora = new Date().toISOString();

  const card = await prisma.card.create({
    data: {
      codigo: String(qtd + 1),
      fluxo,
      etapa,
      status: "EM_ANDAMENTO",
      prioridade: b.prioridade ?? "NORMAL",
      modalidade: b.modalidade ?? null,
      clienteNome: b.clienteNome,
      clienteDocumento: b.documento ?? null,
      clienteContato: b.contato ?? null,
      clienteEndereco: b.endereco ?? null,
      clienteTipo: b.tipoCliente ?? null,
      cr: b.cr ?? null,
      cc: b.cc ?? null,
      crMonitoramento: b.crMonitoramento ?? null,
      crLocacao: b.crLocacao ?? null,
      crServico: b.crServico ?? null,
      crMaterial: b.crMaterial ?? null,
      crMensalidade: b.crMensalidade ?? null,
      margemVenda: b.margem ?? null,
      temContrato: b.temContrato ?? false,
      crDedicado: b.crDedicado ?? false,
      temInvestimento: b.temInvestimento ?? false,
      chamadoInvestimento: b.chamadoInvestimento ?? null,
      chamado: b.chamado ?? null,
      numeroOrcamento: b.numeroOrcamento ?? null,
      numeroConta: b.numeroConta ?? null,
      regiao: b.regiao ?? null,
      dataAbertura: b.dataCadastro ? new Date(`${b.dataCadastro}T12:00:00`) : undefined,
      manutencao: b.manutencao ?? undefined,
      valorMaoDeObra: b.maoDeObra ?? null,
      valorEquipamentos: b.equipamentos ?? null,
      valorTotal: b.total ?? null,
      valorMensal: b.mensal ?? null,
      valorLocacao: b.locacao ?? null,
      responsavelSetor: "COMERCIAL",
      responsavelPessoa: s.nome,
      observacoes: b.observacoes ?? null,
      materiais: Array.isArray(b.materiais) ? b.materiais : [],
      historico: [{ id: "h0", data: agora, setor: "COMERCIAL", autor: s.nome, acao: "Projeto cadastrado", para: etapa }],
    },
  });
  return NextResponse.json({ card: rowToCard(card) }, { status: 201 });
}
