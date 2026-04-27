# Espoá

Sistema de gestão para associações de agricultores familiares, com suporte a operação **offline-first** e sincronização automática com o servidor.

---

## Contexto

Associações rurais frequentemente operam em regiões com conectividade instável. O Espoá resolve esse problema permitindo que os dados sejam registrados localmente no dispositivo (via IndexedDB) e sincronizados com o servidor assim que a conexão for restaurada — sem perda de dados e sem conflitos de versão.

O sistema gerencia o ciclo completo de uma associação:

- Cadastro de **associados** (membros) e **associações**
- Controle de **mensalidades** e **transações financeiras**
- Registro de **produção agrícola** e **ATAs** de reuniões
- Integração com o programa **PNAE** (Programa Nacional de Alimentação Escolar)
- Autenticação com suporte a **email/senha** e **Google OAuth**

---

## Estrutura do monorepo

```
espoá/
├── apps/
│   ├── api/          # API REST (Express 5 + Drizzle ORM)
│   └── web/          # Frontend React 19 (PWA offline-first)
└── packages/
    └── database/     # Schemas Drizzle + migrações (compartilhado)
```

Gerenciado com **pnpm workspaces** + **Turborepo**.

---

## Stack

### API (`apps/api`)

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 22 |
| Framework | Express 5 |
| ORM | Drizzle ORM |
| Banco de dados | Neon (PostgreSQL serverless) |
| Autenticação | JWT (`jsonwebtoken`) + bcryptjs |
| OAuth | Google (`googleapis`) |
| E-mail | Nodemailer |
| Testes | Vitest + Supertest |
| Build | esbuild (bundle único `dist/app.js`) |
| Deploy | Railway (Dockerfile) |

### Web (`apps/web`)

| Camada | Tecnologia |
|---|---|
| Framework | React 19 + Vite |
| Roteamento | React Router v7 |
| UI | Tailwind CSS v4 + shadcn/ui + Base UI |
| Offline storage | Dexie (IndexedDB) |
| Estado global | Zustand |
| Formulários | React Hook Form + Zod |
| HTTP client | Axios |
| Testes | Vitest |

### Database (`packages/database`)

| Camada | Tecnologia |
|---|---|
| ORM | Drizzle ORM |
| Banco | Neon PostgreSQL (serverless) |
| Migrações | drizzle-kit |

---

## Arquitetura Offline-First

O frontend usa **Dexie (IndexedDB)** como banco local. Toda escrita local enfileira uma operação na `sync_queue`. O `SyncManager` processa essa fila e a envia ao endpoint `POST /sync` da API, que:

1. **Aplica as operações de push** no banco remoto (Neon), com deduplicação por `deviceId` + `version`
2. **Retorna as linhas atualizadas** (`pull`) desde o último cursor do cliente

O cliente então atualiza o IndexedDB com as linhas recebidas e marca as operações como sincronizadas.

```
Cliente (Dexie)  →  POST /sync (push: operações pendentes)
                 ←  { pulled: linhas atualizadas, nextPullCursor }
```

---

## Tabelas sincronizadas

| Tabela | Descrição |
|---|---|
| `associado` | Membros da associação |
| `associacao` | Associações cadastradas |
| `mensalidade` | Pagamentos mensais |
| `transacao_financeira` | Movimentações financeiras |
| `ata` | Atas de reuniões |
| `producao` | Registros de produção agrícola |

---

## Autenticação

Todas as rotas protegidas exigem o header:

```
Authorization: Bearer <token>
```

O middleware `requireAuth` valida o JWT e injeta `userId` e `email` na requisição.

### Rotas de auth (`/auth/*`)

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/auth/register` | Cadastro com email/senha |
| `POST` | `/auth/login` | Login com email/senha |
| `POST` | `/auth/google` | Login via Google OAuth |
| `POST` | `/auth/forgot-password` | Solicitação de reset de senha |
| `POST` | `/auth/reset-password` | Reset de senha com token |
| `GET` | `/auth/me` | Dados do usuário autenticado |

---

## Rotas da API

### Sync

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/sync` | Push + pull de dados (requer auth) |

