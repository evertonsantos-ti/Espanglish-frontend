const API_URL = "http://localhost:5000/api";

export async function buscarEventos() {
  const response = await fetch(`${API_URL}/eventos`);

  if (!response.ok) {
    throw new Error("Não foi possível carregar os eventos.");
  }
  return await response.json();
}

export async function loginAdmin(nome: string, senha: string) {
  const response = await fetch(`${API_URL}/auth/admin/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      nome,
      senha,
    }),
  });

  if (!response.ok) throw new Error("Usuário ou senha inválidos");

  return await response.json();
}

export async function loginJurado(
  eventoId: number,
  login: string,
  senha: string,
) {
  const response = await fetch(`${API_URL}/auth/jurado/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      eventoId,
      login,
      senha,
    }),
  });

  if (!response.ok) throw new Error("Usuário ou senha inválidos");

  return await response.json();
}
