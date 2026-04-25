# Requirements: Espoa

**Defined:** 2026-04-18
**Core Value:** Associações rurais conseguem gerir seus associados, finanças e produção de forma organizada e transparente, mesmo sem conexão à internet.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Fundação

- [ ] **FUND-01**: Schema migration — corrigir tipos financeiros para integer (centavos), adicionar campos faltantes em todas as entidades, adicionar sync fields em relatorio_pnae
- [ ] **FUND-02**: Schemas Zod compartilhados como fonte única de tipos entre Dexie (client) e Drizzle (server)
- [ ] **FUND-03**: Autenticação dual — Google OAuth + login convencional (email/senha com cadastro, verificação de email e recuperação de senha) via GCP (Firebase Auth / Identity Platform), com sessão persistente offline (JWT 30 dias via jose)
- [ ] **FUND-04**: Sistema de perfis com dois roles: Administrador de Associação e Associado, com navegação role-based (side nav para ADM, bottom nav para Associado)
- [ ] **FUND-05**: Sync engine — push/pull batched com fila de operações, resolução de conflitos por tabela, resiliência para redes rurais (2G/3G)
- [ ] **FUND-06**: API REST completa para todas as entidades com middleware de autenticação
- [ ] **FUND-07**: Modelagem multi-associação — tabelas `usuario` (id, firebase_uid, email, nome, telefone, avatar_url, auth_provider, timestamps), `associacao` (id, nome, cnpj, municipio, estado, telefone, email, created_by) e `usuario_associacao` (usuario_id, associacao_id, role [adm/associado], status [pendente/ativo/inativo/rejeitado], timestamps) no PostgreSQL com migração Drizzle. Todas as tabelas de domínio recebem FK `associacao_id` para row-level scoping
- [ ] **FUND-08**: Tela de onboarding pós-primeiro-login — seleção de papel ("Sou Associado" / "Sou Administrador de Associação") com cards visuais. Fluxo Associado: busca/seleção de associação via Combobox (shadcn Command + Popover) com solicitação de vínculo pendente de aprovação. Fluxo ADM: formulário de criação de associação (nome, CNPJ, município, estado, contato) com validação Zod
- [ ] **FUND-09**: Suporte a múltiplas associações por usuário — tela de alternância de associação ativa (workspace switcher), scoping de todos os dados à associação selecionada

### Gestão de Associados

- [ ] **ASSC-01**: CRUD de associados com nome, CPF (mascarado em IndexedDB — LGPD), número CAF, telefone, endereço, comunidade, status (ativo/inativo/suspenso), data de entrada
- [ ] **ASSC-02**: Busca por nome e filtro por status com suporte a 50+ membros
- [ ] **ASSC-03**: Visão 360° do associado — histórico de mensalidades, produção, participação PNAE em uma tela

### Mensalidades

- [ ] **MENS-01**: Geração em lote de mensalidades mensais para todos os membros ativos com mês de referência
- [ ] **MENS-02**: Registro de pagamento com valor, data, forma de pagamento e status (pendente/pago/atrasado)
- [ ] **MENS-03**: Visualização de status por membro e por mês com indicador visual de inadimplência

### Finanças

- [ ] **FIN-01**: Registro de entradas e saídas com categoria (mensalidade, venda PNAE, doação, compra material, etc.) — valores em centavos (integer)
- [ ] **FIN-02**: Visualização de saldo atual e resumo mensal/anual
- [ ] **FIN-03**: Fluxo de caixa básico com filtros por período e categoria

### Atas

- [ ] **ATA-01**: CRUD de registros de assembleia (título, data, conteúdo/pauta) com editor de texto simples
- [ ] **ATA-02**: Listagem cronológica com visualização de detalhe

### Produção

- [ ] **PROD-01**: Registro de produção por associado (cultura, quantidade, unidade, preço unitário, data/safra)
- [ ] **PROD-02**: Visão agregada por cultura e por período (safra)

### PNAE

- [ ] **PNAE-01**: CRUD de editais com entidade executora, produtos solicitados, quantidades, preços de referência, datas e status
- [ ] **PNAE-02**: Matching automático produção ↔ edital — quais membros podem atender, gaps e surplus
- [ ] **PNAE-03**: Relatórios estruturados por edital (produtos entregues, valores, membros participantes) — exportável
- [ ] **PNAE-04**: Builder de Projeto de Venda com dados auto-populados de associados (CPF, CAF) e produção

### Dashboard & UX

