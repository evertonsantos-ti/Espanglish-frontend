import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as auth from "../auth/auth";
import {
  buscarEventos,
  criarNota,
  listarAvaliacoes,
  listarCategorias,
  listarCriterios,
  listarEquipes,
  listarNotas,
  atualizarNota,
} from "../services/api";
import type {
  Avaliacao,
  Categoria,
  Criterio,
  Equipe,
  Evento,
  Nota,
} from "../types/Eventos";

type Dados = {
  eventos: Evento[];
  equipes: Equipe[];
  categorias: Categoria[];
  criterios: Criterio[];
  avaliacoes: Avaliacao[];
  notas: Nota[];
};
const vazio: Dados = {
  eventos: [],
  equipes: [],
  categorias: [],
  criterios: [],
  avaliacoes: [],
  notas: [],
};

export function JuradoPage() {
  const navigate = useNavigate();
  const [dados, setDados] = useState<Dados>(vazio);
  const [categoriaId, setCategoriaId] = useState("");
  const [equipeId, setEquipeId] = useState("");
  const [valores, setValores] = useState<Record<number, string>>({});
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [carregando, setCarregando] = useState(true);
  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const [eventos, equipes, categorias, criterios, avaliacoes, notas] =
        await Promise.all([
          buscarEventos(),
          listarEquipes(),
          listarCategorias(),
          listarCriterios(),
          listarAvaliacoes(),
          listarNotas(),
        ]);
      setDados({ eventos, equipes, categorias, criterios, avaliacoes, notas });
    } catch (causa) {
      setErro(
        causa instanceof Error
          ? causa.message
          : "Não foi possível carregar suas avaliações.",
      );
    } finally {
      setCarregando(false);
    }
  }, []);
  useEffect(() => {
    void Promise.resolve().then(carregar);
  }, [carregar]);

  const categoriasDisponiveis = useMemo(() => {
    const categoriasAtribuidas = new Set(
      dados.avaliacoes.map((item) => item.idCategoria),
    );
    return dados.categorias
      .filter((item) => categoriasAtribuidas.has(item.id))
      .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome));
  }, [dados.avaliacoes, dados.categorias]);
  const equipesDisponiveis = useMemo(() => {
    if (!categoriaId) return [];
    const equipesAtribuidas = new Set(
      dados.avaliacoes
        .filter((item) => item.idCategoria === Number(categoriaId))
        .map((item) => item.idEquipe),
    );
    return dados.equipes
      .filter((item) => equipesAtribuidas.has(item.id))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [categoriaId, dados.avaliacoes, dados.equipes]);
  const avaliacao = useMemo(
    () =>
      dados.avaliacoes.find(
        (item) =>
          item.idCategoria === Number(categoriaId) &&
          item.idEquipe === Number(equipeId),
      ),
    [categoriaId, dados.avaliacoes, equipeId],
  );
  const criterios = useMemo(
    () =>
      avaliacao
        ? dados.criterios
            .filter((item) => item.idCategoria === avaliacao.idCategoria)
            .sort((a, b) => a.ordem - b.ordem)
        : [],
    [avaliacao, dados.criterios],
  );
  useEffect(() => {
    if (!avaliacao) {
      queueMicrotask(() => setValores({}));
      return;
    }
    const existentes = dados.notas
      .filter((nota) => nota.idAvaliacao === avaliacao.id)
      .reduce<
        Record<number, string>
      >((acumulado, nota) => ({ ...acumulado, [nota.idCriterio]: String(nota.nota) }), {});
    queueMicrotask(() => setValores(existentes));
  }, [avaliacao, dados.notas]);

  const equipe = avaliacao
    ? dados.equipes.find((item) => item.id === avaliacao.idEquipe)
    : undefined;
  const categoria = avaliacao
    ? dados.categorias.find((item) => item.id === avaliacao.idCategoria)
    : undefined;
  async function salvar() {
    if (!avaliacao) return;
    setErro("");
    setAviso("");
    const notas = criterios.map((criterio) => ({
      criterio,
      valor: Number(valores[criterio.id]),
    }));
    if (
      notas.some(
        ({ valor }) =>
          !Number.isFinite(valor) ||
          valor < 0 ||
          valor > 100 ||
          valor % 5 !== 0,
      )
    )
      return setErro(
        "Preencha todos os critérios com uma nota de 0 a 100, em múltiplos de 5.",
      );
    try {
      await Promise.all(
        notas.map(async ({ criterio, valor }) => {
          const existente = dados.notas.find(
            (nota) =>
              nota.idAvaliacao === avaliacao.id &&
              nota.idCriterio === criterio.id,
          );
          const payload = {
            idAvaliacao: avaliacao.id,
            idCriterio: criterio.id,
            nota: valor,
          };
          return existente
            ? atualizarNota(existente.id, payload)
            : criarNota(payload);
        }),
      );
      setAviso("Avaliação salva com sucesso.");
      await carregar();
    } catch (causa) {
      setErro(
        causa instanceof Error
          ? causa.message
          : "Não foi possível salvar as notas.",
      );
    }
  }
  function sair() {
    auth.removerSessao();
    navigate("/login", { replace: true });
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">ÁREA DO JURADO</p>
          <h1>Espanglish</h1>
        </div>
        <button className="secondary" onClick={sair}>
          Sair
        </button>
      </header>
      {erro && (
        <p className="alert error" role="alert">
          {erro}
        </p>
      )}
      {aviso && (
        <p className="alert success" role="status">
          {aviso}
        </p>
      )}
      {carregando ? (
        <p className="loading">Carregando avaliações…</p>
      ) : (
        <section className="jury-layout">
          <section className="card">
            <h2>Selecione a categoria e a equipe</h2>
            {dados.avaliacoes.length === 0 ? (
              <p className="muted">
                Não há categorias atribuídas a você. Solicite a atribuição ao
                administrador.
              </p>
            ) : (
              <>
                <label>
                  Categoria
                  <select
                    value={categoriaId}
                    onChange={(event) => {
                      setCategoriaId(event.target.value);
                      setEquipeId("");
                    }}
                  >
                    <option value="">Selecione uma categoria</option>
                    {categoriasDisponiveis.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Equipe
                  <select
                    value={equipeId}
                    disabled={!categoriaId}
                    onChange={(event) => setEquipeId(event.target.value)}
                  >
                    <option value="">
                      {categoriaId
                        ? "Selecione uma equipe"
                        : "Selecione a categoria primeiro"}
                    </option>
                    {equipesDisponiveis.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nome}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <p className="hint">
              A categoria permanece selecionada quando você troca de equipe.
              Cada nota vai de 0 a 100, em múltiplos de 5.
            </p>
          </section>
          {avaliacao && (
            <section className="card score-card">
              <div className="section-title">
                <div>
                  <h2>{equipe?.nome}</h2>
                  <p className="muted">
                    {categoria?.nome} ·{" "}
                    {
                      dados.eventos.find(
                        (evento) => evento.id === categoria?.idEvento,
                      )?.nome
                    }
                  </p>
                </div>
              </div>
              {criterios.length === 0 ? (
                <p className="muted">
                  Não há critérios ativos nesta categoria.
                </p>
              ) : (
                <div className="score-list">
                  {criterios.map((criterio) => (
                    <label key={criterio.id} className="score-row">
                      <span>
                        {criterio.ordem}. {criterio.nome}
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="5"
                        inputMode="numeric"
                        value={valores[criterio.id] ?? ""}
                        onChange={(event) =>
                          setValores((atual) => ({
                            ...atual,
                            [criterio.id]: event.target.value,
                          }))
                        }
                        aria-label={`Nota para ${criterio.nome}`}
                      />
                    </label>
                  ))}
                </div>
              )}
              <button
                className="primary"
                disabled={criterios.length === 0}
                onClick={() => void salvar()}
              >
                Salvar avaliação
              </button>
            </section>
          )}
        </section>
      )}
    </main>
  );
}
