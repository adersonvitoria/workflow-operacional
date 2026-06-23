"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  criticidadeDoCard,
  CRITICIDADE_META,
  formatarBRL,
  MODALIDADE_META,
  SETOR_ROTULO,
  STATUS_META,
  TIPO_CLIENTE_META,
} from "@/lib/flows";
import { CHECKLIST_EXECUCAO_MANUTENCAO, CHECKLIST_TECNICA, destinosManutencao, execucaoManutencaoCompleta, podeAvancar, rotuloEtapa } from "@/lib/routing";
import { useAuth } from "@/lib/auth";
import { donoDaEtapa, PERFIL_META, podeEditarCard, podeExcluirCard, podeExecutarEtapa } from "@/lib/perfis";
import type { Card, EtapaImplantacao, EtapaManutencao, FormaPagamento } from "@/types";

const TURNO_ROTULO: Record<string, string> = { MANHA: "Manhã", TARDE: "Tarde", DIA: "Dia" };

function fmtData(iso?: string): string {
  if (!iso) return "—";
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
}

type Aba = "detalhes" | "historico";

/**
 * Painel lateral de detalhes (controlado pelo store). Os gates precisam ser
 * satisfeitos para o botão "Avançar" liberar — lógica à prova de erros.
 */
export function CardSlideOver({ card, onFechar, onPatch, onAvancar, onEditar, onExcluir }: CardSlideOverProps) {
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
  const destinosMan = card && card.fluxo === "MANUTENCAO" ? destinosManutencao(card.etapa as EtapaManutencao) : [];
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
                          <Campo rotulo="CR (Centro de Resultado)" valor={card.cr ?? "—"} />
                          <Campo rotulo="CC (Centro de Custo)" valor={card.cc ?? "—"} />
                          <Campo rotulo="Número da conta" valor={card.numeroConta ?? "—"} />
                          <Campo rotulo="Chamado / OS" valor={card.chamado ?? "—"} />
                          <Campo rotulo="Documento" valor={card.cliente.documento ?? "—"} />
                          <Campo rotulo="Data de cadastro" valor={fmtData(card.datas?.abertura)} />
                          {card.datas?.conclusao && <Campo rotulo="Encerrado em" valor={fmtData(card.datas.conclusao)} destaque />}
                        </dl>
                      </Secao>

                      <Secao titulo="Financeiro">
                        <dl className="grid grid-cols-2 gap-3 text-sm">
                          <Campo rotulo="Mão de obra" valor={formatarBRL(card.valores.maoDeObra)} />
                          <Campo rotulo="Equipamentos" valor={formatarBRL(card.valores.equipamentos)} />
                          <Campo rotulo="Total" valor={formatarBRL(card.valores.total)} destaque />
                          <Campo rotulo="Mensal" valor={formatarBRL(card.valores.mensal)} />
                        </dl>
                      </Secao>
                    </>
                  )}

                  {card.fluxo === "MANUTENCAO" && (
                    <Secao titulo="Atendimento">
                      <dl className="grid grid-cols-2 gap-3 text-sm">
                        <Campo rotulo="Tipo de cliente" valor={card.cliente.tipo ? TIPO_CLIENTE_META[card.cliente.tipo].rotulo : "—"} />
                        <Campo rotulo="Criticidade" valor={crit ? CRITICIDADE_META[crit].rotulo : "—"} />
                        <Campo rotulo="Visita cobrada" valor={man.visitaCobrada ? "Sim" : "Não"} />
                        <Campo rotulo="Turno" valor={man.turno ? (TURNO_ROTULO[man.turno] ?? man.turno) : "—"} />
                        <Campo rotulo="Número da conta" valor={card.numeroConta ?? "—"} />
                        <Campo rotulo="Região" valor={man.regiao ?? "—"} />
                        <Campo rotulo="Ordem de serviço" valor={man.ordemServico ?? "—"} />
                        <Campo rotulo="Agendado" valor={man.agendado ? "Sim" : "Não"} />
                        <Campo rotulo="Técnico" valor={man.tecnico ?? "—"} />
                        <Campo rotulo="Auxiliar técnico" valor={man.auxiliarTecnico ?? "—"} />
                        <Campo rotulo="Tipo de atendimento" valor={man.tipoAtendimento ?? "—"} />
                        <Campo rotulo="Número do orçamento" valor={card.numeroOrcamento ?? "—"} />
                        <Campo rotulo="Setor" valor={man.setor ?? "—"} />
                        <Campo rotulo="Nº do chamado" valor={card.medicao?.chamado ?? card.chamado ?? "—"} />
                        <Campo rotulo="Data de cadastro" valor={fmtData(card.datas?.abertura)} />
                        {card.datas?.conclusao && <Campo rotulo="Encerrado em" valor={fmtData(card.datas.conclusao)} destaque />}
                        <Campo rotulo="Valor do orçamento" valor={formatarBRL(card.valores.total)} destaque />
                      </dl>
                    </Secao>
                  )}

                  {card.fluxo === "MANUTENCAO" && card.etapa === "EXECUCAO" && podeAgir && (
                    <ChecklistExecucaoManutencao card={card} patch={onPatch} />
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

                  {card.fluxo === "IMPLANTACAO" && card.checklist.length > 0 && (
                    <Secao titulo="Checklist da esteira">
                      <ul className="space-y-1.5">
                        {card.checklist.map((item) => (
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
              </footer>
            ) : (
              podeAgir && destinosMan.length > 0 && (
                <footer className="space-y-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
                  {destinosMan.map((d) => {
                    // Gates da Manutenção antes de avançar:
                    // · Execução → Medição: os dois flags do checklist concluídos.
                    // · Medição → Encerrados: nº do chamado preenchido.
                    let bloqueado = false;
                    let aviso = "";
                    if (card.etapa === "EXECUCAO" && d === "MEDICAO" && !execucaoManutencaoCompleta(card)) {
                      bloqueado = true;
                      aviso = "Conclua o checklist (Orçamento concluído e Sistema comunicando).";
                    }
                    if (card.etapa === "MEDICAO" && d === "ENCERRADOS" && !card.medicao?.chamado?.trim()) {
                      bloqueado = true;
                      aviso = "Informe o nº do chamado para encerrar.";
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
    return <AprovacaoCoordenacao card={card} patch={patch} />;
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
        <input value={sigma.dadosConexao ?? ""} onChange={(e) => setSigma({ ...sigma, dadosConexao: e.target.value })} placeholder="Dados de conexão (IP, portas, serial)" className="mb-2 w-full rounded-lg border border-slate-200 p-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
        <button onClick={() => patch({ sigma: { ...sigma, contaCriada: true, statusSync: "SINCRONIZADO" } })} disabled={card.sigma?.contaCriada} className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-emerald-200">
          {card.sigma?.contaCriada ? "✓ Conta criada" : "Confirmar criação da conta"}
        </button>
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
    return <ChecklistTecnica card={card} patch={patch} />;
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

const PGTO_LABEL: Record<string, string> = { A_VISTA: "À vista", PARCELADO: "Parcelado" };

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

  function finalizar() {
    if (!f.competencia.trim()) return;
    patch({
      medicao: {
        numeroImplantar: f.numeroImplantar,
        competencia: f.competencia.trim(),
        valorMedicao: f.valorMedicao ? Number(f.valorMedicao.replace(",", ".")) : undefined,
        chamado: f.chamado || undefined,
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
        <Campito label="Valor medição"><input inputMode="decimal" value={f.valorMedicao} onChange={(e) => setF({ ...f, valorMedicao: e.target.value })} className={inp} /></Campito>
        <Campito label="Chamado"><input value={f.chamado} onChange={(e) => setF({ ...f, chamado: e.target.value })} className={inp} /></Campito>
        <Campito label="Data abertura"><input type="date" value={f.dataAbertura} onChange={(e) => setF({ ...f, dataAbertura: e.target.value })} className={inp} /></Campito>
        <Campito label="Forma pgto.">
          <select value={f.formaPagamento} onChange={(e) => setF({ ...f, formaPagamento: e.target.value })} className={inp}>
            {Object.keys(PGTO_LABEL).map((k) => <option key={k} value={k}>{PGTO_LABEL[k]}</option>)}
          </select>
        </Campito>
        <Campito label="Parcelas"><input inputMode="numeric" value={f.parcelas} onChange={(e) => setF({ ...f, parcelas: e.target.value })} className={inp} /></Campito>
      </div>
      <button onClick={finalizar} disabled={!f.competencia.trim()} className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-emerald-300">
        Registrar e finalizar
      </button>
    </Gate>
  );
}

/**
 * Checklist da Execução (Manutenção): a Técnica confirma os dois flags —
 * "Orçamento concluído" e "Sistema comunicando" — antes de seguir para a Medição.
 */
function ChecklistExecucaoManutencao({ card, patch }: { card: Card; patch: (p: Partial<Card>) => void }) {
  function toggle(id: string, rotulo: string) {
    const existe = card.checklist.find((c) => c.id === id);
    const novo = existe
      ? card.checklist.map((c) => (c.id === id ? { ...c, concluido: !c.concluido } : c))
      : [...card.checklist, { id, etapa: "EXECUCAO" as const, rotulo, concluido: true, obrigatorio: true }];
    patch({ checklist: novo });
  }
  return (
    <Gate titulo="Checklist da Execução">
      <ul className="space-y-1.5">
        {CHECKLIST_EXECUCAO_MANUTENCAO.map((it) => {
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
 * Gate da Medição na Manutenção: o perfil Medição registra o Número do Chamado
 * antes de encerrar a OS. O valor é salvo em `medicao.chamado` (campo de gate,
 * que o perfil Medição tem permissão de gravar nesta etapa).
 */
function MedicaoChamadoGate({ card, patch }: { card: Card; patch: (p: Partial<Card>) => void }) {
  const [chamado, setChamado] = useState(card.medicao?.chamado ?? card.chamado ?? "");
  useEffect(() => {
    setChamado(card.medicao?.chamado ?? card.chamado ?? "");
  }, [card.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const inp = "w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

  function salvar() {
    const v = chamado.trim();
    if (v === (card.medicao?.chamado ?? "")) return;
    patch({ medicao: { ...card.medicao, chamado: v || undefined } });
  }

  return (
    <Gate titulo="Medição · Nº do chamado">
      <p className="text-xs text-slate-600 dark:text-slate-300">Informe o número do chamado para encerrar a OS.</p>
      <input value={chamado} onChange={(e) => setChamado(e.target.value)} onBlur={salvar} placeholder="Nº do chamado" className={`mt-2 ${inp}`} />
      <button onClick={salvar} disabled={!chamado.trim()} className="mt-2 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-emerald-300">
        {card.medicao?.chamado ? "✓ Chamado salvo · atualizar" : "Salvar chamado"}
      </button>
    </Gate>
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
