# Quick Task: CRUD Backend Associados e Associações - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Task Boundary

Criar persistência e rotas REST completas (CRUD) no backend para as entidades Associado e Associação.
Backend-only — o frontend irá consumir via offline-first sync numa tarefa futura.
Roles (adm/member) serão implementados na Phase 2 — ignorar por agora.

</domain>

<decisions>
## Implementation Decisions

### Schema Associação
- Campos básicos: nome, CNPJ, endereço, telefone, email, status
- Sync fields padrão: version, updatedAt, deviceId, deletedAt (seguir padrão de associado)

### Auth/Roles Strategy
- Ignorar roles por agora — rotas ficam abertas
- Guards de role serão adicionados na Phase 2 (Authentication + Profiles)

### Validação de Duplicidade
- Associado: CPF único — rejeitar se já existir associado com mesmo CPF
- Associação: CNPJ único — rejeitar se já existir associação com mesmo CNPJ

### Escopo de Rotas
- CRUD completo para ambas entidades: POST, GET (list + detail), PUT, DELETE (soft delete via deletedAt)
- Rotas seguem padrão REST: /associados, /associacoes

### Offline-First Compatibility
- Rotas devem aceitar/retornar formato compatível com sync engine existente (snake_case no wire, camelCase interno)
- Integrar novas tabelas no sync engine (syncTables, syncTypes)

</decisions>

<specifics>
## Specific Ideas

- Associado schema já existe mas precisa de campos adicionais (CPF, CAF, telefone, endereco, comunidade) conforme Phase 3 requirements
- Associação é entidade nova — precisa schema Drizzle, migration, e integração no sync
- Soft delete padrão: setar deletedAt ao invés de remover

</specifics>
