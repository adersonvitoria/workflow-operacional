import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { obterSessao, assinarSessao, COOKIE_NOME, COOKIE_OPTS } from "@/lib/server-auth";

const MIN_SENHA = 8;

function publico(u: { id: string; nome: string; email: string; perfil: string; ativo: boolean }) {
  return { id: u.id, nome: u.nome, email: u.email, perfil: u.perfil, ativo: u.ativo };
}

export async function GET() {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ usuario: null }, { status: 200 });
  const u = await prisma.usuario.findUnique({ where: { id: s.userId } });
  if (!u || !u.ativo) return NextResponse.json({ usuario: null }, { status: 200 });
  return NextResponse.json({ usuario: publico(u) });
}

/** Auto-serviço: o usuário logado altera o próprio nome de exibição e/ou senha. */
export async function PATCH(req: Request) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const u = await prisma.usuario.findUnique({ where: { id: s.userId } });
  if (!u || !u.ativo) return NextResponse.json({ erro: "Usuário não encontrado." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (body.nome != null) {
    const nome = String(body.nome).trim();
    if (!nome) return NextResponse.json({ erro: "Informe o nome de exibição." }, { status: 400 });
    data.nome = nome;
  }

  if (body.novaSenha != null && String(body.novaSenha).length > 0) {
    const confere = await bcrypt.compare(String(body.senhaAtual ?? ""), u.senhaHash);
    if (!confere) return NextResponse.json({ erro: "Senha atual incorreta." }, { status: 400 });
    if (String(body.novaSenha).length < MIN_SENHA) {
      return NextResponse.json({ erro: `A nova senha deve ter ao menos ${MIN_SENHA} caracteres.` }, { status: 400 });
    }
    data.senhaHash = await bcrypt.hash(String(body.novaSenha), 12);
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ erro: "Nada para atualizar." }, { status: 400 });

  const atualizado = await prisma.usuario.update({ where: { id: u.id }, data });
  const res = NextResponse.json({ usuario: publico(atualizado) });
  // O nome vai no JWT — reemite a sessão quando ele muda.
  if (data.nome) {
    const token = await assinarSessao({ userId: atualizado.id, perfil: atualizado.perfil, nome: atualizado.nome });
    res.cookies.set(COOKIE_NOME, token, COOKIE_OPTS);
  }
  return res;
}
