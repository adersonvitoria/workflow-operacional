"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { podeGerenciarUsuarios, type Perfil } from "@/lib/perfis";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  ativo: boolean;
  /** Senha definida por terceiro (ou antiga/fraca): exige troca no acesso. */
  precisaTrocarSenha?: boolean;
}

export interface NovoUsuario {
  nome: string;
  email: string;
  perfil: Perfil;
  ativo?: boolean;
  senha?: string;
}

interface AuthContextValue {
  carregado: boolean;
  atual: Usuario | null;
  usuarios: Usuario[];
  entrar: (email: string, senha: string) => Promise<{ ok: boolean; motivo?: string }>;
  sair: () => Promise<void>;
  criarUsuario: (u: NovoUsuario) => Promise<{ ok: boolean; motivo?: string }>;
  atualizarUsuario: (id: string, patch: Partial<Usuario> & { senha?: string }) => Promise<void>;
  removerUsuario: (id: string) => Promise<void>;
  /** Auto-serviço do usuário logado: nome de exibição e/ou senha. */
  atualizarPerfil: (patch: { nome?: string; senhaAtual?: string; novaSenha?: string }) => Promise<{ ok: boolean; motivo?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, { credentials: "same-origin", headers: { "Content-Type": "application/json" }, ...init });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [atual, setAtual] = useState<Usuario | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregado, setCarregado] = useState(false);

  // Restaura a sessão a partir do cookie.
  useEffect(() => {
    (async () => {
      const { json } = await api("/api/auth/me");
      setAtual((json.usuario as Usuario) ?? null);
      setCarregado(true);
    })();
  }, []);

  const recarregarUsuarios = useCallback(async () => {
    if (!podeGerenciarUsuarios(atual?.perfil)) { setUsuarios([]); return; }
    const { ok, json } = await api("/api/usuarios");
    if (ok) setUsuarios(json.usuarios as Usuario[]);
  }, [atual]);

  useEffect(() => { void recarregarUsuarios(); }, [recarregarUsuarios]);

  const entrar = useCallback(async (email: string, senha: string) => {
    const { ok, json } = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, senha }) });
    if (!ok) return { ok: false, motivo: (json.erro as string) ?? "Falha no login." };
    setAtual(json.usuario as Usuario);
    return { ok: true };
  }, []);

  const sair = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST" });
    setAtual(null);
    setUsuarios([]);
  }, []);

  const criarUsuario = useCallback(async (u: NovoUsuario) => {
    const { ok, json } = await api("/api/usuarios", { method: "POST", body: JSON.stringify(u) });
    if (!ok) return { ok: false, motivo: (json.erro as string) ?? "Falha ao cadastrar." };
    await recarregarUsuarios();
    return { ok: true };
  }, [recarregarUsuarios]);

  const atualizarUsuario = useCallback(async (id: string, patch: Partial<Usuario> & { senha?: string }) => {
    await api(`/api/usuarios/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    await recarregarUsuarios();
  }, [recarregarUsuarios]);

  const removerUsuario = useCallback(async (id: string) => {
    await api(`/api/usuarios/${id}`, { method: "DELETE" });
    await recarregarUsuarios();
  }, [recarregarUsuarios]);

  const atualizarPerfil = useCallback(async (patch: { nome?: string; senhaAtual?: string; novaSenha?: string }) => {
    const { ok, json } = await api("/api/auth/me", { method: "PATCH", body: JSON.stringify(patch) });
    if (!ok) return { ok: false, motivo: (json.erro as string) ?? "Falha ao atualizar." };
    setAtual(json.usuario as Usuario);
    return { ok: true };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ carregado, atual, usuarios, entrar, sair, criarUsuario, atualizarUsuario, removerUsuario, atualizarPerfil }),
    [carregado, atual, usuarios, entrar, sair, criarUsuario, atualizarUsuario, removerUsuario, atualizarPerfil],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
