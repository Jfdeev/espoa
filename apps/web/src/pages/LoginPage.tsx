import { useState } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { resolverDestino } from "@/lib/utils";

type Modo = "login" | "cadastro" | "recuperar";

// ─── Layout compartilhado ─────────────────────────────────────────────────────

function LeftPanel() {
  return (
    <section className="hidden lg:flex w-1/2 relative overflow-hidden bg-[#01261f]">
      <img
        alt="Paisagem rural"
        className="absolute inset-0 w-full h-full object-cover opacity-80"
        src="https://lh3.googleusercontent.com/aida-public/AB6AXuAYi6UyDdUb2KRVBV8Fze6bcC7xO3Pu6Shu9LyrDA0LSGtYSCMscp46MF6ptiTk3OkUpvn-mvwtHKZxyIVHZRRkbphplIknRubP0dJOyJnrNfYoyI80ze83tUf6SDcVRhxWRhth0ywgVCsaRftTZ64kvPsCvCrFsagf5Hz653EeyRbTszpI7Mj3PQuMqEhzBxBuoGhuFKnhr2CkNzYFrAHN8Pxikonlg0E9rfW4EF1Xv3rmdIerhIqf-TjI3hxK6jNG0m01rjPBIHWY"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#01261f]/80 to-transparent" />
      <div className="relative z-10 flex flex-col justify-between p-16 w-full h-full text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-3xl">park</span>
            <span style={{ fontFamily: "Noto Serif, serif" }} className="text-2xl font-bold tracking-tight">Espoa</span>
          </div>
          <Link to="/" className="flex items-center gap-1 text-sm text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors font-medium">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>{" "}
            Voltar ao site
          </Link>
        </div>
        <div className="max-w-md">
          <h1 style={{ fontFamily: "Noto Serif, serif" }} className="text-5xl leading-tight mb-6">
            Cultivando o futuro da nossa comunidade rural.
          </h1>
          <p className="text-lg text-[#c5eadf] opacity-90 leading-relaxed">
            Junte-se à Espoa para gerenciar sua propriedade com a tradição do campo e a tecnologia de hoje.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-px bg-[#c5eadf]/30" />
          <span className="text-xs uppercase tracking-[0.2em] text-[#c5eadf]/60">
            Associação Rural Espoa
          </span>
        </div>
      </div>
    </section>
  );
}

function MobileLogo() {
  return (
    <div className="lg:hidden flex items-center justify-between mb-8">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[#01261f]">park</span>
        <span style={{ fontFamily: "Noto Serif, serif" }} className="text-xl font-bold text-[#01261f]">Espoa</span>
      </div>
      <Link to="/" className="flex items-center gap-1 text-sm text-[#01261f] bg-[#ebe8e3] hover:bg-[#dedad4] px-3 py-1.5 rounded-lg transition-colors font-medium">
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>{" "}
        Voltar ao site
      </Link>
    </div>
  );
}

function PageFooter({ modo, setModo }: Readonly<{ modo: Modo; setModo: (m: Modo) => void }>) {
  return (
    <footer className="mt-12 flex flex-col items-center gap-4">
      {modo === "login" && (
        <p className="text-[#414846]">
          Não tem conta?{" "}
          <button type="button" onClick={() => setModo("cadastro")} className="text-[#01261f] font-bold hover:underline">
            Criar conta
          </button>
        </p>
      )}
      {(modo === "cadastro" || modo === "recuperar") && (
        <p className="text-[#414846]">
          Já possui uma conta?{" "}
          <button type="button" onClick={() => setModo("login")} className="text-[#01261f] font-bold hover:underline">
            Entrar
          </button>
        </p>
      )}
      <div className="w-full h-px bg-[#e5e2dd]" />
      <div className="flex flex-wrap justify-center gap-6">
        {["Privacidade", "Termos", "Suporte"].map((l) => (
          <a key={l} href={`/${l.toLowerCase()}`} className="text-[10px] uppercase tracking-widest text-[#414846]/60 hover:text-[#01261f] transition-colors">{l}</a>
        ))}
      </div>
      <p className="text-[10px] uppercase tracking-widest text-[#414846]/40 mt-2">© 2025 Espoa Associação Rural</p>
    </footer>
  );
}

// ─── Input estilizado ─────────────────────────────────────────────────────────

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: string;
}

function Field({ label, icon, id, ...props }: Readonly<FieldProps>) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-[#414846]">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#414846]/60 text-[20px]">
            {icon}
          </span>
        )}
        <input
          id={id}
          className={`w-full py-4 rounded-xl border-none bg-[#ebe8e3] focus:outline-none focus:ring-2 focus:ring-[#1a3c34] transition-all placeholder:text-[#414846]/40 text-[#1c1c19] ${icon ? "pl-12 pr-4" : "px-4"}`}
          {...props}
        />
      </div>
    </div>
  );
}

