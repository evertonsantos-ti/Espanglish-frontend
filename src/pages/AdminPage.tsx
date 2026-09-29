import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import * as auth from "../auth/auth";
import {
  atualizarCategoria,
  atualizarCriterio,
  atualizarEvento,
  atualizarEquipe,
  atualizarJurado,
  buscarEventos,
  buscarRelatorioEvento,
  criarCategoria,
  criarCriterio,
  criarEquipe,
  criarEvento,
  criarJurado,
  criarJuradoCategoria,
  criarMovimentacao,
  excluirJuradoCategoria,
  atualizarMovimentacao,
  listarCategorias,
  listarCriterios,
  listarEquipes,
  listarJuradoCategorias,
  listarJurados,
  listarMovimentacoes,
} from "../services/api";
import type {
  Categoria,
  Criterio,
  Equipe,
  Evento,
  Jurado,
  JuradoCategoria,
  MovimentacaoPontuacao,
  RelatorioEvento,
} from "../types/Eventos";

type Dados = {
  eventos: Evento[];
  equipes: Equipe[];
  categorias: Categoria[];
  criterios: Criterio[];
  jurados: Jurado[];
  vinculacoes: JuradoCategoria[];
  movimentacoes: MovimentacaoPontuacao[];
};
const vazio: Dados = {
  eventos: [],
  equipes: [],
  categorias: [],
  criterios: [],
  jurados: [],
  vinculacoes: [],
  movimentacoes: [],
};

function number(value: FormDataEntryValue | null): number {
  return Number(value);
}
function nome<T extends { id: number; nome: string }>(items: T[], id: number) {
  return items.find((item) => item.id === id)?.nome ?? `#${id}`;
}

