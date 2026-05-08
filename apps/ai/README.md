# AI Service - Insights Financeiros

Microsservico responsavel por gerar **insights financeiros** automaticos para a associacao a partir de um snapshot consolidado pelo backend.

Esse servico nao acessa o banco diretamente. Ele recebe um payload com os dados ja consolidados pelo `apps/api` e devolve uma lista de insights em texto simples para serem exibidos como cards no frontend.

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

# Ou rodar a geracao de insights via terminal (sem precisar do servidor)
pnpm --filter ai insights:cli
```

## Testar manualmente

```bash
# Subir o servico e mandar um payload de exemplo
curl -X POST http://localhost:8090/insights \
  -H "Content-Type: application/json" \
  -d @sample-snapshot.json
```
