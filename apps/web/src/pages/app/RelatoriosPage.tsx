import { useState } from "react";
import {
  Leaf,
  Banknote,
  BanknoteArrowUp,
  Users,
  BarChart3,
  MapPin,
  Download,
  FileDown,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth.store";
import AppLayout from "./AppLayout";
import { adminNavItems } from "./nav-items";
import {
  buscarRelatorioProducao,
  buscarRelatorioFinanceiro,
  buscarRelatorioMensalidades,
  buscarRelatorioAssociados,
  buscarRelatorioAreaPlantada,
  exportarCSV,
  type RelatoriosData,
  type RelatorioProducao,
  type RelatorioFinanceiro,
  type RelatorioMensalidades,
  type RelatorioAssociados,
  type RelatorioAreaPlantada,
  type TabKey,
} from "@/lib/relatorios-api";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fCurrency(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fPct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

function fDate(iso: string): string {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function maskCPF(cpf: string | null | undefined): string {
  if (!cpf) return "—";
  const d = cpf.replace(/\D/g, "");
  return d.length >= 9 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.***.${d.slice(-2)}` : cpf;
}

// ── Componentes internos ──────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  variant?: "default" | "dark" | "warning";
  icon?: React.ReactNode;
}

function MetricCard({ label, value, sub, variant = "default", icon }: MetricCardProps) {
  const bg =
    variant === "dark"
      ? "rounded-xl p-5 relative overflow-hidden shadow-[0_8px_30px_rgba(26,60,52,0.15)]"
      : variant === "warning"
        ? "bg-[#fef2f2] rounded-xl p-5 border border-red-100"
        : "bg-white rounded-xl p-5 shadow-sm";

  const textLabel =
    variant === "dark" ? "text-[#aacec3]" : variant === "warning" ? "text-red-500" : "text-[#414846]";
  const textValue =
    variant === "dark" ? "text-white" : variant === "warning" ? "text-red-700" : "text-[#01261f]";
  const textSub =
    variant === "dark" ? "text-[#aacec3]" : variant === "warning" ? "text-red-400" : "text-[#414846]";

  return (
    <div
      className={bg}
      style={
        variant === "dark"
          ? { background: "linear-gradient(135deg, #01261f 0%, #1a3c34 100%)" }
          : undefined
      }
    >
      <div className="flex items-start justify-between mb-3">
        <p className={`font-label text-xs uppercase tracking-wider ${textLabel}`}>{label}</p>
        {icon && (
          <span className={`opacity-60 ${variant === "dark" ? "text-white" : "text-[#01261f]"}`}>
            {icon}
          </span>
        )}
      </div>
      <p className={`font-headline text-3xl font-bold ${textValue}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${textSub}`}>{sub}</p>}
    </div>
  );
}

/** Lista ranqueada com barra de progresso CSS proporcional */
function BarList({
  items,
  unit = "",
}: {
  items: { label: string; value: number; sub?: string }[];
  unit?: string;
}) {
  const max = items[0]?.value ?? 1;
  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const pct = max > 0 ? (item.value / max) * 100 : 0;
        return (
          <div key={i}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-[#1c1c19] font-medium">{item.label}</span>
              <span className="text-[#414846] tabular-nums">
                {typeof item.value === "number"
                  ? item.value.toLocaleString("pt-BR")
                  : item.value}{" "}
                {unit}
              </span>
            </div>
            <div className="h-1.5 bg-[#f6f3ee] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#01261f] rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            {item.sub && <p className="text-xs text-[#414846] mt-0.5">{item.sub}</p>}
          </div>
        );
      })}
    </div>
  );
}

/** Tabela simples com header verde */
function SimpleTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number | null | undefined)[][];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[#c1c8c4]/30">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#01261f] text-white">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className={ri % 2 === 0 ? "bg-white" : "bg-[#f6f3ee]"}
            >
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-2.5 text-[#1c1c19]">
                  {cell == null ? "—" : String(cell)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="px-4 py-8 text-center text-[#414846] text-sm">
                Nenhum registro encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Views de cada aba ─────────────────────────────────────────────────────────

function ProducaoView({ data }: { data: RelatorioProducao }) {
  const { resumo, agregacoes } = data;
  return (
    <div className="space-y-8">
      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Quantidade Total" value={`${resumo.quantidadeTotal.toLocaleString("pt-BR")} kg`} icon={<Leaf size={18} />} />
        <MetricCard label="Registros" value={resumo.totalRegistros} />
        <MetricCard label="Culturas Únicas" value={resumo.culturasUnicas} />
        <MetricCard label="Produtores" value={resumo.associadosUnicos} icon={<Users size={18} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Por cultura */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-headline text-base font-bold text-[#01261f] mb-5">
            Por Cultura
          </h3>
          <BarList
            items={agregacoes.porCultura.map((c) => ({
              label: c.cultura,
              value: c.quantidadeTotal,
              sub: `${c.registros} registro${c.registros !== 1 ? "s" : ""}`,
            }))}
            unit="kg"
          />
        </div>

        {/* Por associado */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-headline text-base font-bold text-[#01261f] mb-5">
            Por Produtor
          </h3>
          <BarList
            items={agregacoes.porAssociado.map((a) => ({
              label: a.nome,
              value: a.quantidadeTotal,
              sub: `${a.registros} registro${a.registros !== 1 ? "s" : ""}`,
            }))}
            unit="kg"
          />
        </div>
      </div>

      {/* Por mês */}
      {agregacoes.porMes.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-headline text-base font-bold text-[#01261f] mb-5">
            Por Mês
          </h3>
          <SimpleTable
            headers={["Mês", "Quantidade (kg)", "Registros"]}
            rows={agregacoes.porMes.map((m) => [
              m.mes,
              m.quantidadeTotal.toLocaleString("pt-BR"),
              m.registros,
            ])}
          />
        </div>
      )}
    </div>
  );
}

function FinanceiroView({ data }: { data: RelatorioFinanceiro }) {
  const { resumo, agregacoes } = data;
  const tiposSaida = Object.entries(agregacoes.porTipoSaida).sort(([, a], [, b]) => b - a);

  return (
    <div className="space-y-8">
      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          label="Total Entradas"
          value={fCurrency(resumo.totalEntradas)}
          icon={<TrendingUp size={18} />}
        />
        <MetricCard
          label="Total Saídas"
          value={fCurrency(resumo.totalSaidas)}
          icon={<TrendingDown size={18} />}
        />
        <MetricCard
          label="Saldo do Período"
          value={fCurrency(resumo.saldoAtual)}
          variant="dark"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Fluxo mensal */}
        {agregacoes.porMes.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-headline text-base font-bold text-[#01261f] mb-5">
              Fluxo Mensal
            </h3>
            <SimpleTable
              headers={["Mês", "Entradas", "Saídas", "Saldo"]}
              rows={agregacoes.porMes.map((m) => {
                const saldo = m.saldo;
                return [
                  m.month,
                  fCurrency(m.entradas),
                  fCurrency(m.saidas),
                  (saldo >= 0 ? "▲ " : "▼ ") + fCurrency(Math.abs(saldo)),
                ];
              })}
            />
          </div>
        )}

        {/* Por tipo de saída */}
        {tiposSaida.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-headline text-base font-bold text-[#01261f] mb-5">
              Despesas por Tipo
            </h3>
            <BarList
              items={tiposSaida.map(([tipo, valor]) => ({
                label: tipo.charAt(0).toUpperCase() + tipo.slice(1),
                value: valor,
                sub: fCurrency(valor),
              }))}
            />
          </div>
        )}
      </div>

      {/* Resumo de mensalidades (do snapshot financeiro) */}
      <div className="bg-[#f6f3ee] rounded-xl p-6 border border-[#c1c8c4]/30">
        <h3 className="font-headline text-base font-bold text-[#01261f] mb-3">
          Mensalidades (Visão Geral)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-[#414846] text-xs uppercase">Pagas</p>
            <p className="font-bold text-[#01261f]">{data.detalhes.mensalidades.pagas}</p>
          </div>
          <div>
            <p className="text-[#414846] text-xs uppercase">Pendentes</p>
            <p className="font-bold text-[#01261f]">{data.detalhes.mensalidades.pendentes}</p>
          </div>
          <div>
            <p className="text-[#414846] text-xs uppercase">Recebido</p>
            <p className="font-bold text-[#01261f]">{fCurrency(data.detalhes.mensalidades.valorRecebido)}</p>
          </div>
          <div>
            <p className="text-[#414846] text-xs uppercase">Inadimplência</p>
            <p className="font-bold text-[#01261f]">
              {fPct(data.detalhes.mensalidades.taxaInadimplencia)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MensalidadesView({ data }: { data: RelatorioMensalidades }) {
  const { resumo, agregacoes, detalhes } = data;

  return (
    <div className="space-y-8">
      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Pagas" value={resumo.totalPagas} sub={fCurrency(resumo.valorRecebido)} />
        <MetricCard
          label="Pendentes"
          value={resumo.totalPendentes}
          sub={fCurrency(resumo.valorPendente)}
          variant={resumo.totalPendentes > 0 ? "warning" : "default"}
        />
        <MetricCard
          label="Taxa Inadimplência"
          value={fPct(resumo.taxaInadimplencia)}
          variant={resumo.taxaInadimplencia > 0.2 ? "warning" : "default"}
        />
        <MetricCard
          label="Pagas no Período"
          value={agregacoes.pagasNoPeriodo}
          sub={fCurrency(agregacoes.valorRecebidoNoPeriodo)}
          variant="dark"
        />
      </div>

      {/* Inadimplentes */}
      {detalhes.pendentes.length > 0 ? (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-headline text-base font-bold text-[#01261f] mb-5">
            Inadimplentes ({detalhes.pendentes.length})
          </h3>
          <SimpleTable
            headers={["Nome", "CPF", "Valor Pendente"]}
            rows={detalhes.pendentes.map((p) => [p.nome, maskCPF(p.cpf), fCurrency(p.valor)])}
          />
        </div>
      ) : (
        <div className="bg-[#f0fdf4] rounded-xl p-6 border border-green-200 text-center">
          <p className="text-green-700 font-medium">✓ Nenhuma mensalidade pendente</p>
          <p className="text-green-600 text-sm mt-1">Todas as mensalidades foram quitadas.</p>
        </div>
      )}
    </div>
  );
}

function AssociadosView({ data }: { data: RelatorioAssociados }) {
  const { resumo, agregacoes, detalhes } = data;

  return (
    <div className="space-y-8">
      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="Total Cadastrados" value={resumo.total} icon={<Users size={18} />} />
        <MetricCard label="Ativos" value={resumo.ativos} variant="dark" />
        <MetricCard label="Novos no Período" value={resumo.novosNoPeriodo} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Por comunidade */}
        {agregacoes.porComunidade.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-headline text-base font-bold text-[#01261f] mb-5">
              Por Comunidade
            </h3>
            <BarList
              items={agregacoes.porComunidade.map((c) => ({
                label: c.comunidade,
                value: c.total,
                sub: `${c.total} associado${c.total !== 1 ? "s" : ""}`,
              }))}
            />
          </div>
        )}

        {/* Por status */}
        {agregacoes.porStatus.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-headline text-base font-bold text-[#01261f] mb-5">
              Por Status
            </h3>
            <BarList
              items={agregacoes.porStatus.map((s) => ({
                label: s.status.charAt(0).toUpperCase() + s.status.slice(1),
                value: s.total,
              }))}
            />
          </div>
        )}
      </div>

      {/* Lista completa */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-headline text-base font-bold text-[#01261f] mb-5">
          Lista de Associados ({detalhes.length})
        </h3>
        <SimpleTable
          headers={["Nome", "Comunidade", "Status", "Entrada"]}
          rows={detalhes.map((a) => [
            a.nome,
            a.comunidade ?? "Não informada",
            a.status,
            fDate(a.dataEntrada),
          ])}
        />
      </div>
    </div>
  );
}

// ── Estados auxiliares ────────────────────────────────────────────────────────

function AreaPlantadaView({ data }: { data: RelatorioAreaPlantada }) {
  const { resumo, agregacoes } = data;
  return (
    <div className="space-y-8">
      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Área Total"
          value={`${resumo.totalHa.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ha`}
          icon={<MapPin size={18} />}
          variant="dark"
        />
        <MetricCard label="Registros" value={resumo.totalRegistros} />
        <MetricCard label="Culturas Únicas" value={resumo.culturasUnicas} />
        <MetricCard label="Produtores" value={resumo.associadosUnicos} icon={<Users size={18} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Por cultura */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-headline text-base font-bold text-[#01261f] mb-5">
            Por Cultura
          </h3>
          <BarList
            items={agregacoes.porCultura.map((c) => ({
              label: c.cultura,
              value: c.totalHa,
              sub: `${c.registros} registro${c.registros !== 1 ? "s" : ""}`,
            }))}
            unit="ha"
          />
        </div>

        {/* Por associado */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-headline text-base font-bold text-[#01261f] mb-5">
            Por Produtor
          </h3>
          <BarList
            items={agregacoes.porAssociado.map((a) => ({
              label: a.nome,
              value: a.totalHa,
              sub: `${a.registros} registro${a.registros !== 1 ? "s" : ""}`,
            }))}
            unit="ha"
          />
        </div>
      </div>

      {/* Por mês */}
      {agregacoes.porMes.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-headline text-base font-bold text-[#01261f] mb-5">
            Por Mês
          </h3>
          <SimpleTable
            headers={["Mês", "Área (ha)", "Registros"]}
            rows={agregacoes.porMes.map((m) => [
              m.mes,
              m.totalHa.toLocaleString("pt-BR", { maximumFractionDigits: 2 }),
              m.registros,
            ])}
          />
        </div>
      )}

      {/* Detalhes */}
      {data.detalhes.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-headline text-base font-bold text-[#01261f] mb-5">
            Registros ({data.detalhes.length})
          </h3>
          <SimpleTable
            headers={["Produtor", "Cultura", "Área (ha)", "Referência"]}
            rows={data.detalhes.map((r) => [
              r.nomeAssociado,
              r.cultura,
              r.areaHa.toLocaleString("pt-BR", { maximumFractionDigits: 2 }),
              fDate(r.dataReferencia),
            ])}
          />
        </div>
      )}
    </div>
  );
}

function EmptyState({ onGerar }: { onGerar: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-full bg-[#f6f3ee] flex items-center justify-center mb-6">
        <BarChart3 size={36} className="text-[#01261f]/40" />
      </div>
      <h3 className="font-headline text-xl font-bold text-[#01261f] mb-2">
        Nenhum relatório gerado
      </h3>
      <p className="text-[#414846] text-sm max-w-sm">
        Selecione o período desejado e clique em{" "}
        <span className="font-semibold text-[#01261f]">Gerar Relatório</span> para visualizar os
        dados da associação.
      </p>
      <Button onClick={onGerar} className="mt-6 bg-[#01261f] text-white hover:bg-[#1a3c34]">
        Gerar Relatório
      </Button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-[#f6f3ee] rounded-xl h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#f6f3ee] rounded-xl h-48" />
        <div className="bg-[#f6f3ee] rounded-xl h-48" />
      </div>
      <div className="bg-[#f6f3ee] rounded-xl h-32" />
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <AlertTriangle size={28} className="text-red-500" />
      </div>
      <h3 className="font-headline text-lg font-bold text-[#1c1c19] mb-2">
        Não foi possível gerar o relatório
      </h3>
      <p className="text-[#414846] text-sm max-w-sm mb-6">{message}</p>
      <Button
        variant="outline"
        onClick={onRetry}
        className="gap-2 border-[#01261f] text-[#01261f] hover:bg-[#01261f] hover:text-white"
      >
        <RefreshCw size={16} /> Tentar Novamente
      </Button>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "producao", label: "Produção", icon: <Leaf size={15} /> },
  { key: "financeiro", label: "Financeiro", icon: <Banknote size={15} /> },
  { key: "mensalidades", label: "Mensalidades", icon: <BanknoteArrowUp size={15} /> },
  { key: "associados", label: "Associados", icon: <Users size={15} /> },
  { key: "area_plantada", label: "Área Plantada", icon: <MapPin size={15} /> },
];

const PERIODOS = [
  { value: "semanal", label: "Últimos 7 dias" },
  { value: "mensal", label: "Mês atual" },
  { value: "anual", label: "Ano atual" },
  { value: "personalizado", label: "Personalizado" },
];

export default function RelatoriosPage() {
  const associacaoAtiva = useAuthStore((s) => s.associacaoAtiva);

  const [activeTab, setActiveTab] = useState<TabKey>("producao");
  const [periodo, setPeriodo] = useState("mensal");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RelatoriosData | null>(null);

  if (!associacaoAtiva) return null;

  const handleGerar = async () => {
    if (periodo === "personalizado" && (!inicio || !fim)) {
      toast.error("Informe as datas de início e fim para o período personalizado.");
      return;
    }
    if (periodo === "personalizado" && inicio > fim) {
      toast.error("A data de início deve ser anterior ou igual à data de fim.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = {
        associacao_id: associacaoAtiva.associacaoId,
        periodo,
        ...(periodo === "personalizado" ? { inicio, fim } : {}),
      };

      const [prod, fin, mens, assoc, area] = await Promise.all([
        buscarRelatorioProducao(params),
        buscarRelatorioFinanceiro(params),
        buscarRelatorioMensalidades(params),
        buscarRelatorioAssociados(params),
        buscarRelatorioAreaPlantada(params),
      ]);

      setData({ producao: prod, financeiro: fin, mensalidades: mens, associados: assoc, areaPlantada: area });
      toast.success("Relatório gerado com sucesso!");
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message.includes("Network")
          ? "Sem conexão com o servidor. Verifique sua internet e tente novamente."
          : "Erro ao gerar relatório. Tente novamente em instantes.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGerarPDF = async () => {
    if (!data) return;
    setPdfLoading(true);
    try {
      const { generatePDFBlob } = await import("./relatorios/pdf-utils");
      const blob = await generatePDFBlob(data, associacaoAtiva);

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-${associacaoAtiva.associacaoNome.replace(/\s+/g, "-")}-${data.producao.meta.periodo.inicio}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF gerado com sucesso!");
    } catch (err) {
      console.error("Erro ao gerar PDF", err);
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <AppLayout navItems={adminNavItems} title="Relatórios">
      <div className="p-6 lg:p-12 max-w-7xl mx-auto space-y-8">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="font-headline text-3xl lg:text-4xl font-bold text-[#01261f]">
              Relatórios Institucionais
            </h1>
            <p className="text-[#414846] mt-1">
              {associacaoAtiva.associacaoNome} · {associacaoAtiva.associacaoMunicipio},{" "}
              {associacaoAtiva.associacaoEstado}
            </p>
          </div>

          {/* Botões de exportação — visíveis somente com dados */}
          {data && !loading && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => exportarCSV(activeTab, data)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#c1c8c4] bg-white text-[#414846] text-sm hover:bg-[#f6f3ee] transition-colors"
              >
                <Download size={15} /> Exportar CSV
              </button>
              <button
                onClick={handleGerarPDF}
                disabled={pdfLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#01261f] bg-white text-[#01261f] text-sm hover:bg-[#01261f] hover:text-white transition-colors disabled:opacity-50"
              >
                <FileDown size={15} />
                {pdfLoading ? "Gerando PDF..." : "Exportar PDF"}
              </button>
            </div>
          )}
        </div>

        {/* ── Filtro de período ── */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#c1c8c4]/30">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#414846] uppercase tracking-wider">
                Período
              </label>
              <select
                value={periodo}
                onChange={(e) => {
                  setPeriodo(e.target.value);
                  setData(null);
                }}
                className="h-9 rounded-lg border border-[#c1c8c4] bg-white px-3 text-sm text-[#1c1c19] focus:outline-none focus:ring-2 focus:ring-[#01261f]/30"
              >
                {PERIODOS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {periodo === "personalizado" && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[#414846] uppercase tracking-wider">
                    De
                  </label>
                  <input
                    type="date"
                    value={inicio}
                    onChange={(e) => { setInicio(e.target.value); setData(null); }}
                    className="h-9 rounded-lg border border-[#c1c8c4] px-3 text-sm text-[#1c1c19] focus:outline-none focus:ring-2 focus:ring-[#01261f]/30"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[#414846] uppercase tracking-wider">
                    Até
                  </label>
                  <input
                    type="date"
                    value={fim}
                    min={inicio}
                    onChange={(e) => { setFim(e.target.value); setData(null); }}
                    className="h-9 rounded-lg border border-[#c1c8c4] px-3 text-sm text-[#1c1c19] focus:outline-none focus:ring-2 focus:ring-[#01261f]/30"
                  />
                </div>
              </>
            )}

            <Button
              onClick={handleGerar}
              disabled={loading}
              className="h-9 bg-[#01261f] text-white hover:bg-[#1a3c34] gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw size={15} className="animate-spin" /> Gerando...
                </>
              ) : (
                <>
                  <BarChart3 size={15} /> Gerar Relatório
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div className="flex gap-2 flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-[#01261f] text-white shadow-sm"
                  : "bg-white text-[#414846] border border-[#c1c8c4]/50 hover:bg-[#f6f3ee]"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Conteúdo da aba ── */}
        <div>
          {loading && <LoadingSkeleton />}

          {!loading && error && (
            <ErrorCard message={error} onRetry={handleGerar} />
          )}

          {!loading && !error && !data && (
            <EmptyState onGerar={handleGerar} />
          )}

          {!loading && !error && data && (
            <>
              {activeTab === "producao" && <ProducaoView data={data.producao} />}
              {activeTab === "financeiro" && <FinanceiroView data={data.financeiro} />}
              {activeTab === "mensalidades" && <MensalidadesView data={data.mensalidades} />}
              {activeTab === "associados" && <AssociadosView data={data.associados} />}
              {activeTab === "area_plantada" && <AreaPlantadaView data={data.areaPlantada} />}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
