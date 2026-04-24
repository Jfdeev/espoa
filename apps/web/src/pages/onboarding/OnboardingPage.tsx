import { useState } from "react";
import { useNavigate } from "react-router-dom";

type Papel = "associado" | "adm" | null;

export default function OnboardingPage() {
  const [papel, setPapel] = useState<Papel>(null);
  const navigate = useNavigate();

  function selecionar(p: Papel) {
    setPapel(p);
    if (p === "associado") navigate("/onboarding/associado");
    if (p === "adm") navigate("/onboarding/adm");
  }

  return (
    <main className="min-h-screen bg-[#fcf9f4] text-[#1c1c19] flex flex-col">
      {/* Header */}
      <header className="px-8 py-6 flex items-center gap-3 border-b border-[#e5e2dd]">
        <span className="material-symbols-outlined text-[#01261f] text-2xl">park</span>
        <span style={{ fontFamily: "Noto Serif, serif" }} className="text-xl font-bold text-[#01261f]">Espoa</span>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl space-y-10">
          {/* Title */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#1a3c34] mb-2">
              <span className="material-symbols-outlined text-[#c5eadf] text-2xl">waving_hand</span>
            </div>
            <h1 style={{ fontFamily: "Noto Serif, serif" }} className="text-3xl font-bold text-[#01261f]">
              Bem-vindo ao Espoa!
            </h1>
            <p className="text-[#414846] text-lg">Como você vai usar o sistema?</p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Associado */}
            <button
              type="button"
              onClick={() => selecionar("associado")}
              className={`text-left p-8 rounded-2xl border-2 transition-all hover:shadow-lg hover:border-[#01261f] active:scale-[0.98] ${
                papel === "associado" ? "border-[#01261f] bg-[#f0ede8]" : "border-[#e5e2dd] bg-white"
              }`}
            >
              <div className="text-4xl mb-4">🧑‍🌾</div>
              <h2 className="text-xl font-bold text-[#01261f] mb-2">Sou Associado</h2>
              <p className="text-sm text-[#414846] leading-relaxed">
                Quero me vincular a uma associação e acompanhar meus dados de produção e mensalidades.
              </p>
              <div className="mt-6 flex items-center gap-2 text-[#ee8428] font-semibold text-sm">
                <span>Continuar</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </div>
            </button>

            {/* Administrador */}
            <button
              type="button"
              onClick={() => selecionar("adm")}
              className={`text-left p-8 rounded-2xl border-2 transition-all hover:shadow-lg hover:border-[#01261f] active:scale-[0.98] ${
                papel === "adm" ? "border-[#01261f] bg-[#f0ede8]" : "border-[#e5e2dd] bg-white"
              }`}
            >
              <div className="text-4xl mb-4">🏛️</div>
              <h2 className="text-xl font-bold text-[#01261f] mb-2">Sou Administrador</h2>
              <p className="text-sm text-[#414846] leading-relaxed">
                Quero criar e gerenciar uma associação — membros, finanças, produção e PNAE.
              </p>
              <div className="mt-6 flex items-center gap-2 text-[#ee8428] font-semibold text-sm">
                <span>Continuar</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </div>
            </button>
          </div>

          <p className="text-center text-xs text-[#414846]/60">
            Você pode estar vinculado a mais de uma associação com diferentes papéis.
          </p>
        </div>
      </div>
    </main>
  );
}
