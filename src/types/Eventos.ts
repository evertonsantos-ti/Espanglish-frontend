export type Evento = {
  id: number;
  nome: string;
  competencia: number;
  dataInicio: string;
  dataFim: string;
  ativo: boolean;
};

export type Equipe = { id: number; idEvento: number; nome: string };
export type Categoria = {
  id: number;
  idEvento: number;
  nome: string;
  ordem: number;
  ativo: boolean;
};
export type Criterio = {
  id: number;
  idCategoria: number;
  nome: string;
  ordem: number;
  ativo: boolean;
};
export type Jurado = {
  id: number;
  idEvento: number;
  nome: string;
  login: string;
  ativo: boolean;
};
export type JuradoCategoria = {
  id: number;
  idJurado: number;
  idCategoria: number;
};
export type Avaliacao = {
  id: number;
  idEquipe: number;
  idCategoria: number;
  idJurado: number;
};
export type Nota = {
  id: number;
  idAvaliacao: number;
  idCriterio: number;
  nota: number;
};
export type MovimentacaoPontuacao = {
  id: number;
  idEvento: number;
  idEquipe: number;
  tipo: "BONUS" | "PENALIDADE" | "PONTUACAO";
  descricao: string;
  pontos: number;
  dataLancamento: string;
};

export type CriterioRelatorio = {
  id: number;
  nome: string;
  ordem: number;
  totalNotas: number;
};

export type CategoriaRelatorio = {
  id: number;
  nome: string;
  ordem: number;
  criterios: CriterioRelatorio[];
  totalNotas: number;
};

export type EquipeRelatorio = {
  id: number;
  nome: string;
  categorias: CategoriaRelatorio[];
  totalNotas: number;
};

export type RelatorioEvento = {
  eventoId: number;
  equipes: EquipeRelatorio[];
};
