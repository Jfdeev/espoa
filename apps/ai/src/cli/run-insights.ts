import { generateInsights } from "../analyzers";
import type { FinancialSnapshot } from "../types";

const sampleSnapshot: FinancialSnapshot = {
  associacaoId: "demo-associacao",
  generatedAt: new Date().toISOString(),
  saldoAtual: 1850,
  totalEntradas: 9200,
  totalSaidas: 7350,
  porMes: [
    { month: "2026-02", entradas: 3200, saidas: 1800, saldo: 1400 },
    { month: "2026-03", entradas: 3000, saidas: 2200, saldo: 800 },
    { month: "2026-04", entradas: 3000, saidas: 3350, saldo: -350 },
  ],
  porTipoSaida: {
    manutencao: 4200,
    eventos: 1900,
    transporte: 1250,
  },
  mensalidades: {
    totalAssociadosAtivos: 42,
    pagas: 28,
    pendentes: 14,
    valorRecebido: 1400,
    valorEsperado: 2100,
    taxaInadimplencia: 14 / 42,
  },
};

const insights = generateInsights(sampleSnapshot);

console.log("=== Snapshot financeiro de demonstracao ===");
console.log(JSON.stringify(sampleSnapshot, null, 2));
console.log("\n=== Insights gerados ===");
for (const insight of insights) {
  console.log(`\n[${insight.severidade.toUpperCase()}] ${insight.titulo}`);
  console.log(`  ${insight.mensagem}`);
}
console.log(`\nTotal: ${insights.length} insights.`);
