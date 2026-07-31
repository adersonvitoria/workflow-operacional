import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { obterSessao } from "@/lib/server-auth";
import { podeGerenciarUsuarios } from "@/lib/perfis";
import { carregarConfigPerfis } from "@/lib/perfis-server";

const MIN_SENHA = 8;

/** Senha inicial aleatória — devolvida uma única vez a quem cadastrou. */
function senhaAleatoria(): string {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => abc[b % abc.length]).join("");
}

function publico(u: { id: string; nome: string; email: string; perfil: string; ativo: boolean }) {
  return { id: u.id, nome: u.nome, email: u.email, perfil: u.perfil, ativo: u.ativo };
}

export async function GET() {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  await carregarConfigPerfis();
  if (!podeGerenciarUsuarios(s.perfil)) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
  const us = await prisma.usuario.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ usuarios: us.map(publico) });
}

export async function POST(req: Request) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  await carregarConfigPerfis();
  if (!podeGerenciarUsuarios(s.perfil)) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { nome, email, perfil, ativo = true, senha } = body;
  if (!nome || !email || !perfil) {
    return NextResponse.json({ erro: "Nome, e-mail e perfil são obrigatórios." }, { status: 400 });
  }
  const existe = await prisma.usuario.findUnique({ where: { email: String(email).toLowerCase() } });
  if (existe) return NextResponse.json({ erro: "E-mail já cadastrado." }, { status: 409 });
  // Só o Coordenador cria outro Coordenador (evita autopromoção via cadastro).
  if (perfil === "COORDENADOR" && s.perfil !== "COORDENADOR") {
    return NextResponse.json({ erro: "Somente o Coordenador pode conceder o perfil de Coordenador." }, { status: 403 });
  }
  if (senha && String(senha).length < MIN_SENHA) {
    return NextResponse.json({ erro: `A senha deve ter ao menos ${MIN_SENHA} caracteres.` }, { status: 400 });
  }

  // Sem senha informada, gera uma aleatória (nada de senha padrão conhecida).
  const senhaInicial = senha ? String(senha) : senhaAleatoria();
  const senhaHash = await bcrypt.hash(senhaInicial, 12);
  // Toda senha definida por terceiro exige troca no primeiro acesso.
  const u = await prisma.usuario.create({
    data: { nome, email: String(email).toLowerCase(), perfil, ativo, senhaHash, precisaTrocarSenha: true },
  });
  return NextResponse.json(
    { usuario: publico(u), ...(senha ? {} : { senhaInicial }) },
    { status: 201 },
  );
}
