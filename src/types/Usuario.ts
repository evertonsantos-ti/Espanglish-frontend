export type Usuario = {
  id: number;
  nome: string;
};

export type CriarUsuario = {
  nome: string;
  senha: string;
};

export type AtualizarUsuario = {
  nome: string;
  senha?: string;
};
