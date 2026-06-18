import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { obterSessao } from "@/lib/server-auth";
import { podeGerenciarUsuarios } from "@/lib/perfis";

function publico(u: { id: string; nome: string; email: string; perfil: string; ativo: boolean }) {
  return { id: u.id, nome: u.nome, email: u.email, perfil: u.perfil, ativo: u.ativo };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  if (!podeGerenciarUsuarios(s.perfil)) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (body.nome != null) data.nome = body.nome;
  if (body.email != null) data.email = String(body.email).toLowerCase();
  if (body.perfil != null) data.perfil = body.perfil;
  if (body.ativo != null) data.ativo = body.ativo;
  if (body.senha) data.senhaHash = await bcrypt.hash(String(body.senha), 10);

  try {
    const u = await prisma.usuario.update({ where: { id: params.id }, data });
    return NextResponse.json({ usuario: publico(u) });
  } catch {
    return NextResponse.json({ erro: "Usuário não encontrado." }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  if (!podeGerenciarUsuarios(s.perfil)) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
  if (params.id === s.userId) return NextResponse.json({ erro: "Você não pode remover a si mesmo." }, { status: 400 });

  try {
    await prisma.usuario.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: "Usuário não encontrado." }, { status: 404 });
  }
}
