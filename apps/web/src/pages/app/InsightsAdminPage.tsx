import { useEffect, useState, useCallback } from "react";
import {
  Lightbulb,
  AlertTriangle,
  ShieldAlert,
  Info,
  Wallet,
  Banknote,
  Leaf,
  FileText,
  RefreshCw,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";
import AppLayout from "./AppLayout";
import { adminNavItems } from "./nav-items";
import { Button } from "@/components/ui/button";
import {
  fetchInsights,
  fetchSuggestions,
  type Insight,
  type InsightsResponse,
  type ActionSuggestion,
  type SuggestionsResponse,
  type InsightSeverity,
  type SuggestionPriority,
  type SuggestionArea,
} from "@/lib/insights-api";

// ── Helpers ───────────────────────────────────────────────────────────────────

function severityConfig(s: InsightSeverity) {
  switch (s) {
    case "critico":
      return {
        bg: "bg-red-50",
        border: "border-red-200",
        icon: <ShieldAlert size={20} className="text-red-600" />,
        badge: "bg-red-100 text-red-700",
        label: "Crítico",
      };
    case "alerta":
      return {
        bg: "bg-amber-50",
        border: "border-amber-200",
        icon: <AlertTriangle size={20} className="text-amber-600" />,
        badge: "bg-amber-100 text-amber-700",
        label: "Alerta",
      };
    default:
      return {
        bg: "bg-blue-50",
        border: "border-blue-200",
        icon: <Info size={20} className="text-blue-600" />,
        badge: "bg-blue-100 text-blue-700",
        label: "Info",
      };
  }
}

function priorityConfig(p: SuggestionPriority) {
  switch (p) {
    case "alta":
      return {
        bg: "bg-red-50",
        border: "border-red-200",
        badge: "bg-red-100 text-red-700",
        label: "Alta",
      };
    case "media":
      return {
        bg: "bg-amber-50",
        border: "border-amber-200",
        badge: "bg-amber-100 text-amber-700",
        label: "Média",
      };
    default:
      return {
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        badge: "bg-emerald-100 text-emerald-700",
        label: "Baixa",
      };
  }
}

function areaIcon(area: SuggestionArea) {
  switch (area) {
    case "financeiro":
      return <Wallet size={18} className="text-emerald-600" />;
    case "mensalidades":
      return <Banknote size={18} className="text-blue-600" />;
    case "producao":
      return <Leaf size={18} className="text-green-600" />;
    case "pnae":
      return <FileText size={18} className="text-purple-600" />;
    default:
      return <Info size={18} className="text-gray-500" />;
  }
}

function areaLabel(area: SuggestionArea) {
  const map: Record<SuggestionArea, string> = {
    financeiro: "Financeiro",
    mensalidades: "Mensalidades",
    producao: "Produção",
    pnae: "PNAE",
    geral: "Geral",
  };
  return map[area];
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ── Componentes ───────────────────────────────────────────────────────────────

function InsightCard({ insight }: { insight: Insight }) {
  const config = severityConfig(insight.severidade);
  return (
    <div
      className={`${config.bg} ${config.border} border rounded-xl p-5 flex gap-4 items-start transition-all hover:shadow-sm`}
    >
      <div className="mt-0.5 shrink-0">{config.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h3 className="font-headline text-base font-semibold text-[#1c1c19]">
            {insight.titulo}
          </h3>
          <span
            className={`${config.badge} text-xs font-medium px-2 py-0.5 rounded-full`}
          >
            {config.label}
          </span>
        </div>
        <p className="text-sm text-[#414846] leading-relaxed">
          {insight.mensagem}
        </p>
      </div>
    </div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: ActionSuggestion }) {
  const pConfig = priorityConfig(suggestion.prioridade);
  return (
    <div
      className={`${pConfig.bg} ${pConfig.border} border rounded-xl p-5 transition-all hover:shadow-sm`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="mt-0.5 shrink-0">{areaIcon(suggestion.area)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-headline text-base font-semibold text-[#1c1c19]">
              {suggestion.titulo}
            </h3>
            <span
              className={`${pConfig.badge} text-xs font-medium px-2 py-0.5 rounded-full`}
            >
              {pConfig.label}
            </span>
            <span className="text-xs text-[#656461] bg-white/60 px-2 py-0.5 rounded-full">
              {areaLabel(suggestion.area)}
            </span>
          </div>
        </div>
      </div>
      <div className="ml-8 space-y-2">
        <p className="text-sm text-[#414846] leading-relaxed">
          <span className="font-medium text-[#1c1c19]">Recomendação: </span>
          {suggestion.recomendacao}
        </p>
        <p className="text-xs text-[#656461] leading-relaxed italic">
          {suggestion.justificativa}
        </p>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-gray-100 rounded-xl h-24" />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-[#656461]">
      <Lightbulb size={40} className="mx-auto mb-3 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="text-center py-12">
      <AlertTriangle size={40} className="mx-auto mb-3 text-amber-400" />
      <p className="text-sm text-[#656461] mb-4">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw size={14} className="mr-2" />
        Tentar novamente
      </Button>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function InsightsAdminPage() {
  const associacaoAtiva = useAuthStore((s) => s.associacaoAtiva);
  const assocId = associacaoAtiva?.associacaoId;

  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionsResponse | null>(
    null,
  );
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [errorInsights, setErrorInsights] = useState<string | null>(null);
  const [errorSuggestions, setErrorSuggestions] = useState<string | null>(null);

  const loadInsights = useCallback(async () => {
    if (!assocId) return;
    setLoadingInsights(true);
    setErrorInsights(null);
    try {
      const data = await fetchInsights(assocId);
      setInsights(data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { status?: number } }).response?.status === 503
          ? "Serviço de IA indisponível no momento."
          : "Não foi possível carregar os insights.";
      setErrorInsights(msg);
    } finally {
      setLoadingInsights(false);
    }
  }, [assocId]);

  const loadSuggestions = useCallback(async () => {
    if (!assocId) return;
    setLoadingSuggestions(true);
    setErrorSuggestions(null);
    try {
      const data = await fetchSuggestions(assocId);
      setSuggestions(data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { status?: number } }).response?.status === 503
          ? "Serviço de IA indisponível no momento."
          : "Não foi possível carregar as sugestões.";
      setErrorSuggestions(msg);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [assocId]);

  useEffect(() => {
    loadInsights();
    loadSuggestions();
  }, [loadInsights, loadSuggestions]);

  const handleRefresh = () => {
    loadInsights();
    loadSuggestions();
    toast.info("Atualizando análises…");
  };

  // Separar insights por severidade
  const criticos =
    insights?.insights.filter((i) => i.severidade === "critico") ?? [];
  const alertas =
    insights?.insights.filter((i) => i.severidade === "alerta") ?? [];
  const infos =
    insights?.insights.filter((i) => i.severidade === "info") ?? [];

  // Separar sugestões por prioridade
  const sugAltas =
    suggestions?.sugestoes.filter((s) => s.prioridade === "alta") ?? [];
  const sugMedias =
    suggestions?.sugestoes.filter((s) => s.prioridade === "media") ?? [];
  const sugBaixas =
    suggestions?.sugestoes.filter((s) => s.prioridade === "baixa") ?? [];

  return (
    <AppLayout navItems={adminNavItems} title="Inteligência">
      <div className="p-6 lg:p-12 max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Sparkles size={28} className="text-md-primary" />
              <h1 className="font-headline text-3xl lg:text-4xl font-bold text-md-primary">
                Inteligência da Associação
              </h1>
            </div>
            <p className="text-[#414846]">
              Análises automáticas e sugestões baseadas nos dados da{" "}
              {associacaoAtiva?.associacaoNome ?? "associação"}.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loadingInsights && loadingSuggestions}
            className="shrink-0"
          >
            <RefreshCw
              size={16}
              className={`mr-2 ${loadingInsights || loadingSuggestions ? "animate-spin" : ""}`}
            />
            Atualizar
          </Button>
        </div>

        {/* Overview badges */}
        {insights && !loadingInsights && (
          <div className="flex flex-wrap gap-3">
            {criticos.length > 0 && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-full text-sm font-medium border border-red-200">
                <ShieldAlert size={14} />
                {criticos.length} crítico{criticos.length > 1 ? "s" : ""}
              </div>
            )}
            {alertas.length > 0 && (
              <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full text-sm font-medium border border-amber-200">
                <AlertTriangle size={14} />
                {alertas.length} alerta{alertas.length > 1 ? "s" : ""}
              </div>
            )}
            {infos.length > 0 && (
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium border border-blue-200">
                <Info size={14} />
                {infos.length} informativo{infos.length > 1 ? "s" : ""}
              </div>
            )}
            {insights.generatedAt && (
              <span className="text-xs text-[#656461] self-center ml-auto">
                Atualizado em {formatDate(insights.generatedAt)}
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Coluna Insights */}
          <section>
            <div className="flex items-center gap-2 mb-5">
              <Lightbulb size={22} className="text-md-primary" />
              <h2 className="font-headline text-2xl font-bold text-md-primary">
                Insights Financeiros
              </h2>
            </div>

            {loadingInsights ? (
              <LoadingSkeleton />
            ) : errorInsights ? (
              <ErrorState message={errorInsights} onRetry={loadInsights} />
            ) : !insights || insights.insights.length === 0 ? (
              <EmptyState message="Nenhum insight disponível. Registre transações para gerar análises." />
            ) : (
              <div className="space-y-4">
                {/* Críticos primeiro */}
                {criticos.map((i) => (
                  <InsightCard key={i.id} insight={i} />
                ))}
                {/* Alertas */}
                {alertas.map((i) => (
                  <InsightCard key={i.id} insight={i} />
                ))}
                {/* Informativos */}
                {infos.map((i) => (
                  <InsightCard key={i.id} insight={i} />
                ))}
              </div>
            )}
          </section>

          {/* Coluna Sugestões */}
          <section>
            <div className="flex items-center gap-2 mb-5">
              <ChevronRight size={22} className="text-md-primary" />
              <h2 className="font-headline text-2xl font-bold text-md-primary">
                Sugestões de Ação
              </h2>
            </div>

            {loadingSuggestions ? (
              <LoadingSkeleton />
            ) : errorSuggestions ? (
              <ErrorState
                message={errorSuggestions}
                onRetry={loadSuggestions}
              />
            ) : !suggestions || suggestions.sugestoes.length === 0 ? (
              <EmptyState message="Nenhuma sugestão disponível no momento." />
            ) : (
              <div className="space-y-4">
                {sugAltas.map((s) => (
                  <SuggestionCard key={s.id} suggestion={s} />
                ))}
                {sugMedias.map((s) => (
                  <SuggestionCard key={s.id} suggestion={s} />
                ))}
                {sugBaixas.map((s) => (
                  <SuggestionCard key={s.id} suggestion={s} />
                ))}
              </div>
            )}

            {suggestions?.aviso && (
              <p className="mt-4 text-xs text-[#656461] italic px-1">
                {suggestions.aviso}
              </p>
            )}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
