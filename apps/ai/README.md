# AI Service - Insights, Relatorios PNAE e Sugestoes

Microsservico responsavel por transformar dados consolidados da associacao em
**informacoes compreensiveis**: insights financeiros (IA-01), apoio a geracao de
relatorios PNAE (IA-02) e sugestoes de acao (IA-03).

Esse servico nao acessa o banco diretamente nem usa LLM. Ele recebe um payload
com os dados ja consolidados pelo `apps/api` e devolve resultados deterministas
em texto simples para serem exibidos no frontend. Toda saida e **apoio a
decisao** — nunca uma decisao automatica.

## Como funciona

```
[apps/web]  GET /insights?associacao_id=...
     |
     v
[apps/api]  consolida dados financeiros (transacao + mensalidade)
     |
     v
[apps/ai]   POST /insights  (snapshot)
     |
     v
[apps/api]  retorna insights ao web
```

## Endpoints

### `GET /health`
Healthcheck.

### `POST /insights`

Recebe um snapshot financeiro e devolve insights.

**Request body** (`FinancialSnapshot`):

```json
{
  "associacaoId": "uuid",
  "generatedAt": "2026-05-08T03:00:00.000Z",
  "saldoAtual": 1850,
  "totalEntradas": 9200,
  "totalSaidas": 7350,
  "porMes": [
    { "month": "2026-04", "entradas": 3000, "saidas": 3350, "saldo": -350 }
  ],
  "porTipoSaida": { "manutencao": 4200 },
  "mensalidades": {
    "totalAssociadosAtivos": 42,
    "pagas": 28,
    "pendentes": 14,
    "valorRecebido": 1400,
    "valorEsperado": 2100,
    "taxaInadimplencia": 0.33
  }
}
```

**Response 200** (`InsightsResponse`):

```json
{
  "associacaoId": "uuid",
  "generatedAt": "2026-05-08T03:29:05.627Z",
  "insights": [
    {
      "id": "tendencia_saldo_negativa",
      "categoria": "tendencia_saldo",
      "severidade": "alerta",
      "titulo": "Saldo em queda",
      "mensagem": "O saldo caiu R$ 1.750,00 nos ultimos 3 meses..."
    }
  ]
}
```

### Categorias geradas
- `tendencia_saldo` — saldo subindo, caindo ou estavel
- `maior_gasto` — mes com maior saida
- `fluxo_caixa` — categoria dominante de gastos / saldo negativo
- `inadimplencia` — risco baseado na taxa de mensalidades pendentes
- `geral` — resumo executivo

### Severidades
- `info` (azul) — informativo
- `alerta` (amarelo) — atencao recomendada
- `critico` (vermelho) — acao imediata sugerida

### `POST /pnae-report` — IA-02

Apoio na geracao de relatorios PNAE. Recebe a demanda do edital + a producao
ja agregada pelo backend e devolve o material **organizado e em linguagem
compreensivel**: cruzamento producao x demanda, nivel de prontidao, secoes
textuais e um `textoRelatorio` pronto para ser salvo em
`relatorio_pnae.conteudo`.

**Request body** (`PnaeReportSnapshot`) — ver `sample-pnae-snapshot.json`:

```json
{
  "associacaoId": "uuid",
  "generatedAt": "2026-05-15T03:00:00.000Z",
  "edital": {
    "id": "uuid",
    "titulo": "Chamada Publica PNAE 2026",
    "dataLimite": "2026-06-10",
    "status": "aberto",
    "produtos": [
      { "produto": "Alface", "quantidade": 800, "unidade": "kg", "precoReferencia": 4.5 }
    ]
  },
  "periodo": { "inicio": "2026-01-01", "fim": "2026-05-15" },
  "producao": {
    "quantidadeTotal": 2650,
    "totalRegistros": 41,
    "associadosUnicos": 7,
    "culturasUnicas": 3,
    "porCultura": [
      { "cultura": "Alface", "quantidadeTotal": 950, "registros": 14 }
    ]
  }
}
```

> Se `edital.produtos` vier vazio (o schema atual de `edital_pnae` ainda nao
> tem produtos), o servico nao quebra: ele organiza os dados de producao para
> preenchimento manual do projeto de venda.

**Response 200** (`PnaeReportResponse`): `resumoExecutivo`, `prontidao`
(`nivel`, `coberturaMedia`, `produtosAtendidos`/`produtosTotal`), `matching`
(por produto: `status` = `atende` | `parcial` | `sem_producao`, `gap`,
`surplus`, `valorEstimado`), `secoes`, `alertas` e `textoRelatorio`.

### `POST /suggestions` — IA-03

Sugestoes de ajuste na gestao financeira e na organizacao da producao.
**Sempre apoio, nunca decisao automatica**: cada sugestao traz `apoio: true` +
`justificativa`, e a resposta inclui um `aviso` explicito de que a decisao
final e da associacao.

**Request body** (`SuggestionsSnapshot`) — ver `sample-suggestions-snapshot.json`:
o snapshot financeiro (mesmo de `/insights`) em `financeiro`, opcionalmente
`producao` (agregada) e `editaisAbertos`.

**Response 200** (`SuggestionsResponse`):

```json
{
  "associacaoId": "uuid",
  "generatedAt": "2026-05-15T03:29:05.627Z",
  "aviso": "Estas sao sugestoes de apoio... a decisao final e sempre da associacao.",
  "sugestoes": [
    {
      "id": "fin_saldo_negativo",
      "area": "financeiro",
      "prioridade": "alta",
      "titulo": "Recompor o caixa",
      "recomendacao": "Considere priorizar a cobranca...",
      "justificativa": "O saldo atual esta negativo em R$ 420,00.",
      "apoio": true
    }
  ]
}
```

Areas: `financeiro`, `mensalidades`, `producao`, `pnae`, `geral`.
Prioridades: `alta`, `media`, `baixa` (resposta ordenada por prioridade).

## Variaveis de ambiente

| Var | Descricao | Default |
|---|---|---|
| `AI_PORT` | Porta do servico | `8090` |

No `apps/api`, defina `AI_SERVICE_URL` apontando para o host do AI (ex: `http://localhost:8090`).

## Como rodar

```bash
# Instalar deps
pnpm install

# Subir o servico
pnpm --filter ai dev

# Ou rodar via terminal, sem precisar do servidor (demonstracoes)
pnpm --filter ai insights:cli
pnpm --filter ai pnae:cli
pnpm --filter ai suggestions:cli

# Rodar os testes
pnpm --filter ai test
```

## Testar manualmente

```bash
# Subir o servico e mandar um payload de exemplo
curl -X POST http://localhost:8090/insights \
  -H "Content-Type: application/json" \
  -d @sample-snapshot.json

curl -X POST http://localhost:8090/pnae-report \
  -H "Content-Type: application/json" \
  -d @sample-pnae-snapshot.json

curl -X POST http://localhost:8090/suggestions \
  -H "Content-Type: application/json" \
  -d @sample-suggestions-snapshot.json
```
