import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obterSessao } from "@/lib/server-auth";
import { podeGerenciarItens } from "@/lib/perfis";
import { carregarConfigPerfis } from "@/lib/perfis-server";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  await carregarConfigPerfis();
  if (!podeGerenciarItens(s.perfil)) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (b.descricao != null) data.descricao = String(b.descricao).trim();
  if (b.unidade != null) data.unidade = b.unidade;
  if (b.preco != null) data.preco = Number(b.preco) || 0;
  if (b.ativo != null) data.ativo = b.ativo;

  try {
    const item = await prisma.item.update({ where: { id: params.id }, data });
    return NextResponse.json({ item });
  } catch {
    return NextResponse.json({ erro: "Item não encontrado ou descrição duplicada." }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  await carregarConfigPerfis();
  if (!podeGerenciarItens(s.perfil)) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
  try {
    await prisma.item.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: "Item não encontrado." }, { status: 404 });
  }
}
