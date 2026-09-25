import { useEffect, useState } from "react";
import { buscarEventos, loginAdmin, loginJurado } from "../services/api";
import type { Evento } from "../types/Eventos";

export function LoginPage() {
  const [tipo, setTipo] = useState<"ADMIN" | "JURADO">("ADMIN");
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [eventoId, setEventoId] = useState<number | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);

  useEffect(() => {
    buscarEventos()
      .then((dados) => {
        setEventos(dados);
      })
      .catch((erro) => {
        console.log(erro);
      });
  }, []);

  async function handleLogin() {
    try {
      if (tipo === "ADMIN") {
        const resultado = await loginAdmin(login, senha);

        console.log("Login ADMIN: ", resultado);
        return;
      }

      if (eventoId === null) {
        console.error("Nenhum evento selecionado.");
        return;
      }
      const resultado = await loginJurado(eventoId, login, senha);
      console.log("Login JURADO: ", resultado);
    } catch (erro) {
      console.error("ERRO NO LOGIN: ", erro);
    }
  }

  return (
    <div>
      <h1>ESPANGLISH</h1>

      <label>
        Tipo de acesso:
        <select
          value={tipo}
          onChange={(event) => {
            setTipo(event?.target.value as "ADMIN" | "JURADO");
          }}
        >
          <option value="ADMIN">ADMINISTRADOR</option>
          <option value="JURADO">JURADO</option>
        </select>
      </label>
      <br />
      {tipo === "JURADO" && (
        <label>
          Evento:
          <select
            value={eventoId ?? ""}
            onChange={(event) => {
              setEventoId(Number(event.target.value));
            }}
          >
            <option value="">Selecione um evento</option>
            {eventos.map((evento) => (
              <option key={evento.id} value={evento.id}>
                {evento.nome}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Login:
        <input
          type="text"
          value={login}
          onChange={(event) => setLogin(event.target.value)}
        />
      </label>
      <label>
        Senha:
        <input
          type="text"
          value={senha}
          onChange={(event) => setSenha(event.target.value)}
        />
      </label>
      <br />
      <button type="button" onClick={handleLogin}>
        Entrar
      </button>
    </div>
  );
}
