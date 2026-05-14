export interface Associado {
  id?: string;
  nome: string;
  contato?: string;
  data_entrada: string;
  status: string;
  usuario_id?: string | null;
  version: number;
  updated_at: string;
  device_id?: string;
  deleted_at?: string;
}

export interface Mensalidade {
  id?: string;
  associado_id?: string | null;
  usuario_id?: string | null;
  valor: number;
  data_pagamento?: string | null;
  forma_pagamento?: string | null;
  version: number;
  updated_at: string;
  device_id?: string;
  deleted_at?: string | null;
}

export interface TransacaoFinanceira {
  id?: string;
  associacao_id?: string | null;
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

export interface EditalPnae {
  id?: string;
  associacao_id: string;
  titulo: string;
  numero_edital?: string;
  orgao_responsavel?: string;
  descricao?: string;
  municipio?: string;
  estado?: string;
  data_abertura?: string;
  data_limite: string;
  valor_total_estimado?: number;
  link_original?: string;
  observacoes_internas?: string;
  status: "aberto" | "em_analise" | "encerrado";
  created_by?: string;
  created_at?: string;
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