export function AdminPage() {
  const navigate = useNavigate();
  const [dados, setDados] = useState<Dados>(vazio);
  const [aba, setAba] = useState("eventos");
  const [eventoSelecionadoId, setEventoSelecionadoId] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const [
        eventos,
        equipes,
        categorias,
        criterios,
        jurados,
        vinculacoes,
        movimentacoes,
      ] = await Promise.all([
        buscarEventos(),
        listarEquipes(),
        listarCategorias(),
        listarCriterios(),
        listarJurados(),
        listarJuradoCategorias(),
        listarMovimentacoes(),
      ]);
      setDados({
        eventos,
        equipes,
        categorias,
        criterios,
        jurados,
        vinculacoes,
        movimentacoes,
      });
    } catch (causa) {
      setErro(
        causa instanceof Error
          ? causa.message
          : "Não foi possível carregar os dados.",
      );
    } finally {
      setCarregando(false);
    }
  }, []);
  useEffect(() => {
    void Promise.resolve().then(carregar);
  }, [carregar]);

  async function salvar(acao: () => Promise<unknown>, mensagem: string) {
    setErro("");
    setAviso("");
    try {
      await acao();
      setAviso(mensagem);
      await carregar();
    } catch (causa) {
      setErro(
        causa instanceof Error
          ? causa.message
          : "Não foi possível salvar os dados.",
      );
    }
  }
  function sair() {
    auth.removerSessao();
    navigate("/login", { replace: true });
  }
  const dadosVisiveis = useMemo(() => {
    const eventoId = Number(eventoSelecionadoId);
    if (!Number.isInteger(eventoId) || eventoId <= 0) return dados;

    const eventos = dados.eventos.filter((evento) => evento.id === eventoId);
    const equipes = dados.equipes.filter((equipe) => equipe.idEvento === eventoId);
    const categorias = dados.categorias.filter((categoria) => categoria.idEvento === eventoId);
    const categoriaIds = new Set(categorias.map((categoria) => categoria.id));
    const jurados = dados.jurados.filter((jurado) => jurado.idEvento === eventoId);
    const juradoIds = new Set(jurados.map((jurado) => jurado.id));

    return {
      eventos,
      equipes,
      categorias,
      criterios: dados.criterios.filter((criterio) => categoriaIds.has(criterio.idCategoria)),
      jurados,
      vinculacoes: dados.vinculacoes.filter((vinculo) => juradoIds.has(vinculo.idJurado) || categoriaIds.has(vinculo.idCategoria)),
      movimentacoes: dados.movimentacoes.filter((movimentacao) => movimentacao.idEvento === eventoId),
    };
  }, [dados, eventoSelecionadoId]);
  const eventosAtivos = dadosVisiveis.eventos.filter((evento) => evento.ativo);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">ADMINISTRAÇÃO</p>
          <h1>Espanglish</h1>
        </div>
        <div className="topbar-actions">
          <label className="event-filter">Evento
            <select value={eventoSelecionadoId} onChange={(event) => setEventoSelecionadoId(event.target.value)}>
              <option value="">Todos os eventos</option>
              {dados.eventos.map((evento) => <option key={evento.id} value={evento.id}>{evento.nome} ({evento.competencia})</option>)}
            </select>
          </label>
          <button className="secondary" onClick={sair}>Sair</button>
        </div>
      </header>
      <nav className="tabs" aria-label="Módulos">
        {[
          ["eventos", "Eventos"],
          ["equipes", "Equipes"],
          ["categorias", "Categorias"],
          ["criterios", "Critérios"],
          ["jurados", "Jurados"],
          ["pontuacao", "Pontuação"],
          ["relatorios", "Relatórios"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={aba === id ? "active" : ""}
            onClick={() => {
              setAba(id);
              setAviso("");
              setErro("");
            }}
          >
            {label}
          </button>
        ))}
      </nav>
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
        <p className="loading">Carregando dados…</p>
      ) : (
        <section className="workspace">
          {aba === "eventos" && <Eventos dados={dadosVisiveis} salvar={salvar} />}
          {aba === "equipes" && (
            <Equipes
              eventos={eventosAtivos}
              equipes={dadosVisiveis.equipes}
              salvar={salvar}
            />
          )}
          {aba === "categorias" && (
            <Categorias
              eventos={eventosAtivos}
              categorias={dadosVisiveis.categorias}
              salvar={salvar}
            />
          )}
          {aba === "criterios" && (
            <Criterios
              eventos={eventosAtivos}
              categorias={dadosVisiveis.categorias.filter(
                (categoria) => categoria.ativo,
              )}
              criterios={dadosVisiveis.criterios}
              salvar={salvar}
            />
          )}
          {aba === "jurados" && (
            <Jurados
              eventos={eventosAtivos}
              categorias={dadosVisiveis.categorias.filter(
                (categoria) => categoria.ativo,
              )}
              jurados={dadosVisiveis.jurados}
              vinculacoes={dadosVisiveis.vinculacoes}
              salvar={salvar}
            />
          )}
          {aba === "pontuacao" && (
            <Pontuacao
              eventos={eventosAtivos}
              equipes={dadosVisiveis.equipes}
              movimentacoes={dadosVisiveis.movimentacoes}
              salvar={salvar}
            />
          )}
          {aba === "relatorios" && <Relatorios eventos={dadosVisiveis.eventos} />}
        </section>
      )}
    </main>
  );
}

function Painel({
  titulo,
  children,
  lista,
}: {
  titulo: string;
  children: ReactNode;
  lista: ReactNode;
}) {
  return (
    <>
      <div className="section-title">
        <h2>{titulo}</h2>
      </div>
      <div className="split">
        <section className="card">
          <h3>Novo cadastro</h3>
          {children}
        </section>
        <section className="card">
          <h3>Registros</h3>
          {lista}
        </section>
      </div>
    </>
  );
}

