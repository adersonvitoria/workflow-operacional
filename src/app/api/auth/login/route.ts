import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { assinarSessao, COOKIE_NOME, COOKIE_OPTS } from "@/lib/server-auth";
import { consumir, ipDaRequisicao, liberar } from "@/lib/rate-limit";

// Força bruta: 8 tentativas por IP+e-mail a cada 10 minutos.
const MAX_TENTATIVAS = 8;
const JANELA_MS = 10 * 60 * 1000;

export async function POST(req: Request) {
  const { email, senha } = await req.json().catch(() => ({}));
  if (!email || !senha) {
    return NextResponse.json({ erro: "Informe e-mail e senha." }, { status: 400 });
  }

  const chave = `login:${ipDaRequisicao(req)}:${String(email).toLowerCase()}`;
  const limite = consumir(chave, MAX_TENTATIVAS, JANELA_MS);
  if (!limite.ok) {
    return NextResponse.json(
      { erro: `Muitas tentativas. Tente novamente em ${Math.ceil(limite.esperarSegundos / 60)} minuto(s).` },
      { status: 429, headers: { "Retry-After": String(limite.esperarSegundos) } },
    );
  }

  const u = await prisma.usuario.findUnique({ where: { email: String(email).toLowerCase() } });
  if (!u || !u.ativo) {
    return NextResponse.json({ erro: "Credenciais inválidas ou usuário inativo." }, { status: 401 });
  }
  const ok = await bcrypt.compare(String(senha), u.senhaHash);
  if (!ok) {
    return NextResponse.json({ erro: "Credenciais inválidas." }, { status: 401 });
  }

  liberar(chave); // login válido zera o contador
  const token = await assinarSessao({ userId: u.id, perfil: u.perfil, nome: u.nome });
  const res = NextResponse.json({
    usuario: { id: u.id, nome: u.nome, email: u.email, perfil: u.perfil, ativo: u.ativo, precisaTrocarSenha: u.precisaTrocarSenha },
  });
  res.cookies.set(COOKIE_NOME, token, COOKIE_OPTS);
  return res;
}