### Associados (requer auth)

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/associados` | Criar associado |
| `GET` | `/associados` | Listar associados |
| `GET` | `/associados/:id` | Buscar por ID |
| `PUT` | `/associados/:id` | Atualizar |
| `DELETE` | `/associados/:id` | Soft delete |

### Associações — gerenciamento (requer auth)

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/manage/associacoes` | Criar associação |
| `GET` | `/manage/associacoes` | Listar associações |
| `GET` | `/manage/associacoes/:id` | Buscar por ID |
| `PUT` | `/manage/associacoes/:id` | Atualizar |
| `DELETE` | `/manage/associacoes/:id` | Soft delete |

> As rotas `/manage/associacoes` são separadas do fluxo de auth (`GET /associacoes`) para evitar conflito de prefixos.

### Health

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Verificação de saúde da API |

---

## Pré-requisitos

- **Node.js** >= 22
- **pnpm** >= 10.33.0
- Banco **Neon PostgreSQL** (ou qualquer PostgreSQL compatível)

---

## Variáveis de ambiente

### `apps/api` — crie um arquivo `.env`:

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
JWT_SECRET=sua_chave_secreta_longa_e_aleatoria
GOOGLE_CLIENT_ID=seu_google_client_id
GOOGLE_CLIENT_SECRET=seu_google_client_secret
EMAIL_USER=seu@email.com
EMAIL_PASS=senha_do_email
```

### `apps/web` — crie um arquivo `.env`:

```env
VITE_API_BASE_URL=http://localhost:8080
```

---

## Como rodar

### 1. Instalar dependências

```bash
pnpm install
```

### 2. Configurar variáveis de ambiente

Crie os arquivos `.env` conforme a seção acima.

### 3. Aplicar migrações no banco

```bash
cd packages/database
pnpm db:push
```

Ou para gerar e aplicar via arquivo de migração:

```bash
pnpm db:generate   # gera o SQL em drizzle/
pnpm db:migrate    # aplica no banco
```

### 4. Rodar em desenvolvimento

```bash
# Na raiz do monorepo — sobe API e Web em paralelo
pnpm dev
```

Ou individualmente:

```bash
# Apenas a API (porta 8080)
cd apps/api
pnpm dev

# Apenas o frontend (porta 5173)
cd apps/web
pnpm dev
```

---

## Testes

```bash
# Todos os pacotes
pnpm test

# Apenas a API
cd apps/api
pnpm test

# Com watch mode
pnpm test:watch

# Com cobertura
pnpm test:coverage
```

Os testes da API usam **Vitest + Supertest** com mocks dos serviços e middleware de autenticação. Não é necessário banco de dados real para rodar os testes.

---

## Build de produção

```bash
# Build de todos os pacotes (respeita dependências via Turborepo)
pnpm build
```

O build da API gera um **bundle único** em `apps/api/dist/app.js` via esbuild, com todas as dependências do workspace embutidas.

---

## Deploy

### API (Railway)

A API é deployada no **Railway** via Dockerfile. O processo:

1. Turborepo faz o build (`pnpm build`)
2. O Dockerfile copia apenas `dist/app.js` e instala só as dependências de produção
3. Railway expõe a porta definida na variável `PORT`

Configure no Railway:
- `DATABASE_URL`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `EMAIL_USER` / `EMAIL_PASS`

### Drizzle Studio (inspeção do banco)

```bash
cd packages/database
pnpm db:studio
```

---

## Schema do banco de dados

```
usuario
  └── usuario_associacao ──→ associacao
                                 └── associado
                                       ├── mensalidade
                                       ├── producao
                                       └── ata

transacao_financeira
edital_pnae
relatorio_pnae
sync_queue
```

Todos os registros sincronizáveis possuem os campos:

| Campo | Tipo | Descrição |
|---|---|---|
| `version` | integer | Controle de versão otimista |
| `updated_at` | timestamp | Última atualização |
| `device_id` | varchar | Origem da operação |
| `deleted_at` | timestamp | Soft delete (null = ativo) |
