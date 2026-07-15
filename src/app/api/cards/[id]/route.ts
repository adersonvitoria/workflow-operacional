import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { obterSessao } from "@/lib/server-auth";
import { podeEditarCard, podeExcluirCard, podeExecutarEtapa } from "@/lib/perfis";
import { carregarConfigPerfis } from "@/lib/perfis-server";
import { destinosManutencaoCard, ehRetrocessoImplantacao, ehRetrocessoManutencao, rotuloEtapa } from "@/lib/routing";
import { colunasDoFluxo } from "@/lib/flows";
import { rowToCard } from "@/lib/mappers";
import type { Card, EtapaImplantacao, EtapaManutencao, Fluxo } from "@/types";

// Campos "editoriais" (dados do card) vs campos de "gate" (aprovar/checar).
const CAMPOS_EDIT = ["cliente", "valores", "modalidade", "natureza", "prioridade", "cr", "cc", "crMonitoramento", "crLocacao", "crServico", "crMaterial", "crMensalidade", "margemVenda", "temContrato", "crDedicado", "temInvestimento", "chamadoInvestimento", "chamado", "numeroOrcamento", "numeroConta", "regiao", "datas", "observacoes", "pagamento"];
// Período de execução/equipe/chip são preenchidos pela Técnica no gate da etapa.
const CAMPOS_GATE = ["aprovacaoInicial", "auditoriaFinal", "medicao", "almoxarifado", "sigma", "checklist", "historico", "etapa", "status", "responsavelAtual", "dataInicioExecucao", "dataFimExecucao", "tecnicos", "auxiliarTecnico", "numeroChip"];

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
    d.valorLocacao = p.valores.locacao ?? null;
  }
  for (const k of ["modalidade", "natureza", "prioridade", "status", "etapa", "cr", "cc", "crMonitoramento", "crLocacao", "crServico", "crMaterial", "crMensalidade", "margemVenda", "temContrato", "crDedicado", "temInvestimento", "chamadoInvestimento", "chamado", "numeroOrcamento", "numeroConta", "regiao", "observacoes"] as const) {
    if (p[k] !== undefined) d[k] = p[k];
  }
  for (const k of ["pagamento", "aprovacaoInicial", "auditoriaFinal", "medicao", "almoxarifado", "sigma", "manutencao", "materiais", "checklist", "historico"] as const) {
    if (p[k] !== undefined) d[k] = p[k];
  }
  if (p.datas) {
    if (p.datas.abertura != null) d.dataAbertura = new Date(p.datas.abertura);
    if (p.datas.conclusao != null) d.dataConclusao = new Date(p.datas.conclusao);
  }
  // Datas "puras" (YYYY-MM-DD) viram meio-dia local para não cair em d-1 (fuso).
  const dataPura = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T12:00:00`) : new Date(v));
  for (const k of ["dataInicioExecucao", "dataFimExecucao"] as const) {
    if (p[k] !== undefined) d[k] = p[k] ? dataPura(p[k] as string) : null;
  }
  for (const k of ["tecnicos", "auxiliarTecnico", "numeroChip"] as const) {
    if (p[k] !== undefined) d[k] = p[k] ?? null;
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
  await carregarConfigPerfis();

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
  // Mover etapa: na Manutenção só pelos caminhos válidos do fluxo. O Coordenador
  // pode retroceder o card para qualquer raia anterior (Manutenção e Implantação).
  const mudaEtapa = body.etapa != null && body.etapa !== existente.etapa;
  const retrocessoCoord = mudaEtapa && existente.fluxo === "MANUTENCAO"
    && s.perfil === "COORDENADOR" && ehRetrocessoManutencao(existente.etapa as EtapaManutencao, body.etapa as EtapaManutencao);
  const retrocessoCoordImpl = mudaEtapa && existente.fluxo === "IMPLANTACAO"
    && s.perfil === "COORDENADOR" && ehRetrocessoImplantacao(existente.etapa as EtapaImplantacao, body.etapa as EtapaImplantacao);
  // Implantação só muda de etapa via "Avançar" (endpoint dedicado); por PATCH só
  // é permitido o retrocesso do Coordenador.
  if (mudaEtapa && existente.fluxo === "IMPLANTACAO" && !retrocessoCoordImpl) {
    return NextResponse.json({ erro: "Use o botão Avançar para mover o card na Implantação." }, { status: 422 });
  }
  if (body.etapa != null && body.etapa !== existente.etapa && existente.fluxo === "MANUTENCAO" && !retrocessoCoord) {
    const destinos = destinosManutencaoCard({ etapa: existente.etapa as EtapaManutencao, complementar: existente.complementar });
    if (!destinos.includes(body.etapa as EtapaManutencao)) {
      return NextResponse.json({ erro: "Transição inválida na esteira de Manutenção." }, { status: 422 });
    }
    // Orçamento → Aguardando exige número e valor do orçamento.
    if (existente.etapa === "ORCAMENTO" && body.etapa === "ORC_AGUARDANDO") {
      const numero = body.numeroOrcamento ?? existente.numeroOrcamento;
      const valor = body.valores?.total ?? existente.valorTotal;
      if (!numero || !String(numero).trim() || valor == null || Number(valor) <= 0) {
        return NextResponse.json({ erro: "Informe o número e o valor do orçamento antes de enviar." }, { status: 422 });
      }
    }
    // Medição → Encerrados exige nº do chamado, CR e competência (mês/ano).
    if (existente.etapa === "MEDICAO" && body.etapa === "ENCERRADOS") {
      const medExistente = existente.medicao as { chamado?: string; competencia?: string; visitaIsenta?: boolean } | null;
      const chamado = body.medicao?.chamado ?? medExistente?.chamado;
      const competencia = body.medicao?.competencia ?? medExistente?.competencia;
      const cr = body.cr ?? existente.cr;
      if (!chamado || !String(chamado).trim() || !cr || !String(cr).trim() || !competencia || !String(competencia).trim()) {
        return NextResponse.json({ erro: "Informe o nº do chamado, o CR e a competência antes de encerrar." }, { status: 422 });
      }
      // Visita Isenta exige o Nº do orçamento.
      const visitaIsenta = body.medicao?.visitaIsenta ?? medExistente?.visitaIsenta;
      const numeroOrcamento = body.numeroOrcamento ?? existente.numeroOrcamento;
      if (visitaIsenta && (!numeroOrcamento || !String(numeroOrcamento).trim())) {
        return NextResponse.json({ erro: "Visita Isenta: informe o Nº do orçamento antes de encerrar." }, { status: 422 });
      }
    }
  }

  const data = patchToData(body);
  // Ao retroceder na Implantação, desliga a tag de conferência (rewind manual).
  if (retrocessoCoordImpl) data.conferenciaSuprimentos = false;
  // Histórico de movimentações: toda mudança de etapa via PATCH é registrada.
  if (body.etapa != null && body.etapa !== existente.etapa) {
    const hist = Array.isArray(existente.historico) ? (existente.historico as unknown[]) : [];
    const encerrando = body.etapa === "ENCERRADOS";
    const col = colunasDoFluxo(existente.fluxo as Fluxo).find((c) => c.id === body.etapa);
    const acao = encerrando
      ? "OS encerrada"
      : (retrocessoCoord || retrocessoCoordImpl)
        ? `Retrocedido para ${rotuloEtapa(body.etapa)}`
        : `Movido para ${rotuloEtapa(body.etapa)}`;
    const evento = {
      id: `h${hist.length}`,
      data: new Date().toISOString(),
      setor: col?.setorResponsavel ?? "ADMINISTRATIVO",
      autor: s.nome,
      acao,
      de: existente.etapa,
      para: body.etapa,
    };
    data.historico = [...hist, evento] as unknown as object[];
    if (encerrando && data.dataConclusao == null) data.dataConclusao = new Date();
    // Ao reabrir (sair de Encerrados), limpa a data de encerramento.
    if (existente.etapa === "ENCERRADOS" && body.etapa !== "ENCERRADOS") data.dataConclusao = null;
  }

  const row = await prisma.card.update({ where: { id: params.id }, data });
  return NextResponse.json({ card: rowToCard(row) });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const s = await obterSessao();
  if (!s) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  await carregarConfigPerfis();

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
