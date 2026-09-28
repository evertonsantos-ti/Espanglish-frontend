import type { Sessao, TipoUsuario } from "../types/Auth";

const SESSION_KEY = "espanglish.sessao";

export function salvarSessao(token: string, tipo: TipoUsuario): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ token, tipo }));
}

export function obterSessao(): Sessao | null {
  const valor = localStorage.getItem(SESSION_KEY);
  if (!valor) return null;
  try {
    const sessao: unknown = JSON.parse(valor);
    if (
      typeof sessao === "object" &&
      sessao !== null &&
      "token" in sessao &&
      "tipo" in sessao &&
      typeof sessao.token === "string" &&
      (sessao.tipo === "ADMIN" || sessao.tipo === "JURADO")
    ) {
      return { token: sessao.token, tipo: sessao.tipo };
    }
  } catch {
    // Sessões inválidas são descartadas abaixo.
  }
  removerSessao();
  return null;
}

export function obterToken(): string | null {
  return obterSessao()?.token ?? null;
}

export function removerSessao(): void {
  localStorage.removeItem(SESSION_KEY);
}
