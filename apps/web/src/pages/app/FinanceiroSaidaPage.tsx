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

export default function FinanceiroSaidaPage() {
  const associacaoAtiva = useAuthStore((s) => s.associacaoAtiva);
  const [valor, setValor] = useState("");
  const [data, setData] = useState(today);
  const [descricao, setDescricao] = useState("");
  const [documento, setDocumento] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ valor?: string; data?: string }>({});
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
    () => saldoAtual - valorNumero,
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

    const nextErrors: { valor?: string; data?: string } = {};
    if (!data) nextErrors.data = "Informe a data da saida";
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
        tipo: "despesa",
        valor: valorNumero,
        data,
        descricao: descricao.trim() || undefined,
        documento: documento.trim() || undefined,
      });
      toast.success("Saida registrada com sucesso");
      setValor("");
      setData(today);
      setDescricao("");
      setDocumento("");
    } catch {
      toast.error("Nao foi possivel salvar a saida");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout navItems={adminNavItems} title="Financeiro">
      <div className="p-6 lg:p-12 max-w-3xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="font-headline text-3xl font-bold text-md-primary">
            Registrar saida
          </h1>
          <p className="text-[#414846]">
            Registre as saidas financeiras da associacao. Transacoes futuras sao
            permitidas.
          </p>
          <div className="flex items-center gap-3 text-sm">
            <Link
              to="/app/financeiro/entrada"
              className="text-[#414846] hover:text-md-primary"
            >
              Entradas
            </Link>
            <span className="text-[#c1c8c4]">|</span>
            <span className="font-semibold text-md-primary">Saidas</span>
            <span className="text-[#c1c8c4]">|</span>
            <Link
              to="/app/financeiro/resumo"
              className="text-[#414846] hover:text-md-primary"
            >
              Resumo
            </Link>
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 bg-white rounded-2xl p-6 border border-[#c1c8c4]/30"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                name="valor"
                inputMode="decimal"
                placeholder="0.00"
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
              <Label htmlFor="data">Data da saida</Label>
              <Input
                id="data"
                name="data"
                type="date"
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
            <Label htmlFor="documento">
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

          <div className="space-y-2">
            <Label htmlFor="descricao">Descricao (opcional)</Label>
            <Textarea
              id="descricao"
              name="descricao"
              placeholder="Detalhes sobre a saida"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          {showNegativeWarning && (
            <div className="rounded-lg border border-[#E67E22]/30 bg-[#fff4e6] px-4 py-3 text-sm text-[#8a4b14]">
              Essa saida deixa o saldo estimado negativo (
              {formatCurrency(saldoProjetado)}). Nenhuma acao sera bloqueada.
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar saida"}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
