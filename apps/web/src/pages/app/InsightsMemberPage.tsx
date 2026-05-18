import { useEffect, useState } from "react";
import {
  Lightbulb,
  ShieldAlert,
  AlertTriangle,
  Info,
  ThumbsUp,
  RefreshCw,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import AppLayout from "./AppLayout";
import { memberNavItems } from "./nav-items";
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
} from "@/lib/insights-api";

// ── Helpers ───────────────────────────────────────────────────────────────────

function severityEmoji(s: InsightSeverity) {
  switch (s) {
    case "critico":
      return {
        icon: <ShieldAlert size={24} className="text-red-500" />,
        bg: "bg-red-50 border-red-200",
        label: "Precisa de atenção!",
      };
    case "alerta":
      return {
        icon: <AlertTriangle size={24} className="text-amber-500" />,
        bg: "bg-amber-50 border-amber-200",
        label: "Fique de olho",
      };
    default:
      return {
        icon: <Info size={24} className="text-blue-500" />,
        bg: "bg-blue-50 border-blue-200",
        label: "Tudo certo",
      };
  }
}

function priorityStyle(p: SuggestionPriority) {
  switch (p) {
    case "alta":
      return "bg-red-50 border-red-200";
    case "media":
      return "bg-amber-50 border-amber-200";
    default:
      return "bg-emerald-50 border-emerald-200";
  }
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

// ── Componentes simplificados ─────────────────────────────────────────────────

function SimpleInsightCard({ insight }: { insight: Insight }) {
  const config = severityEmoji(insight.severidade);
  return (
    <div
      className={`${config.bg} border rounded-2xl p-6 flex gap-4 items-start`}
    >
      <div className="mt-1 shrink-0">{config.icon}</div>
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-bold text-[#1c1c19] mb-1">
          {insight.titulo}
        </h3>
        <p className="text-[15px] text-[#414846] leading-relaxed">
          {insight.mensagem}
        </p>
      </div>
    </div>
  );
}

function SimpleSuggestionCard({
  suggestion,
}: {
  suggestion: ActionSuggestion;
}) {
  return (
    <div
      className={`${priorityStyle(suggestion.prioridade)} border rounded-2xl p-6`}
    >
      <div className="flex items-start gap-3 mb-3">
        <ArrowRight
          size={20}
          className="text-md-primary mt-0.5 shrink-0"
        />
        <h3 className="text-lg font-bold text-[#1c1c19]">
          {suggestion.titulo}
        </h3>
      </div>
      <p className="text-[15px] text-[#414846] leading-relaxed ml-8">
        {suggestion.recomendacao}
      </p>
    </div>
  );
}

function LoadingPulse() {
  return (
    <div className="space-y-5 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-[#f0ede8] rounded-2xl h-28" />
      ))}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function InsightsMemberPage() {
  const perfil = useAuthStore((s) => s.perfil);
  const associacaoAtiva = useAuthStore((s) => s.associacaoAtiva);
  const assocId = associacaoAtiva?.associacaoId;
  const firstName = perfil?.nome?.split(" ")[0] ?? "usuário";

  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionsResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = async () => {
    if (!assocId) return;
    setLoading(true);
    setError(null);
    try {
      const [ins, sug] = await Promise.all([
        fetchInsights(assocId).catch(() => null),
        fetchSuggestions(assocId).catch(() => null),
      ]);
      if (!ins && !sug) {
        setError("Não foi possível carregar as informações agora. Tente mais tarde.");
      } else {
        setInsights(ins);
        setSuggestions(sug);
      }
    } catch {
      setError("Algo deu errado. Tente novamente em alguns minutos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [assocId]);

  // Filtrar: para o associado, mostrar apenas os mais relevantes
  // Prioridade: críticos e alertas primeiro, máximo de 3 insights
  const importantInsights =
    insights?.insights
      .filter((i) => i.severidade !== "info" || i.categoria === "geral")
      .slice(0, 4) ?? [];

  // Sugestões: prioridade alta e média, máximo de 3
  const topSuggestions =
    suggestions?.sugestoes
      .filter((s) => s.prioridade !== "baixa")
      .slice(0, 3) ?? [];

  // Fallback: se não há nada filtrado mas há dados
  const hasData = importantInsights.length > 0 || topSuggestions.length > 0;
  const allGood =
    !loading && !error && insights && !hasData;

  return (
    <AppLayout navItems={memberNavItems} title="Dicas da Associação">
      <div className="flex justify-center items-start pt-8 pb-4 px-6">
        <div className="max-w-2xl w-full flex flex-col gap-10">
          {/* Header amigável */}
          <section className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Sparkles size={28} className="text-[#E67E22]" />
              <h1 className="font-headline text-3xl lg:text-4xl font-bold text-md-primary">
                {getGreeting()}, {firstName}!
              </h1>
            </div>
            <p className="text-[#414846] text-lg">
              Veja o que está acontecendo na sua associação.
            </p>
          </section>

          {loading ? (
            <LoadingPulse />
          ) : error ? (
            <div className="text-center py-16">
              <AlertTriangle
                size={48}
                className="mx-auto mb-4 text-amber-400"
              />
              <p className="text-[#414846] text-lg mb-6">{error}</p>
              <Button
                variant="outline"
                size="lg"
                onClick={loadAll}
                className="text-base"
              >
                <RefreshCw size={18} className="mr-2" />
                Tentar de novo
              </Button>
            </div>
          ) : allGood ? (
            /* Tudo em dia */
            <div className="text-center py-16 bg-emerald-50 rounded-2xl border border-emerald-200">
              <ThumbsUp
                size={48}
                className="mx-auto mb-4 text-emerald-500"
              />
              <h2 className="text-2xl font-bold text-md-primary mb-2">
                Tudo em dia!
              </h2>
              <p className="text-[#414846] text-lg max-w-md mx-auto">
                A associação está funcionando bem. Continue acompanhando
                seus registros.
              </p>
            </div>
          ) : (
            <>
              {/* Situação da Associação */}
              {importantInsights.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-5">
                    <Lightbulb size={24} className="text-[#E67E22]" />
                    <h2 className="font-headline text-2xl font-bold text-md-primary">
                      Situação da Associação
                    </h2>
                  </div>
                  <div className="space-y-4">
                    {importantInsights.map((i) => (
                      <SimpleInsightCard key={i.id} insight={i} />
                    ))}
                  </div>
                </section>
              )}

              {/* O que você pode fazer */}
              {topSuggestions.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-5">
                    <ArrowRight size={24} className="text-md-primary" />
                    <h2 className="font-headline text-2xl font-bold text-md-primary">
                      O que você pode fazer
                    </h2>
                  </div>
                  <div className="space-y-4">
                    {topSuggestions.map((s) => (
                      <SimpleSuggestionCard key={s.id} suggestion={s} />
                    ))}
                  </div>
                </section>
              )}

              {/* Aviso de apoio */}
              {suggestions?.aviso && (
                <p className="text-center text-sm text-[#656461] italic px-4 pb-4">
                  {suggestions.aviso}
                </p>
              )}
            </>
          )}

          {/* Botão atualizar */}
          {!loading && !error && (
            <div className="text-center pb-6">
              <Button
                variant="ghost"
                onClick={loadAll}
                className="text-[#656461] hover:text-md-primary"
              >
                <RefreshCw size={14} className="mr-2" />
                Atualizar informações
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
