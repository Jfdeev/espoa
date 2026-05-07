export interface Associado {
  id?: string;
  nome: string;
  contato?: string;
  data_entrada: string;
  status: string;
  version: number;
  updated_at: string;
  device_id?: string;
  deleted_at?: string;
}

export interface Mensalidade {
  id?: string;
  associado_id: string;
  valor: number;
  data_pagamento?: string;
  forma_pagamento?: string;
  version: number;
  updated_at: string;
  device_id?: string;
  deleted_at?: string;
}

export interface TransacaoFinanceira {
  id?: string;
  tipo: string;
  valor: number;
  descricao?: string;
  documento?: string;
  data: string;
  version: number;
  updated_at: string;
  device_id?: string;
  deleted_at?: string;
}

export interface Ata {
  id?: string;
  titulo: string;
  conteudo: string;
  data: string;
  version: number;
  updated_at: string;
  device_id?: string;
  deleted_at?: string;
}

export interface Producao {
  id?: string;
  associado_id: string;
  cultura: string;
  quantidade: number;
  data: string;
  version: number;
  updated_at: string;
  device_id?: string;
  deleted_at?: string;
}

export interface Associacao {
  id?: string;
  nome: string;
  cnpj: string;
  municipio: string;
  estado: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  status: string;
  version: number;
  updated_at: string;
  device_id?: string;
  deleted_at?: string;
}

export interface UsuarioAssociacao {
  id: string;
  usuario_id: string;
  associacao_id: string;
  role: string;
  status: string;
  requested_at: string;
  joined_at?: string;
  version: number;
  updated_at: string;
  device_id?: string;
}

export interface SyncQueue {
  id?: number;
  table_name: string;
  record_id: string;
  operation: "create" | "update" | "delete";
  payload: string;
  created_at: string;
  synced: number;
}

export interface ConflictLog {
  id?: number;
  device_id?: string;
  operation_id?: string;
  table_name: string;
  record_id: string;
  local_data: string;
  remote_data: string;
  reason?: string;
  resolved: number;
  created_at: string;
}
