import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { obterSessao } from "@/lib/server-auth";
import { podeGerenciarUsuarios } from "@/lib/perfis";
import { carregarConfigPerfis } from "@/lib/perfis-server";

const MIN_SENHA = 8;

function publico(u: { id: string; nome: string; email: string; perfil: string; ativo: boolean }) {
  return { id: u.id, nome: u.nome, email: u.email, perfil: u.perfil, ativo: u.ativo };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  await carregarConfigPerfis();
  if (!podeGerenciarUsuarios(s.perfil)) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (body.nome != null) data.nome = body.nome;
  if (body.email != null) data.email = String(body.email).toLowerCase();
  if (body.ativo != null) data.ativo = body.ativo;
  if (body.senha) {
    const senha = String(body.senha);
    if (senha.length < MIN_SENHA) {
      return NextResponse.json({ erro: `A senha deve ter ao menos ${MIN_SENHA} caracteres.` }, { status: 400 });
    }
    data.senhaHash = await bcrypt.hash(senha, 12);
  }
  // Escalonamento de privilégio: ninguém muda o próprio perfil, e só o
  // Coordenador promove alguém a Coordenador.
  if (body.perfil != null) {
    if (params.id === s.userId) {
      return NextResponse.json({ erro: "Você não pode alterar o seu próprio perfil." }, { status: 403 });
    }
    if (body.perfil === "COORDENADOR" && s.perfil !== "COORDENADOR") {
      return NextResponse.json({ erro: "Somente o Coordenador pode conceder o perfil de Coordenador." }, { status: 403 });
    }
    data.perfil = body.perfil;
  }
  // Desativar/reativar a si mesmo também fica bloqueado (evita auto-lockout
  // e manobras de reativação).
  if (body.ativo != null && params.id === s.userId) {
    return NextResponse.json({ erro: "Você não pode alterar o seu próprio status." }, { status: 403 });
  }

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
  await carregarConfigPerfis();
  if (!podeGerenciarUsuarios(s.perfil)) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
  if (params.id === s.userId) return NextResponse.json({ erro: "Você não pode remover a si mesmo." }, { status: 400 });

  try {
    await prisma.usuario.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: "Usuário não encontrado." }, { status: 404 });
  }
}
