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
}

export interface NovoUsuario {
  nome: string;
  email: string;
  perfil: Perfil;
  ativo?: boolean;
  senha?: string;
}

/** Demo: acesso rápido por perfil usa o e-mail semente + senha padrão. */
const EMAIL_PADRAO: Record<Perfil, string> = {
  COORDENADOR: "coordenacao@empresa.com",
  COMERCIAL: "comercial@empresa.com",
  ALMOXARIFADO: "almoxarifado@empresa.com",
  SUPRIMENTOS: "suprimentos@empresa.com",
  SUPERVISOR_MONITORAMENTO: "monitoramento@empresa.com",
  SUPERVISOR_TECNICO: "tecnica@empresa.com",
  ADMINISTRATIVO: "admin@empresa.com",
};
const SENHA_PADRAO = "123456";

interface AuthContextValue {
  carregado: boolean;
  atual: Usuario | null;
  usuarios: Usuario[];
  entrar: (email: string, senha: string) => Promise<{ ok: boolean; motivo?: string }>;
  entrarComoPerfil: (perfil: Perfil) => Promise<{ ok: boolean; motivo?: string }>;
  sair: () => Promise<void>;
  criarUsuario: (u: NovoUsuario) => Promise<{ ok: boolean; motivo?: string }>;
  atualizarUsuario: (id: string, patch: Partial<Usuario> & { senha?: string }) => Promise<void>;
  removerUsuario: (id: string) => Promise<void>;
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

  const entrarComoPerfil = useCallback((perfil: Perfil) => entrar(EMAIL_PADRAO[perfil], SENHA_PADRAO), [entrar]);

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

  const value = useMemo<AuthContextValue>(
    () => ({ carregado, atual, usuarios, entrar, entrarComoPerfil, sair, criarUsuario, atualizarUsuario, removerUsuario }),
    [carregado, atual, usuarios, entrar, entrarComoPerfil, sair, criarUsuario, atualizarUsuario, removerUsuario],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
