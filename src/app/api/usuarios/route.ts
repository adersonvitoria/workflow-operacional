import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { obterSessao } from "@/lib/server-auth";
import { podeGerenciarUsuarios } from "@/lib/perfis";
import { carregarConfigPerfis } from "@/lib/perfis-server";

const SENHA_PADRAO = "123456";

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

  const senhaHash = await bcrypt.hash(String(senha || SENHA_PADRAO), 10);
  const u = await prisma.usuario.create({
    data: { nome, email: String(email).toLowerCase(), perfil, ativo, senhaHash },
  });
  return NextResponse.json({ usuario: publico(u) }, { status: 201 });
}