- [ ] **DASH-01**: Dashboard administrativo com visão geral (membros ativos, saldo, inadimplência, editais abertos, produção agregada)
- [ ] **DASH-02**: Portal de transparência read-only para perfil agricultor (resumo financeiro, atas, status de mensalidade pessoal, produção pessoal)
- [ ] **DASH-03**: Modo agricultor simplificado — botões grandes, ícones, linguagem simples, navegação mínima, adequado para baixa alfabetização digital
- [ ] **DASH-04**: Alertas e notificações push para prazos de editais, mensalidades atrasadas e reuniões
- [ ] **DASH-05**: Exportação de relatórios em PDF/CSV para contador, governo e assembleias

### IA (Online, Complementar)

- [ ] **IA-01**: Insights financeiros — análise de padrões de saldo, tendências, alertas de inadimplência, períodos de maior gasto. Apresentados em linguagem clara e simples
- [ ] **IA-02**: Apoio na geração de relatórios PNAE — organização e transformação de dados de produção em informações compreensíveis para editais
- [ ] **IA-03**: Sugestões de ação — recomendações de ajustes na gestão financeira e organização da produção, sempre como apoio (nunca decisão automática)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Inteligência Avançada

- **IA-04**: Alertas preditivos com IA — antecipar inadimplência antes de acontecer
- **IA-05**: Análise comparativa entre safras com recomendações de diversificação

### Escala

- **ESCL-01**: ~~Multi-tenancy — múltiplas associações em uma instância~~ → Promovido para v1 como FUND-07 + FUND-09 (multi-tenant leve por row-level scoping com `associacao_id`)
- **ESCL-02**: Marketplace de produtos entre associações

### Integrações

- **INTG-01**: Integração direta com SigPC (API governamental)
- **INTG-02**: Importação automática de editais publicados

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Chat / mensageria em tempo real | WhatsApp já cumpre essa função para os agricultores |
| App nativo (iOS/Android) | PWA offline-first é suficiente para v1 |
| Contabilidade formal (dupla entrada) | Associações usam contador externo; manter financeiro simples (entradas/saídas) |
| OCR / scanner de documentos | Frágil em celulares low-end com câmeras ruins |
| IA offline / modelos on-device | Devices low-end não suportam; todo IA é online-only |
| Workflows de aprovação complexos | Friction desnecessária para associações de pequeno porte |
| Integração direta com APIs governamentais (v1) | APIs instáveis e mal-documentadas; gerar relatórios no formato esperado |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FUND-01 | Phase 1 | Pending |
| FUND-02 | Phase 1 | Pending |
| FUND-03 | Phase 2 | Pending |
| FUND-04 | Phase 2 | Pending |
| FUND-05 | Phase 4 | Pending |
| FUND-06 | Phase 4 | Pending |
| FUND-07 | Phase 2 | Pending |
| FUND-08 | Phase 2 | Pending |
| FUND-09 | Phase 2 | Pending |
| ASSC-01 | Phase 3 | Pending |
| ASSC-02 | Phase 3 | Pending |
| ASSC-03 | Phase 5 | Pending |
| MENS-01 | Phase 3 | Pending |
| MENS-02 | Phase 3 | Pending |
| MENS-03 | Phase 3 | Pending |
| FIN-01 | Phase 3 | Pending |
| FIN-02 | Phase 5 | Pending |
| FIN-03 | Phase 5 | Pending |
| ATA-01 | Phase 3 | Pending |
| ATA-02 | Phase 3 | Pending |
| PROD-01 | Phase 3 | Pending |
| PROD-02 | Phase 5 | Pending |
| PNAE-01 | Phase 6 | Pending |
| PNAE-02 | Phase 6 | Pending |
| PNAE-03 | Phase 6 | Pending |
| PNAE-04 | Phase 6 | Pending |
| DASH-01 | Phase 5 | Pending |
| DASH-02 | Phase 7 | Pending |
| DASH-03 | Phase 7 | Pending |
| DASH-04 | Phase 7 | Pending |
| DASH-05 | Phase 7 | Pending |
| IA-01 | Phase 7 | Pending |
| IA-02 | Phase 7 | Pending |
| IA-03 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 34 total
- Mapped to phases: 34 ✓
- Unmapped: 0

---
*Requirements defined: 2026-04-18*
*Last updated: 2026-04-20 — Phase 2 refinada: auth dual Firebase, onboarding, multi-associação (FUND-07/08/09 adicionados)*
