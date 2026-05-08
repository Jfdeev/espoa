import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { EditalPnae } from "@/database/types";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;

const STATUS_OPTIONS = [
  { value: "aberto", label: "Aberto" },
  { value: "em_analise", label: "Em análise" },
  { value: "encerrado", label: "Encerrado" },
] as const;

export type EditalPnaeFormValues = {
  titulo: string;
  numero_edital: string;
  orgao_responsavel: string;
  descricao: string;
  municipio: string;
  estado: string;
  data_abertura: string;
  data_limite: string;
  valor_total_estimado: string;
  link_original: string;
  observacoes_internas: string;
  status: "aberto" | "em_analise" | "encerrado";
};

function buildInitialValues(initial?: EditalPnae | null): EditalPnaeFormValues {
  return {
    titulo: initial?.titulo ?? "",
    numero_edital: initial?.numero_edital ?? "",
    orgao_responsavel: initial?.orgao_responsavel ?? "",
    descricao: initial?.descricao ?? "",
    municipio: initial?.municipio ?? "",
    estado: initial?.estado ?? "",
    data_abertura: initial?.data_abertura ?? "",
    data_limite: initial?.data_limite ?? "",
    valor_total_estimado:
      initial?.valor_total_estimado != null
        ? String(initial.valor_total_estimado)
        : "",
    link_original: initial?.link_original ?? "",
    observacoes_internas: initial?.observacoes_internas ?? "",
    status: initial?.status ?? "aberto",
  };
}

export type EditalPnaeFormSubmit = {
  titulo: string;
  numero_edital?: string;
  orgao_responsavel?: string;
  descricao?: string;
  municipio?: string;
  estado?: string;
  data_abertura?: string;
  data_limite: string;
  valor_total_estimado?: number;
  link_original?: string;
  observacoes_internas?: string;
  status: "aberto" | "em_analise" | "encerrado";
};

interface Props {
  initial?: EditalPnae | null;
  onSubmit: (values: EditalPnaeFormSubmit) => Promise<void> | void;
  onCancel: () => void;
  submitLabel?: string;
}

