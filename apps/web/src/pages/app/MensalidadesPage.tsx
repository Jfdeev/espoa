import { useEffect, useState, useCallback } from "react";
import { BanknoteArrowUp, CheckCircle, User } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/auth.store";
import { associadoRepository } from "@/repositories/associado.repository";
import { mensalidadeRepository } from "@/repositories/financeiro.repository";
import type { Associado, Mensalidade } from "@/database/types";
import AppLayout from "./AppLayout";
import { adminNavItems } from "./nav-items";
import { cn } from "@/lib/utils";

const FORMAS_PAGAMENTO = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao", label: "Cartão" },
  { value: "boleto", label: "Boleto" },
];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function FormaPagamentoBadge({ forma }: { forma: string | undefined }) {
  if (!forma) return null;
  const label = FORMAS_PAGAMENTO.find((f) => f.value === forma)?.label ?? forma;
  return (
    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-[#1a3c34]/10 text-[#1a3c34]">
      {label}
    </span>
  );
}

interface PagamentoForm {
  associado_id: string;
  valor: string;
  data_pagamento: string;
  forma_pagamento: string;
}

const formVazio: PagamentoForm = {
  associado_id: "",
  valor: "",
  data_pagamento: new Date().toISOString().slice(0, 10),
  forma_pagamento: "pix",
};

export default function MensalidadesPage() {
  const associacaoAtiva = useAuthStore((s) => s.associacaoAtiva);
  const [associados, setAssociados] = useState<Associado[]>([]);
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [form, setForm] = useState<PagamentoForm>(formVazio);
  const [submitting, setSubmitting] = useState(false);
  const [loadingAssociados, setLoadingAssociados] = useState(true);

  const carregarDados = useCallback(async () => {
    const [listaAssociados, listaMensalidades] = await Promise.all([
      associadoRepository.list(),
      mensalidadeRepository.list(),
    ]);
    setAssociados(listaAssociados);
    setMensalidades(
      listaMensalidades.sort((a, b) =>
        (b.updated_at ?? "").localeCompare(a.updated_at ?? ""),
      ),
    );
    setLoadingAssociados(false);
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const associadoId = form.associado_id.trim();
    if (!associadoId) {
      toast.error("Selecione um associado.");
      return;
    }

    const valor = parseFloat(form.valor);
    if (isNaN(valor) || valor <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }

    setSubmitting(true);
    try {
      await mensalidadeRepository.create({
        associado_id: associadoId,
        valor,
        data_pagamento: form.data_pagamento || undefined,
        forma_pagamento: form.forma_pagamento || undefined,
      });
      toast.success("Pagamento registrado com sucesso!");
      setForm(formVazio);
      await carregarDados();
    } catch {
      toast.error("Erro ao registrar pagamento.");
    } finally {
      setSubmitting(false);
    }
  }

  const nomeAssociado = (id: string) =>
    associados.find((a) => a.id === id)?.nome ?? "—";

  return (
    <AppLayout navItems={adminNavItems} title="Mensalidades">
      <Toaster />
      <div className="p-6 lg:p-12 max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <div>
          <h1 className="font-headline text-3xl lg:text-4xl font-bold text-[#01261f] mb-1">
            Mensalidades
          </h1>
          <p className="text-[#414846]">
            Registre pagamentos de mensalidades dos associados
            {associacaoAtiva ? ` de ${associacaoAtiva.associacaoNome}` : ""}.
          </p>
        </div>

        {/* Formulário */}
        <div className="bg-white rounded-2xl shadow-sm p-6 lg:p-8 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-[#01261f] flex items-center justify-center text-white">
              <BanknoteArrowUp size={20} />
            </div>
            <h2 className="font-headline text-lg font-bold text-[#01261f]">
              Registrar Pagamento
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Associado */}
            <div className="space-y-1.5">
              <Label htmlFor="associado_id" className="text-[#01261f] font-medium">
                Associado <span className="text-red-500">*</span>
              </Label>
              {loadingAssociados ? (
                <div className="h-10 rounded-lg bg-[#f6f3ee] animate-pulse" />
              ) : (
                <select
                  id="associado_id"
                  name="associado_id"
                  value={form.associado_id}
                  onChange={handleChange}
                  required
                  className={cn(
                    "h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none",
                    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    "disabled:opacity-50",
                    !form.associado_id && "text-muted-foreground",
                  )}
                >
                  <option value="" disabled>
                    Selecione um associado
                  </option>
                  {associados.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome}
                    </option>
                  ))}
                </select>
              )}
              {!loadingAssociados && associados.length === 0 && (
                <p className="text-xs text-[#414846]">
                  Nenhum associado cadastrado localmente. Sincronize primeiro.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Valor */}
              <div className="space-y-1.5">
                <Label htmlFor="valor" className="text-[#01261f] font-medium">
                  Valor (R$) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="valor"
                  name="valor"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0,00"
                  value={form.valor}
                  onChange={handleChange}
                  required
                  className="h-10"
                />
              </div>

              {/* Data pagamento */}
              <div className="space-y-1.5">
                <Label htmlFor="data_pagamento" className="text-[#01261f] font-medium">
                  Data do Pagamento
                </Label>
                <Input
                  id="data_pagamento"
                  name="data_pagamento"
                  type="date"
                  value={form.data_pagamento}
                  onChange={handleChange}
                  className="h-10"
                />
              </div>
            </div>

            {/* Forma de pagamento */}
            <div className="space-y-1.5">
              <Label htmlFor="forma_pagamento" className="text-[#01261f] font-medium">
                Forma de Pagamento
              </Label>
              <select
                id="forma_pagamento"
                name="forma_pagamento"
                value={form.forma_pagamento}
                onChange={handleChange}
                className={cn(
                  "h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none",
                  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                )}
              >
                {FORMAS_PAGAMENTO.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={submitting || associados.length === 0}
                className="bg-[#01261f] hover:bg-[#1a3c34] text-white h-10 px-6 rounded-lg font-medium"
              >
                {submitting ? "Salvando..." : "Registrar Pagamento"}
              </Button>
            </div>
          </form>
        </div>

        {/* Histórico */}
        <div className="space-y-4">
          <h2 className="font-headline text-xl font-bold text-[#01261f]">
            Histórico de Pagamentos
          </h2>

          {mensalidades.length === 0 ? (
            <div className="bg-[#f6f3ee] rounded-xl p-8 text-center text-[#414846]">
              Nenhum pagamento registrado ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {mensalidades.map((m) => (
                <div
                  key={m.id}
                  className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4"
                >
                  <div className="w-9 h-9 rounded-full bg-[#f6f3ee] flex items-center justify-center flex-shrink-0">
                    <User size={18} className="text-[#01261f]/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#01261f] text-sm truncate">
                      {nomeAssociado(m.associado_id)}
                    </p>
                    <p className="text-xs text-[#414846]">
                      {m.data_pagamento ? formatDate(m.data_pagamento) : "Sem data"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <FormaPagamentoBadge forma={m.forma_pagamento} />
                    <span className="font-bold text-[#01261f]">
                      {formatCurrency(m.valor)}
                    </span>
                    <CheckCircle size={16} className="text-emerald-600" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
