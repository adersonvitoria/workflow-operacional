import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obterSessao } from "@/lib/server-auth";
import { podeEditarCard, podeExcluirCard, podeExecutarEtapa } from "@/lib/perfis";
import { destinosManutencao, execucaoManutencaoCompleta, rotuloEtapa } from "@/lib/routing";
import { colunasDoFluxo } from "@/lib/flows";
import { rowToCard } from "@/lib/mappers";
import type { Card, EtapaManutencao, Fluxo } from "@/types";

// Campos "editoriais" (dados do card) vs campos de "gate" (aprovar/checar).
const CAMPOS_EDIT = ["cliente", "valores", "modalidade", "natureza", "prioridade", "cr", "cc", "chamado", "numeroOrcamento", "numeroConta", "datas", "observacoes", "pagamento"];
const CAMPOS_GATE = ["aprovacaoInicial", "auditoriaFinal", "medicao", "almoxarifado", "sigma", "checklist", "historico", "etapa", "status", "responsavelAtual"];

/** Traduz um Partial<Card> (vindo do front) para colunas do Prisma. */
function patchToData(p: Partial<Card>): Record<string, unknown> {
  const d: Record<string, unknown> = {};
  if (p.cliente) {
    if (p.cliente.nome != null) d.clienteNome = p.cliente.nome;
    d.clienteDocumento = p.cliente.documento ?? null;
    d.clienteContato = p.cliente.contato ?? null;
    d.clienteEndereco = p.cliente.endereco ?? null;
    d.clienteTipo = p.cliente.tipo ?? null;
  }
  if (p.valores) {
    d.valorMaoDeObra = p.valores.maoDeObra ?? null;
    d.valorEquipamentos = p.valores.equipamentos ?? null;
    d.valorTotal = p.valores.total ?? null;
    d.valorMensal = p.valores.mensal ?? null;
  }
  for (const k of ["modalidade", "natureza", "prioridade", "status", "etapa", "cr", "cc", "chamado", "numeroOrcamento", "numeroConta", "observacoes"] as const) {
    if (p[k] !== undefined) d[k] = p[k];
  }
  for (const k of ["pagamento", "aprovacaoInicial", "auditoriaFinal", "medicao", "almoxarifado", "sigma", "manutencao", "materiais", "checklist", "historico"] as const) {
    if (p[k] !== undefined) d[k] = p[k];
  }
  if (p.datas) {
    if (p.datas.abertura != null) d.dataAbertura = new Date(p.datas.abertura);
    if (p.datas.conclusao != null) d.dataConclusao = new Date(p.datas.conclusao);
  }
  if (p.responsavelAtual) {
    d.responsavelSetor = p.responsavelAtual.setor;
    d.responsavelPessoa = p.responsavelAtual.pessoa ?? null;
  }
  return d;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  const row = await prisma.card.findUnique({ where: { id: params.id } });
  if (!row) return NextResponse.json({ erro: "Card não encontrado." }, { status: 404 });
  return NextResponse.json({ card: rowToCard(row) });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const existente = await prisma.card.findUnique({ where: { id: params.id } });
  if (!existente) return NextResponse.json({ erro: "Card não encontrado." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Partial<Card>;
  const chaves = Object.keys(body);
  const tocaEdit = chaves.some((k) => CAMPOS_EDIT.includes(k));
  const tocaGate = chaves.some((k) => CAMPOS_GATE.includes(k));

  if (tocaEdit && !podeEditarCard(s.perfil, existente.etapa, existente.fluxo)) {
    return NextResponse.json({ erro: "Seu perfil não pode editar os dados deste card nesta etapa." }, { status: 403 });
  }
  if (tocaGate && !podeExecutarEtapa(s.perfil, existente.etapa, existente.modalidade ?? undefined)) {
    return NextResponse.json({ erro: "Seu perfil não pode executar a ação desta etapa." }, { status: 403 });
  }
  // Na Manutenção, mover etapa só pelos caminhos válidos do fluxo.
  if (body.etapa != null && body.etapa !== existente.etapa && existente.fluxo === "MANUTENCAO") {
    const destinos = destinosManutencao(existente.etapa as EtapaManutencao);
    if (!destinos.includes(body.etapa as EtapaManutencao)) {
      return NextResponse.json({ erro: "Transição inválida na esteira de Manutenção." }, { status: 422 });
    }
    // Execução → Medição exige os dois flags do checklist concluídos.
    if (existente.etapa === "EXECUCAO" && body.etapa === "MEDICAO") {
      const checklist = (body.checklist ?? existente.checklist ?? []) as Card["checklist"];
      if (!execucaoManutencaoCompleta({ checklist })) {
        return NextResponse.json({ erro: "Conclua o checklist da Execução (Orçamento concluído e Sistema comunicando)." }, { status: 422 });
      }
    }
    // Medição → Encerrados exige o nº do chamado registrado pela Medição.
    if (existente.etapa === "MEDICAO" && body.etapa === "ENCERRADOS") {
      const medExistente = existente.medicao as { chamado?: string } | null;
      const chamado = body.medicao?.chamado ?? medExistente?.chamado;
      if (!chamado || !String(chamado).trim()) {
        return NextResponse.json({ erro: "Informe o nº do chamado antes de encerrar." }, { status: 422 });
      }
    }
  }

  const data = patchToData(body);
  // Histórico de movimentações: toda mudança de etapa via PATCH é registrada.
  if (body.etapa != null && body.etapa !== existente.etapa) {
    const hist = Array.isArray(existente.historico) ? (existente.historico as unknown[]) : [];
    const encerrando = body.etapa === "ENCERRADOS";
    const col = colunasDoFluxo(existente.fluxo as Fluxo).find((c) => c.id === body.etapa);
    const evento = {
      id: `h${hist.length}`,
      data: new Date().toISOString(),
      setor: col?.setorResponsavel ?? "ADMINISTRATIVO",
      autor: s.nome,
      acao: encerrando ? "OS encerrada" : `Movido para ${rotuloEtapa(body.etapa)}`,
      de: existente.etapa,
      para: body.etapa,
    };
    data.historico = [...hist, evento] as unknown as object[];
    if (encerrando && data.dataConclusao == null) data.dataConclusao = new Date();
  }

  const row = await prisma.card.update({ where: { id: params.id }, data });
  return NextResponse.json({ card: rowToCard(row) });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const existente = await prisma.card.findUnique({ where: { id: params.id } });
  if (!existente) return NextResponse.json({ erro: "Card não encontrado." }, { status: 404 });

  // Excluir: somente Coordenador (qualquer etapa) e Comercial (etapa Comercial).
  // O Assistente edita rotinas de Manutenção, mas não exclui.
  if (!podeExcluirCard(s.perfil, existente.etapa)) {
    return NextResponse.json({ erro: "Sem permissão para excluir este card." }, { status: 403 });
  }
  await prisma.card.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
