# Espoa

## What This Is

Espoa é um sistema PWA offline-first voltado para associações rurais no Brasil. A plataforma digitaliza a gestão associativa — controle de associados, finanças, atas, produção — e apoia o acesso ao PNAE (Programa Nacional de Alimentação Escolar), conectando o produtor rural à associação e a associação ao mercado. Dois perfis de usuário: agricultores (baixa alfabetização digital, uso simples) e administradores (gestão e análise).

## Core Value

Associações rurais conseguem gerir seus associados, finanças e produção de forma organizada e transparente, mesmo sem conexão à internet.

## Requirements

### Validated

- ✓ Monorepo com pnpm workspaces + Turborepo (apps/web, apps/api, packages/database) — existing
- ✓ Schema do banco definido para 7 entidades de domínio (associado, mensalidade, transação financeira, ata, produção, edital PNAE, relatório PNAE) — existing
- ✓ Banco local IndexedDB via Dexie com tabelas de sync queue e conflict log — existing
- ✓ Conexão serverless PostgreSQL via Neon + Drizzle ORM — existing
- ✓ API Express skeleton com health check — existing
- ✓ PWA pipeline configurada (vite-plugin-pwa + workbox) — existing
- ✓ Landing page institucional com design Material Design 3 e animações — existing

### Active

- [ ] CRUD completo de associados (cadastro, edição, listagem, busca)
- [ ] Gestão financeira: entradas, saídas, mensalidades com status de pagamento
- [ ] Registro e consulta de atas de reunião
- [ ] Registro de produção por associado
- [ ] Visualização de editais PNAE e preparação de dados para participação
- [ ] Relatórios PNAE com dados consolidados
- [ ] Dashboard administrativo com visão geral da associação
- [ ] Autenticação via Google (OAuth)
- [ ] Sincronização offline→online (sync queue, conflict resolution)
- [ ] API REST completa para todas as entidades
- [ ] Transparência: membros podem visualizar finanças e atas da associação
- [ ] Interface adaptada para baixa alfabetização digital (botões grandes, linguagem simples, ícones)

### Out of Scope

- Chat/mensageria em tempo real — complexidade alta, não é core
- App nativo (iOS/Android) — PWA é suficiente para v1
- Marketplace de produtos — foco é gestão interna primeiro
- IA offline — toda IA será 100% online, fora de funcionalidades offline-críticas
- Multi-tenancy complexo — v1 foca em uma associação por instância

## Context

- **Domínio:** Gestão de associações rurais brasileiras, incluindo participação no PNAE
- **Público:** Agricultores familiares e administradores de associações em áreas rurais com conectividade limitada
- **Arquitetura:** Offline-first PWA com sync eventual para PostgreSQL serverless (Neon). O backend é a fonte oficial dos dados
- **Codebase existente:** Schemas completos, infraestrutura de build configurada, landing page pronta. Falta: UI do app, API endpoints, sync layer, autenticação
- **Dívida técnica conhecida:** Schema drift entre client (Dexie snake_case) e server (Drizzle camelCase), relatorio_pnae sem campos de sync, API vazia
- **Linguagem do domínio:** Termos de domínio em português (associado, mensalidade, ata, produção, edital)

## Constraints

- **Offline-first:** O app deve funcionar 100% sem internet para operações CRUD locais
- **Baixa conectividade:** Áreas rurais com internet intermitente — sync deve ser resiliente
- **Acessibilidade digital:** Usuários agricultores têm baixa familiaridade com tecnologia — UI precisa ser extremamente simples
- **Stack definida:** React 19 + Vite + Dexie + Zustand (frontend), Express 5 + Drizzle + Neon (backend), TypeScript
- **PWA:** Precisa funcionar como app instalável no celular via browser

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Dexie como banco local | IndexedDB wrapper maduro, API simples, suporta sync patterns | — Pending |
| Neon PostgreSQL serverless | Zero infra management, HTTP driver, escala com demanda | — Pending |
| Sync queue + conflict log | Padrão offline-first com operações enfileiradas e resolução de conflitos | — Pending |
| Dois perfis de usuário (agricultor/admin) | Necessidades muito diferentes de UX e funcionalidades | — Pending |
| IA somente online | Evita complexidade de modelos offline, features de IA não são críticas | — Pending |
| Landing page com Tailwind CSS v4 | Design sistema consistente, utility-first, rápido para prototipar | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-18 after initialization*
