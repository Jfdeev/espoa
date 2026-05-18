import { generatePnaeReport } from "../pnae-analyzers";
import type { PnaeReportSnapshot } from "../types";

const sample: PnaeReportSnapshot = {
  associacaoId: "demo-associacao",
  generatedAt: new Date().toISOString(),
  edital: {
    id: "edital-001",
    titulo: "Chamada Publica PNAE 2026 - Merenda Escolar",
    numeroEdital: "001/2026",
    orgaoResponsavel: "Secretaria Municipal de Educacao",
    municipio: "Sao Joao",
    estado: "MG",
    dataLimite: "2026-06-10",
    valorTotalEstimado: 48000,
    status: "aberto",
    produtos: [
      { produto: "Alface", quantidade: 800, unidade: "kg", precoReferencia: 4.5 },
      { produto: "Tomate", quantidade: 1200, unidade: "kg", precoReferencia: 6 },
      { produto: "Cenoura", quantidade: 600, unidade: "kg", precoReferencia: 5 },
      { produto: "Banana", quantidade: 500, unidade: "kg", precoReferencia: 3.5 },
    ],
  },
  periodo: { inicio: "2026-01-01", fim: "2026-05-15" },
  producao: {
    quantidadeTotal: 2650,
    totalRegistros: 41,
    associadosUnicos: 7,
    culturasUnicas: 3,
    porCultura: [
      { cultura: "Alface", quantidadeTotal: 950, registros: 14, associados: 5 },
      { cultura: "Tomate", quantidadeTotal: 700, registros: 18, associados: 4 },
      { cultura: "Cenoura", quantidadeTotal: 1000, registros: 9, associados: 3 },
    ],
  },
};

const report = generatePnaeReport(sample);

console.log("=== Relatorio de apoio PNAE (demonstracao) ===\n");
console.log(report.resumoExecutivo);
console.log(
  `\nProntidao: ${report.prontidao.nivel} | cobertura media ${(
    report.prontidao.coberturaMedia * 100
  ).toFixed(0)}% | ${report.prontidao.produtosAtendidos}/${report.prontidao.produtosTotal} produto(s) atendidos`,
);

console.log("\n--- Cruzamento producao x demanda ---");
for (const m of report.matching) {
  console.log(`\n[${m.status.toUpperCase()}] ${m.produto}`);
  console.log(`  ${m.mensagem}`);
}

if (report.alertas.length > 0) {
  console.log("\n--- Alertas ---");
  for (const a of report.alertas) console.log(`  - ${a}`);
}

console.log("\n--- Texto pronto para relatorio_pnae.conteudo ---\n");
console.log(report.textoRelatorio);
