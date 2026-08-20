"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  COMPLEMENTAR_META,
  CONFERENCIA_META,
  ORIGEM_IMPLANTACAO_META,
  criticidadeDoCard,
  CRITICIDADE_META,
  duracaoAteEncerrar,
  formatarBRL,
  MODALIDADE_META,
  SETOR_ROTULO,
  STATUS_META,
  TIPO_CLIENTE_META,
} from "@/lib/flows";
import { CHECKLIST_CHEQUE_MONITORAMENTO, CHECKLIST_TECNICA, classificacaoComprasCompleta, destinosCompras, destinosManutencaoCard, entregaComprasCompleta, etapaAnteriorCompras, etapaAnteriorImplantacao, etapaAnteriorManutencao, podeAvancar, rotuloEtapa, separacaoComprasCompleta } from "@/lib/routing";
import { useAuth } from "@/lib/auth";
import { useTecnicos } from "@/lib/tecnicos-store";
import { ComboPessoa } from "@/components/forms/ComboPessoa";
import { donoDaEtapa, PERFIL_META, podeEditarCard, podeExcluirCard, podeExecutarEtapa } from "@/lib/perfis";
import type { Card, EtapaCompras, EtapaImplantacao, EtapaManutencao, FormaPagamento, ItemCompra, LancamentoMedicao } from "@/types";

const TURNO_ROTULO: Record<string, string> = { MANHA: "Manhã", TARDE: "Tarde", DIA: "Dia" };