export function EditalPnaeForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Salvar",
}: Props) {
  const [values, setValues] = useState<EditalPnaeFormValues>(
    buildInitialValues(initial),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function setField<K extends keyof EditalPnaeFormValues>(
    key: K,
    value: EditalPnaeFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): boolean {
    const next: Record<string, string> = {};

    if (!values.titulo.trim()) {
      next.titulo = "Título é obrigatório.";
    }
    if (!values.data_limite) {
      next.data_limite = "Data limite é obrigatória.";
    }
    if (
      values.data_abertura &&
      values.data_limite &&
      values.data_abertura > values.data_limite
    ) {
      next.data_limite = "Data limite deve ser igual ou posterior à abertura.";
    }
    if (values.estado && !UFS.includes(values.estado as (typeof UFS)[number])) {
      next.estado = "UF inválida.";
    }
    if (values.link_original) {
      try {
        new URL(values.link_original);
      } catch {
        next.link_original = "Link inválido.";
      }
    }
    if (values.valor_total_estimado) {
      const parsed = Number(values.valor_total_estimado.replace(",", "."));
      if (Number.isNaN(parsed) || parsed < 0) {
        next.valor_total_estimado = "Valor inválido.";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      const valor = values.valor_total_estimado
        ? Number(values.valor_total_estimado.replace(",", "."))
        : undefined;
      await onSubmit({
        titulo: values.titulo.trim(),
        numero_edital: values.numero_edital.trim() || undefined,
        orgao_responsavel: values.orgao_responsavel.trim() || undefined,
        descricao: values.descricao.trim() || undefined,
        municipio: values.municipio.trim() || undefined,
        estado: values.estado || undefined,
        data_abertura: values.data_abertura || undefined,
        data_limite: values.data_limite,
        valor_total_estimado: valor,
        link_original: values.link_original.trim() || undefined,
        observacoes_internas: values.observacoes_internas.trim() || undefined,
        status: values.status,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2 space-y-1">
          <Label htmlFor="titulo">Título *</Label>
          <Input
            id="titulo"
            value={values.titulo}
            onChange={(e) => setField("titulo", e.target.value)}
            placeholder="Ex.: Chamada Pública 001/2026"
            aria-invalid={!!errors.titulo}
          />
          {errors.titulo && (
            <p className="text-xs text-destructive">{errors.titulo}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="numero_edital">Número do edital</Label>
          <Input
            id="numero_edital"
            value={values.numero_edital}
            onChange={(e) => setField("numero_edital", e.target.value)}
            placeholder="Ex.: 001/2026"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            value={values.status}
            onChange={(e) =>
              setField("status", e.target.value as EditalPnaeFormValues["status"])
            }
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2 space-y-1">
          <Label htmlFor="orgao_responsavel">Órgão responsável</Label>
          <Input
            id="orgao_responsavel"
            value={values.orgao_responsavel}
            onChange={(e) => setField("orgao_responsavel", e.target.value)}
            placeholder="Ex.: Prefeitura Municipal de Itaú de Minas"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="municipio">Município</Label>
          <Input
            id="municipio"
            value={values.municipio}
            onChange={(e) => setField("municipio", e.target.value)}
            placeholder="Ex.: Itaú de Minas"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="estado">UF</Label>
          <select
            id="estado"
            value={values.estado}
            onChange={(e) => setField("estado", e.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
            aria-invalid={!!errors.estado}
          >
            <option value="">—</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
          {errors.estado && (
            <p className="text-xs text-destructive">{errors.estado}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="data_abertura">Data de abertura</Label>
          <Input
            id="data_abertura"
            type="date"
            value={values.data_abertura}
            onChange={(e) => setField("data_abertura", e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="data_limite">Data limite *</Label>
          <Input
            id="data_limite"
            type="date"
            value={values.data_limite}
            onChange={(e) => setField("data_limite", e.target.value)}
            aria-invalid={!!errors.data_limite}
          />
          {errors.data_limite && (
            <p className="text-xs text-destructive">{errors.data_limite}</p>
          )}
        </div>

        <div className="sm:col-span-2 space-y-1">
          <Label htmlFor="valor_total_estimado">Valor total estimado (R$)</Label>
          <Input
            id="valor_total_estimado"
            inputMode="decimal"
            value={values.valor_total_estimado}
            onChange={(e) => setField("valor_total_estimado", e.target.value)}
            placeholder="Ex.: 50000.00"
            aria-invalid={!!errors.valor_total_estimado}
          />
          {errors.valor_total_estimado && (
            <p className="text-xs text-destructive">
              {errors.valor_total_estimado}
            </p>
          )}
        </div>

        <div className="sm:col-span-2 space-y-1">
          <Label htmlFor="link_original">Link do edital oficial</Label>
          <Input
            id="link_original"
            type="url"
            value={values.link_original}
            onChange={(e) => setField("link_original", e.target.value)}
            placeholder="https://..."
            aria-invalid={!!errors.link_original}
          />
          {errors.link_original && (
            <p className="text-xs text-destructive">{errors.link_original}</p>
          )}
        </div>

        <div className="sm:col-span-2 space-y-1">
          <Label htmlFor="descricao">Descrição</Label>
          <Textarea
            id="descricao"
            value={values.descricao}
            onChange={(e) => setField("descricao", e.target.value)}
            placeholder="Resumo do edital, produtos demandados, condições..."
            rows={3}
          />
        </div>

        <div className="sm:col-span-2 space-y-1">
          <Label htmlFor="observacoes_internas">Observações internas</Label>
          <Textarea
            id="observacoes_internas"
            value={values.observacoes_internas}
            onChange={(e) => setField("observacoes_internas", e.target.value)}
            placeholder="Anotações da equipe, prazos internos, status do projeto de venda..."
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
