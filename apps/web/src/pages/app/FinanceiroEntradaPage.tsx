import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { toast } from "sonner";
import AppLayout from "./AppLayout";
import { adminNavItems } from "./nav-items";
import { useAuthStore } from "@/store/auth.store";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { transacaoRepository } from "@/repositories/financeiro.repository";
import { db } from "@/database/db";
import { useLiveQuery } from "@/hooks/useLiveQuery";
import { ArrowDownLeft, ArrowUpRight, BarChart3 } from "lucide-react";

function getTodayInputValue() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

const today = getTodayInputValue();

function sanitizeMoneyInput(value: string) {
  const hasComma = value.includes(",");
  let cleaned = value.replace(/,/g, ".").replace(/[^0-9.]/g, "");
  const dotIndex = cleaned.indexOf(".");

  if (dotIndex >= 0) {
    const intPart = cleaned.slice(0, dotIndex).replace(/\./g, "");
    const decPart = cleaned
      .slice(dotIndex + 1)
      .replace(/\./g, "")
      .slice(0, 2);
    cleaned = decPart.length > 0 ? `${intPart}.${decPart}` : `${intPart}.`;
  } else {
    cleaned = cleaned.replace(/\./g, "");
  }

  return { value: cleaned, hasComma };
}

function parseMoney(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, "");
  if (!cleaned || cleaned === ".") return 0;
  const [intRaw, decRaw] = cleaned.split(".");
  const intPart = intRaw.replace(/\D/g, "");
  const decPart = (decRaw ?? "").replace(/\D/g, "");
  const normalized = decPart ? `${intPart}.${decPart}` : intPart;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function FinanceiroEntradaPage() {
  const associacaoAtiva = useAuthStore((s) => s.associacaoAtiva);
  const [valor, setValor] = useState("");
  const [data, setData] = useState(today);
  const [descricao, setDescricao] = useState("");
  const [documento, setDocumento] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ valor?: string; data?: string; descricao?: string }>({});
  const [valorFormatError, setValorFormatError] = useState<string | null>(null);

  const saldoAtual = useLiveQuery(async () => {
    const transacoes = await db.transacao_financeira
      .filter((t) => !t.deleted_at)
      .toArray();
    return transacoes.reduce((acc, t) => {
      const v = t.tipo === "despesa" ? -t.valor : t.valor;
      return acc + v;
    }, 0);
  }, 0);

  const valorNumero = useMemo(() => parseMoney(valor), [valor]);
  const saldoProjetado = useMemo(
    () => saldoAtual + valorNumero,
    [saldoAtual, valorNumero],
  );
  const showNegativeWarning = valorNumero > 0 && saldoProjetado < 0;

  if (!associacaoAtiva) {
    return <Navigate to="/solicitacoes" replace />;
  }

  if (associacaoAtiva.role !== "adm") {
    return <Navigate to="/app" replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const nextErrors: { valor?: string; data?: string; descricao?: string } = {};
    if (!data) nextErrors.data = "Informe a data da entrada";
    if (!descricao.trim()) nextErrors.descricao = "Informe uma descricao para a entrada";
    if (valorFormatError) {
      nextErrors.valor = valorFormatError;
    } else if (!valorNumero || valorNumero <= 0) {
      nextErrors.valor = "Informe um valor maior que zero";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      await transacaoRepository.create({
        tipo: "entrada",
        valor: valorNumero,
        data,
        descricao: descricao.trim() || undefined,
        documento: documento.trim() || undefined,
        associacao_id: associacaoAtiva?.associacaoId,
      });
      toast.success("Entrada registrada com sucesso");
      setValor("");
      setData(today);
      setDescricao("");
      setDocumento("");
    } catch {
      toast.error("Nao foi possivel salvar a entrada");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout navItems={adminNavItems} title="Financeiro">
      <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 p-1 bg-[#f6f3ee] rounded-xl w-fit">
          <span className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white shadow-sm text-sm font-semibold text-md-primary">
            <ArrowDownLeft size={16} />
            Entradas
          </span>
          <Link
            to="/app/financeiro/saida"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-[#414846] hover:bg-white/60 transition-colors"
          >
            <ArrowUpRight size={16} />
            Saidas
          </Link>
          <Link
            to="/app/financeiro/resumo"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-[#414846] hover:bg-white/60 transition-colors"
          >
            <BarChart3 size={16} />
            Resumo
          </Link>
        </nav>



        {/* Form */}
        <div className="bg-white rounded-2xl border border-[#e5e2dd] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#f0ede8] bg-[#fcfbf9]">
            <h2 className="font-headline text-lg font-bold text-md-primary">
              Registrar entrada
            </h2>
            <p className="text-sm text-[#6b7170] mt-0.5">
              Registre receitas da associacao — transacoes futuras sao permitidas.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="valor" className="text-[#1c1c19] font-medium">Valor (R$) *</Label>
                <Input
                  id="valor"
                  name="valor"
                  inputMode="decimal"
                  placeholder="0.00"
                  className="h-11 text-lg font-semibold"
                  value={valor}
                  onChange={(e) => {
                    const nextValue = sanitizeMoneyInput(e.target.value);
                    setValor(nextValue.value);
                    setValorFormatError(
                      nextValue.hasComma
                        ? "Centavos devem ser indicados com um ponto."
                        : null,
                    );
                  }}
                  aria-invalid={Boolean(errors.valor)}
                />
                {valorFormatError ? (
                  <p className="text-xs text-red-600">{valorFormatError}</p>
                ) : (
                  errors.valor && (
                    <p className="text-xs text-red-600">{errors.valor}</p>
                  )
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="data" className="text-[#1c1c19] font-medium">Data da entrada *</Label>
                <Input
                  id="data"
                  name="data"
                  type="date"
                  className="h-11"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  aria-invalid={Boolean(errors.data)}
                />
                {errors.data && (
                  <p className="text-xs text-red-600">{errors.data}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao" className="text-[#1c1c19] font-medium">Descricao *</Label>
              <Textarea
                id="descricao"
                name="descricao"
                placeholder="Ex: Venda de producao, doacao, cota associativa"
                className="min-h-20 resize-none"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                aria-invalid={Boolean(errors.descricao)}
              />
              {errors.descricao && (
                <p className="text-xs text-red-600">{errors.descricao}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="documento" className="text-[#6b7170]">
                Documento ou comprovante (opcional)
              </Label>
              <Input
                id="documento"
                name="documento"
                placeholder="Ex: Boleto, recibo, numero de protocolo"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
              />
            </div>

            {showNegativeWarning && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-3">
                <span className="text-amber-500 mt-0.5">⚠️</span>
                <span>
                  Essa entrada ainda deixa o saldo estimado negativo (
                  {formatCurrency(saldoProjetado)}). Nenhuma acao sera bloqueada.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="h-11 px-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-sm"
              >
                {loading ? "Salvando..." : "Salvar entrada"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
