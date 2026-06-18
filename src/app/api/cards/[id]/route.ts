import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obterSessao } from "@/lib/server-auth";
import { podeCriarCard } from "@/lib/perfis";
import { rowToCard } from "@/lib/mappers";
import type { Card } from "@/types";

/** Traduz um Partial<Card> (vindo do front) para colunas do Prisma. */
function patchToData(p: Partial<Card>): Record<string, unknown> {
  const d: Record<string, unknown> = {};
  if (p.cliente) {
    if (p.cliente.nome != null) d.clienteNome = p.cliente.nome;
    d.clienteDocumento = p.cliente.documento ?? null;
    d.clienteContato = p.cliente.contato ?? null;
    d.clienteEndereco = p.cliente.endereco ?? null;
  }
  if (p.valores) {
    d.valorMaoDeObra = p.valores.maoDeObra ?? null;
    d.valorEquipamentos = p.valores.equipamentos ?? null;
    d.valorTotal = p.valores.total ?? null;
    d.valorMensal = p.valores.mensal ?? null;
  }
  for (const k of ["modalidade", "natureza", "prioridade", "status", "etapa", "cr", "cc", "chamado", "numeroOrcamento", "observacoes"] as const) {
    if (p[k] !== undefined) d[k] = p[k];
  }
  for (const k of ["pagamento", "aprovacaoInicial", "auditoriaFinal", "almoxarifado", "sigma", "materiais", "checklist", "historico"] as const) {
    if (p[k] !== undefined) d[k] = p[k];
  }
  if (p.responsavelAtual) {
    d.responsavelSetor = p.responsavelAtual.setor;
    d.responsavelPessoa = p.responsavelAtual.pessoa ?? null;
  }
  return d;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  const row = await prisma.card.findUnique({ where: { id: params.id } });
  if (!row) return NextResponse.json({ erro: "Card não encontrado." }, { status: 404 });
  return NextResponse.json({ card: rowToCard(row) });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Partial<Card>;
  try {
    const row = await prisma.card.update({ where: { id: params.id }, data: patchToData(body) });
    return NextResponse.json({ card: rowToCard(row) });
  } catch {
    return NextResponse.json({ erro: "Card não encontrado." }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  if (!podeCriarCard(s.perfil)) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
  try {
    await prisma.card.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: "Card não encontrado." }, { status: 404 });
  }
}
