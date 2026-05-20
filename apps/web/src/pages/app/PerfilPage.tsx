import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { User, Mail, Phone, IdCard, Save, CheckCircle2 } from "lucide-react";
import AppLayout from "./AppLayout";
import { adminNavItems, memberNavItems } from "./nav-items";
import { useAuthStore } from "@/store/auth.store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export default function PerfilPage() {
  const perfil = useAuthStore((s) => s.perfil);
  const vinculos = useAuthStore((s) => s.vinculos);
  const associacaoAtiva = useAuthStore((s) => s.associacaoAtiva);
  const setPerfil = useAuthStore((s) => s.setPerfil);

  const [nome, setNome] = useState(perfil?.nome ?? "");
  const [telefone, setTelefone] = useState(formatPhone(perfil?.telefone ?? ""));
  const [cpf, setCpf] = useState(formatCpf(perfil?.cpf ?? ""));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  if (!perfil) {
    return <Navigate to="/login" replace />;
  }

  const navItems =
    associacaoAtiva?.role === "adm" ? adminNavItems : memberNavItems;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null);
    setSucesso(false);
    setSalvando(true);
    try {
      const { data } = await api.patch<{
        usuario: typeof perfil;
      }>("/auth/profile", {
        nome: nome.trim(),
        telefone: telefone.trim(),
        cpf: cpf.trim(),
      });
      setPerfil(data.usuario, vinculos);
      setSucesso(true);
      setTimeout(() => setSucesso(false), 3000);
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      const message =
        e?.response?.data?.error ??
        e?.message ??
        "Não foi possível atualizar seu perfil.";
      setErro(String(message));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <AppLayout navItems={navItems} title="Meu Perfil">
      <div className="flex justify-center items-start pt-8 pb-12 px-6">
        <div className="max-w-2xl w-full flex flex-col gap-8">
          <header>
            <h1 className="font-headline text-3xl lg:text-4xl font-bold text-[#01261f]">
              Meu Perfil
            </h1>
            <p className="text-[#414846] mt-2">
              Mantenha seus dados sempre atualizados.
            </p>
          </header>

          <section className="rounded-xl bg-white border border-[#c1c8c4]/30 p-8">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#c1c8c4]/30">
              <div className="w-16 h-16 rounded-full bg-[#ebe8e3] flex items-center justify-center overflow-hidden">
                {perfil.avatarUrl ? (
                  <img
                    src={perfil.avatarUrl}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={32} className="text-[#1A3C34]/60" />
                )}
              </div>
              <div>
                <p className="font-headline text-lg font-bold text-[#01261f]">
                  {perfil.nome || "Sem nome"}
                </p>
                <p className="text-sm text-[#414846] flex items-center gap-2">
                  <Mail size={14} /> {perfil.email}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label
                  htmlFor="nome"
                  className="text-sm font-label text-[#01261f] mb-1 block"
                >
                  Nome completo
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#414846]/60"
                  />
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="telefone"
                  className="text-sm font-label text-[#01261f] mb-1 block"
                >
                  Telefone
                </label>
                <div className="relative">
                  <Phone
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#414846]/60"
                  />
                  <Input
                    id="telefone"
                    value={telefone}
                    onChange={(e) => setTelefone(formatPhone(e.target.value))}
                    className="pl-9"
                    placeholder="(11) 98765-4321"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="cpf"
                  className="text-sm font-label text-[#01261f] mb-1 block"
                >
                  CPF
                </label>
                <div className="relative">
                  <IdCard
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#414846]/60"
                  />
                  <Input
                    id="cpf"
                    value={cpf}
                    onChange={(e) => setCpf(formatCpf(e.target.value))}
                    className="pl-9"
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>

              {erro && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-800">
                  {erro}
                </div>
              )}

              {sucesso && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 size={16} /> Perfil atualizado com sucesso.
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={salvando}>
                  <Save size={16} className="mr-2" />
                  {salvando ? "Salvando..." : "Salvar alterações"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
