import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obterSessao } from "@/lib/server-auth";
import { podeCriarCard } from "@/lib/perfis";
import { rowToCard } from "@/lib/mappers";
import type { Fluxo } from "@/types";

export async function GET(req: Request) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fluxo = searchParams.get("fluxo") as Fluxo | null;
  const rows = await prisma.card.findMany({
    where: fluxo ? { fluxo } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ cards: rows.map(rowToCard) });
}

export async function POST(req: Request) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  if (!b.clienteNome) return NextResponse.json({ erro: "Informe o cliente." }, { status: 400 });

  const fluxo: Fluxo = b.fluxo === "MANUTENCAO" ? "MANUTENCAO" : "IMPLANTACAO";
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
      chamado: b.chamado ?? null,
      numeroOrcamento: b.numeroOrcamento ?? null,
      numeroConta: b.numeroConta ?? null,
      dataAbertura: b.dataCadastro ? new Date(`${b.dataCadastro}T12:00:00`) : undefined,
      manutencao: b.manutencao ?? undefined,
      valorMaoDeObra: b.maoDeObra ?? null,
      valorEquipamentos: b.equipamentos ?? null,
      valorTotal: b.total ?? null,
      valorMensal: b.mensal ?? null,
      responsavelSetor: "COMERCIAL",
      responsavelPessoa: s.nome,
      observacoes: b.observacoes ?? null,
      materiais: Array.isArray(b.materiais) ? b.materiais : [],
      historico: [{ id: "h0", data: agora, setor: "COMERCIAL", autor: s.nome, acao: "Projeto cadastrado", para: etapa }],
    },
  });
  return NextResponse.json({ card: rowToCard(card) }, { status: 201 });
}
