import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { assinarSessao, COOKIE_NOME, COOKIE_OPTS } from "@/lib/server-auth";

export async function POST(req: Request) {
  const { email, senha } = await req.json().catch(() => ({}));
  if (!email || !senha) {
    return NextResponse.json({ erro: "Informe e-mail e senha." }, { status: 400 });
  }

  const u = await prisma.usuario.findUnique({ where: { email: String(email).toLowerCase() } });
  if (!u || !u.ativo) {
    return NextResponse.json({ erro: "Credenciais inválidas ou usuário inativo." }, { status: 401 });
  }
  const ok = await bcrypt.compare(String(senha), u.senhaHash);
  if (!ok) {
    return NextResponse.json({ erro: "Credenciais inválidas." }, { status: 401 });
  }

  const token = await assinarSessao({ userId: u.id, perfil: u.perfil, nome: u.nome });
  const res = NextResponse.json({ usuario: { id: u.id, nome: u.nome, email: u.email, perfil: u.perfil, ativo: u.ativo } });
  res.cookies.set(COOKIE_NOME, token, COOKIE_OPTS);
  return res;
}
