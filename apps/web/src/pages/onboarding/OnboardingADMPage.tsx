import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

function formatarCNPJ(v: string) {
  return v
    .replaceAll(/\D/g, "")
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .slice(0, 18);
}

const schema = z.object({
  nome: z.string().min(3, "Nome muito curto"),
  cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "CNPJ inválido"),
  municipio: z.string().min(2, "Informe o município"),
  estado: z.string().length(2, "Selecione um estado"),
  telefone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

interface FieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

function FormField({ label, error, children }: Readonly<FieldProps>) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-[#414846]">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

const inputClass = "w-full px-4 py-4 rounded-xl border-none bg-[#ebe8e3] focus:outline-none focus:ring-2 focus:ring-[#1a3c34] transition-all placeholder:text-[#414846]/40 text-[#1c1c19]";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface AssociacaoBusca {
  id: string;
  nome: string;
  municipio: string;
  estado: string;
}

// ─── Layout compartilhado ─────────────────────────────────────────────────────

function PageLayout({ children, onBack }: Readonly<{ children: React.ReactNode; onBack: () => void }>) {
  return (
    <main className="min-h-screen bg-[#fcf9f4] text-[#1c1c19] flex flex-col">
      <Toaster />
      <header className="px-8 py-6 flex items-center gap-3 border-b border-[#e5e2dd]">
        <span className="material-symbols-outlined text-[#01261f] text-2xl">park</span>
        <span style={{ fontFamily: "Noto Serif, serif" }} className="text-xl font-bold text-[#01261f]">Espoa</span>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg space-y-8">
          <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-[#414846] hover:text-[#01261f] transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>{" "}
            Voltar
          </button>
          {children}
        </div>
      </div>
    </main>
  );
}

// ─── Tela de escolha ─────────────────────────────────────────────────────────

function EscolhaView({ onEscolher }: Readonly<{ onEscolher: (opcao: "criar" | "entrar") => void }>) {
  const navigate = useNavigate();
  return (
    <PageLayout onBack={() => navigate("/onboarding")}>
      <div className="space-y-3">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1a3c34]">
          <span className="material-symbols-outlined text-[#c5eadf]">admin_panel_settings</span>
        </div>
        <h2 style={{ fontFamily: "Noto Serif, serif" }} className="text-3xl text-[#01261f] font-bold">Área do Administrador</h2>
        <p className="text-[#414846]">Como você quer continuar?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
        <button
          type="button"
          onClick={() => onEscolher("criar")}
          className="text-left p-8 rounded-2xl border-2 border-[#e5e2dd] bg-white hover:border-[#01261f] hover:shadow-lg active:scale-[0.98] transition-all"
        >
          <div className="text-3xl mb-4">🏛️</div>
          <h3 className="text-lg font-bold text-[#01261f] mb-2">Criar associação</h3>
          <p className="text-sm text-[#414846] leading-relaxed">Registre uma nova associação e seja o administrador responsável.</p>
          <div className="mt-5 flex items-center gap-2 text-[#ee8428] font-semibold text-sm">
            <span>Continuar</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onEscolher("entrar")}
          className="text-left p-8 rounded-2xl border-2 border-[#e5e2dd] bg-white hover:border-[#01261f] hover:shadow-lg active:scale-[0.98] transition-all"
        >
          <div className="text-3xl mb-4">🤝</div>
          <h3 className="text-lg font-bold text-[#01261f] mb-2">Entrar em uma existente</h3>
          <p className="text-sm text-[#414846] leading-relaxed">Solicite acesso de administrador a uma associação que já existe no sistema.</p>
          <div className="mt-5 flex items-center gap-2 text-[#ee8428] font-semibold text-sm">
            <span>Continuar</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </div>
        </button>
      </div>
    </PageLayout>
  );
}

// ─── Entrar como ADM em associação existente ──────────────────────────────────

function EntrarView({ onVoltar }: Readonly<{ onVoltar: () => void }>) {
  const [busca, setBusca] = useState("");
  const [opcoes, setOpcoes] = useState<AssociacaoBusca[]>([]);
  const [selecionada, setSelecionada] = useState<AssociacaoBusca | null>(null);
  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const navigate = useNavigate();
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
    if (busca.length < 2) { setOpcoes([]); return; }
    const timeout = setTimeout(async () => {
      try {
        const { data } = await api.get<AssociacaoBusca[]>(`/associacoes?q=${busca}`);
        setOpcoes(data);
      } catch { /* silencioso */ }
    }, 300);
    return () => clearTimeout(timeout);
  }, [busca]);

  async function solicitar() {
    if (!selecionada) return;
    setEnviando(true);
    try {
      await api.post(`/associacoes/${selecionada.id}/solicitar-vinculo`, { role: "adm" });
      const me = await api.get("/auth/me");
      setPerfil(me.data.usuario, me.data.vinculos);
      setSucesso(true);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Erro ao solicitar acesso");
    } finally {
      setEnviando(false);
    }
  }

  if (sucesso) {
    return (
      <PageLayout onBack={onVoltar}>
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#1a3c34]">
            <span className="material-symbols-outlined text-[#c5eadf] text-3xl">check_circle</span>
          </div>
          <div>
            <h2 style={{ fontFamily: "Noto Serif, serif" }} className="text-3xl text-[#01261f] font-bold mb-2">Solicitação enviada!</h2>
            <p className="text-[#414846] leading-relaxed">
              Sua solicitação de acesso como administrador em <strong>{selecionada?.nome}</strong> foi enviada. Você será notificado quando for aprovado.
            </p>
          </div>
          <button type="button" onClick={() => navigate("/solicitacoes")} className="w-full py-4 bg-[#ee8428] text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2">
            <span>Ver minhas solicitações</span>
            <span className="material-symbols-outlined text-xl">arrow_forward</span>
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout onBack={onVoltar}>
      <div className="space-y-3">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1a3c34]">
          <span className="material-symbols-outlined text-[#c5eadf]">manage_search</span>
        </div>
        <h2 style={{ fontFamily: "Noto Serif, serif" }} className="text-3xl text-[#01261f] font-bold">Entrar como administrador</h2>
        <p className="text-[#414846]">Busque a associação e solicite acesso de administrador.</p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-2" ref={dropdownRef}>
          <label htmlFor="busca-adm" className="text-xs font-semibold uppercase tracking-wider text-[#414846]">Buscar associação</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#414846]/60 text-[20px]">search</span>
            <input
              id="busca-adm"
              type="text"
              placeholder="Nome ou município..."
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setAberto(true); setSelecionada(null); }}
              onFocus={() => setAberto(true)}
              className="w-full pl-12 pr-4 py-4 rounded-xl border-none bg-[#ebe8e3] focus:outline-none focus:ring-2 focus:ring-[#1a3c34] transition-all placeholder:text-[#414846]/40 text-[#1c1c19]"
            />
          </div>
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
        </div>

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
          <span>{enviando ? "Enviando..." : "Solicitar acesso de administrador"}</span>
          {!enviando && <span className="material-symbols-outlined text-xl">arrow_forward</span>}
        </button>
      </div>
    </PageLayout>
  );
}