function SubmitButton({ loading, label }: Readonly<{ loading: boolean; label: string }>) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-4 px-8 bg-[#ee8428] text-white font-bold rounded-xl shadow-lg hover:opacity-90 active:scale-[0.98] transition-all flex justify-center items-center gap-3 disabled:opacity-60"
    >
      <span>{loading ? "Aguarde..." : label}</span>
      {!loading && <span className="material-symbols-outlined text-xl">arrow_forward</span>}
    </button>
  );
}

// ─── Formulário de Login ──────────────────────────────────────────────────────

function LoginForm({ setModo }: Readonly<{ setModo: (m: Modo) => void }>) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    try {
      const { data } = await api.post("/auth/login", { email, password: senha });
      const me = await api.get("/auth/me", { headers: { Authorization: `Bearer ${data.token}` } });
      setAuth(data.token, me.data.usuario, me.data.vinculos);
      navigate(resolverDestino(me.data.vinculos));
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Credenciais inválidas");
    } finally {
      setCarregando(false);
    }
  }

  const handleGoogle = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return;
    setCarregando(true);
    try {
      const { data } = await api.post("/auth/google", { idToken: credentialResponse.credential });
      const me = await api.get("/auth/me", { headers: { Authorization: `Bearer ${data.token}` } });
      setAuth(data.token, me.data.usuario, me.data.vinculos);
      navigate(resolverDestino(me.data.vinculos));
    } catch {
      toast.error("Erro ao fazer login com Google");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <>
      <header className="mb-12">
        <MobileLogo />
        <h2 style={{ fontFamily: "Noto Serif, serif" }} className="text-4xl text-[#01261f] mb-2">Entrar</h2>
        <p className="text-[#414846]">Bem-vindo de volta. Acesse sua conta.</p>
      </header>
      <form onSubmit={handleSubmit} className="space-y-6 flex-grow">
        <Field label="Email" id="email" type="email" icon="mail" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <Field label="Senha" id="senha" type="password" icon="lock" placeholder="••••••••" value={senha} onChange={(e) => setSenha(e.target.value)} required autoComplete="current-password" />
        <div className="flex justify-end">
          <button type="button" onClick={() => setModo("recuperar")} className="text-sm text-[#01261f] hover:underline font-medium">
            Esqueci minha senha
          </button>
        </div>
        <SubmitButton loading={carregando} label="Entrar" />
        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-[#c1c8c4]" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#fcf9f4] px-3 text-[#414846]/60">ou</span>
          </div>
        </div>
        <div className="flex justify-center">
          <GoogleLogin onSuccess={handleGoogle} onError={() => toast.error("Login com Google cancelado")} useOneTap={false} />
        </div>
      </form>
    </>
  );
}

// ─── Formulário de Cadastro ───────────────────────────────────────────────────

