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
  table_name: string;
  record_id: string;
  local_data: string;
  remote_data: string;
  resolved: number;
  created_at: string;
}
