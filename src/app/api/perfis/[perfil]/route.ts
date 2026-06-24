import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obterSessao } from "@/lib/server-auth";
import { PERFIS, podeGerenciarPerfis, type Perfil } from "@/lib/perfis";

/** Atualiza as permissões/ações de um perfil. Somente o Coordenador. */
export async function PATCH(req: Request, { params }: { params: { perfil: string } }) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  if (!podeGerenciarPerfis(s.perfil)) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });

  const perfil = params.perfil as Perfil;
  if (!PERFIS.includes(perfil)) return NextResponse.json({ erro: "Perfil inválido." }, { status: 400 });
  if (perfil === "COORDENADOR") return NextResponse.json({ erro: "O Coordenador tem acesso total e não é editável." }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const etapas = Array.isArray(body.etapas) ? body.etapas : [];
  const capacidades = body.capacidades && typeof body.capacidades === "object" ? body.capacidades : {};
  const acoes = Array.isArray(body.acoes) ? body.acoes : [];

  const row = await prisma.perfilConfig.upsert({
    where: { perfil },
    create: { perfil, etapas, capacidades, acoes },
    update: { etapas, capacidades, acoes },
  });
  return NextResponse.json({ ok: true, perfil: row.perfil });
}

/** Restaura o perfil ao padrão de fábrica (remove o override). Só o Coordenador. */
export async function DELETE(_req: Request, { params }: { params: { perfil: string } }) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  if (!podeGerenciarPerfis(s.perfil)) return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });

  const perfil = params.perfil as Perfil;
  if (!PERFIS.includes(perfil)) return NextResponse.json({ erro: "Perfil inválido." }, { status: 400 });
  await prisma.perfilConfig.deleteMany({ where: { perfil } });
  return NextResponse.json({ ok: true });
}
