import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { RelatoriosData } from "@/lib/relatorios-api";
import type { UsuarioVinculo } from "@/types/auth";

// ── Paleta ────────────────────────────────────────────────────────────────────

const C = {
  green: "#01261f",
  lightGreen: "#1a3c34",
  cream: "#f6f3ee",
  accent: "#aacec3",
  grey: "#414846",
  lightGrey: "#c1c8c4",
  white: "#ffffff",
  black: "#1c1c19",
  danger: "#b91c1c",
};

// ── Estilos ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.black,
    paddingBottom: 50,
  },

  // Cabeçalho
  header: {
    backgroundColor: C.green,
    paddingHorizontal: 36,
    paddingVertical: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "column", gap: 3 },
  headerBadge: {
    fontSize: 7,
    color: C.accent,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  headerTitle: { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.white },
  headerSub: { fontSize: 9, color: C.accent },
  headerRight: { alignItems: "flex-end" },
  headerPeriod: { fontSize: 8, color: C.white, opacity: 0.8 },
  headerGenerated: { fontSize: 7, color: C.accent, marginTop: 3 },

  // Corpo
  body: { paddingHorizontal: 36, paddingTop: 20 },

  // Título de seção
  sectionTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.green,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: 20,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.accent,
  },

  // Linha de métricas (3 colunas)
  metricRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  metricCard: {
    flex: 1,
    backgroundColor: C.cream,
    borderRadius: 4,
    padding: 10,
  },
  metricCardDark: {
    flex: 1,
    backgroundColor: C.green,
    borderRadius: 4,
    padding: 10,
  },
  metricLabel: { fontSize: 7, color: C.grey, marginBottom: 4, textTransform: "uppercase" },
  metricLabelDark: { fontSize: 7, color: C.accent, marginBottom: 4, textTransform: "uppercase" },
  metricValue: { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.green },
  metricValueDark: { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.white },
  metricSub: { fontSize: 7, color: C.grey, marginTop: 2 },
  metricSubDark: { fontSize: 7, color: C.accent, marginTop: 2 },

  // Tabela
  table: { width: "100%", marginBottom: 4 },
  tableHeader: { flexDirection: "row", backgroundColor: C.green, borderRadius: 2 },
  tableHeaderCell: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 7,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.white,
  },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.lightGrey },
  tableRowAlt: {
    flexDirection: "row",
    backgroundColor: C.cream,
    borderBottomWidth: 1,
    borderBottomColor: C.lightGrey,
  },
  tableCell: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 7,
    fontSize: 8,
    color: C.black,
  },
  tableCellBold: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 7,
    fontSize: 8,
    color: C.black,
    fontFamily: "Helvetica-Bold",
  },

  // Inadimplente item
  inadimplenteItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.lightGrey,
  },
  inadimplenteNome: { fontSize: 8, color: C.black, flex: 2 },
  inadimplenteCpf: { fontSize: 8, color: C.grey, flex: 1.5 },
  inadimplenteValor: { fontSize: 8, color: C.danger, fontFamily: "Helvetica-Bold", flex: 0.8, textAlign: "right" },

  // Resumo de inadimplência
  inadResumoBadge: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fca5a5",
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  inadResumoText: { fontSize: 8, color: C.danger },
  inadResumoValue: { fontSize: 8, color: C.danger, fontFamily: "Helvetica-Bold" },

  // Tags de comunidade
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 4 },
  tag: {
    backgroundColor: C.cream,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 8,
    color: C.green,
  },

  // Rodapé
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: C.cream,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 36,
    borderTopWidth: 1,
    borderTopColor: C.lightGrey,
  },
  footerText: { fontSize: 7, color: C.grey },
  pageNumber: { fontSize: 7, color: C.grey },
});

// ── Helpers de formatação ─────────────────────────────────────────────────────

