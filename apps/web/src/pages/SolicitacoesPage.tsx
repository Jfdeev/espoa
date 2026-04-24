import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";
import { Toaster } from "@/components/ui/sonner";
import type { UsuarioVinculo } from "@/types/auth";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  UsuarioVinculo["status"],
  { label: string; bg: string; text: string; icon: string }
> = {
  ativo: { label: "Ativo", bg: "bg-[#d4f0e6]", text: "text-[#01261f]", icon: "check_circle" },
  pendente: { label: "Pendente", bg: "bg-[#fff4e0]", text: "text-[#a05800]", icon: "schedule" },
  rejeitado: { label: "Rejeitado", bg: "bg-[#fde8e8]", text: "text-[#c00000]", icon: "cancel" },
  inativo: { label: "Inativo", bg: "bg-[#f0ede8]", text: "text-[#414846]", icon: "pause_circle" },
};

// ─── Card de vínculo ──────────────────────────────────────────────────────────

function VinculoCard({ v }: { v: UsuarioVinculo }) {
  const navigate = useNavigate();
  const cfg = STATUS_CONFIG[v.status];

  return (
    <div
      className={`rounded-2xl border-2 ${
        v.status === "ativo" ? "border-[#1a3c34]" : "border-[#e5e2dd]"
      } bg-white p-6 flex flex-col gap-4`}
    >
      {/* Header do card */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#f0f7f5] flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[#01261f] text-[20px]">domain</span>
          </div>
          <div>
            <p className="font-bold text-[#1c1c19]">{v.associacaoNome}</p>
            <p className="text-sm text-[#414846]/70">
              {v.associacaoMunicipio} — {v.associacaoEstado}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${cfg.bg} ${cfg.text}`}
        >
          <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>
          {cfg.label}
        </span>
      </div>

      {/* Papel */}
      <div className="flex items-center gap-2 text-sm text-[#414846]">
        <span className="material-symbols-outlined text-[16px]">badge</span>
        <span>
          Papel solicitado:{" "}
          <strong>{v.role === "adm" ? "Administrador" : "Associado"}</strong>
        </span>
      </div>

      {/* Ações */}
      {v.status === "ativo" && (
        <button
          type="button"
          onClick={() => navigate("/app")}
          className="w-full py-3 bg-[#ee8428] text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 text-sm"
        >
          <span>Entrar no app</span>
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      )}
      {v.status === "pendente" && (
        <div className="flex items-start gap-3 bg-[#fff9f0] rounded-xl px-4 py-3 text-sm text-[#a05800]">
          <span className="material-symbols-outlined text-[18px] flex-shrink-0 mt-0.5">info</span>
          <span>Aguardando aprovação do administrador. Você receberá acesso assim que a solicitação for aprovada.</span>
        </div>
      )}
      {v.status === "rejeitado" && (
        <button
          type="button"
          onClick={() => navigate("/onboarding")}
          className="w-full py-3 border-2 border-[#e5e2dd] text-[#414846] font-semibold rounded-xl hover:bg-[#f0ede8] transition-all flex items-center justify-center gap-2 text-sm"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          <span>Tentar outra associação</span>
        </button>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function SolicitacoesPage() {
  const { perfil, vinculos, limpar } = useAuthStore();
  const navigate = useNavigate();

  const primeiroNome = perfil?.nome?.split(" ")[0] ?? "usuário";
  const pendentes = vinculos.filter((v) => v.status === "pendente");
  const temAtivo = vinculos.some((v) => v.status === "ativo");

  function sair() {
    limpar();
    navigate("/login");
  }

  return (
    <main className="min-h-screen bg-[#fcf9f4] text-[#1c1c19] flex flex-col">
      <Toaster />

      {/* Header */}
      <header className="px-8 py-6 flex items-center justify-between border-b border-[#e5e2dd]">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#01261f] text-2xl">park</span>
          <span style={{ fontFamily: "Noto Serif, serif" }} className="text-xl font-bold text-[#01261f]">
            Espoa
          </span>
        </div>
        <button
          type="button"
          onClick={sair}
          className="text-sm text-[#414846] hover:text-[#01261f] flex items-center gap-1 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Sair
        </button>
      </header>

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col items-center px-6 py-12">
        <div className="w-full max-w-lg space-y-8">

          {/* Hero */}
          <div className="space-y-2">
            <p className="text-sm text-[#414846]">Olá, {primeiroNome} 👋</p>
            <h1
              style={{ fontFamily: "Noto Serif, serif" }}
              className="text-3xl text-[#01261f] font-bold"
            >
              Suas solicitações
            </h1>
            {temAtivo ? (
              <p className="text-[#414846] leading-relaxed">
                Você já tem acesso ativo a uma associação.
              </p>
            ) : pendentes.length > 0 ? (
              <p className="text-[#414846] leading-relaxed">
                {pendentes.length === 1
                  ? "Sua solicitação está sendo analisada. Você receberá acesso assim que um administrador aprovar."
                  : `Você tem ${pendentes.length} solicitações em análise. Você receberá acesso assim que um administrador aprovar.`}
              </p>
            ) : (
              <p className="text-[#414846] leading-relaxed">
                Nenhuma solicitação pendente. Solicite acesso a uma associação abaixo.
              </p>
            )}
          </div>

          {/* Cards */}
          {vinculos.length > 0 && (
            <div className="space-y-4">
              {vinculos.map((v) => (
                <VinculoCard key={v.associacaoId} v={v} />
              ))}
            </div>
          )}

          {/* Adicionar outra */}
          <button
            type="button"
            onClick={() => navigate("/onboarding")}
            className="w-full py-4 border-2 border-dashed border-[#c1c8c4] rounded-2xl text-[#414846] hover:border-[#01261f] hover:text-[#01261f] transition-all flex items-center justify-center gap-2 font-semibold"
          >
            <span className="material-symbols-outlined">add</span>
            Solicitar acesso a outra associação
          </button>
        </div>
      </div>
    </main>
  );
}
