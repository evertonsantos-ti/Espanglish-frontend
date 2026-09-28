import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import * as auth from "../auth/auth";
import {
  atualizarCategoria,
  atualizarCriterio,
  atualizarEvento,
  atualizarJurado,
  buscarEventos,
  criarAvaliacao,
  criarCategoria,
  criarCriterio,
  criarEquipe,
  criarEvento,
  criarJurado,
  criarJuradoCategoria,
  criarMovimentacao,
  listarAvaliacoes,
  listarCategorias,
  listarCriterios,
  listarEquipes,
  listarJuradoCategorias,
  listarJurados,
  listarMovimentacoes,
  listarNotas,
} from "../services/api";
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

type Dados = {
  eventos: Evento[];
  equipes: Equipe[];
  categorias: Categoria[];
  criterios: Criterio[];
  jurados: Jurado[];
  vinculacoes: JuradoCategoria[];
  avaliacoes: Avaliacao[];
  notas: Nota[];
  movimentacoes: MovimentacaoPontuacao[];
};
const vazio: Dados = {
  eventos: [],
  equipes: [],
  categorias: [],
  criterios: [],
  jurados: [],
  vinculacoes: [],
  avaliacoes: [],
  notas: [],
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
        avaliacoes,
        notas,
        movimentacoes,
      ] = await Promise.all([
        buscarEventos(),
        listarEquipes(),
        listarCategorias(),
        listarCriterios(),
        listarJurados(),
        listarJuradoCategorias(),
        listarAvaliacoes(),
        listarNotas(),
        listarMovimentacoes(),
      ]);
      setDados({
        eventos,
        equipes,
        categorias,
        criterios,
        jurados,
        vinculacoes,
        avaliacoes,
        notas,
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
  const eventosAtivos = dados.eventos.filter((evento) => evento.ativo);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">ADMINISTRAÇÃO</p>
          <h1>Espanglish</h1>
        </div>
        <button className="secondary" onClick={sair}>
          Sair
        </button>
      </header>
      <nav className="tabs" aria-label="Módulos">
        {[
          ["eventos", "Eventos"],
          ["equipes", "Equipes"],
          ["categorias", "Categorias"],
          ["criterios", "Critérios"],
          ["jurados", "Jurados"],
          ["avaliacoes", "Avaliações"],
          ["pontuacao", "Pontuação"],
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
          {aba === "eventos" && <Eventos dados={dados} salvar={salvar} />}
          {aba === "equipes" && (
            <Equipes
              eventos={eventosAtivos}
              equipes={dados.equipes}
              salvar={salvar}
            />
          )}
          {aba === "categorias" && (
            <Categorias
              eventos={eventosAtivos}
              categorias={dados.categorias}
              salvar={salvar}
            />
          )}
          {aba === "criterios" && (
            <Criterios
              categorias={dados.categorias.filter(
                (categoria) => categoria.ativo,
              )}
              criterios={dados.criterios}
              salvar={salvar}
            />
          )}
          {aba === "jurados" && (
            <Jurados
              eventos={eventosAtivos}
              categorias={dados.categorias.filter(
                (categoria) => categoria.ativo,
              )}
              jurados={dados.jurados}
              vinculacoes={dados.vinculacoes}
              salvar={salvar}
            />
          )}
          {aba === "avaliacoes" && <Avaliacoes dados={dados} salvar={salvar} />}
          {aba === "pontuacao" && (
            <Pontuacao
              eventos={eventosAtivos}
              equipes={dados.equipes}
              movimentacoes={dados.movimentacoes}
              salvar={salvar}
            />
          )}
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
  return (
    <Painel
      titulo="Eventos"
      lista={
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Período</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {dados.eventos.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.nome}
                  <small>{item.competencia}</small>
                </td>
                <td>
                  {item.dataInicio.slice(0, 10)} — {item.dataFim.slice(0, 10)}
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
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void salvar(
            () =>
              criarEvento({
                nome: String(form.get("nome")).trim(),
                competencia: number(form.get("competencia")),
                dataInicio: String(form.get("inicio")),
                dataFim: String(form.get("fim")),
              }),
            "Evento criado com sucesso.",
          );
          event.currentTarget.reset();
        }}
      >
        <label>
          Nome
          <input name="nome" maxLength={100} required />
        </label>
        <div className="form-grid">
          <label>
            Competência
            <input
              name="competencia"
              type="number"
              min="2020"
              max="2100"
              defaultValue={new Date().getFullYear()}
              required
            />
          </label>
          <label>
            Início
            <input name="inicio" type="date" required />
          </label>
          <label>
            Fim
            <input name="fim" type="date" required />
          </label>
        </div>
        <button className="primary">Salvar evento</button>
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
  return (
    <Painel
      titulo="Equipes"
      lista={
        <table>
          <thead>
            <tr>
              <th>Equipe</th>
              <th>Evento</th>
            </tr>
          </thead>
          <tbody>
            {equipes.map((item) => (
              <tr key={item.id}>
                <td>{item.nome}</td>
                <td>{nome(eventos, item.idEvento)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void salvar(
            () =>
              criarEquipe({
                nome: String(form.get("nome")).trim(),
                idEvento: number(form.get("evento")),
              }),
            "Equipe cadastrada.",
          );
          event.currentTarget.reset();
        }}
      >
        <Select name="evento" label="Evento" items={eventos} />
        <label>
          Nome da equipe
          <input name="nome" maxLength={100} required />
        </label>
        <button className="primary">Salvar equipe</button>
      </form>
    </Painel>
  );
}
function Categorias({
  eventos,
  categorias,
  salvar,
}: { eventos: Evento[]; categorias: Categoria[] } & AdminPageProps) {
  return (
    <Painel
      titulo="Categorias"
      lista={
        <table>
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Evento</th>
              <th>Ordem</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {categorias.map((item) => (
              <tr key={item.id}>
                <td>{item.nome}</td>
                <td>{nome(eventos, item.idEvento)}</td>
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
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void salvar(
            () =>
              criarCategoria({
                nome: String(form.get("nome")).trim(),
                idEvento: number(form.get("evento")),
                ordem: number(form.get("ordem")),
              }),
            "Categoria cadastrada.",
          );
          event.currentTarget.reset();
        }}
      >
        <Select name="evento" label="Evento" items={eventos} />
        <div className="form-grid">
          <label>
            Nome
            <input name="nome" maxLength={100} required />
          </label>
          <label>
            Ordem
            <input name="ordem" type="number" min="1" required />
          </label>
        </div>
        <button className="primary">Salvar categoria</button>
      </form>
    </Painel>
  );
}
function Criterios({
  categorias,
  criterios,
  salvar,
}: { categorias: Categoria[]; criterios: Criterio[] } & AdminPageProps) {
  return (
    <Painel
      titulo="Critérios"
      lista={
        <table>
          <thead>
            <tr>
              <th>Critério</th>
              <th>Categoria</th>
              <th>Ordem</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {criterios.map((item) => (
              <tr key={item.id}>
                <td>{item.nome}</td>
                <td>{nome(categorias, item.idCategoria)}</td>
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
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void salvar(
            () =>
              criarCriterio({
                nome: String(form.get("nome")).trim(),
                idCategoria: number(form.get("categoria")),
                ordem: number(form.get("ordem")),
              }),
            "Critério cadastrado.",
          );
          event.currentTarget.reset();
        }}
      >
        <Select name="categoria" label="Categoria" items={categorias} />
        <div className="form-grid">
          <label>
            Nome
            <input name="nome" maxLength={100} required />
          </label>
          <label>
            Ordem
            <input name="ordem" type="number" min="1" required />
          </label>
        </div>
        <button className="primary">Salvar critério</button>
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
  const lista =
    modo === "jurado" ? (
      <table>
        <thead>
          <tr>
            <th>Jurado</th>
            <th>Evento</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {jurados.map((item) => (
            <tr key={item.id}>
              <td>
                {item.nome}
                <small>{item.login}</small>
              </td>
              <td>{nome(eventos, item.idEvento)}</td>
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
                      item.ativo ? "Jurado inativado." : "Jurado ativado.",
                    )
                  }
                >
                  {item.ativo ? "Ativo" : "Inativo"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <table>
        <thead>
          <tr>
            <th>Jurado</th>
            <th>Categoria</th>
          </tr>
        </thead>
        <tbody>
          {vinculacoes.map((item) => (
            <tr key={item.id}>
              <td>{nome(jurados, item.idJurado)}</td>
              <td>{nome(categorias, item.idCategoria)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void salvar(
                () =>
                  criarJurado({
                    nome: String(form.get("nome")).trim(),
                    login: String(form.get("login")).trim(),
                    idEvento: number(form.get("evento")),
                  }),
                "Jurado cadastrado.",
              );
              event.currentTarget.reset();
            }}
          >
            <Select name="evento" label="Evento" items={eventos} />
            <label>
              Nome
              <input name="nome" maxLength={100} required />
            </label>
            <label>
              Login
              <input name="login" maxLength={100} required />
            </label>
            <button className="primary">Salvar jurado</button>
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
                "Categoria atribuída ao jurado.",
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

function Avaliacoes({ dados, salvar }: { dados: Dados } & AdminPageProps) {
  const [idEquipe, setIdEquipe] = useState("");
  const [idCategoria, setIdCategoria] = useState("");
  const [idJurado, setIdJurado] = useState("");
  const eventoId = dados.equipes.find(
    (equipe) => equipe.id === Number(idEquipe),
  )?.idEvento;
  const categorias = dados.categorias.filter(
    (categoria) => categoria.ativo && categoria.idEvento === eventoId,
  );
  const jurados = dados.jurados.filter(
    (jurado) => jurado.ativo && jurado.idEvento === eventoId,
  );

  return (
    <Painel
      titulo="Avaliações"
      lista={
        <table>
          <thead>
            <tr>
              <th>Equipe</th>
              <th>Categoria</th>
              <th>Jurado</th>
              <th>Notas</th>
            </tr>
          </thead>
          <tbody>
            {dados.avaliacoes.map((item) => (
              <tr key={item.id}>
                <td>{nome(dados.equipes, item.idEquipe)}</td>
                <td>{nome(dados.categorias, item.idCategoria)}</td>
                <td>{nome(dados.jurados, item.idJurado)}</td>
                <td>
                  {
                    dados.notas.filter((nota) => nota.idAvaliacao === item.id)
                      .length
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!idEquipe || !idCategoria || !idJurado) return;
          void salvar(
            () =>
              criarAvaliacao({
                idEquipe: Number(idEquipe),
                idCategoria: Number(idCategoria),
                idJurado: Number(idJurado),
              }),
            "Avaliação criada. O jurado já pode lançar as notas.",
          ).then(() => {
            setIdEquipe("");
            setIdCategoria("");
            setIdJurado("");
          });
        }}
      >
        <label>
          Equipe
          <select
            value={idEquipe}
            onChange={(event) => {
              setIdEquipe(event.target.value);
              setIdCategoria("");
              setIdJurado("");
            }}
            required
          >
            <option value="">Selecione</option>
            {dados.equipes.map((equipe) => (
              <option key={equipe.id} value={equipe.id}>
                {equipe.nome}
              </option>
            ))}
          </select>
        </label>
        <label>
          Categoria
          <select
            value={idCategoria}
            onChange={(event) => setIdCategoria(event.target.value)}
            disabled={!eventoId}
            required
          >
            <option value="">Selecione a equipe primeiro</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </option>
            ))}
          </select>
        </label>
        <label>
          Jurado
          <select
            value={idJurado}
            onChange={(event) => setIdJurado(event.target.value)}
            disabled={!eventoId}
            required
          >
            <option value="">Selecione a equipe primeiro</option>
            {jurados.map((jurado) => (
              <option key={jurado.id} value={jurado.id}>
                {jurado.nome}
              </option>
            ))}
          </select>
        </label>
        <p className="hint">
          Categoria e jurado são filtrados automaticamente pelo evento da
          equipe.
        </p>
        <button
          className="primary"
          disabled={!idEquipe || !idCategoria || !idJurado}
        >
          Criar avaliação
        </button>
      </form>
    </Painel>
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
  return (
    <Painel
      titulo="Movimentações de pontuação"
      lista={
        <table>
          <thead>
            <tr>
              <th>Equipe</th>
              <th>Tipo</th>
              <th>Pontos</th>
              <th>Descrição</th>
            </tr>
          </thead>
          <tbody>
            {movimentacoes.map((item) => (
              <tr key={item.id}>
                <td>{nome(equipes, item.idEquipe)}</td>
                <td>{item.tipo}</td>
                <td className={item.pontos < 0 ? "negative" : "positive"}>
                  {item.pontos > 0 ? "+" : ""}
                  {item.pontos}
                </td>
                <td>{item.descricao}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
                pontos: number(form.get("pontos")),
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
            <input name="pontos" type="number" step="1" required />
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