function fCurrency(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fPct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

function fDate(iso: string): string {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

function maskCPF(cpf: string | null | undefined): string {
  if (!cpf) return "—";
  const digits = cpf.replace(/\D/g, "");
  if (digits.length < 9) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.***.${digits.slice(-2)}`;
}

function periodoLabel(meta: { periodo: { tipo: string; inicio: string; fim: string } }): string {
  const { tipo, inicio, fim } = meta.periodo;
  if (tipo === "mensal") return `Mês: ${fDate(inicio)} a ${fDate(fim)}`;
  if (tipo === "semanal") return `Semana: ${fDate(inicio)} a ${fDate(fim)}`;
  if (tipo === "anual") return `Ano: ${fDate(inicio)} a ${fDate(fim)}`;
  return `${fDate(inicio)} a ${fDate(fim)}`;
}

// ── Sub-componentes PDF ───────────────────────────────────────────────────────

function PDFHeader({
  assocNome,
  municipio,
  estado,
  periodo,
  geradoEm,
}: {
  assocNome: string;
  municipio: string;
  estado: string;
  periodo: string;
  geradoEm: string;
}) {
  return (
    <View style={s.header}>
      <View style={s.headerLeft}>
        <Text style={s.headerBadge}>Sistema Itaju · Relatório Institucional</Text>
        <Text style={s.headerTitle}>{assocNome}</Text>
        <Text style={s.headerSub}>
          {municipio} – {estado}
        </Text>
      </View>
      <View style={s.headerRight}>
        <Text style={s.headerPeriod}>{periodo}</Text>
        <Text style={s.headerGenerated}>
          Gerado em {new Date(geradoEm).toLocaleDateString("pt-BR")}
        </Text>
      </View>
    </View>
  );
}

function PDFSection({ title }: { title: string }) {
  return <Text style={s.sectionTitle}>{title}</Text>;
}

function PDFMetricRow({
  metrics,
}: {
  metrics: { label: string; value: string; sub?: string; dark?: boolean }[];
}) {
  return (
    <View style={s.metricRow}>
      {metrics.map((m, i) => (
        <View key={i} style={m.dark ? s.metricCardDark : s.metricCard}>
          <Text style={m.dark ? s.metricLabelDark : s.metricLabel}>{m.label}</Text>
          <Text style={m.dark ? s.metricValueDark : s.metricValue}>{m.value}</Text>
          {m.sub && <Text style={m.dark ? s.metricSubDark : s.metricSub}>{m.sub}</Text>}
        </View>
      ))}
    </View>
  );
}

function PDFTable({
  headers,
  rows,
  boldFirst = false,
}: {
  headers: string[];
  rows: (string | number | null | undefined)[][];
  boldFirst?: boolean;
}) {
  return (
    <View style={s.table}>
      <View style={s.tableHeader}>
        {headers.map((h, i) => (
          <Text key={i} style={s.tableHeaderCell}>
            {h}
          </Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={ri % 2 === 0 ? s.tableRow : s.tableRowAlt}>
          {row.map((cell, ci) => (
            <Text
              key={ci}
              style={boldFirst && ci === 0 ? s.tableCellBold : s.tableCell}
            >
              {cell == null ? "—" : String(cell)}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function PDFFooter({ assocNome }: { assocNome: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>
        {assocNome} · Documento gerado pelo Sistema Itaju
      </Text>
      <Text
        style={s.pageNumber}
        render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Pág. ${pageNumber} / ${totalPages}`}
        fixed
      />
    </View>
  );
}

// ── Documento principal ───────────────────────────────────────────────────────

interface Props {
  data: RelatoriosData;
  associacao: UsuarioVinculo;
}

