export type LoginResponse = {
  token: string;
};
export type TipoUsuario = "ADMIN" | "JURADO";

export type Sessao = {
  token: string;
  tipo: TipoUsuario;
};
