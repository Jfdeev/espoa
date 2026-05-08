import { useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/auth.store";
import { adminNavItems, memberNavItems } from "./nav-items";
import AppLayout from "./AppLayout";
import api from "@/lib/api";

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatTelefone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10)
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
}

export default function ConfiguracoesPage() {
  const perfil = useAuthStore((s) => s.perfil);
  const setPerfil = useAuthStore((s) => s.setPerfil);
  const vinculos = useAuthStore((s) => s.vinculos);
  const associacaoAtiva = useAuthStore((s) => s.associacaoAtiva);
  const isAdmin = associacaoAtiva?.role === "adm";

  const [nome, setNome] = useState(perfil?.nome ?? "");
  const [telefone, setTelefone] = useState(
    perfil?.telefone ? formatTelefone(perfil.telefone) : "",
  );
  const [cpf, setCpf] = useState(
    perfil?.cpf ? formatCpf(perfil.cpf) : "",
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.patch("/auth/profile", {
        nome: nome.trim() || undefined,
        telefone: telefone.replace(/\D/g, "") || "",
        cpf: cpf.replace(/\D/g, "") || "",
      });
      setPerfil(data.usuario, vinculos);
      toast.success("Perfil atualizado com sucesso!");
    } catch {
      toast.error("Erro ao atualizar perfil.");
    } finally {
      setSaving(false);
    }
  }

  const navItems = isAdmin ? adminNavItems : memberNavItems;

  return (
    <AppLayout navItems={navItems} title="Configurações">
      <Toaster />
      <div className="p-6 lg:p-12 max-w-xl mx-auto space-y-8">
        <div>
          <h1 className="font-headline text-3xl lg:text-4xl font-bold text-[#01261f] mb-1">
            Editar Perfil
          </h1>
          <p className="text-[#414846]">
            Mantenha seus dados atualizados para usar todos os recursos.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 lg:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label htmlFor="nome" className="text-[#01261f] font-medium">
                Nome completo
              </Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome completo"
                className="h-10"
              />
            </div>

            {/* Email — read only */}
            <div className="space-y-1.5">
              <Label className="text-[#01261f] font-medium">Email</Label>
              <Input
                value={perfil?.email ?? ""}
                disabled
                className="h-10 bg-[#f6f3ee] text-[#414846]"
              />
              <p className="text-xs text-[#414846]/60">O e-mail não pode ser alterado.</p>
            </div>

            {/* Telefone */}
            <div className="space-y-1.5">
              <Label htmlFor="telefone" className="text-[#01261f] font-medium">
                Telefone (WhatsApp)
              </Label>
              <Input
                id="telefone"
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                placeholder="(99) 99999-9999"
                className="h-10"
              />
            </div>

            {/* CPF */}
            <div className="space-y-1.5">
              <Label htmlFor="cpf" className="text-[#01261f] font-medium">
                CPF
              </Label>
              <Input
                id="cpf"
                value={cpf}
                onChange={(e) => setCpf(formatCpf(e.target.value))}
                placeholder="000.000.000-00"
                className="h-10"
              />
              <p className="text-xs text-[#414846]/60">
                Necessário para pagamentos via PIX.
              </p>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#01261f] hover:bg-[#1a3c34] text-white h-10 px-6 rounded-lg font-medium"
              >
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