export function RelatoriosPDFDoc({ data, associacao }: Props) {
  const { producao, financeiro, mensalidades, associados } = data;
  const periodoStr = periodoLabel(producao.meta);
  const geradoEm = producao.meta.geradoEm;

  // Resumo executivo — combina todos os módulos
  const saldo = financeiro.resumo.saldoAtual;

  return (
    <Document
      title={`Relatório Institucional — ${associacao.associacaoNome}`}
      author="Sistema Itaju"
      subject="Relatório de Associação Rural"
    >
      <Page size="A4" style={s.page}>
        {/* Cabeçalho */}
        <PDFHeader
          assocNome={associacao.associacaoNome}
          municipio={associacao.associacaoMunicipio}
          estado={associacao.associacaoEstado}
          periodo={periodoStr}
          geradoEm={geradoEm}
        />

        <View style={s.body}>
          {/* ── Resumo Executivo ── */}
          <PDFSection title="Resumo Executivo" />
          <PDFMetricRow
            metrics={[
              {
                label: "Associados Ativos",
                value: String(associados.resumo.ativos),
                sub: `Total: ${associados.resumo.total}`,
              },
              {
                label: "Produção Total",
                value: `${producao.resumo.quantidadeTotal.toLocaleString("pt-BR")} kg`,
                sub: `${producao.resumo.culturasUnicas} culturas`,
              },
              {
                label: "Saldo do Período",
                value: fCurrency(saldo),
                sub: saldo >= 0 ? "Positivo" : "Negativo",
                dark: true,
              },
            ]}
          />

          {/* ── Produção Agrícola ── */}
          <PDFSection title="Produção Agrícola" />
          {producao.agregacoes.porCultura.length === 0 ? (
            <Text style={{ fontSize: 8, color: C.grey, marginBottom: 8 }}>
              Nenhum registro de produção no período.
            </Text>
          ) : (
            <PDFTable
              headers={["Cultura", "Qtd. Total", "Produtores", "Registros"]}
              boldFirst
              rows={producao.agregacoes.porCultura.map((c) => [
                c.cultura,
                `${c.quantidadeTotal.toLocaleString("pt-BR")} kg`,
                producao.agregacoes.porAssociado.filter((a) =>
                  producao.detalhes.some(
                    (d) => d.associadoId === a.associadoId && d.cultura === c.cultura,
                  ),
                ).length || "—",
                c.registros,
              ])}
            />
          )}

          {/* ── Fluxo Financeiro ── */}
          <PDFSection title="Fluxo Financeiro" />
          <PDFMetricRow
            metrics={[
              {
                label: "Total Entradas",
                value: fCurrency(financeiro.resumo.totalEntradas),
              },
              {
                label: "Total Saídas",
                value: fCurrency(financeiro.resumo.totalSaidas),
              },
              {
                label: "Saldo",
                value: fCurrency(financeiro.resumo.saldoAtual),
                dark: true,
              },
            ]}
          />
          {financeiro.agregacoes.porMes.length > 0 && (
            <PDFTable
              headers={["Mês", "Entradas (R$)", "Saídas (R$)", "Saldo (R$)"]}
              rows={financeiro.agregacoes.porMes.map((m) => [
                m.month,
                fCurrency(m.entradas),
                fCurrency(m.saidas),
                fCurrency(m.saldo),
              ])}
            />
          )}

          {/* ── Mensalidades ── */}
          <PDFSection title="Mensalidades" />
          <PDFMetricRow
            metrics={[
              {
                label: "Pagas",
                value: String(mensalidades.resumo.totalPagas),
                sub: fCurrency(mensalidades.resumo.valorRecebido),
              },
              {
                label: "Pendentes",
                value: String(mensalidades.resumo.totalPendentes),
                sub: fCurrency(mensalidades.resumo.valorPendente),
              },
              {
                label: "Taxa Inadimplência",
                value: fPct(mensalidades.resumo.taxaInadimplencia),
                dark: mensalidades.resumo.taxaInadimplencia > 0.2,
              },
            ]}
          />

          {mensalidades.detalhes.pendentes.length > 0 && (
            <>
              <Text style={{ fontSize: 7, color: C.grey, marginBottom: 4 }}>
                INADIMPLENTES ({mensalidades.detalhes.pendentes.length})
              </Text>
              {mensalidades.detalhes.pendentes.map((p, i) => (
                <View key={i} style={s.inadimplenteItem}>
                  <Text style={s.inadimplenteNome}>{p.nome}</Text>
                  <Text style={s.inadimplenteCpf}>{maskCPF(p.cpf)}</Text>
                  <Text style={s.inadimplenteValor}>{fCurrency(p.valor)}</Text>
                </View>
              ))}
            </>
          )}

          {/* ── Associados ── */}
          <PDFSection title="Associados" />
          <PDFMetricRow
            metrics={[
              { label: "Total Cadastrados", value: String(associados.resumo.total) },
              { label: "Ativos", value: String(associados.resumo.ativos) },
              { label: "Novos no Período", value: String(associados.resumo.novosNoPeriodo) },
            ]}
          />

          {associados.agregacoes.porComunidade.length > 0 && (
            <>
              <Text style={{ fontSize: 7, color: C.grey, marginBottom: 4, marginTop: 6 }}>
                POR COMUNIDADE
              </Text>
              <View style={s.tagRow}>
                {associados.agregacoes.porComunidade.map((c, i) => (
                  <Text key={i} style={s.tag}>
                    {c.comunidade} ({c.total})
                  </Text>
                ))}
              </View>
            </>
          )}

          {associados.detalhes.length > 0 && (
            <PDFTable
              headers={["Nome", "CPF", "Comunidade", "Status", "Entrada"]}
              boldFirst
              rows={associados.detalhes.slice(0, 30).map((a) => [
                a.nome,
                maskCPF(a.cpf),
                a.comunidade ?? "Não informada",
                a.status,
                fDate(a.dataEntrada),
              ])}
            />
          )}
          {associados.detalhes.length > 30 && (
            <Text style={{ fontSize: 7, color: C.grey, marginTop: 4 }}>
              + {associados.detalhes.length - 30} associados não exibidos. Exporte o CSV para a lista completa.
            </Text>
          )}
        </View>

        {/* Rodapé fixo em todas as páginas */}
        <PDFFooter assocNome={associacao.associacaoNome} />
      </Page>
    </Document>
  );
}
