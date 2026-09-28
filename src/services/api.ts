import * as auth from "../auth/auth";
import type { LoginResponse } from "../types/Auth";
import type {
  Avaliacao,
  Categoria,
  Criterio,
  Equipe,
  Evento,
  Jurado,
  JuradoCategoria,
  MovimentacaoPontuacao,
  Nota,
} from "../types/Eventos";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = auth.obterToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
  if (response.status === 401) auth.removerSessao();
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message =
      typeof body === "object" && body !== null && "error" in body
        ? String(body.error)
        : typeof body === "object" && body !== null && "message" in body
          ? String(body.message)
          : "Não foi possível concluir a operação.";
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const buscarEventos = () => apiFetch<Evento[]>("/eventos");
export const listarEquipes = () => apiFetch<Equipe[]>("/equipes");
export const listarCategorias = () => apiFetch<Categoria[]>("/categorias");
export const listarCriterios = () => apiFetch<Criterio[]>("/criterios");
export const listarJurados = () => apiFetch<Jurado[]>("/jurados");
export const listarJuradoCategorias = () =>
  apiFetch<JuradoCategoria[]>("/jurado-categorias");
export const listarAvaliacoes = () => apiFetch<Avaliacao[]>("/avaliacoes");
export const listarNotas = () => apiFetch<Nota[]>("/notas");
export const listarMovimentacoes = () =>
  apiFetch<MovimentacaoPontuacao[]>("/movimentacoes-pontuacao");

export const criarEvento = (dados: Omit<Evento, "id" | "ativo">) =>
  apiFetch<Evento>("/eventos", { method: "POST", body: JSON.stringify(dados) });
export const atualizarEvento = (id: number, dados: Omit<Evento, "id">) =>
  apiFetch<Evento>(`/eventos/${id}`, {
    method: "PUT",
    body: JSON.stringify(dados),
  });
export const criarEquipe = (dados: Omit<Equipe, "id">) =>
  apiFetch<Equipe>("/equipes", { method: "POST", body: JSON.stringify(dados) });
export const criarCategoria = (dados: Omit<Categoria, "id" | "ativo">) =>
  apiFetch<Categoria>("/categorias", {
    method: "POST",
    body: JSON.stringify(dados),
  });
export const atualizarCategoria = (id: number, dados: Omit<Categoria, "id">) =>
  apiFetch<Categoria>(`/categorias/${id}`, {
    method: "PUT",
    body: JSON.stringify(dados),
  });
export const criarCriterio = (dados: Omit<Criterio, "id" | "ativo">) =>
  apiFetch<Criterio>("/criterios", {
    method: "POST",
    body: JSON.stringify(dados),
  });
export const atualizarCriterio = (id: number, dados: Omit<Criterio, "id">) =>
  apiFetch<Criterio>(`/criterios/${id}`, {
    method: "PUT",
    body: JSON.stringify(dados),
  });
export const criarJurado = (dados: Omit<Jurado, "id" | "ativo">) =>
  apiFetch<Jurado>("/jurados", { method: "POST", body: JSON.stringify(dados) });
export const atualizarJurado = (id: number, dados: Omit<Jurado, "id">) =>
  apiFetch<Jurado>(`/jurados/${id}`, {
    method: "PUT",
    body: JSON.stringify(dados),
  });
export const criarJuradoCategoria = (dados: Omit<JuradoCategoria, "id">) =>
  apiFetch<JuradoCategoria>("/jurado-categorias", {
    method: "POST",
    body: JSON.stringify(dados),
  });
export const criarAvaliacao = (dados: Omit<Avaliacao, "id">) =>
  apiFetch<Avaliacao>("/avaliacoes", {
    method: "POST",
    body: JSON.stringify(dados),
  });
export const criarMovimentacao = (
  dados: Omit<MovimentacaoPontuacao, "id" | "dataLancamento">,
) =>
  apiFetch<MovimentacaoPontuacao>("/movimentacoes-pontuacao", {
    method: "POST",
    body: JSON.stringify(dados),
  });
export const criarNota = (dados: Omit<Nota, "id">) =>
  apiFetch<Nota>("/notas", { method: "POST", body: JSON.stringify(dados) });
export const atualizarNota = (id: number, dados: Omit<Nota, "id">) =>
  apiFetch<Nota>(`/notas/${id}`, {
    method: "PUT",
    body: JSON.stringify(dados),
  });

export const loginAdmin = (nome: string, senha: string) =>
  apiFetch<LoginResponse>("/auth/admin/login", {
    method: "POST",
    body: JSON.stringify({ nome, senha }),
  });
export const loginJurado = (eventoId: number, login: string, senha: string) =>
  apiFetch<LoginResponse>("/auth/jurado/login", {
    method: "POST",
    body: JSON.stringify({ eventoId, login, senha }),
  });
