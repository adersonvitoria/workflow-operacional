import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obterSessao } from "@/lib/server-auth";
import { podeGerenciarTecnicos } from "@/lib/perfis";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  if (!podeGerenciarTecnicos(s.perfil)) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (b.nome != null) {
    const nome = String(b.nome).trim();
    if (!nome) return NextResponse.json({ erro: "Informe o nome do técnico." }, { status: 400 });
    data.nome = nome;
  }
  if (b.ativo != null) data.ativo = !!b.ativo;

  try {
    const tecnico = await prisma.tecnico.update({ where: { id: id }, data });
    return NextResponse.json({ tecnico });
  } catch {
    return NextResponse.json({ erro: "Técnico não encontrado." }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  if (!podeGerenciarTecnicos(s.perfil)) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });

  try {
    await prisma.tecnico.delete({ where: { id: id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: "Técnico não encontrado." }, { status: 404 });
  }
}