function CadastroForm() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [aceito, setAceito] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (senha !== confirmar) { toast.error("As senhas não coincidem"); return; }
    if (!aceito) { toast.error("Aceite os Termos de Uso para continuar"); return; }
    setCarregando(true);
    try {
      const { data } = await api.post("/auth/register", { nome, email, password: senha });
      const me = await api.get("/auth/me", { headers: { Authorization: `Bearer ${data.token}` } });
      setAuth(data.token, me.data.usuario, me.data.vinculos);
      navigate(resolverDestino(me.data.vinculos));
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Erro ao criar conta");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <header className="mb-12">
        <MobileLogo />
        <h2 style={{ fontFamily: "Noto Serif, serif" }} className="text-4xl text-[#01261f] mb-2">Criar conta</h2>
        <p className="text-[#414846]">Preencha os dados abaixo para iniciar sua jornada.</p>
      </header>
      <form onSubmit={handleSubmit} className="space-y-6 flex-grow">
        <Field label="Nome" id="nome" type="text" placeholder="Seu nome completo" value={nome} onChange={(e) => setNome(e.target.value)} required autoComplete="name" />
        <Field label="Email" id="email" type="email" icon="mail" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Senha" id="senha" type="password" placeholder="••••••••" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={8} autoComplete="new-password" />
          <Field label="Confirmação de Senha" id="confirmar_senha" type="password" placeholder="••••••••" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required autoComplete="new-password" />
        </div>
        <div className="flex items-start gap-3 pt-2">
          <input type="checkbox" id="terms" checked={aceito} onChange={(e) => setAceito(e.target.checked)} className="mt-1 w-5 h-5 rounded accent-[#ee8428]" />
          <label htmlFor="terms" className="text-sm text-[#414846] leading-relaxed">
            Eu li e concordo com os{" "}
            <a href="/termos" className="text-[#01261f] font-semibold hover:underline">Termos de Uso</a>
            {" "}e a{" "}
            <a href="/privacidade" className="text-[#01261f] font-semibold hover:underline">Política de Privacidade</a>
            {" "}da Espoa.
          </label>
        </div>
        <div className="pt-2">
          <SubmitButton loading={carregando} label="Criar Conta" />
        </div>
      </form>
    </>
  );
}

// ─── Formulário de Recuperação ────────────────────────────────────────────────

function RecuperarForm({ setModo }: Readonly<{ setModo: (m: Modo) => void }>) {
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    try {
      await api.post("/auth/forgot-password", { email });
      toast.success("Se o e-mail estiver cadastrado, você receberá as instruções!");
      setModo("login");
    } catch {
      toast.error("Erro ao enviar e-mail de recuperação");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <header className="mb-12">
        <MobileLogo />
        <h2 style={{ fontFamily: "Noto Serif, serif" }} className="text-4xl text-[#01261f] mb-2">Recuperar senha</h2>
        <p className="text-[#414846]">Informe seu e-mail e enviaremos as instruções para redefinir sua senha.</p>
      </header>
      <form onSubmit={handleSubmit} className="space-y-6 flex-grow">
        <Field label="Email" id="email-rec" type="email" icon="mail" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <SubmitButton loading={carregando} label="Enviar instruções" />
      </form>
    </>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function LoginPage() {
  const [modo, setModo] = useState<Modo>("login");
  const token = useAuthStore((s) => s.token);
  const vinculos = useAuthStore((s) => s.vinculos);

  if (token) {
    return <Navigate to={resolverDestino(vinculos)} replace />;
  }

  return (
    <main className="flex min-h-screen bg-[#fcf9f4] text-[#1c1c19]">
      <Toaster />
      <LeftPanel />
      <section className="w-full lg:w-1/2 flex flex-col bg-[#fcf9f4] overflow-y-auto">
        <div className="max-w-xl mx-auto w-full px-8 py-12 flex flex-col min-h-full">
          {modo === "login" && <LoginForm setModo={setModo} />}
          {modo === "cadastro" && <CadastroForm />}
          {modo === "recuperar" && <RecuperarForm setModo={setModo} />}
          <PageFooter modo={modo} setModo={setModo} />
        </div>
      </section>
    </main>
  );
}