function fmtData(iso?: string): string {
  if (!iso) return "—";
  // Datas "puras" (YYYY-MM-DD), como a data da visita, são formatadas sem fuso —
  // `new Date("2026-06-29")` é meia-noite UTC e, no horário do Brasil (UTC-3),
  // cairia em 28/06 (d-1). Formatamos direto a partir das partes da string.
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

interface CardSlideOverProps {
  card: Card | null;
  onFechar: () => void;
  onPatch: (patch: Partial<Card>) => void;
  onAvancar: () => void;
  onEditar: () => void;
  onExcluir: () => void;
  /** Manutenção · Cheque: gera um Orçamento Complementar na coluna Orçamento. */
  onOrcamentoComplementar: () => void;
  /** Envia o card à esteira de Compras (Manutenção·Aprovado ou Implantação·Coordenação). */
  onEnviarCompras: () => void;
  /** Compras · Entrega (final): devolve o card à esteira de origem. */
  onConcluirEntrega: () => void;
  /** Compras (Coordenador): retrocede o card para a coluna de origem. */
  onRetrocederOrigem: () => void;
}

type Aba = "detalhes" | "historico";

/**
 * Painel lateral de detalhes (controlado pelo store). Os gates precisam ser
 * satisfeitos para o botão "Avançar" liberar — lógica à prova de erros.
 */
export function CardSlideOver({ card, onFechar, onPatch, onAvancar, onEditar, onExcluir, onOrcamentoComplementar, onEnviarCompras, onConcluirEntrega, onRetrocederOrigem }: CardSlideOverProps) {
  const [aba, setAba] = useState<Aba>("detalhes");
  const { atual } = useAuth();
  const perfil = atual?.perfil;
  const aberto = card != null;
  const validacao = card ? podeAvancar(card) : { ok: false as const };
  const podeAgir = card ? podeExecutarEtapa(perfil, card.etapa, card.modalidade) : false;
  const podeEditar = card ? podeEditarCard(perfil, card.etapa, card.fluxo) : false;
  const podeExcluir = card ? podeExcluirCard(perfil, card.etapa) : false;
  const dono = card ? donoDaEtapa(card.etapa, card.modalidade) : undefined;
  // Destinos válidos para avançar uma entrada de Manutenção a partir da etapa atual.
  const destinosMan = card && card.fluxo === "MANUTENCAO" ? destinosManutencaoCard(card) : [];
  const ehCoordenador = perfil === "COORDENADOR";
  const anteriorMan = card && card.fluxo === "MANUTENCAO" ? etapaAnteriorManutencao(card.etapa as EtapaManutencao) : null;
  const anteriorImpl = card && card.fluxo === "IMPLANTACAO" ? etapaAnteriorImplantacao(card.etapa as EtapaImplantacao) : null;
  // Compras: fluxo linear — próximo destino + retrocesso do Coordenador.
  const destinosCompra = card && card.fluxo === "COMPRAS" ? destinosCompras(card.etapa as EtapaCompras) : [];
  const anteriorCompra = card && card.fluxo === "COMPRAS" ? etapaAnteriorCompras(card.etapa as EtapaCompras) : null;
  const man = card?.manutencao ?? {};
  const crit = card ? criticidadeDoCard(card) : undefined;

  return (
    <>
      <div
        onClick={onFechar}
        className={["fixed inset-0 z-40 bg-slate-900/30 transition-opacity", aberto ? "opacity-100" : "pointer-events-none opacity-0"].join(" ")}
      />

      <aside
        className={["fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-surface-card shadow-slideover transition-transform duration-300 dark:bg-slate-900", aberto ? "translate-x-0" : "translate-x-full"].join(" ")}
      >
        {card && (
          <>
            <header className="border-b border-slate-200 px-5 pt-4 dark:border-slate-800">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs text-slate-400">#{card.codigo}</span>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{card.cliente.nome}</h2>
                </div>
                <div className="flex items-center gap-1">
                  {podeEditar && <button onClick={onEditar} className="rounded-lg px-2 py-1 text-xs font-medium text-brand hover:bg-brand/10">Editar</button>}
                  {podeExcluir && <button onClick={onExcluir} className="rounded-lg px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/15">Excluir</button>}
                  <button onClick={onFechar} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Fechar">✕</button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {card.complementar && <Tag classe={COMPLEMENTAR_META.classe}>{COMPLEMENTAR_META.rotulo}</Tag>}
                {card.fluxo === "COMPRAS" && card.origemCompras === "IMPLANTACAO" && (
                  <Tag classe={ORIGEM_IMPLANTACAO_META.classe}>{ORIGEM_IMPLANTACAO_META.rotulo}</Tag>
                )}
                {card.conferenciaSuprimentos && <Tag classe={CONFERENCIA_META.classe}>{CONFERENCIA_META.rotulo}</Tag>}
                {card.modalidade && <Tag classe={MODALIDADE_META[card.modalidade].classe}>{MODALIDADE_META[card.modalidade].rotulo}</Tag>}
                <Tag classe={STATUS_META[card.status].classe}>{STATUS_META[card.status].rotulo}</Tag>
                <Tag classe="bg-slate-100 text-slate-600 ring-slate-200">{rotuloEtapa(card.etapa)}</Tag>
              </div>

              <div className="-mb-px mt-3 flex gap-4">
                {(["detalhes", "historico"] as Aba[]).map((a) => (
                  <button key={a} onClick={() => setAba(a)} className={["border-b-2 pb-2 text-sm font-medium transition", aba === a ? "border-brand text-brand" : "border-transparent text-slate-400 hover:text-slate-600"].join(" ")}>
                    {a === "detalhes" ? "Detalhes" : "Histórico"}
                  </button>
                ))}
              </div>
            </header>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
              {aba === "detalhes" ? (
                <>
                  {card.fluxo === "IMPLANTACAO" && (podeAgir ? (
                    <GateAtual card={card} patch={onPatch} />
                  ) : (
                    dono && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                        🔒 Esta etapa é do setor <strong>{PERFIL_META[dono].rotulo}</strong>. Você está logado como <strong>{perfil ? PERFIL_META[perfil].rotulo : "—"}</strong> e não pode executar a ação aqui.
                      </div>
                    )
                  ))}

                  {card.fluxo === "IMPLANTACAO" && (
                    <>
                      <Secao titulo="Identificação">
                        <dl className="grid grid-cols-2 gap-3 text-sm">
                          {card.modalidade === "LOCACAO" ? (
                            <>
                              <Campo rotulo="CR de monitoramento" valor={card.crMonitoramento ?? "—"} />
                              <Campo rotulo="CR de locação" valor={card.crLocacao ?? "—"} />
                            </>
                          ) : card.modalidade === "VENDA" ? (
                            <>
                              <Campo rotulo="CR de serviço" valor={card.crServico ?? "—"} />
                              <Campo rotulo="CR de material" valor={card.crMaterial ?? "—"} />
                              <Campo rotulo="CR de mensalidade" valor={card.crMensalidade ?? "—"} />
                            </>
                          ) : (
                            <Campo rotulo="CR (Centro de Resultado)" valor={card.cr ?? "—"} />
                          )}
                          <Campo rotulo="Tipo de cliente" valor={card.cliente.tipo ? TIPO_CLIENTE_META[card.cliente.tipo].rotulo : "—"} />
                          <Campo rotulo="Criticidade" valor={crit ? CRITICIDADE_META[crit].rotulo : "—"} />
                          {/* Conta criada no Monitoramento — segue visível nas etapas seguintes. */}
                          {card.sigma?.contaSigma && <Campo rotulo="Nº da conta (Monitoramento)" valor={card.sigma.contaSigma} destaque />}
                          <Campo rotulo="Região" valor={card.regiao ?? "—"} />
                          {(card.dataInicioExecucao || card.dataFimExecucao) && (
                            <Campo rotulo="Período de execução" valor={`${fmtData(card.dataInicioExecucao)} – ${fmtData(card.dataFimExecucao)}`} destaque />
                          )}
                          {card.tecnicos && <Campo rotulo="Técnico" valor={card.tecnicos} />}
                          {card.auxiliarTecnico && <Campo rotulo="Aux. Técnico" valor={card.auxiliarTecnico} />}
                          {card.numeroChip && <Campo rotulo="Nº do chip" valor={card.numeroChip} />}
                          {card.temContrato && <Campo rotulo="Nº do chamado" valor={card.chamado ?? "—"} />}
                          {card.crDedicado && <Campo rotulo="Nº do CR" valor={card.cr ?? "—"} />}
                          {card.temInvestimento && <Campo rotulo="Nº do chamado de investimento" valor={card.chamadoInvestimento ?? "—"} />}
                          <Campo rotulo="Documento" valor={card.cliente.documento ?? "—"} />
                          {card.datas?.conclusao && <Campo rotulo="Encerrado em" valor={fmtData(card.datas.conclusao)} destaque />}
                          {duracaoAteEncerrar(card) && <Campo rotulo="Tempo na esteira" valor={duracaoAteEncerrar(card)!} destaque />}
                        </dl>
                      </Secao>

                      <Secao titulo="Financeiro">
                        <dl className="grid grid-cols-2 gap-3 text-sm">
                          {card.modalidade === "VENDA" ? (
                            <>
                              <Campo rotulo="Valor de serviço" valor={formatarBRL(card.valores.maoDeObra)} />
                              <Campo rotulo="Valor de material" valor={formatarBRL(card.valores.equipamentos)} />
                              <Campo rotulo="Valor de mensalidade" valor={formatarBRL(card.valores.mensal)} />
                              <Campo rotulo="Margem de venda" valor={card.margemVenda != null ? `${card.margemVenda}%` : "—"} />
                              <Campo rotulo="Total" valor={formatarBRL(card.valores.total)} destaque />
                            </>
                          ) : card.modalidade === "LOCACAO" ? (
                            <>
                              <Campo rotulo="Mensalidade" valor={formatarBRL(card.valores.mensal)} />
                              <Campo rotulo="Valor de locação" valor={formatarBRL(card.valores.locacao)} />
                              <Campo rotulo="Mão de obra" valor={formatarBRL(card.valores.maoDeObra)} />
                              <Campo rotulo="Equipamentos" valor={formatarBRL(card.valores.equipamentos)} />
                              <Campo rotulo="Total" valor={formatarBRL(card.valores.total)} destaque />
                            </>
                          ) : (
                            <>
                              <Campo rotulo="Mão de obra" valor={formatarBRL(card.valores.maoDeObra)} />
                              <Campo rotulo="Equipamentos" valor={formatarBRL(card.valores.equipamentos)} />
                              <Campo rotulo="Total" valor={formatarBRL(card.valores.total)} destaque />
                              <Campo rotulo="Mensal" valor={formatarBRL(card.valores.mensal)} />
                            </>
                          )}
                        </dl>
                      </Secao>
                    </>
                  )}

                  {card.fluxo === "MANUTENCAO" && (
                    <Secao titulo="Atendimento">
                      <dl className="grid grid-cols-2 gap-3 text-sm">
                        {man.tipo && <Campo rotulo="Tipo de entrada" valor={man.tipo === "ORCAMENTO" ? "Orçamento" : "Visita"} destaque />}
                        {man.tipo === "ORCAMENTO" && <Campo rotulo="Data de início" valor={fmtData(man.dataInicio)} />}
                        {man.tipo === "ORCAMENTO" && <Campo rotulo="Data de fim" valor={fmtData(man.dataFim)} />}
                        <Campo rotulo="Tipo de cliente" valor={card.cliente.tipo ? TIPO_CLIENTE_META[card.cliente.tipo].rotulo : "—"} />
                        <Campo rotulo="Criticidade" valor={crit ? CRITICIDADE_META[crit].rotulo : "—"} />
                        {man.tipo !== "ORCAMENTO" && <Campo rotulo="Data da visita" valor={fmtData(man.dataVisita)} />}
                        {man.tipo !== "ORCAMENTO" && <Campo rotulo="Visita cobrada" valor={man.visitaCobrada ? "Sim" : "Não"} />}
                        {man.visitaCobrada && man.tipo !== "ORCAMENTO" && <Campo rotulo="Valor da visita" valor={formatarBRL(man.valorVisita)} />}
                        {card.medicao?.visitaIsenta && <Campo rotulo="Visita Isenta" valor="Sim · não gera receita" destaque />}
                        {card.medicao?.visitaIsenta && <Campo rotulo="Isenta pelo orçamento" valor={card.numeroOrcamento ?? "—"} destaque />}
                        <Campo rotulo="Turno" valor={man.turno ? (TURNO_ROTULO[man.turno] ?? man.turno) : "—"} />
                        <Campo rotulo="Número da conta" valor={card.numeroConta ?? "—"} />
                        <Campo rotulo="Região" valor={man.regiao ?? "—"} />
                        <Campo rotulo="Ordem de serviço" valor={man.ordemServico ?? "—"} />
                        <Campo rotulo="Agendado" valor={man.agendado ? "Sim" : "Não"} />
                        <Campo rotulo="Técnico" valor={man.tecnico ?? "—"} />
                        <Campo rotulo="Auxiliar técnico" valor={man.auxiliarTecnico ?? "—"} />
                        <Campo rotulo="Tipo de atendimento" valor={man.tipoAtendimento ?? "—"} />
                        {man.tipo !== "VISITA" && !card.medicao?.visitaIsenta && <Campo rotulo="Número do orçamento" valor={card.numeroOrcamento ?? "—"} />}
                        {card.orcamentoPdfNome && (
                          <div>
                            <dt className="text-xs text-slate-400">Orçamento (PDF)</dt>
                            <dd>
                              <a href={`/api/cards/${card.id}/orcamento-pdf`} target="_blank" rel="noreferrer" className="truncate font-medium text-brand hover:underline" title={card.orcamentoPdfNome}>
                                📄 {card.orcamentoPdfNome}
                              </a>
                            </dd>
                          </div>
                        )}
                        <Campo rotulo="Setor" valor={man.setor ?? "—"} />
                        <Campo rotulo="Nº do chamado" valor={card.medicao?.chamado ?? card.chamado ?? "—"} />
                        <Campo rotulo="CR" valor={card.cr ?? "—"} />
                        {(card.medicao?.lancamentos ?? []).length > 1 && (
                          <Campo rotulo="Medição rateada" valor={`${card.medicao!.lancamentos!.length} linhas · ${formatarBRL(card.medicao?.valorMedicao)}`} destaque />
                        )}
                        <Campo rotulo="Competência" valor={card.medicao?.competencia ?? "—"} />
                        {card.datas?.conclusao && <Campo rotulo="Encerrado em" valor={fmtData(card.datas.conclusao)} destaque />}
                        {duracaoAteEncerrar(card) && <Campo rotulo="Tempo na esteira" valor={duracaoAteEncerrar(card)!} destaque />}
                        {man.tipo !== "VISITA" && <Campo rotulo="Valor do orçamento" valor={formatarBRL(card.valores.total)} destaque />}
                      </dl>
                    </Secao>
                  )}

                  {/* COMPRAS: dados do orçamento + itens (edição conforme a etapa). */}
                  {card.fluxo === "COMPRAS" && (
                    <>
                      <Secao titulo="Orçamento">
                        <dl className="grid grid-cols-2 gap-3 text-sm">
                          <Campo rotulo="Nº do orçamento" valor={card.numeroOrcamento ?? "—"} />
                          <Campo rotulo="Data solicitada (aprovação)" valor={fmtData(card.datas?.abertura)} />
                          {card.orcamentoPdfNome && (
                            <div>
                              <dt className="text-xs text-slate-400">Orçamento (PDF)</dt>
                              <dd>
                                <a href={`/api/cards/${card.id}/orcamento-pdf`} target="_blank" rel="noreferrer" className="truncate font-medium text-brand hover:underline" title={card.orcamentoPdfNome}>
                                  📄 {card.orcamentoPdfNome}
                                </a>
                              </dd>
                            </div>
                          )}
                          <Campo rotulo="Itens" valor={String((card.itensCompra ?? []).length)} />
                          {/* Itens em estoque não geram pagamento — ficam fora do contador. */}
                          <Campo
                            rotulo="Pagamentos pendentes"
                            valor={String((card.itensCompra ?? []).filter((i) => i.estoque !== "EM_ESTOQUE" && i.statusPagamento !== "PAGO").length)}
                            destaque={(card.itensCompra ?? []).some((i) => i.estoque !== "EM_ESTOQUE" && i.statusPagamento !== "PAGO")}
                          />
                        </dl>
                      </Secao>
                      <ItensCompraGate card={card} patch={onPatch} podeAgir={podeAgir} />
                    </>
                  )}

                  {card.fluxo === "MANUTENCAO" && card.etapa === "ORCAMENTO" && podeAgir && (
                    <OrcamentoGate card={card} patch={onPatch} />
                  )}

                  {card.fluxo === "MANUTENCAO" && card.etapa === "MEDICAO" && podeAgir && (
                    <MedicaoChamadoGate card={card} patch={onPatch} />
                  )}

                  {card.fluxo === "IMPLANTACAO" && card.materiais.length > 0 && (
                    <Secao titulo={`Kit de instalação (${card.materiais.length})`}>
                      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                        {card.materiais.map((m) => (
                          <li key={m.id} className="flex items-center justify-between px-3 py-2 text-sm">
                            <span className="min-w-0">
                              <span className="block text-slate-700 dark:text-slate-300"><span className="font-medium">{m.quantidade}x</span> {m.descricao}</span>
                              {(m.alocacao || m.cr) && (
                                <span className="block text-[11px] text-slate-400">{m.alocacao ? `Alocação: ${m.alocacao}` : ""}{m.alocacao && m.cr ? " · " : ""}{m.cr ? `CR ${m.cr}` : ""}</span>
                              )}
                            </span>
                            <span className="ml-2 shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">{m.statusAlmox}</span>
                          </li>
                        ))}
                      </ul>
                    </Secao>
                  )}

                  {/* Mostra apenas o checklist da Técnica · Execução (os flags do
                      Cheque · Monitoramento aparecem só no gate da etapa). Na
                      própria Técnica com o gate aberto, a seção some — o gate já
                      exibe o checklist (evita duplicidade). */}
                  {card.fluxo === "IMPLANTACAO" && !(card.etapa === "TECNICA" && podeAgir) && card.checklist.some((c) => c.etapa === "TECNICA") && (
                    <Secao titulo="Checklist da Técnica · Execução">
                      <ul className="space-y-1.5">
                        {card.checklist.filter((c) => c.etapa === "TECNICA").map((item) => (
                          <li key={item.id}>
                            <button type="button" disabled={!podeAgir} onClick={() => podeAgir && onPatch({ checklist: card.checklist.map((c) => (c.id === item.id ? { ...c, concluido: !c.concluido } : c)) })} className="flex w-full items-center gap-2 text-left text-sm disabled:cursor-default">
                              <span className={["flex h-4 w-4 items-center justify-center rounded border text-[10px]", item.concluido ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-transparent"].join(" ")}>✓</span>
                              <span className={item.concluido ? "text-slate-500 line-through" : "text-slate-700 dark:text-slate-300"}>{item.rotulo}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </Secao>
                  )}

                  {/* Anexos PDF: upload no Comercial (Implantação) e no Pedido ao
                      Fornecedor (Compras); a lista aparece em qualquer etapa. */}
                  <AnexosPdf card={card} podeAgir={podeAgir} />

                  {card.observacoes && (
                    <Secao titulo="Observações">
                      <p className="text-sm text-slate-600 dark:text-slate-300">{card.observacoes}</p>
                    </Secao>
                  )}
                </>
              ) : (
                <Secao titulo="Histórico">
                  <ol className="space-y-3 border-l-2 border-slate-100 pl-4 dark:border-slate-800">
                    {[...card.historico].reverse().map((ev) => (
                      <li key={ev.id} className="relative text-sm">
                        <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-brand ring-2 ring-white dark:ring-slate-900" />
                        <p className="font-medium text-slate-700 dark:text-slate-200">{ev.acao}</p>
                        <p className="text-xs text-slate-400">{SETOR_ROTULO[ev.setor]} · {ev.autor} · {new Date(ev.data).toLocaleDateString("pt-BR")}</p>
                      </li>
                    ))}
                  </ol>
                </Secao>
              )}
            </div>

            {card.fluxo === "IMPLANTACAO" ? (
              <footer className="space-y-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
                {/* Coordenação: o cheque aprova o escopo e envia o card à esteira de Compras. */}
                {card.etapa === "COORDENACAO_APROVACAO" ? (
                  podeAgir && (
                    <button
                      onClick={onEnviarCompras}
                      className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
                      title="Aprova o escopo e envia o card à esteira de Compras (Separação); após a Entrega ele volta ao Monitoramento"
                    >
                      ✓ Dar cheque e enviar para Compras · Separação →
                    </button>
                  )
                ) : (
                  <>
                    {podeAgir && !validacao.ok && validacao.motivo && (
                      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30">⚠ {validacao.motivo}</p>
                    )}
                    <button
                      onClick={onAvancar}
                      disabled={!validacao.ok || !podeAgir}
                      className={["w-full rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition", validacao.ok && podeAgir ? "bg-brand text-white hover:bg-brand-700" : "cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"].join(" ")}
                    >
                      {validacao.ok && validacao.proxima ? `Avançar para ${rotuloEtapa(validacao.proxima)} →` : "Avançar etapa"}
                    </button>
                  </>
                )}
                {ehCoordenador && anteriorImpl && (
                  <button
                    onClick={() => onPatch({ etapa: anteriorImpl })}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    title="Retroceder o card para a coluna anterior"
                  >
                    ↩ Retroceder para {rotuloEtapa(anteriorImpl)}
                  </button>
                )}
              </footer>
            ) : card.fluxo === "COMPRAS" ? (
              ((podeAgir && (destinosCompra.length > 0 || card.etapa === "ENTREGA")) || (ehCoordenador && anteriorCompra)) && (
                <footer className="space-y-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
                  {/* Entrega (final): concluída, o card volta à esteira de ORIGEM. */}
                  {podeAgir && card.etapa === "ENTREGA" && (() => {
                    const bloqueado = !entregaComprasCompleta(card);
                    const destino = card.origemCompras === "IMPLANTACAO" ? "Implantação (Monitoramento)" : "Manutenção (Agendamento)";
                    return (
                      <div>
                        {bloqueado && (
                          <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30">⚠ Registre a data de entrega de todos os itens antes de concluir.</p>
                        )}
                        <button
                          onClick={() => !bloqueado && onConcluirEntrega()}
                          disabled={bloqueado}
                          className={["w-full rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition", bloqueado ? "cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500" : "bg-brand text-white hover:bg-brand-700"].join(" ")}
                          title={`O card volta para a esteira de origem: ${destino}`}
                        >
                          Concluir entrega · {destino} →
                        </button>
                      </div>
                    );
                  })()}
                  {podeAgir && destinosCompra.map((d) => {
                    // Gates: Separação exige em estoque/falta por item;
                    // Classificação exige tipo de custo + CC por item.
                    let bloqueado = false;
                    let aviso = "";
                    if (card.etapa === "SEPARACAO" && d === "CLASSIFICACAO" && !separacaoComprasCompleta(card)) {
                      bloqueado = true;
                      aviso = "Marque cada item (em estoque ou falta) antes de avançar.";
                    }
                    if (card.etapa === "CLASSIFICACAO" && d === "PEDIDO_FORNECEDOR" && !classificacaoComprasCompleta(card)) {
                      bloqueado = true;
                      aviso = "Classifique os itens a comprar (tipo de custo e centro de custo) — itens em estoque dispensam.";
                    }
                    return (
                      <div key={d}>
                        {bloqueado && (
                          <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30">⚠ {aviso}</p>
                        )}
                        <button
                          onClick={() => !bloqueado && onPatch({ etapa: d })}
                          disabled={bloqueado}
                          className={["w-full rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition", bloqueado ? "cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500" : "bg-brand text-white hover:bg-brand-700"].join(" ")}
                        >
                          Avançar para {rotuloEtapa(d)} →
                        </button>
                      </div>
                    );
                  })}
                  {ehCoordenador && anteriorCompra && (
                    <button
                      onClick={() => onPatch({ etapa: anteriorCompra })}
                      className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      title="Retroceder o card para a coluna anterior"
                    >
                      ↩ Retroceder para {rotuloEtapa(anteriorCompra)}
                    </button>
                  )}
                  {/* Sai da esteira: volta para a coluna de origem do card. */}
                  {ehCoordenador && (
                    <button
                      onClick={onRetrocederOrigem}
                      className="w-full rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25"
                      title={card.origemCompras === "IMPLANTACAO"
                        ? "O card sai de Compras e volta à Implantação (Coordenação · Aprovação)"
                        : "O card sai de Compras e volta à Manutenção (Aprovado); de lá dá para retroceder ao Orçamento"}
                    >
                      ↩↩ Retroceder para {card.origemCompras === "IMPLANTACAO" ? "Implantação · Coordenação" : "Manutenção · Aprovado"}
                    </button>
                  )}
                </footer>
              )
            ) : (
              ((podeAgir && (destinosMan.length > 0 || card.etapa === "ORC_APROVADO")) || (ehCoordenador && anteriorMan)) && (
                <footer className="space-y-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
                  {/* Aprovado: o avanço envia o card para a esteira de Compras (Separação). */}
                  {podeAgir && card.etapa === "ORC_APROVADO" && (
                    <button
                      onClick={onEnviarCompras}
                      className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
                      title="O card muda para a esteira de Compras, entrando na coluna Separação"
                    >
                      Avançar para Compras · Separação →
                    </button>
                  )}
                  {podeAgir && destinosMan.map((d) => {
                    // Gates da Manutenção antes de avançar:
                    // · Orçamento → Aguardando: número e valor do orçamento.
                    // · Medição → Encerrados: nº do chamado, CR e competência.
                    let bloqueado = false;
                    let aviso = "";
                    if (card.etapa === "ORCAMENTO" && d === "ORC_AGUARDANDO" && (!card.numeroOrcamento?.trim() || !card.valores.total)) {
                      bloqueado = true;
                      aviso = "Informe o número e o valor do orçamento antes de enviar.";
                    }
                    // O PDF do orçamento é obrigatório para sair da coluna Orçamento.
                    if (card.etapa === "ORCAMENTO" && d === "ORC_AGUARDANDO" && !card.orcamentoPdfNome) {
                      bloqueado = true;
                      aviso = "Anexe o orçamento (PDF) antes de enviar para Aguardando.";
                    }
                    // Visita Isenta: exige só o Nº do orçamento (chamado/CR/competência dispensados).
                    if (card.etapa === "MEDICAO" && d === "ENCERRADOS") {
                      if (card.medicao?.visitaIsenta) {
                        if (!card.numeroOrcamento?.trim()) {
                          bloqueado = true;
                          aviso = "Visita Isenta: informe o Nº do orçamento para encerrar.";
                        }
                      } else if (!card.medicao?.chamado?.trim() || !card.cr?.trim() || !card.medicao?.competencia?.trim()) {
                        bloqueado = true;
                        aviso = "Informe o nº do chamado, o CR e a competência para encerrar.";
                      }
                    }
                    return (
                      <div key={d}>
                        {bloqueado && (
                          <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30">⚠ {aviso}</p>
                        )}
                        <button
                          onClick={() => !bloqueado && onPatch({ etapa: d })}
                          disabled={bloqueado}
                          className={["w-full rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition", bloqueado ? "cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500" : "bg-brand text-white hover:bg-brand-700"].join(" ")}
                        >
                          Avançar para {rotuloEtapa(d)} →
                        </button>
                      </div>
                    );
                  })}
                  {/* Cheque: gera um Orçamento Complementar (card novo na coluna Orçamento). */}
                  {podeAgir && card.etapa === "CHEQUE" && (
                    <button
                      onClick={onOrcamentoComplementar}
                      className="w-full rounded-lg border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-300 dark:hover:bg-violet-500/25"
                      title="Cria um orçamento complementar na coluna Orçamento"
                    >
                      + Orçamento Complementar
                    </button>
                  )}
                  {ehCoordenador && anteriorMan && (
                    <button
                      onClick={() => onPatch({ etapa: anteriorMan })}
                      className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      title="Retroceder o card para a raia anterior"
                    >
                      ↩ Retroceder para {rotuloEtapa(anteriorMan)}
                    </button>
                  )}
                  {/* Aprovado: atalho direto para reabrir o orçamento (o card
                      pode ter voltado de Compras e precisar de revisão). */}
                  {ehCoordenador && card.etapa === "ORC_APROVADO" && (
                    <button
                      onClick={() => onPatch({ etapa: "ORCAMENTO" })}
                      className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      title="Reabrir o orçamento para revisão"
                    >
                      ↩ Retroceder para Orçamento
                    </button>
                  )}
                </footer>
              )
            )}
          </>
        )}
      </aside>
    </>
  );
}

function GateAtual({ card, patch }: { card: Card; patch: (p: Partial<Card>) => void }) {
  const etapa = card.etapa as EtapaImplantacao;
  const [sigma, setSigma] = useState(card.sigma ?? { contaCriada: false });
  // Re-sincroniza o rascunho ao trocar de card.
  useEffect(() => {
    setSigma(card.sigma ?? { contaCriada: false });
  }, [card.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (etapa === "COMERCIAL" && !card.modalidade) {
    return (
      <Gate titulo="Definir modalidade">
        <div className="flex gap-2">
          {(["LOCACAO", "VENDA"] as const).map((m) => (
            <button key={m} onClick={() => patch({ modalidade: m })} className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ring-1 ring-inset ${MODALIDADE_META[m].classe}`}>{MODALIDADE_META[m].rotulo}</button>
          ))}
        </div>
      </Gate>
    );
  }

  if (etapa === "COORDENACAO_APROVACAO") {
    // O cheque (botão no rodapé) aprova o escopo e envia o card à esteira de
    // Compras — a classificação dos itens acontece lá (Classificação).
    return (
      <Gate titulo="Coordenação · cheque">
        <p className="text-xs text-slate-600 dark:text-slate-300">
          {card.aprovacaoInicial?.aprovado
            ? "✓ Escopo aprovado."
            : "Dê o cheque no rodapé para aprovar o escopo e enviar o card à esteira de Compras (Separação). Após a Entrega, ele volta ao Monitoramento."}
        </p>
      </Gate>
    );
  }

  if (etapa === "ALMOXARIFADO") {
    return <ConferenciaAlmox card={card} patch={patch} />;
  }

  if (etapa === "SUPRIMENTOS") {
    return (
      <Gate titulo="Suprimentos · compra dos itens">
        <p className="text-xs text-slate-600 dark:text-slate-300">
          {card.modalidade === "VENDA"
            ? "Compre os itens marcados como faltantes pelo Almoxarifado."
            : "Locação: adquira 100% dos itens e avance para o Monitoramento."}
        </p>
        <ItensGate card={card} patch={patch} />
      </Gate>
    );
  }

  if (etapa === "MONITORAMENTO") {
    return (
      <Gate titulo="Criação de conta no software central">
        <input value={sigma.contaSigma ?? ""} onChange={(e) => setSigma({ ...sigma, contaSigma: e.target.value })} placeholder="Nº da conta (Sigma)" className="mb-2 w-full rounded-lg border border-slate-200 p-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
        {/* Observações (substitui o antigo campo de dados de conexão). */}
        <textarea
          value={sigma.observacoes ?? sigma.dadosConexao ?? ""}
          onChange={(e) => setSigma({ ...sigma, observacoes: e.target.value })}
          placeholder="Observações"
          rows={3}
          className="mb-2 w-full resize-none rounded-lg border border-slate-200 p-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <button onClick={() => patch({ sigma: { ...sigma, contaCriada: true, statusSync: "SINCRONIZADO" } })} disabled={card.sigma?.contaCriada} className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-emerald-200">
          {card.sigma?.contaCriada ? "✓ Conta criada" : "Confirmar criação da conta"}
        </button>
        {card.sigma?.contaCriada && (
          <button onClick={() => patch({ sigma: { ...sigma } })} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            Salvar observações
          </button>
        )}
      </Gate>
    );
  }

  if (etapa === "COORDENACAO_AUDITORIA") {
    return (
      <Gate titulo="Auditoria final da Coordenação">
        <button onClick={() => patch({ auditoriaFinal: { aprovado: true, por: "Coordenação", em: new Date().toISOString() } })} disabled={card.auditoriaFinal?.aprovado} className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-emerald-200">
          {card.auditoriaFinal?.aprovado ? "✓ Obra aprovada" : "Dar OK de qualidade"}
        </button>
      </Gate>
    );
  }

  if (etapa === "TECNICA") {
    return (
      <>
        <DadosExecucaoGate card={card} patch={patch} />
        <ChecklistTecnica card={card} patch={patch} />
      </>
    );
  }

  if (etapa === "CHEQUE_MONITORAMENTO") {
    return <ChecklistChequeMonitoramento card={card} patch={patch} />;
  }

  if (etapa === "MEDICAO") {
    return <MedicaoForm card={card} patch={patch} />;
  }

  return null;
}

/** Checklist da Técnica · Execução: conclusão do projeto + sistema comunicando. */
function ChecklistTecnica({ card, patch }: { card: Card; patch: (p: Partial<Card>) => void }) {
  function toggle(id: string, rotulo: string) {
    const existe = card.checklist.find((c) => c.id === id);
    const novo = existe
      ? card.checklist.map((c) => (c.id === id ? { ...c, concluido: !c.concluido } : c))
      : [...card.checklist, { id, etapa: "TECNICA" as const, rotulo, concluido: true, obrigatorio: true }];
    patch({ checklist: novo });
  }
  return (
    <Gate titulo="Checklist da Técnica · Execução">
      <ul className="space-y-1.5">
        {CHECKLIST_TECNICA.map((it) => {
          const done = card.checklist.some((c) => c.id === it.id && c.concluido);
          return (
            <li key={it.id}>
              <button type="button" onClick={() => toggle(it.id, it.rotulo)} className="flex w-full items-center gap-2 text-left text-sm">
                <span className={["flex h-4 w-4 items-center justify-center rounded border text-[10px]", done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-transparent dark:border-slate-600"].join(" ")}>✓</span>
                <span className={done ? "text-slate-500 line-through" : "text-slate-700 dark:text-slate-200"}>{it.rotulo}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Gate>
  );
}

/**
 * Dados da execução em campo (Técnica): período (alimenta o calendário durante
 * todo o intervalo), técnico + auxiliar (lista de técnicos/prestadores) e chip.
 */
function DadosExecucaoGate({ card, patch }: { card: Card; patch: (p: Partial<Card>) => void }) {
  const { ativos: pessoas } = useTecnicos();
  const [inicio, setInicio] = useState(card.dataInicioExecucao?.slice(0, 10) ?? "");
  const [fim, setFim] = useState(card.dataFimExecucao?.slice(0, 10) ?? "");
  const [tecnico, setTecnico] = useState(card.tecnicos ?? "");
  const [auxiliar, setAuxiliar] = useState(card.auxiliarTecnico ?? "");
  const [chip, setChip] = useState(card.numeroChip ?? "");
  useEffect(() => {
    setInicio(card.dataInicioExecucao?.slice(0, 10) ?? "");
    setFim(card.dataFimExecucao?.slice(0, 10) ?? "");
    setTecnico(card.tecnicos ?? "");
    setAuxiliar(card.auxiliarTecnico ?? "");
    setChip(card.numeroChip ?? "");
  }, [card.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const inp = "w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

  // A data de fim nunca pode ser anterior à data de início.
  const periodoInvalido = !!inicio && !!fim && fim < inicio;

  function salvar(over: Partial<Card> = {}) {
    const base: Partial<Card> = {
      tecnicos: tecnico.trim() || undefined,
      auxiliarTecnico: auxiliar.trim() || undefined,
      numeroChip: chip.trim() || undefined,
    };
    // Período inválido não é salvo (aviso na tela).
    if (!periodoInvalido) {
      base.dataInicioExecucao = inicio || undefined;
      base.dataFimExecucao = fim || undefined;
    }
    patch({ ...base, ...over });
  }

  return (
    <Gate titulo="Execução em campo · agenda">
      {/* Conta criada pelo Monitoramento — dado que a Técnica usa em campo. */}
      {card.sigma?.contaSigma && (
        <p className="mb-2 rounded-lg bg-cyan-50 px-3 py-2 text-xs font-medium text-cyan-800 ring-1 ring-inset ring-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:ring-cyan-500/30">
          Nº da conta (Monitoramento): <strong className="font-mono">{card.sigma.contaSigma}</strong>
        </p>
      )}
      <p className="text-xs text-slate-600 dark:text-slate-300">O card aparece no calendário nos dias úteis do período informado (sem fins de semana).</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Campito label="Data de início *"><input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} onBlur={() => salvar()} className={inp} /></Campito>
        <Campito label="Data de fim *"><input type="date" min={inicio || undefined} value={fim} onChange={(e) => setFim(e.target.value)} onBlur={() => salvar()} className={inp} /></Campito>
      </div>
      {periodoInvalido && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30">⚠ A data de fim não pode ser anterior à data de início.</p>
      )}
      <label className="mt-2 block text-[10px] text-slate-400">Técnico</label>
      <ComboPessoa
        value={tecnico}
        onChange={(v) => { setTecnico(v); salvar({ tecnicos: v.trim() || undefined }); }}
        opcoes={pessoas}
        className={inp}
        placeholder="Selecione ou pesquise (técnicos e prestadores)"
      />
      <label className="mt-2 block text-[10px] text-slate-400">Aux. Técnico</label>
      <ComboPessoa
        value={auxiliar}
        onChange={(v) => { setAuxiliar(v); salvar({ auxiliarTecnico: v.trim() || undefined }); }}
        opcoes={pessoas}
        className={inp}
        placeholder="Selecione ou pesquise (técnicos e prestadores)"
      />
      <label className="mt-2 block text-[10px] text-slate-400">Nº do chip</label>
      <input value={chip} onChange={(e) => setChip(e.target.value)} onBlur={() => salvar()} placeholder="Nº do chip" className={inp} />
      <button
        onClick={() => salvar()}
        disabled={periodoInvalido}
        className="mt-2 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-emerald-300"
      >
        {card.dataInicioExecucao && card.dataFimExecucao ? "✓ Dados salvos · atualizar" : "Salvar dados"}
      </button>
    </Gate>
  );
}

/** Cheque · Monitoramento: os 5 flags de revisão antes da auditoria. */
function ChecklistChequeMonitoramento({ card, patch }: { card: Card; patch: (p: Partial<Card>) => void }) {
  function toggle(id: string, rotulo: string) {
    const existe = card.checklist.find((c) => c.id === id);
    const novo = existe
      ? card.checklist.map((c) => (c.id === id ? { ...c, concluido: !c.concluido } : c))
      : [...card.checklist, { id, etapa: "CHEQUE_MONITORAMENTO" as const, rotulo, concluido: true, obrigatorio: true }];
    patch({ checklist: novo });
  }
  return (
    <Gate titulo="Cheque · Monitoramento">
      <ul className="space-y-1.5">
        {CHECKLIST_CHEQUE_MONITORAMENTO.map((it) => {
          const done = card.checklist.some((c) => c.id === it.id && c.concluido);
          return (
            <li key={it.id}>
              <button type="button" onClick={() => toggle(it.id, it.rotulo)} className="flex w-full items-center gap-2 text-left text-sm">
                <span className={["flex h-4 w-4 items-center justify-center rounded border text-[10px]", done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-transparent dark:border-slate-600"].join(" ")}>✓</span>
                <span className={done ? "text-slate-500 line-through" : "text-slate-700 dark:text-slate-200"}>{it.rotulo}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Gate>
  );
}

/**
 * Itens do orçamento na esteira de Compras. A edição muda conforme a etapa:
 * Classificação (tipo de custo + CC — Coordenador), Pedido ao Fornecedor
 * (fornecedor + nº do pedido), Entrega (data) e Pagamento (pendente/pago).
 * Nas demais etapas (ou sem permissão) a lista é somente leitura.
 */
function ItensCompraGate({ card, patch, podeAgir }: { card: Card; patch: (p: Partial<Card>) => void; podeAgir: boolean }) {
  const [itens, setItens] = useState<ItemCompra[]>(card.itensCompra ?? []);
  useEffect(() => setItens(card.itensCompra ?? []), [card.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const etapa = card.etapa as EtapaCompras;
  // Sem a coluna Pagamento, o Pendente/Pago por item é marcado nas etapas do
  // portal interno em diante (Tabela de Valores → PC enviado).
  const ETAPAS_PAGAMENTO: EtapaCompras[] = ["TABELA_VALORES", "REVISAO_VALORES", "SOLICITACAO_COMPRA", "PEDIDO_COMPRA", "PC_ENVIADO"];
  const modo: "separacao" | "classificacao" | "pedido" | "entrega" | "pagamento" | "leitura" =
    !podeAgir ? "leitura"
    : etapa === "SEPARACAO" ? "separacao"
    : etapa === "CLASSIFICACAO" ? "classificacao"
    : etapa === "PEDIDO_FORNECEDOR" ? "pedido"
    : etapa === "ENTREGA" ? "entrega"
    : ETAPAS_PAGAMENTO.includes(etapa) ? "pagamento"
    : "leitura";

  const inp = "w-full rounded border border-slate-200 px-2 py-1 text-xs focus:border-brand focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
  const set = (id: string, patchItem: Partial<ItemCompra>) =>
    setItens((prev) => prev.map((i) => (i.id === id ? { ...i, ...patchItem } : i)));

  const titulos: Record<typeof modo, string> = {
    separacao: "Separação · marque cada item: em estoque ou falta",
    classificacao: "Classificação · tipo de custo e centro de custo por item",
    pedido: "Pedido ao Fornecedor · fornecedor e nº do pedido por item",
    entrega: "Entrega · data de entrega por item",
    pagamento: "Pagamento · marque os itens pagos",
    leitura: `Itens do orçamento (${itens.length})`,
  };

  return (
    <Gate titulo={titulos[modo]}>
      {itens.length === 0 && <p className="text-xs text-slate-500 dark:text-slate-400">Nenhum item no orçamento.</p>}
      <ul className="space-y-2">
        {itens.map((i) => (
          <li key={i.id} className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 text-xs font-medium text-slate-700 dark:text-slate-200">
                <span className="font-semibold">{i.quantidade}x</span> {i.material}
                {i.setor && <span className="text-slate-400"> · {i.setor}</span>}
              </p>
              <span className="flex shrink-0 items-center gap-1">
                {i.estoque && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${i.estoque === "EM_ESTOQUE" ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30" : "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30"}`}>
                    {i.estoque === "EM_ESTOQUE" ? "Em estoque" : "Falta"}
                  </span>
                )}
                {/* Item em estoque não gera compra nem pagamento — sem chip de pgto. */}
                {i.estoque !== "EM_ESTOQUE" && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${i.statusPagamento === "PAGO" ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30" : "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30"}`}>
                    {i.statusPagamento === "PAGO" ? "Pago" : "Pgto. pendente"}
                  </span>
                )}
              </span>
            </div>

            {/* Resumo do que já foi preenchido nas etapas anteriores. */}
            {(i.tipoCusto || i.centroCusto || i.fornecedor || i.numeroPedido || i.dataEntrega) && (
              <p className="mt-1 text-[11px] text-slate-400">
                {i.tipoCusto ? `Custo: ${i.tipoCusto}` : ""}{i.tipoCusto && i.centroCusto ? " · " : ""}{i.centroCusto ? `CC ${i.centroCusto}` : ""}
                {(i.tipoCusto || i.centroCusto) && (i.fornecedor || i.numeroPedido) ? " · " : ""}
                {i.fornecedor ?? ""}{i.numeroPedido ? ` (pedido ${i.numeroPedido})` : ""}
                {i.dataEntrega ? ` · entregue ${fmtData(i.dataEntrega)}` : ""}
              </p>
            )}

            {modo === "separacao" && (
              <div className="mt-1.5 flex gap-1">
                {([["EM_ESTOQUE", "Em estoque"], ["FALTA", "Falta"]] as const).map(([st, rot]) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => set(i.id, { estoque: st })}
                    className={`rounded px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${i.estoque === st ? (st === "EM_ESTOQUE" ? "bg-emerald-600 text-white ring-emerald-600" : "bg-rose-500 text-white ring-rose-500") : "bg-white text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700"}`}
                  >
                    {rot}
                  </button>
                ))}
              </div>
            )}
            {modo === "classificacao" && (
              i.estoque === "EM_ESTOQUE" ? (
                <p className="mt-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">✓ Em estoque — dispensa tipo de custo e centro de custo.</p>
              ) : (
                <div className="mt-1.5 flex gap-2">
                  <input value={i.tipoCusto ?? ""} onChange={(e) => set(i.id, { tipoCusto: e.target.value })} placeholder="Tipo de custo" className={inp} />
                  <input value={i.centroCusto ?? ""} onChange={(e) => set(i.id, { centroCusto: e.target.value })} placeholder="Centro de custo" className={inp} />
                </div>
              )
            )}
            {/* Item EM ESTOQUE dispensa todo o resto (fornecedor, pedido,
                entrega, pagamento) — o produto já existe no estoque. */}
            {modo === "pedido" && (
              i.estoque === "EM_ESTOQUE" ? (
                <p className="mt-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">✓ Em estoque — dispensa fornecedor e nº do pedido.</p>
              ) : (
                <div className="mt-1.5 flex gap-2">
                  <input value={i.fornecedor ?? ""} onChange={(e) => set(i.id, { fornecedor: e.target.value })} placeholder="Fornecedor" className={inp} />
                  <input value={i.numeroPedido ?? ""} onChange={(e) => set(i.id, { numeroPedido: e.target.value })} placeholder="Nº do pedido" className={inp} />
                </div>
              )
            )}
            {modo === "entrega" && (
              i.estoque === "EM_ESTOQUE" ? (
                <p className="mt-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">✓ Em estoque — dispensa a data de entrega.</p>
              ) : (
                <div className="mt-1.5">
                  <input type="date" value={i.dataEntrega ?? ""} onChange={(e) => set(i.id, { dataEntrega: e.target.value || undefined })} className={inp} />
                </div>
              )
            )}
            {modo === "pagamento" && (
              i.estoque === "EM_ESTOQUE" ? (
                <p className="mt-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">✓ Em estoque — sem pagamento a marcar.</p>
              ) : (
                <div className="mt-1.5 flex gap-1">
                  {(["PENDENTE", "PAGO"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => set(i.id, { statusPagamento: st })}
                      className={`rounded px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${i.statusPagamento === st ? (st === "PAGO" ? "bg-emerald-600 text-white ring-emerald-600" : "bg-amber-500 text-white ring-amber-500") : "bg-white text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700"}`}
                    >
                      {st === "PAGO" ? "Pago" : "Pendente"}
                    </button>
                  ))}
                </div>
              )
            )}
          </li>
        ))}
      </ul>
      {modo !== "leitura" && itens.length > 0 && (
        <button
          onClick={() => patch({ itensCompra: itens })}
          className="mt-2 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
        >
          Salvar itens
        </button>
      )}
    </Gate>
  );
}

const PGTO_LABEL: Record<string, string> = { A_VISTA: "À vista", PARCELADO: "Parcelado" };

/** Linhas mínimas exibidas no rateio da medição. */
const LINHAS_MEDICAO = 3;

/** Normaliza os lançamentos do card completando até o mínimo de linhas. */
function lancamentosIniciais(card: Card): LancamentoMedicao[] {
  const salvos = card.medicao?.lancamentos ?? [];
  const base: LancamentoMedicao[] = salvos.length
    ? salvos.map((l, i) => ({ ...l, id: l.id || `lm-${i}` }))
    // Cards antigos: a primeira linha herda os campos únicos já preenchidos.
    : [{ id: "lm-0", valor: card.medicao?.valorMedicao, chamado: card.medicao?.chamado ?? card.chamado ?? undefined, cr: card.cr ?? undefined }];
  while (base.length < LINHAS_MEDICAO) base.push({ id: `lm-${base.length}` });
  return base;
}

/** Soma dos valores lançados (undefined quando nada foi informado). */
function totalLancamentos(ls: LancamentoMedicao[]): number | undefined {
  const comValor = ls.filter((l) => Number.isFinite(l.valor as number));
  if (!comValor.length) return undefined;
  return comValor.reduce((s, l) => s + (l.valor ?? 0), 0);
}

/**
 * Rateio da medição: Valor / Chamado / CR por linha. O total alimenta o valor
 * da medição do card e a primeira linha preenchida mantém os campos únicos
 * (chamado e CR), que os relatórios antigos consomem.
 */
function LancamentosMedicao({
  lancamentos,
  setLancamentos,
  onBlurSalvar,
}: {
  lancamentos: LancamentoMedicao[];
  setLancamentos: (ls: LancamentoMedicao[]) => void;
  onBlurSalvar: () => void;
}) {
  const inp = "w-full min-w-0 rounded border border-slate-200 px-2 py-1 text-xs text-slate-800 focus:border-brand focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
  const total = totalLancamentos(lancamentos);

  // Texto em edição do valor, por linha — permite digitar vírgula/ponto sem o
  // número "consertar" o campo a cada tecla (perdia o separador decimal).
  const [rascunho, setRascunho] = useState<Record<string, string>>({});

  /** Converte o texto (pt-BR: vírgula decimal, ponto de milhar) em número. */
  const parseValor = (txt: string): number | undefined => {
    const limpo = txt.trim();
    if (!limpo) return undefined;
    const norm = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
    const n = Number(norm);
    return Number.isFinite(n) ? n : undefined;
  };

  const set = (id: string, patch: Partial<LancamentoMedicao>) =>
    setLancamentos(lancamentos.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  return (
    <div className="mt-2">
      <div className="mb-1 grid grid-cols-[1fr_1fr_1fr_auto] gap-1.5 text-[10px] text-slate-400">
        <span>Valor (R$)</span>
        <span>Chamado</span>
        <span>CR</span>
        <span className="w-5" />
      </div>
      <ul className="space-y-1.5">
        {lancamentos.map((l) => (
          <li key={l.id} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-1.5">
            <input
              inputMode="decimal"
              value={rascunho[l.id] ?? (l.valor != null ? String(l.valor).replace(".", ",") : "")}
              onChange={(e) => {
                const txt = e.target.value;
                // Só dígitos, vírgula e ponto.
                if (txt !== "" && !/^[\d.,]*$/.test(txt)) return;
                setRascunho((r) => ({ ...r, [l.id]: txt }));
                set(l.id, { valor: parseValor(txt) });
              }}
              onBlur={() => {
                setRascunho((r) => { const n = { ...r }; delete n[l.id]; return n; });
                onBlurSalvar();
              }}
              placeholder="0,00"
              className={inp}
            />
            <input value={l.chamado ?? ""} onChange={(e) => set(l.id, { chamado: e.target.value || undefined })} onBlur={onBlurSalvar} placeholder="Chamado" className={inp} />
            <input value={l.cr ?? ""} onChange={(e) => set(l.id, { cr: e.target.value || undefined })} onBlur={onBlurSalvar} placeholder="CR" className={inp} />
            <button
              type="button"
              onClick={() => { setLancamentos(lancamentos.filter((x) => x.id !== l.id)); onBlurSalvar(); }}
              disabled={lancamentos.length <= 1}
              className="w-5 rounded text-xs text-slate-400 hover:text-rose-600 disabled:opacity-30"
              title="Remover linha"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-1.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setLancamentos([...lancamentos, { id: `lm-${Date.now()}` }])}
          className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          + Adicionar linha
        </button>
        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          Total: {formatarBRL(total)}
        </span>
      </div>
    </div>
  );
}

/** Formulário de Medição: registra os dados e finaliza o card. */
function MedicaoForm({ card, patch }: { card: Card; patch: (p: Partial<Card>) => void }) {
  const { atual } = useAuth();
  const finalizado = card.status === "FINALIZADO" || !!card.medicao?.finalizadoEm;
  const m = card.medicao ?? {};
  const [f, setF] = useState({
    numeroImplantar: m.numeroImplantar ?? card.codigo,
    competencia: m.competencia ?? "",
    valorMedicao: m.valorMedicao != null ? String(m.valorMedicao) : (card.valores.total != null ? String(card.valores.total) : ""),
    chamado: m.chamado ?? card.chamado ?? "",
    dataAbertura: m.dataAbertura?.slice(0, 10) ?? card.datas.abertura?.slice(0, 10) ?? "",
    formaPagamento: (m.formaPagamento ?? card.pagamento?.forma ?? "A_VISTA") as string,
    parcelas: m.parcelas != null ? String(m.parcelas) : (card.pagamento?.parcelas != null ? String(card.pagamento.parcelas) : ""),
  });
  useEffect(() => {
    const mm = card.medicao ?? {};
    setF({
      numeroImplantar: mm.numeroImplantar ?? card.codigo,
      competencia: mm.competencia ?? "",
      valorMedicao: mm.valorMedicao != null ? String(mm.valorMedicao) : (card.valores.total != null ? String(card.valores.total) : ""),
      chamado: mm.chamado ?? card.chamado ?? "",
      dataAbertura: mm.dataAbertura?.slice(0, 10) ?? card.datas.abertura?.slice(0, 10) ?? "",
      formaPagamento: (mm.formaPagamento ?? card.pagamento?.forma ?? "A_VISTA") as string,
      parcelas: mm.parcelas != null ? String(mm.parcelas) : (card.pagamento?.parcelas != null ? String(card.pagamento.parcelas) : ""),
    });
  }, [card.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const inp = "w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

  // Rateio da medição (Valor / Chamado / CR por linha).
  const [lancamentos, setLancamentos] = useState<LancamentoMedicao[]>(() => lancamentosIniciais(card));
  useEffect(() => setLancamentos(lancamentosIniciais(card)), [card.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function finalizar() {
    if (!f.competencia.trim()) return;
    const uteis = lancamentos.filter((l) => l.valor != null || l.chamado?.trim() || l.cr?.trim());
    patch({
      // A 1ª linha alimenta o CR do card (usado nos relatórios por CR).
      cr: uteis[0]?.cr?.trim() || card.cr || undefined,
      medicao: {
        numeroImplantar: f.numeroImplantar,
        competencia: f.competencia.trim(),
        valorMedicao: totalLancamentos(uteis),
        chamado: uteis[0]?.chamado?.trim() || undefined,
        lancamentos: uteis,
        dataAbertura: f.dataAbertura || undefined,
        formaPagamento: f.formaPagamento as FormaPagamento,
        parcelas: f.parcelas ? Number(f.parcelas) : undefined,
        finalizadoEm: new Date().toISOString(),
        finalizadoPor: atual?.nome,
      },
      status: "FINALIZADO",
    });
  }

  if (finalizado) {
    return (
      <Gate titulo="Medição finalizada">
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Competência <strong>{card.medicao?.competencia ?? "—"}</strong> · {formatarBRL(card.medicao?.valorMedicao)}
        </p>
        <Link href={`/relatorios?card=${card.id}`} className="mt-2 block w-full rounded-lg bg-brand px-3 py-2 text-center text-sm font-semibold text-white hover:bg-brand-700">
          Gerar relatório
        </Link>
      </Gate>
    );
  }

  return (
    <Gate titulo="Registrar medição">
      <div className="grid grid-cols-2 gap-2">
        <Campito label="Nº Implantar"><input value={f.numeroImplantar} onChange={(e) => setF({ ...f, numeroImplantar: e.target.value })} className={inp} /></Campito>
        <Campito label="Competência *"><input value={f.competencia} onChange={(e) => setF({ ...f, competencia: e.target.value })} placeholder="06/2026" className={inp} /></Campito>
        <Campito label="Data abertura"><input type="date" value={f.dataAbertura} onChange={(e) => setF({ ...f, dataAbertura: e.target.value })} className={inp} /></Campito>
        <Campito label="Forma pgto.">
          <select value={f.formaPagamento} onChange={(e) => setF({ ...f, formaPagamento: e.target.value })} className={inp}>
            {Object.keys(PGTO_LABEL).map((k) => <option key={k} value={k}>{PGTO_LABEL[k]}</option>)}
          </select>
        </Campito>
        <Campito label="Parcelas"><input inputMode="numeric" value={f.parcelas} onChange={(e) => setF({ ...f, parcelas: e.target.value })} className={inp} /></Campito>
      </div>

      {/* Rateio: a medição pode ser dividida em várias linhas. */}
      <label className="mt-3 block text-[10px] text-slate-400">Medição · Valor / Chamado / CR</label>
      <LancamentosMedicao key={card.id} lancamentos={lancamentos} setLancamentos={setLancamentos} onBlurSalvar={() => {}} />

      <button onClick={finalizar} disabled={!f.competencia.trim()} className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-emerald-300">
        Registrar e finalizar
      </button>
    </Gate>
  );
}

/** "06/2026" -> "2026-06" (para o input type=month). */
function compParaInput(c?: string): string {
  if (!c) return "";
  const m = c.match(/^(\d{2})\/(\d{4})$/);
  return m ? `${m[2]}-${m[1]}` : c;
}
/** "2026-06" -> "06/2026" (padrão de competência). */
function inputParaComp(v: string): string {
  const m = v.match(/^(\d{4})-(\d{2})$/);
  return m ? `${m[2]}/${m[1]}` : v;
}

/**
 * Gate da Medição na Manutenção: o perfil Medição registra o Número do Chamado
 * e a Competência (mês/ano) antes de encerrar a OS. Salvos em `medicao` (campo
 * de gate que o perfil Medição tem permissão de gravar nesta etapa).
 */
function MedicaoChamadoGate({ card, patch }: { card: Card; patch: (p: Partial<Card>) => void }) {
  // Valor sugerido: total do orçamento ou, na falta, a visita cobrada.
  const valorSugerido = card.valores.total ?? (card.manutencao?.visitaCobrada ? card.manutencao.valorVisita : undefined);
  const [comp, setComp] = useState(compParaInput(card.medicao?.competencia));
  const [isenta, setIsenta] = useState(!!card.medicao?.visitaIsenta);
  const [numOrc, setNumOrc] = useState(card.numeroOrcamento ?? "");
  const [lancamentos, setLancamentos] = useState<LancamentoMedicao[]>(() => lancamentosIniciais(card));
  useEffect(() => {
    setComp(compParaInput(card.medicao?.competencia));
    setIsenta(!!card.medicao?.visitaIsenta);
    setNumOrc(card.numeroOrcamento ?? "");
    setLancamentos(lancamentosIniciais(card));
  }, [card.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const inp = "w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

  // Linhas efetivamente preenchidas (valor, chamado ou CR).
  const preenchidos = lancamentos.filter((l) => l.valor != null || l.chamado?.trim() || l.cr?.trim());
  const primeiro = preenchidos[0];

  function salvar(isentaAtual = isenta, lsAtual = lancamentos) {
    const comper = comp ? inputParaComp(comp) : undefined;
    const uteis = lsAtual.filter((l) => l.valor != null || l.chamado?.trim() || l.cr?.trim());
    patch({
      // A 1ª linha alimenta os campos únicos que os relatórios já consomem.
      cr: uteis[0]?.cr?.trim() || undefined,
      numeroOrcamento: numOrc.trim() || undefined,
      medicao: {
        ...card.medicao,
        chamado: uteis[0]?.chamado?.trim() || undefined,
        competencia: comper,
        visitaIsenta: isentaAtual,
        lancamentos: isentaAtual ? [] : uteis,
        // Visita isenta não gera receita: nada de valor de medição.
        valorMedicao: isentaAtual ? undefined : totalLancamentos(uteis),
      },
    });
  }

  // Visita Isenta: só o Nº do orçamento é exigido; caso contrário, uma linha
  // com chamado e CR + a competência.
  const completo = isenta ? !!numOrc.trim() : !!primeiro?.chamado?.trim() && !!primeiro?.cr?.trim() && !!comp;
  const salvo = isenta ? !!card.numeroOrcamento : !!(card.medicao?.chamado && card.cr && card.medicao?.competencia);

  return (
    <Gate titulo="Medição · Dados para encerrar">
      <p className="text-xs text-slate-600 dark:text-slate-300">
        {isenta ? "Visita Isenta: informe o Nº do orçamento para encerrar a OS." : "Informe ao menos uma linha (valor, chamado e CR) e a competência para encerrar a OS."}
      </p>
      {/* Rateio: a medição pode ser dividida em várias linhas. */}
      {!isenta && (
        <>
          <label className="mt-2 block text-[10px] text-slate-400">Medição · Valor / Chamado / CR</label>
          <LancamentosMedicao key={card.id} lancamentos={lancamentos} setLancamentos={setLancamentos} onBlurSalvar={() => salvar()} />
          {valorSugerido != null && totalLancamentos(preenchidos) == null && (
            <p className="mt-1 text-[11px] text-slate-400">Sugerido: {formatarBRL(valorSugerido)} ({card.valores.total != null ? "orçamento" : "visita cobrada"}).</p>
          )}
          <label className="mt-3 block text-[10px] text-slate-400">Competência (mês/ano)</label>
          <input type="month" value={comp} onChange={(e) => setComp(e.target.value)} onBlur={() => salvar()} className={inp} />
        </>
      )}

      {/* Visita Isenta: quando marcada, o Nº do orçamento é obrigatório. */}
      <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          checked={isenta}
          onChange={(e) => { const v = e.target.checked; setIsenta(v); salvar(v); }}
          className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
        />
        Visita Isenta
      </label>
      {isenta && (
        <>
          <label className="mt-2 block text-[10px] text-slate-400">Nº do orçamento *</label>
          <input value={numOrc} onChange={(e) => setNumOrc(e.target.value)} onBlur={() => salvar()} placeholder="Obrigatório na visita isenta" className={inp} />
          {!numOrc.trim() && <p className="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">Visita Isenta exige o Nº do orçamento.</p>}
        </>
      )}

      <button onClick={() => salvar()} disabled={!completo} className="mt-2 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-emerald-300">
        {salvo ? "✓ Dados salvos · atualizar" : "Salvar dados"}
      </button>
    </Gate>
  );
}

/**
 * Gate do Orçamento (Manutenção): o Assistente 2 informa o número e o valor do
 * orçamento antes de enviar para Aguardando. Os valores preenchem os campos do
 * card (numeroOrcamento e valores.total).
 */
function OrcamentoGate({ card, patch }: { card: Card; patch: (p: Partial<Card>) => void }) {
  const [numero, setNumero] = useState(card.numeroOrcamento ?? "");
  const [valor, setValor] = useState(card.valores.total != null ? String(card.valores.total) : "");
  const [enviandoPdf, setEnviandoPdf] = useState(false);
  const [avisoPdf, setAvisoPdf] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setNumero(card.numeroOrcamento ?? "");
    setValor(card.valores.total != null ? String(card.valores.total) : "");
    setAvisoPdf(null);
  }, [card.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const inp = "w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

  function salvar(over: Partial<Card> = {}) {
    const v = valor ? Number(valor.replace(",", ".")) : undefined;
    patch({ numeroOrcamento: numero.trim() || undefined, valores: { ...card.valores, total: v }, ...over });
  }

  /** Anexa o PDF (obrigatório) e pré-preenche nº/valor com a leitura da IA. */
  async function anexarPdf(file: File) {
    setAvisoPdf(null);
    if (file.type !== "application/pdf") return setAvisoPdf("Selecione um arquivo PDF.");
    if (file.size > 3 * 1024 * 1024) return setAvisoPdf("PDF muito grande (máx. 3 MB).");
    setEnviandoPdf(true);
    try {
      const buf = await file.arrayBuffer();
      let bin = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      const res = await fetch(`/api/cards/${card.id}/orcamento-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ pdfBase64: btoa(bin), nome: file.name }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.erro ?? "Falha ao anexar o PDF.");
      if (json.avisoIA) setAvisoPdf(json.avisoIA);
      // Pré-preenche com a leitura da IA (o usuário revisa) e persiste — o
      // PATCH também devolve o card atualizado com o nome do anexo.
      const novoNumero = json.extraido?.numeroOrcamento || numero;
      const novoValor = json.extraido?.valorTotal != null ? String(json.extraido.valorTotal) : valor;
      setNumero(novoNumero);
      setValor(novoValor);
      const v = novoValor ? Number(String(novoValor).replace(",", ".")) : undefined;
      patch({ numeroOrcamento: novoNumero.trim() || undefined, valores: { ...card.valores, total: v } });
    } catch (e) {
      setAvisoPdf(e instanceof Error ? e.message : "Falha ao anexar o PDF.");
    } finally {
      setEnviandoPdf(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const completo = !!numero.trim() && !!valor && Number(valor.replace(",", ".")) > 0;

  return (
    <Gate titulo="Orçamento · dados para enviar">
      <p className="text-xs text-slate-600 dark:text-slate-300">Anexe o PDF do orçamento (obrigatório) e informe o número e o valor antes de enviar para Aguardando.</p>

      {/* Anexo obrigatório do orçamento em PDF (a IA pré-preenche nº e valor). */}
      <label className="mt-2 block text-[10px] text-slate-400">Orçamento (PDF) *</label>
      <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void anexarPdf(f); }} />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={enviandoPdf}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${card.orcamentoPdfNome ? "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700" : "bg-brand text-white ring-brand hover:bg-brand-700"} disabled:opacity-60`}
        >
          {enviandoPdf ? "Enviando…" : card.orcamentoPdfNome ? "Substituir PDF" : "📄 Anexar PDF"}
        </button>
        {card.orcamentoPdfNome ? (
          <a href={`/api/cards/${card.id}/orcamento-pdf`} target="_blank" rel="noreferrer" className="min-w-0 truncate text-xs font-medium text-brand hover:underline" title={card.orcamentoPdfNome}>
            ✓ {card.orcamentoPdfNome}
          </a>
        ) : (
          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Nenhum PDF anexado.</span>
        )}
      </div>
      {avisoPdf && <p className="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">{avisoPdf}</p>}

      <label className="mt-2 block text-[10px] text-slate-400">Número do orçamento</label>
      <input value={numero} onChange={(e) => setNumero(e.target.value)} onBlur={() => salvar()} placeholder="Nº do orçamento" className={inp} />
      <label className="mt-2 block text-[10px] text-slate-400">Valor do orçamento (R$)</label>
      <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} onBlur={() => salvar()} placeholder="0,00" className={inp} />
      <button onClick={() => salvar()} disabled={!completo} className="mt-2 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-emerald-300">
        {card.numeroOrcamento && card.valores.total ? "✓ Dados salvos · atualizar" : "Salvar dados"}
      </button>
    </Gate>
  );
}

interface AnexoResumo {
  id: string;
  nome: string;
  etapa?: string | null;
  autor?: string | null;
  createdAt: string;
}

/**
 * Anexos PDF avulsos do card. O upload fica disponível no Comercial
 * (Implantação) e no Pedido ao Fornecedor (Compras) para quem executa a
 * etapa; a lista com os links aparece em qualquer etapa.
 */
function AnexosPdf({ card, podeAgir }: { card: Card; podeAgir: boolean }) {
  const [anexos, setAnexos] = useState<AnexoResumo[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const podeAnexar = podeAgir && (
    (card.fluxo === "IMPLANTACAO" && card.etapa === "COMERCIAL") ||
    (card.fluxo === "COMPRAS" && card.etapa === "PEDIDO_FORNECEDOR")
  );

  useEffect(() => {
    setAviso(null);
    let ativo = true;
    fetch(`/api/cards/${card.id}/anexos`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { anexos: [] }))
      .then((j) => { if (ativo) setAnexos(j.anexos ?? []); })
      .catch(() => { if (ativo) setAnexos([]); });
    return () => { ativo = false; };
  }, [card.id]);

  async function anexar(file: File) {
    setAviso(null);
    if (file.type !== "application/pdf") return setAviso("Selecione um arquivo PDF.");
    if (file.size > 3 * 1024 * 1024) return setAviso("PDF muito grande (máx. 3 MB).");
    setEnviando(true);
    try {
      const buf = await file.arrayBuffer();
      let bin = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      const res = await fetch(`/api/cards/${card.id}/anexos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ pdfBase64: btoa(bin), nome: file.name }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.erro ?? "Falha ao anexar o PDF.");
      setAnexos((prev) => [...prev, json.anexo as AnexoResumo]);
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "Falha ao anexar o PDF.");
    } finally {
      setEnviando(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remover(id: string) {
    if (!window.confirm("Remover este anexo?")) return;
    const res = await fetch(`/api/cards/${card.id}/anexos/${id}`, { method: "DELETE", credentials: "same-origin" });
    if (res.ok) setAnexos((prev) => prev.filter((a) => a.id !== id));
  }

  if (!podeAnexar && anexos.length === 0) return null;

  return (
    <Secao titulo={`Anexos (PDF)${anexos.length ? ` · ${anexos.length}` : ""}`}>
      {anexos.length > 0 && (
        <ul className="mb-2 divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {anexos.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <a href={`/api/cards/${card.id}/anexos/${a.id}`} target="_blank" rel="noreferrer" className="min-w-0 truncate font-medium text-brand hover:underline" title={a.nome}>
                📄 {a.nome}
              </a>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-[10px] text-slate-400">{a.etapa ? rotuloEtapa(a.etapa) : ""}</span>
                {podeAnexar && (
                  <button onClick={() => void remover(a.id)} className="rounded p-0.5 text-xs text-slate-400 hover:text-rose-600" title="Remover anexo">✕</button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {podeAnexar && (
        <>
          <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void anexar(f); }} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={enviando}
            className="rounded-lg border border-brand bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand transition hover:bg-brand/20 disabled:opacity-60"
          >
            {enviando ? "Enviando…" : "📄 Anexar PDF"}
          </button>
        </>
      )}
      {aviso && <p className="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">{aviso}</p>}
    </Secao>
  );
}

function Campito({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[10px] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

/** Aprovação da Coordenação: define Alocação + CR de cada item (obrigatório). */
function AprovacaoCoordenacao({ card, patch }: { card: Card; patch: (p: Partial<Card>) => void }) {
  const [itens, setItens] = useState(card.materiais);
  useEffect(() => setItens(card.materiais), [card.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const aprovado = !!card.aprovacaoInicial?.aprovado;
  const faltam = itens.some((m) => !m.alocacao?.trim() || !m.cr?.trim());
  const inp = "w-full rounded border border-slate-200 px-2 py-1 text-xs focus:border-brand focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
  const set = (id: string, campo: "alocacao" | "cr", val: string) =>
    setItens((prev) => prev.map((m) => (m.id === id ? { ...m, [campo]: val } : m)));

  return (
    <Gate titulo="Aprovação inicial da Coordenação">
      {itens.length > 0 && (
        <>
          <p className="mb-2 text-[11px] text-slate-500 dark:text-slate-400">Defina a <strong>Alocação</strong> e o <strong>CR</strong> de cada item (obrigatório para aprovar).</p>
          <ul className="mb-2 space-y-2">
            {itens.map((m) => (
              <li key={m.id}>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{m.quantidade}x {m.descricao}</p>
                <div className="mt-1 flex gap-2">
                  <input value={m.alocacao ?? ""} onChange={(e) => set(m.id, "alocacao", e.target.value)} placeholder="Alocação" className={inp} disabled={aprovado} />
                  <input value={m.cr ?? ""} onChange={(e) => set(m.id, "cr", e.target.value)} placeholder="CR" className={inp} disabled={aprovado} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      <button
        onClick={() => patch({ materiais: itens, aprovacaoInicial: { aprovado: true, por: "Coordenação", em: new Date().toISOString() }, status: "EM_ANDAMENTO" })}
        disabled={aprovado || (itens.length > 0 && faltam)}
        className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-emerald-300 dark:disabled:bg-emerald-800"
      >
        {aprovado ? "✓ Aprovado" : "Aprovar escopo"}
      </button>
      {!aprovado && itens.length > 0 && faltam && <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">Preencha Alocação e CR de todos os itens.</p>}
    </Gate>
  );
}

/** Conferência do Almoxarifado (Venda): marca cada item em estoque x faltante. */
function ConferenciaAlmox({ card, patch }: { card: Card; patch: (p: Partial<Card>) => void }) {
  const itens = card.materiais;
  const setStatus = (id: string, st: "SEPARADO" | "EM_COMPRAS") =>
    patch({ materiais: itens.map((m) => (m.id === id ? { ...m, statusAlmox: st } : m)) });
  const emEstoque = itens.filter((m) => m.statusAlmox === "SEPARADO").length;
  const faltantes = itens.filter((m) => m.statusAlmox === "EM_COMPRAS").length;
  const base = "rounded px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset";
  const neutro = "bg-white text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700";

  return (
    <Gate titulo="Almoxarifado · conferência de estoque (Venda)">
      {itens.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">Nenhum item cadastrado pelo Comercial.</p>
      ) : (
        <>
          <p className="mb-2 text-[11px] text-slate-500 dark:text-slate-400">
            Marque cada item: <strong>em estoque</strong> ou <strong>faltante</strong> (os faltantes vão para o Suprimentos comprar).
          </p>
          <ul className="space-y-1.5">
            {itens.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate text-slate-700 dark:text-slate-200"><span className="font-medium">{m.quantidade}x</span> {m.descricao}</span>
                <span className="flex shrink-0 gap-1">
                  <button onClick={() => setStatus(m.id, "SEPARADO")} className={`${base} ${m.statusAlmox === "SEPARADO" ? "bg-emerald-600 text-white ring-emerald-600" : neutro}`}>Em estoque</button>
                  <button onClick={() => setStatus(m.id, "EM_COMPRAS")} className={`${base} ${m.statusAlmox === "EM_COMPRAS" ? "bg-amber-500 text-white ring-amber-500" : neutro}`}>Falta</button>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">{emEstoque} em estoque · {faltantes} faltante(s)</p>
        </>
      )}
    </Gate>
  );
}

/** Lista os itens do projeto no gate de Suprimentos + ação de "adquirir". */
function ItensGate({ card, patch }: { card: Card; patch: (p: Partial<Card>) => void }) {
  if (card.materiais.length === 0) return null;
  const pendentes = card.materiais.some((m) => m.statusAlmox === "PENDENTE" || m.statusAlmox === "EM_COMPRAS");
  return (
    <div className="mt-3 border-t border-brand/20 pt-2">
      <p className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Itens do projeto ({card.materiais.length})</p>
      <ul className="mb-2 space-y-1 text-xs">
        {card.materiais.map((m) => (
          <li key={m.id} className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-300"><span className="font-medium">{m.quantidade}x</span> {m.descricao}</span>
            <span className="text-[10px] text-slate-400">{m.statusAlmox}</span>
          </li>
        ))}
      </ul>
      {pendentes && (
        <button
          onClick={() => patch({ materiais: card.materiais.map((m) => ({ ...m, statusAlmox: "RETIRADO" })) })}
          className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
        >
          Marcar itens como adquiridos
        </button>
      )}
    </div>
  );
}

function Gate({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-brand/20 bg-brand/5 p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand">{titulo}</h3>
      {children}
    </section>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{titulo}</h3>
      {children}
    </section>
  );
}

function Campo({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{rotulo}</dt>
      <dd className={destaque ? "font-semibold text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"}>{valor}</dd>
    </div>
  );
}

function Tag({ classe, children }: { classe: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ring-1 ring-inset ${classe}`}>{children}</span>;
}
