import { useEffect, useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

interface ResumoResponse {
  resumo: string;
  cached: boolean;
}

const STORAGE_KEY = "espoa-resumo-mes-cache";

interface StoredResumo {
  associacaoId: string;
  mes: string;
  resumo: string;
  generatedAt: string;
}

function currentMes(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function loadStored(associacaoId: string): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredResumo;
    if (
      parsed.associacaoId === associacaoId &&
      parsed.mes === currentMes()
    ) {
      return parsed.resumo;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function saveStored(associacaoId: string, resumo: string): void {
  try {
    const stored: StoredResumo = {
      associacaoId,
      mes: currentMes(),
      resumo,
      generatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    /* ignore */
  }
}

export function ResumoMesCard() {
  const associacaoAtiva = useAuthStore((s) => s.associacaoAtiva);
  const [resumo, setResumo] = useState<string | null>(() =>
    associacaoAtiva ? loadStored(associacaoAtiva.associacaoId) : null,
  );
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [silenciado, setSilenciado] = useState(false);

  const buscar = async (force = false) => {
    if (!associacaoAtiva) return;
    if (!force && resumo) return; // já tem cache local
    setLoading(true);
    setErro(null);
    try {
      const { data } = await api.get<ResumoResponse>("/me/resumo-mes", {
        params: { associacao_id: associacaoAtiva.associacaoId },
      });
      setResumo(data.resumo);
      saveStored(associacaoAtiva.associacaoId, data.resumo);
    } catch (err) {
      const code = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      if (code === "ia_nao_configurada") {
        // Sem IA configurada: esconde o card silenciosamente
        setSilenciado(true);
      } else if (code === "geracao_falhou") {
        setErro("Não foi possível gerar seu resumo agora.");
      } else if (code !== "acesso_negado_membro") {
        setErro("Erro ao carregar resumo.");
      } else {
        setSilenciado(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!associacaoAtiva) return;
    if (resumo) return;
    buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [associacaoAtiva?.associacaoId]);

  if (silenciado) return null;
  if (!associacaoAtiva) return null;
  if (!resumo && !loading && !erro) return null;

  return (
    <section className="rounded-xl bg-gradient-to-br from-[#1A3C34] to-[#01261f] text-white p-6 lg:p-8 shadow-lg">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
          <Sparkles size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-headline text-lg font-bold">
            Seu mês na associação
          </h2>
          <p className="text-xs text-white/60">
            Resumo personalizado gerado por IA
          </p>
        </div>
        {resumo && (
          <button
            type="button"
            onClick={() => buscar(true)}
            disabled={loading}
            className="p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
            title="Atualizar resumo"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        )}
      </div>

      {loading && !resumo && (
        <p className="text-sm text-white/80 italic">
          Gerando seu resumo personalizado...
        </p>
      )}

      {erro && (
        <p className="text-sm text-amber-200">{erro}</p>
      )}

      {resumo && (
        <p className="text-sm leading-relaxed text-white/95 whitespace-pre-wrap">
          {resumo}
        </p>
      )}
    </section>
  );
}
