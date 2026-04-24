import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

interface AssocacaoBusca {
  id: string;
  nome: string;
  municipio: string;
  estado: string;
}

function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#fcf9f4] text-[#1c1c19] flex flex-col">
      <Toaster />
      <header className="px-8 py-6 flex items-center gap-3 border-b border-[#e5e2dd]">
        <span className="material-symbols-outlined text-[#01261f] text-2xl">park</span>
        <span style={{ fontFamily: "Noto Serif, serif" }} className="text-xl font-bold text-[#01261f]">Espoa</span>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg">{children}</div>
      </div>
    </main>
  );
}

export default function OnboardingAssociadoPage() {
  const [busca, setBusca] = useState("");
  const [opcoes, setOpcoes] = useState<AssocacaoBusca[]>([]);
  const [selecionada, setSelecionada] = useState<AssocacaoBusca | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [aberto, setAberto] = useState(false);
  const navigate = useNavigate();
  const vinculos = useAuthStore((s) => s.vinculos);
  const setPerfil = useAuthStore((s) => s.setPerfil);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (busca.length < 2) {
      setOpcoes([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const { data } = await api.get<AssocacaoBusca[]>(`/associacoes?q=${busca}`);
        setOpcoes(data);
      } catch {
        // silencioso
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [busca]);

  async function solicitar() {
    if (!selecionada) return;
    setEnviando(true);
    try {
      await api.post(`/associacoes/${selecionada.id}/solicitar-vinculo`);
      const me = await api.get("/auth/me");
      setPerfil(me.data.usuario, me.data.vinculos);
      setSucesso(true);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Erro ao solicitar vínculo");
    } finally {
      setEnviando(false);
    }
  }

  if (sucesso) {
    return (
      <OnboardingLayout>
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#1a3c34]">
            <span className="material-symbols-outlined text-[#c5eadf] text-3xl">check_circle</span>
          </div>
          <div>
            <h2 style={{ fontFamily: "Noto Serif, serif" }} className="text-3xl text-[#01261f] font-bold mb-2">Solicitação enviada!</h2>
            <p className="text-[#414846] leading-relaxed">
              Sua solicitação foi enviada para <strong>{selecionada?.nome}</strong>.
              Você será notificado quando o administrador aprovar seu acesso.
            </p>
          </div>
          <p className="text-sm text-[#414846]/60">Enquanto isso, você já pode explorar o app com acesso limitado.</p>
          <button type="button" onClick={() => navigate("/solicitacoes")} className="w-full py-4 bg-[#ee8428] text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2">
            <span>Ir para o app</span>
            <span className="material-symbols-outlined text-xl">arrow_forward</span>
          </button>
        </div>
      </OnboardingLayout>
    );
  }

  const vinculosAtivos = vinculos.filter((v) => v.status === "ativo");

  return (
    <OnboardingLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-3">
          <button type="button" onClick={() => navigate("/onboarding")} className="flex items-center gap-1 text-sm text-[#414846] hover:text-[#01261f] transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Voltar
          </button>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1a3c34]">
            <span className="material-symbols-outlined text-[#c5eadf]">search</span>
          </div>
          <h2 style={{ fontFamily: "Noto Serif, serif" }} className="text-3xl text-[#01261f] font-bold">Encontrar minha associação</h2>
          <p className="text-[#414846]">Busque pelo nome da sua associação ou município e solicite o vínculo.</p>
        </div>

        {/* Search */}
        <div className="space-y-4">
          <div className="flex flex-col gap-2" ref={dropdownRef}>
            <label htmlFor="busca" className="text-xs font-semibold uppercase tracking-wider text-[#414846]">Buscar associação</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#414846]/60 text-[20px]">search</span>
              <input
                id="busca"
                type="text"
                placeholder="Nome ou município..."
                value={busca}
                onChange={(e) => { setBusca(e.target.value); setAberto(true); setSelecionada(null); }}
                onFocus={() => setAberto(true)}
                className="w-full pl-12 pr-4 py-4 rounded-xl border-none bg-[#ebe8e3] focus:outline-none focus:ring-2 focus:ring-[#1a3c34] transition-all placeholder:text-[#414846]/40 text-[#1c1c19]"
              />
            </div>
          </div>

          {/* Dropdown */}
          {aberto && opcoes.length > 0 && !selecionada && (
            <div className="rounded-xl border border-[#e5e2dd] bg-white shadow-lg overflow-hidden">
              {opcoes.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => { setSelecionada(a); setBusca(`${a.nome} — ${a.municipio}/${a.estado}`); setAberto(false); }}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[#f0ede8] transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-[#01261f] text-[20px] mt-0.5">location_on</span>
                  <div>
                    <p className="font-semibold text-[#1c1c19]">{a.nome}</p>
                    <p className="text-sm text-[#414846]/60">{a.municipio} / {a.estado}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {aberto && busca.length >= 2 && opcoes.length === 0 && (
            <p className="text-sm text-center text-[#414846]/60 py-4">Nenhuma associação encontrada.</p>
          )}

          {/* Selected */}
          {selecionada && (
            <div className="rounded-xl border-2 border-[#1a3c34] bg-[#f0f7f5] px-5 py-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-[#01261f]">domain</span>
              <div className="flex-1">
                <p className="font-semibold text-[#1c1c19]">{selecionada.nome}</p>
                <p className="text-sm text-[#414846]/70">{selecionada.municipio} — {selecionada.estado}</p>
              </div>
              <button type="button" onClick={() => { setSelecionada(null); setBusca(""); }} className="text-[#414846]/40 hover:text-[#414846]">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={solicitar}
            disabled={!selecionada || enviando}
            className="w-full py-4 bg-[#ee8428] text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <span>{enviando ? "Enviando..." : "Solicitar vínculo"}</span>
            {!enviando && <span className="material-symbols-outlined text-xl">arrow_forward</span>}
          </button>

          {vinculosAtivos.length > 0 && (
            <button type="button" onClick={() => navigate("/app")} className="w-full py-4 border border-[#c1c8c4] rounded-xl text-[#01261f] font-semibold hover:bg-[#f0ede8] transition-all">
              Já tenho vínculo ativo — ir para o app
            </button>
          )}
        </div>
      </div>
    </OnboardingLayout>
  );
}
