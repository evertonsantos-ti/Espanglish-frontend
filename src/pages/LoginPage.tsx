import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import * as auth from "../auth/auth";
import { buscarEventos, loginAdmin, loginJurado } from "../services/api";
import type { TipoUsuario } from "../types/Auth";
import type { Evento } from "../types/Eventos";

export function LoginPage() {
  const navigate = useNavigate();
  const [tipo, setTipo] = useState<TipoUsuario>("ADMIN");
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [eventoId, setEventoId] = useState("");
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    buscarEventos()
      .then((dados) => setEventos(dados.filter((evento) => evento.ativo)))
      .catch(() => setErro("Não foi possível carregar os eventos."));
  }, []);

  async function entrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    if (!login.trim() || !senha) return setErro("Informe o acesso e a senha.");
    if (tipo === "JURADO" && !eventoId)
      return setErro("Selecione o evento que será avaliado.");
    setCarregando(true);
    try {
      const resultado =
        tipo === "ADMIN"
          ? await loginAdmin(login.trim(), senha)
          : await loginJurado(Number(eventoId), login.trim(), senha);
      auth.salvarSessao(resultado.token, tipo);
      navigate(tipo === "ADMIN" ? "/admin" : "/jurado", { replace: true });
    } catch (causa) {
      setErro(
        causa instanceof Error
          ? causa.message
          : "Não foi possível realizar o acesso.",
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <p className="eyebrow">SISTEMA DE PONTUAÇÃO</p>
        <h1>Espanglish</h1>
        <p className="muted">
          Acesse o painel de organização ou registre as avaliações da sua
          categoria.
        </p>
        <form onSubmit={entrar} noValidate>
          <label>
            Perfil
            <select
              value={tipo}
              onChange={(event) => {
                setTipo(event.target.value as TipoUsuario);
                setErro("");
              }}
            >
              <option value="ADMIN">Administração</option>
              <option value="JURADO">Jurado</option>
            </select>
          </label>
          {tipo === "JURADO" && (
            <label>
              Evento
              <select
                value={eventoId}
                onChange={(event) => setEventoId(event.target.value)}
                required
              >
                <option value="">Selecione um evento</option>
                {eventos.map((evento) => (
                  <option key={evento.id} value={evento.id}>
                    {evento.nome} ({evento.competencia})
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            {tipo === "ADMIN" ? "Usuário" : "Login do jurado"}
            <input
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {erro && (
            <p className="alert error" role="alert">
              {erro}
            </p>
          )}
          <button className="primary" disabled={carregando}>
            {carregando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