// ─── Criar associação ─────────────────────────────────────────────────────────

function CriarView({ onVoltar }: Readonly<{ onVoltar: () => void }>) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();
  const setPerfil = useAuthStore((s) => s.setPerfil);

  async function onSubmit(data: FormData) {
    setEnviando(true);
    try {
      await api.post("/associacoes", data);
      const me = await api.get("/auth/me");
      setPerfil(me.data.usuario, me.data.vinculos);
      navigate("/app");
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Erro ao criar associação");
    } finally {
      setEnviando(false);
    }
  }

  const cnpjValue = watch("cnpj") ?? "";
  const estadoValue = watch("estado") ?? "";

  return (
    <PageLayout onBack={onVoltar}>
      <div className="space-y-3">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1a3c34]">
          <span className="material-symbols-outlined text-[#c5eadf]">domain_add</span>
        </div>
        <h2 style={{ fontFamily: "Noto Serif, serif" }} className="text-3xl text-[#01261f] font-bold">Criar minha associação</h2>
        <p className="text-[#414846]">Preencha os dados da sua associação. Você será o administrador responsável.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormField label="Nome da associação *" error={errors.nome?.message}>
          <input {...register("nome")} placeholder="Associação dos Produtores de..." className={inputClass} />
        </FormField>

        <FormField label="CNPJ *" error={errors.cnpj?.message}>
          <input
            value={cnpjValue}
            onChange={(e) => setValue("cnpj", formatarCNPJ(e.target.value))}
            placeholder="00.000.000/0000-00"
            maxLength={18}
            className={inputClass}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FormField label="Município *" error={errors.municipio?.message}>
            <input {...register("municipio")} placeholder="Ex: Petrolina" className={inputClass} />
          </FormField>

          <FormField label="Estado *" error={errors.estado?.message}>
            <select
              value={estadoValue}
              onChange={(e) => setValue("estado", e.target.value)}
              className={`${inputClass} appearance-none cursor-pointer`}
            >
              <option value="">UF</option>
              {ESTADOS_BR.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="Telefone de contato">
          <input {...register("telefone")} placeholder="(00) 00000-0000" className={inputClass} />
        </FormField>

        <FormField label="Email institucional" error={errors.email?.message}>
          <input {...register("email")} type="email" placeholder="associacao@email.com" className={inputClass} />
        </FormField>

        <div className="pt-2">
          <button
            type="submit"
            disabled={enviando}
            className="w-full py-4 bg-[#ee8428] text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <span>{enviando ? "Criando..." : "Criar associação"}</span>
            {!enviando && <span className="material-symbols-outlined text-xl">arrow_forward</span>}
          </button>
        </div>
      </form>
    </PageLayout>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function OnboardingADMPage() {
  const [opcao, setOpcao] = useState<"escolha" | "criar" | "entrar">("escolha");

  if (opcao === "criar") return <CriarView onVoltar={() => setOpcao("escolha")} />;
  if (opcao === "entrar") return <EntrarView onVoltar={() => setOpcao("escolha")} />;
  return <EscolhaView onEscolher={setOpcao} />;
}

