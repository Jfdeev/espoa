import { generateSuggestions } from "../suggestion-analyzers";
import type { SuggestionsSnapshot } from "../types";

const sample: SuggestionsSnapshot = {
  associacaoId: "demo-associacao",
  generatedAt: new Date().toISOString(),
  financeiro: {
    associacaoId: "demo-associacao",
    generatedAt: new Date().toISOString(),
    saldoAtual: -420,
    totalEntradas: 9200,
    totalSaidas: 9620,
    porMes: [
      { month: "2026-02", entradas: 3200, saidas: 1800, saldo: 1400 },
      { month: "2026-03", entradas: 3000, saidas: 3500, saldo: -500 },
      { month: "2026-04", entradas: 3000, saidas: 4320, saldo: -1320 },
    ],
    porTipoSaida: {
      manutencao: 6800,
      eventos: 1900,
      transporte: 920,
    },
    mensalidades: {
      totalAssociadosAtivos: 42,
      pagas: 24,
      pendentes: 18,
      valorRecebido: 1200,
      valorEsperado: 2100,
      taxaInadimplencia: 18 / 42,
    },
  },
  producao: {
    quantidadeTotal: 1850,
    totalRegistros: 22,
    associadosUnicos: 2,
    culturasUnicas: 2,
    porCultura: [
      { cultura: "Alface", quantidadeTotal: 1600, registros: 18 },
      { cultura: "Tomate", quantidadeTotal: 250, registros: 4 },
    ],
    porMes: [
      { mes: "2026-02", quantidadeTotal: 900, registros: 9 },
      { mes: "2026-03", quantidadeTotal: 0, registros: 0 },
      { mes: "2026-04", quantidadeTotal: 950, registros: 13 },
    ],
  },
  editaisAbertos: 2,
};

const result = generateSuggestions(sample);

console.log("=== Sugestoes de acao (demonstracao) ===\n");
console.log(result.aviso);
console.log(`\nTotal: ${result.sugestoes.length} sugestao(oes).`);

for (const s of result.sugestoes) {
  console.log(
    `\n[${s.prioridade.toUpperCase()} · ${s.area}] ${s.titulo}`,
  );
  console.log(`  Recomendacao: ${s.recomendacao}`);
  console.log(`  Justificativa: ${s.justificativa}`);
  console.log(`  Apoio (nao decide sozinho): ${s.apoio}`);
}
