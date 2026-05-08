export interface UsuarioVinculo {
  associacaoId: string;
  associacaoNome: string;
  associacaoMunicipio: string;
  associacaoEstado: string;
  role: "adm" | "associado";
  status: "pendente" | "ativo" | "inativo" | "rejeitado" | "convidado";
  joinedAt: string | null;
}

export interface UsuarioPerfil {
  id: string;
  email: string;
  nome: string;
  telefone?: string | null;
  cpf?: string | null;
  avatarUrl?: string;
  authProvider: "google" | "email";
  emailVerified: boolean;
  googleId?: string | null;
}
