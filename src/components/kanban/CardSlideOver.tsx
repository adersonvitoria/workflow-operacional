"use client";

import { useState } from "react";
import {
  formatarBRL,
  MODALIDADE_META,
  SETOR_ROTULO,
  STATUS_META,
} from "@/lib/flows";
import { podeAvancar, rotuloEtapa } from "@/lib/routing";
import type { Card, EtapaImplantacao } from "@/types";

interface CardSlideOverProps {
  card: Card | null;
  onFechar: () => void;
  onPatch: (patch: Partial<Card>) => void;
  onAvancar: () => void;
  onEditar: () => void;
}

type Aba = "detalhes" | "historico";

/**
 * Painel lateral de detalhes (controlado pelo store). Os gates precisam ser
 * satisfeitos para o botão "Avançar" liberar — lógica à prova de erros.
 */
export function CardSlideOver({ card, onFechar, onPatch, onAvancar, onEditar }: CardSlideOverProps) {
  const [aba, setAba] = useState<Aba>("detalhes");
  const aberto = card != null;
  const validacao = card ? podeAvancar(card) : { ok: false as const };

  return (
    <>
      <div
        onClick={onFechar}
        className={["fixed inset-0 z-40 bg-slate-900/30 transition-opacity", aberto ? "opacity-100" : "pointer-events-none opacity-0"].join(" ")}
      />

      <aside
        className={["fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-surface-card shadow-slideover transition-transform duration-300", aberto ? "translate-x-0" : "translate-x-full"].join(" ")}
      >
        {card && (
          <>
            <header className="border-b border-slate-200 px-5 pt-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs text-slate-400">#{card.codigo}</span>
                  <h2 className="text-lg font-semibold text-slate-900">{card.cliente.nome}</h2>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={onEditar} className="rounded-lg px-2 py-1 text-xs font-medium text-brand hover:bg-brand/10">Editar</button>
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
                  <GateAtual card={card} patch={onPatch} />

                  <Secao titulo="Financeiro">
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <Campo rotulo="Mão de obra" valor={formatarBRL(card.valores.maoDeObra)} />
                      <Campo rotulo="Equipamentos" valor={formatarBRL(card.valores.equipamentos)} />
                      <Campo rotulo="Total" valor={formatarBRL(card.valores.total)} destaque />
                      <Campo rotulo="Mensal" valor={formatarBRL(card.valores.mensal)} />
                    </dl>
                  </Secao>

                  {card.materiais.length > 0 && (
                    <Secao titulo={`Kit de instalação (${card.materiais.length})`}>
                      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                        {card.materiais.map((m) => (
                          <li key={m.id} className="flex items-center justify-between px-3 py-2 text-sm">
                            <span className="text-slate-700"><span className="font-medium">{m.quantidade}x</span> {m.descricao}</span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">{m.statusAlmox}</span>
                          </li>
                        ))}
                      </ul>
                    </Secao>
                  )}

                  {card.checklist.length > 0 && (
                    <Secao titulo="Checklist da esteira">
                      <ul className="space-y-1.5">
                        {card.checklist.map((item) => (
                          <li key={item.id}>
                            <button type="button" onClick={() => onPatch({ checklist: card.checklist.map((c) => (c.id === item.id ? { ...c, concluido: !c.concluido } : c)) })} className="flex w-full items-center gap-2 text-left text-sm">
                              <span className={["flex h-4 w-4 items-center justify-center rounded border text-[10px]", item.concluido ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-transparent"].join(" ")}>✓</span>
                              <span className={item.concluido ? "text-slate-500 line-through" : "text-slate-700"}>{item.rotulo}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </Secao>
                  )}

                  {card.observacoes && (
                    <Secao titulo="Observações">
                      <p className="text-sm text-slate-600">{card.observacoes}</p>
                    </Secao>
                  )}
                </>
              ) : (
                <Secao titulo="Histórico">
                  <ol className="space-y-3 border-l-2 border-slate-100 pl-4">
                    {[...card.historico].reverse().map((ev) => (
                      <li key={ev.id} className="relative text-sm">
                        <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-brand ring-2 ring-white" />
                        <p className="font-medium text-slate-700">{ev.acao}</p>
                        <p className="text-xs text-slate-400">{SETOR_ROTULO[ev.setor]} · {ev.autor} · {new Date(ev.data).toLocaleDateString("pt-BR")}</p>
                      </li>
                    ))}
                  </ol>
                </Secao>
              )}
            </div>

            <footer className="space-y-2 border-t border-slate-200 px-5 py-4">
              {!validacao.ok && validacao.motivo && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">⚠ {validacao.motivo}</p>
              )}
              <button
                onClick={onAvancar}
                disabled={!validacao.ok}
                className={["w-full rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition", validacao.ok ? "bg-brand text-white hover:bg-brand-700" : "cursor-not-allowed bg-slate-100 text-slate-400"].join(" ")}
              >
                {validacao.ok && validacao.proxima ? `Avançar para ${rotuloEtapa(validacao.proxima)} →` : "Avançar etapa"}
              </button>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}

function GateAtual({ card, patch }: { card: Card; patch: (p: Partial<Card>) => void }) {
  const etapa = card.etapa as EtapaImplantacao;

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
    return (
      <Gate titulo="Aprovação inicial da Coordenação">
        <button onClick={() => patch({ aprovacaoInicial: { aprovado: true, por: "Coordenação", em: new Date().toISOString() }, status: "EM_ANDAMENTO" })} disabled={card.aprovacaoInicial?.aprovado} className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-emerald-200">
          {card.aprovacaoInicial?.aprovado ? "✓ Aprovado" : "Aprovar escopo"}
        </button>
      </Gate>
    );
  }

  if (etapa === "SUPRIMENTOS" && card.modalidade === "VENDA") {
    const a = card.almoxarifado ?? { verificado: false, temTudoEmEstoque: false, listaDoQueFalta: "" };
    return (
      <Gate titulo="Almoxarifado · conferência de estoque (Venda)">
        <textarea value={a.listaDoQueFalta} onChange={(e) => patch({ almoxarifado: { ...a, listaDoQueFalta: e.target.value, verificado: true } })} placeholder="Lista do que falta comprar…" rows={3} className="w-full resize-none rounded-lg border border-slate-200 p-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand" />
        <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
          <input type="checkbox" checked={a.temTudoEmEstoque} onChange={(e) => patch({ almoxarifado: { ...a, temTudoEmEstoque: e.target.checked, verificado: true } })} />
          Tenho tudo em estoque (não precisa comprar)
        </label>
      </Gate>
    );
  }

  if (etapa === "MONITORAMENTO") {
    const s = card.sigma ?? { contaCriada: false };
    return (
      <Gate titulo="Criação de conta no software central">
        <input value={s.contaSigma ?? ""} onChange={(e) => patch({ sigma: { ...s, contaSigma: e.target.value } })} placeholder="Nº da conta (Sigma)" className="mb-2 w-full rounded-lg border border-slate-200 p-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand" />
        <input value={s.dadosConexao ?? ""} onChange={(e) => patch({ sigma: { ...s, dadosConexao: e.target.value } })} placeholder="Dados de conexão (IP, portas, serial)" className="mb-2 w-full rounded-lg border border-slate-200 p-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand" />
        <button onClick={() => patch({ sigma: { ...s, contaCriada: true, statusSync: "SINCRONIZADO" } })} disabled={s.contaCriada} className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-emerald-200">
          {s.contaCriada ? "✓ Conta criada" : "Confirmar criação da conta"}
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

  return null;
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
      <dd className={destaque ? "font-semibold text-slate-900" : "text-slate-700"}>{valor}</dd>
    </div>
  );
}

function Tag({ classe, children }: { classe: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ring-1 ring-inset ${classe}`}>{children}</span>;
}
