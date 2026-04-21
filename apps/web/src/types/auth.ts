export interface UsuarioVinculo {
  associacaoId: string;
  associacaoNome: string;
  associacaoMunicipio: string;
  associacaoEstado: string;
  role: "adm" | "associado";
  status: "pendente" | "ativo" | "inativo" | "rejeitado";
  joinedAt: string | null;
}

export interface UsuarioPerfil {
  id: string;
  firebaseUid: string;
  email: string;
  nome: string;
  telefone?: string;
  avatarUrl?: string;
  authProvider: "google" | "email";
}