function Eventos({
  dados,
  salvar,
}: {
  dados: Dados;
  salvar: AdminPageProps["salvar"];
}) {
  const navigate = useNavigate();
  const [editando, setEditando] = useState<Evento | null>(null);
  return (
    <Painel
      titulo="Eventos"
      lista={
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Período</th>
              <th>Status</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {dados.eventos.map((item) => (
              <tr key={item.id}>
                <td>
                  <button
                    className="link"
                    onClick={() =>
                      navigate(`/admin/eventos/${item.id}/relatorio`)
                    }
                  >
                    {item.nome}
                  </button>
                  <small>{item.competencia}</small>
                </td>
                <td>
                  {item.dataInicio
                    ? item.dataInicio
                        .slice(0, 10)
                        .split("-")
                        .reverse()
                        .join("/")
                    : "-"}{" "}
                  —{" "}
                  {item.dataFim
                    ? item.dataFim.slice(0, 10).split("-").reverse().join("/")
                    : "-"}{" "}
                </td>
                <td>
                  <button
                    className="link"
                    onClick={() =>
                      salvar(
                        () =>
                          atualizarEvento(item.id, {
                            ...item,
                            ativo: !item.ativo,
                          }),
                        item.ativo ? "Evento inativado." : "Evento ativado.",
                      )
                    }
                  >
                    {item.ativo ? "Ativo" : "Inativo"}
                  </button>
                </td>
                <td><button className="secondary" onClick={() => setEditando(item)}>Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <form key={editando?.id ?? "novo"}
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void salvar(
            () => editando
              ? atualizarEvento(editando.id, {
                nome: String(form.get("nome")).trim(),
                competencia: number(form.get("competencia")),
                dataInicio: String(form.get("inicio")),
                dataFim: String(form.get("fim")),
                ativo: editando.ativo,
              })
              : criarEvento({
                  nome: String(form.get("nome")).trim(),
                  competencia: number(form.get("competencia")),
                  dataInicio: String(form.get("inicio")),
                  dataFim: String(form.get("fim")),
                }),
            editando ? "Evento atualizado." : "Evento criado com sucesso.",
          );
          setEditando(null);
          event.currentTarget.reset();
        }}
      >
        <label>
          Nome
          <input name="nome" maxLength={100} defaultValue={editando?.nome} required />
        </label>
        <div className="form-grid">
          <label>
            Competência
            <input
              name="competencia"
              type="number"
              min="2020"
              max="2100"
              defaultValue={editando?.competencia ?? new Date().getFullYear()}
              required
            />
          </label>
          <label>
            Início
            <input name="inicio" type="date" defaultValue={editando?.dataInicio.slice(0, 10)} required />
          </label>
          <label>
            Fim
            <input name="fim" type="date" defaultValue={editando?.dataFim.slice(0, 10)} required />
          </label>
        </div>
        <button className="primary">{editando ? "Atualizar evento" : "Salvar evento"}</button>
        {editando && <button type="button" className="secondary" onClick={() => setEditando(null)}>Cancelar</button>}
      </form>
    </Painel>
  );
}

type AdminPageProps = {
  salvar: (acao: () => Promise<unknown>, mensagem: string) => Promise<void>;
};
function Equipes({
  eventos,
  equipes,
  salvar,
}: { eventos: Evento[]; equipes: Equipe[] } & AdminPageProps) {
  const [editando, setEditando] = useState<Equipe | null>(null);
  return (
    <Painel
      titulo="Equipes"
      lista={
        <div>
          {eventos.map((evt) => {
            const teams = equipes.filter((eq) => eq.idEvento === evt.id);
            if (teams.length === 0) return null;
            return (
              <div key={evt.id} className="group">
                <h4>
                  {evt.nome} <small>{evt.competencia}</small>
                </h4>
                <table>
                  <thead>
                    <tr>
                      <th>Equipe</th><th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((t) => (
                      <tr key={t.id}>
                        <td>{t.nome}</td><td><button className="secondary" onClick={() => setEditando(t)}>Editar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      }
    >
      <form key={editando?.id ?? "novo"}
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void salvar(
            () => editando
              ? atualizarEquipe(editando.id, {
                  nome: String(form.get("nome")).trim(),
                  idEvento: editando.idEvento,
                })
              : criarEquipe({
                nome: String(form.get("nome")).trim(),
                idEvento: number(form.get("evento")),
              }),
            editando ? "Equipe atualizada." : "Equipe cadastrada.",
          );
          setEditando(null);
          event.currentTarget.reset();
        }}
      >
        {editando ? <p className="hint">Evento: {nome(eventos, editando.idEvento)}</p> : <Select name="evento" label="Evento" items={eventos} />}
        <label>
          Nome da equipe
          <input name="nome" maxLength={100} defaultValue={editando?.nome} required />
        </label>
        <button className="primary">{editando ? "Atualizar equipe" : "Salvar equipe"}</button>
        {editando && <button type="button" className="secondary" onClick={() => setEditando(null)}>Cancelar</button>}
      </form>
    </Painel>
  );
}
function Categorias({
  eventos,
  categorias,
  salvar,
}: { eventos: Evento[]; categorias: Categoria[] } & AdminPageProps) {
  const [editando, setEditando] = useState<Categoria | null>(null);
  return (
    <Painel
      titulo="Categorias"
      lista={
        <div>
          {eventos.map((evt) => {
            const cats = categorias.filter((c) => c.idEvento === evt.id);
            if (cats.length === 0) return null;
            return (
              <div key={evt.id} className="group">
                <h4>
                  {evt.nome} <small>{evt.competencia}</small>
                </h4>
                <table>
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th>Ordem</th>
                      <th>Status</th><th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cats.map((item) => (
                      <tr key={item.id}>
                        <td>{item.nome}</td>
                        <td>{item.ordem}</td>
                        <td>
                          <button
                            className="link"
                            onClick={() =>
                              salvar(
                                () =>
                                  atualizarCategoria(item.id, {
                                    ...item,
                                    ativo: !item.ativo,
                                  }),
                                item.ativo
                                  ? "Categoria inativada."
                                  : "Categoria ativada.",
                              )
                            }
                          >
                            {item.ativo ? "Ativa" : "Inativa"}
                          </button>
                        </td>
                        <td><button className="secondary" onClick={() => setEditando(item)}>Editar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      }
    >
      <form key={editando?.id ?? "novo"}
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void salvar(
            () => editando
              ? atualizarCategoria(editando.id, {
                  nome: String(form.get("nome")).trim(),
                  idEvento: editando.idEvento,
                  ordem: number(form.get("ordem")),
                  ativo: editando.ativo,
                })
              : criarCategoria({
                nome: String(form.get("nome")).trim(),
                idEvento: number(form.get("evento")),
                ordem: number(form.get("ordem")),
              }),
            editando ? "Categoria atualizada." : "Categoria cadastrada.",
          );
          setEditando(null);
          event.currentTarget.reset();
        }}
      >
        {editando ? <p className="hint">Evento: {nome(eventos, editando.idEvento)}</p> : <Select name="evento" label="Evento" items={eventos} />}
        <div className="form-grid">
          <label>
            Nome
            <input name="nome" maxLength={100} defaultValue={editando?.nome} required />
          </label>
          <label>
            Ordem
            <input name="ordem" type="number" min="1" defaultValue={editando?.ordem} required />
          </label>
        </div>
        <button className="primary">{editando ? "Atualizar categoria" : "Salvar categoria"}</button>
        {editando && <button type="button" className="secondary" onClick={() => setEditando(null)}>Cancelar</button>}
      </form>
    </Painel>
  );
}
function Criterios({
  eventos,
  categorias,
  criterios,
  salvar,
}: {
  eventos: Evento[];
  categorias: Categoria[];
  criterios: Criterio[];
} & AdminPageProps) {
  const [editando, setEditando] = useState<Criterio | null>(null);
  return (
    <Painel
      titulo="Critérios"
      lista={
        <div>
          {eventos.map((evt) => {
            const cats = categorias.filter((c) => c.idEvento === evt.id);
            if (cats.length === 0) return null;
            return (
              <div key={evt.id} className="group">
                <h4>
                  {evt.nome} <small>{evt.competencia}</small>
                </h4>
                {cats.map((cat) => {
                  const crits = criterios.filter(
                    (cr) => cr.idCategoria === cat.id,
                  );
                  return (
                    <div key={cat.id} className="subgroup">
                      <h5>{cat.nome}</h5>
                      <table>
                        <thead>
                          <tr>
                            <th>Critério</th>
                            <th>Ordem</th>
                            <th>Status</th><th>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {crits.map((item) => (
                            <tr key={item.id}>
                              <td>{item.nome}</td>
                              <td>{item.ordem}</td>
                              <td>
                                <button
                                  className="link"
                                  onClick={() =>
                                    salvar(
                                      () =>
                                        atualizarCriterio(item.id, {
                                          ...item,
                                          ativo: !item.ativo,
                                        }),
                                      item.ativo
                                        ? "Critério inativado."
                                        : "Critério ativado.",
                                    )
                                  }
                                >
                                  {item.ativo ? "Ativo" : "Inativo"}
                                </button>
                              </td>
                              <td><button className="secondary" onClick={() => setEditando(item)}>Editar</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      }
    >
      <form key={editando?.id ?? "novo"}
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void salvar(
            () => editando
              ? atualizarCriterio(editando.id, {
                  nome: String(form.get("nome")).trim(),
                  idCategoria: editando.idCategoria,
                  ordem: number(form.get("ordem")),
                  ativo: editando.ativo,
                })
              : criarCriterio({
                nome: String(form.get("nome")).trim(),
                idCategoria: number(form.get("categoria")),
                ordem: number(form.get("ordem")),
              }),
            editando ? "Critério atualizado." : "Critério cadastrado.",
          );
          setEditando(null);
          event.currentTarget.reset();
        }}
      >
        {editando ? <p className="hint">Categoria: {nome(categorias, editando.idCategoria)}</p> : <Select name="categoria" label="Categoria" items={categorias} />}
        <div className="form-grid">
          <label>
            Nome
            <input name="nome" maxLength={100} defaultValue={editando?.nome} required />
          </label>
          <label>
            Ordem
            <input name="ordem" type="number" min="1" defaultValue={editando?.ordem} required />
          </label>
        </div>
        <button className="primary">{editando ? "Atualizar critério" : "Salvar critério"}</button>
        {editando && <button type="button" className="secondary" onClick={() => setEditando(null)}>Cancelar</button>}
      </form>
    </Painel>
  );
}

function Jurados({
  eventos,
  categorias,
  jurados,
  vinculacoes,
  salvar,
}: {
  eventos: Evento[];
  categorias: Categoria[];
  jurados: Jurado[];
  vinculacoes: JuradoCategoria[];
} & AdminPageProps) {
  const [modo, setModo] = useState<"jurado" | "vinculo">("jurado");
  const [editando, setEditando] = useState<Jurado | null>(null);
  const lista =
    modo === "jurado" ? (
      <div>
        {eventos.map((evt) => {
          const js = jurados.filter((j) => j.idEvento === evt.id);
          if (js.length === 0) return null;
          return (
            <div key={evt.id} className="group">
              <h4>
                {evt.nome} <small>{evt.competencia}</small>
              </h4>
              <table>
                <thead>
                  <tr>
                    <th>Jurado</th>
                    <th>Status</th><th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {js.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.nome}
                        <small>{item.login}</small>
                      </td>
                      <td>
                        <button
                          className="link"
                          onClick={() =>
                            salvar(
                              () =>
                                atualizarJurado(item.id, {
                                  ...item,
                                  ativo: !item.ativo,
                                }),
                              item.ativo
                                ? "Jurado inativado."
                                : "Jurado ativado.",
                            )
                          }
                        >
                          {item.ativo ? "Ativo" : "Inativo"}
                        </button>
                      </td>
                      <td><button className="secondary" onClick={() => setEditando(item)}>Editar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    ) : (
      <div>
        {jurados.map((j) => {
          const atribuicoes = vinculacoes
            .filter((v) => v.idJurado === j.id)
            .map((v) => ({ vinculo: v, categoria: categorias.find((c) => c.id === v.idCategoria) }))
            .filter((item): item is { vinculo: JuradoCategoria; categoria: Categoria } => Boolean(item.categoria));
          return (
            <div key={j.id} className="group">
              <h4>
                {j.nome} <small>{j.login}</small>
              </h4>
              <ul>
                {atribuicoes.map(({ vinculo, categoria }) => (
                  <li key={vinculo.id}>
                    {categoria.nome} ({nome(eventos, categoria.idEvento)}) {" "}
                    <button className="link" onClick={() => {
                      if (window.confirm(`Remover a categoria ${categoria.nome}, suas avaliações e as notas deste jurado?`)) {
                        void salvar(() => excluirJuradoCategoria(vinculo.id), "Categoria, avaliações e notas vinculadas removidas.");
                      }
                    }}>Excluir</button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    );
  return (
    <>
      <div className="subtabs">
        <button
          className={modo === "jurado" ? "active" : ""}
          onClick={() => setModo("jurado")}
        >
          Jurados
        </button>
        <button
          className={modo === "vinculo" ? "active" : ""}
          onClick={() => setModo("vinculo")}
        >
          Categorias atribuídas
        </button>
      </div>
      <Painel
        titulo={modo === "jurado" ? "Jurados" : "Atribuir categoria"}
        lista={lista}
      >
        {modo === "jurado" ? (
          <form key={editando?.id ?? "novo"}
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void salvar(
                () => editando
                  ? atualizarJurado(editando.id, {
                      nome: String(form.get("nome")).trim(),
                      login: String(form.get("login")).trim(),
                      idEvento: editando.idEvento,
                      ativo: editando.ativo,
                    })
                  : criarJurado({
                    nome: String(form.get("nome")).trim(),
                    login: String(form.get("login")).trim(),
                    idEvento: number(form.get("evento")),
                  }),
                editando ? "Jurado atualizado." : "Jurado cadastrado.",
              );
              setEditando(null);
              event.currentTarget.reset();
            }}
          >
            {editando ? <p className="hint">Evento: {nome(eventos, editando.idEvento)}</p> : <Select name="evento" label="Evento" items={eventos} />}
            <label>
              Nome
              <input name="nome" maxLength={100} defaultValue={editando?.nome} required />
            </label>
            <label>
              Login
              <input name="login" maxLength={100} defaultValue={editando?.login} required />
            </label>
            <button className="primary">{editando ? "Atualizar jurado" : "Salvar jurado"}</button>
            {editando && <button type="button" className="secondary" onClick={() => setEditando(null)}>Cancelar</button>}
          </form>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void salvar(
                () =>
                  criarJuradoCategoria({
                    idJurado: number(form.get("jurado")),
                    idCategoria: number(form.get("categoria")),
                  }),
                "Categoria atribuída e avaliações criadas para todas as equipes do evento.",
              );
              event.currentTarget.reset();
            }}
          >
            <Select
              name="jurado"
              label="Jurado"
              items={jurados.filter((jurado) => jurado.ativo)}
            />
            <Select name="categoria" label="Categoria" items={categorias} />
            <button className="primary">Atribuir categoria</button>
          </form>
        )}
      </Painel>
    </>
  );
}

function Pontuacao({
  eventos,
  equipes,
  movimentacoes,
  salvar,
}: {
  eventos: Evento[];
  equipes: Equipe[];
  movimentacoes: MovimentacaoPontuacao[];
} & AdminPageProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formState, setFormState] = useState<{
    tipo: MovimentacaoPontuacao["tipo"];
    pontos: number;
    descricao: string;
    idEquipe: number;
    idEvento: number;
  } | null>(null);

  function startEdit(item: MovimentacaoPontuacao) {
    setEditingId(item.id);
    setFormState({
      tipo: item.tipo,
      pontos: item.pontos,
      descricao: item.descricao,
      idEquipe: item.idEquipe,
      idEvento: item.idEvento,
    });
  }
  function cancelEdit() {
    setEditingId(null);
    setFormState(null);
  }

  return (
    <Painel
      titulo="Movimentações de pontuação"
      lista={
        <div>
          {equipes.map((eq) => {
            const itens = movimentacoes.filter((m) => m.idEquipe === eq.id);
            return (
              <div key={eq.id} className="group">
                <h4>{eq.nome}</h4>
                <table>
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Pontos</th>
                      <th>Descrição</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.length === 0 && (
                      <tr>
                        <td colSpan={4}>
                          <em>Sem movimentações</em>
                        </td>
                      </tr>
                    )}
                    {itens.map((item) => {
                      if (editingId === item.id && formState) {
                        return (
                          <tr key={item.id}>
                            <td>
                              <select
                                value={formState.tipo}
                                onChange={(e) =>
                                  setFormState({
                                    ...formState,
                                    tipo: e.target.value as MovimentacaoPontuacao["tipo"],
                                  })
                                }
                              >
                                <option value="PONTUACAO">Pontuação</option>
                                <option value="BONUS">Bônus</option>
                                <option value="PENALIDADE">Penalidade</option>
                              </select>
                            </td>
                            <td>
                              <input
                                type="number"
                                min={0}
                                value={formState.pontos}
                                onChange={(e) =>
                                  setFormState({
                                    ...formState,
                                    pontos: Math.max(
                                      0,
                                      Number(e.target.value || 0),
                                    ),
                                  })
                                }
                              />
                            </td>
                            <td>
                              <input
                                value={formState.descricao}
                                onChange={(e) =>
                                  setFormState({
                                    ...formState,
                                    descricao: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td>
                              <button
                                className="primary"
                                onClick={() => {
                                  void salvar(
                                    () =>
                                      atualizarMovimentacao(item.id, {
                                        idEvento: formState.idEvento,
                                        idEquipe: formState.idEquipe,
                                        tipo: formState.tipo,
                                        descricao: formState.descricao,
                                        pontos: Math.max(0, formState.pontos),
                                      }),
                                    "Movimentação atualizada.",
                                  ).then(() => cancelEdit());
                                }}
                              >
                                Salvar
                              </button>
                              <button
                                className="secondary"
                                onClick={cancelEdit}
                              >
                                Cancelar
                              </button>
                            </td>
                          </tr>
                        );
                      }

                      const efetivo =
                        item.tipo === "PENALIDADE"
                          ? -Math.abs(item.pontos)
                          : Math.abs(item.pontos);

                      return (
                        <tr key={item.id}>
                          <td>{item.tipo}</td>
                          <td className={efetivo < 0 ? "negative" : "positive"}>
                            {efetivo > 0 ? "+" : ""}
                            {efetivo}
                          </td>
                          <td>{item.descricao}</td>
                          <td>
                            <button
                              className="secondary"
                              onClick={() => startEdit(item)}
                            >
                              Editar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void salvar(
            () =>
              criarMovimentacao({
                idEvento: number(form.get("evento")),
                idEquipe: number(form.get("equipe")),
                tipo: String(form.get("tipo")) as MovimentacaoPontuacao["tipo"],
                descricao: String(form.get("descricao")).trim(),
                pontos: Math.max(0, number(form.get("pontos"))),
              }),
            "Movimentação registrada.",
          );
          event.currentTarget.reset();
        }}
      >
        <Select name="evento" label="Evento" items={eventos} />
        <Select name="equipe" label="Equipe" items={equipes} />
        <div className="form-grid">
          <label>
            Tipo
            <select name="tipo" defaultValue="PONTUACAO">
              <option value="PONTUACAO">Pontuação</option>
              <option value="BONUS">Bônus</option>
              <option value="PENALIDADE">Penalidade</option>
            </select>
          </label>
          <label>
            Pontos
            <input name="pontos" type="number" min="0" step="1" required />
          </label>
        </div>
        <label>
          Descrição
          <input name="descricao" maxLength={255} required />
        </label>
        <button className="primary">Registrar movimentação</button>
      </form>
    </Painel>
  );
}

function Relatorios({ eventos }: { eventos: Evento[] }) {
  const [eventoId, setEventoId] = useState("");
  const [relatorio, setRelatorio] = useState<RelatorioEvento | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!eventoId) return;

    void Promise.resolve().then(async () => {
      setCarregando(true);
      setErro("");
      try {
        setRelatorio(await buscarRelatorioEvento(Number(eventoId)));
      } catch (causa) {
        setRelatorio(null);
        setErro(
          causa instanceof Error
            ? causa.message
            : "Não foi possível gerar o relatório.",
        );
      } finally {
        setCarregando(false);
      }
    });
  }, [eventoId]);

  return (
    <section className="report-section">
      <div className="section-title">
        <h2>Relatório consolidado de avaliações</h2>
        <p className="muted">
          As notas dos jurados são somadas por critério, sem repetir avaliações.
        </p>
      </div>
      <section className="card report-filter">
        <label>
          Evento
          <select
            value={eventoId}
            onChange={(event) => {
              setEventoId(event.target.value);
              setRelatorio(null);
              setErro("");
            }}
          >
            <option value="">Selecione um evento</option>
            {eventos.map((evento) => (
              <option key={evento.id} value={evento.id}>
                {evento.nome} ({evento.competencia})
              </option>
            ))}
          </select>
        </label>
      </section>
      {erro && <p className="alert error">{erro}</p>}
      {carregando && <p className="loading">Consolidando notas…</p>}
      {relatorio && !carregando && (
        <div className="report-list">
          {relatorio.equipes.length === 0 ? (
            <section className="card">
              <p className="muted">
                Não há equipes, categorias e critérios configurados para este evento.
              </p>
            </section>
          ) : (
            relatorio.equipes.map((equipe) => (
              <section className="card report-team" key={equipe.id}>
                <div className="report-heading">
                  <h3>{equipe.nome}</h3>
                  <strong>Total geral: {equipe.totalNotas}</strong>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th>Critério</th>
                      <th>Total das notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipe.categorias.map((categoria) => (
                      <CategoryRows key={categoria.id} categoria={categoria} />
                    ))}
                  </tbody>
                </table>
              </section>
            ))
          )}
        </div>
      )}
    </section>
  );
}

function CategoryRows({
  categoria,
}: {
  categoria: RelatorioEvento["equipes"][number]["categorias"][number];
}) {
  return (
    <>
      {categoria.criterios.map((criterio, index) => (
        <tr key={criterio.id}>
          {index === 0 && (
            <td rowSpan={categoria.criterios.length + 1} className="report-category">
              <strong>{categoria.nome}</strong>
              <small>Total: {categoria.totalNotas}</small>
            </td>
          )}
          <td>{criterio.nome}</td>
          <td className="report-score">{criterio.totalNotas}</td>
        </tr>
      ))}
      <tr className="report-category-total">
        <td>Total da categoria</td>
        <td className="report-score">{categoria.totalNotas}</td>
      </tr>
    </>
  );
}

function Select<T extends { id: number; nome: string }>({
  name,
  label,
  items,
}: {
  name: string;
  label: string;
  items: T[];
}) {
  return (
    <label>
      {label}
      <select name={name} required defaultValue="">
        <option value="" disabled>
          Selecione
        </option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.nome}
          </option>
        ))}
      </select>
    </label>
  );
}
