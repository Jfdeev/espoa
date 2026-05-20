import { Link } from "react-router-dom";
import { CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import type { Mensalidade } from "@/database/types";
import { db } from "@/database/db";
import { useLiveQuery } from "@/hooks/useLiveQuery";
import { useAuthStore } from "@/store/auth.store";
import {
  primeiroUtilDoMes,
  isVencido,
} from "@/lib/mensalidade-utils";
import { cn } from "@/lib/utils";

type Status = "em_dia" | "proximo_vencimento" | "atrasado";

interface StatusInfo {
  status: Status;
  label: string;
  detail: string;
}

const DIAS_AVISO_PROXIMO = 3;

function classify(mensalidades: Mensalidade[]): StatusInfo {
  const hoje = new Date();
  const vencimento = primeiroUtilDoMes(hoje);
  const anoMes = `${vencimento.getFullYear()}-${String(
    vencimento.getMonth() + 1,
  ).padStart(2, "0")}`;

  const pagouMes = mensalidades.some(
    (m) => !m.deleted_at && m.data_pagamento?.slice(0, 7) === anoMes,
  );

  if (pagouMes) {
    return {
      status: "em_dia",
      label: "Em dia",
      detail: `Mensalidade de ${vencimento.toLocaleDateString("pt-BR", {
        month: "long",
      })} paga`,
    };
  }

  if (isVencido(mensalidades)) {
    return {
      status: "atrasado",
      label: "Atrasado",
      detail: `Vencimento em ${vencimento.toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "short",
      })} passou`,
    };
  }

  const msPorDia = 24 * 60 * 60 * 1000;
  const diasParaVencer = Math.ceil(
    (vencimento.getTime() - hoje.getTime()) / msPorDia,
  );

  if (diasParaVencer >= 0 && diasParaVencer <= DIAS_AVISO_PROXIMO) {
    return {
      status: "proximo_vencimento",
      label:
        diasParaVencer === 0
          ? "Vence hoje"
          : `Vence em ${diasParaVencer}d`,
      detail: `Vencimento em ${vencimento.toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
      })}`,
    };
  }

  return {
    status: "em_dia",
    label: "Em dia",
    detail: `Próximo vencimento em ${vencimento.toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
    })}`,
  };
}

const styles: Record<
  Status,
  { container: string; dot: string; icon: React.ReactNode }
> = {
  em_dia: {
    container:
      "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100",
    dot: "bg-emerald-500",
    icon: <CheckCircle2 size={14} />,
  },
  proximo_vencimento: {
    container:
      "bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100",
    dot: "bg-amber-500",
    icon: <AlertTriangle size={14} />,
  },
  atrasado: {
    container: "bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100",
    dot: "bg-rose-500",
    icon: <AlertCircle size={14} />,
  },
};

interface MensalidadeStatusBadgeProps {
  className?: string;
  variant?: "full" | "compact";
}

export function MensalidadeStatusBadge({
  className,
  variant = "full",
}: MensalidadeStatusBadgeProps) {
  const perfil = useAuthStore((s) => s.perfil);
  const usuarioId = perfil?.id;

  const mensalidades = useLiveQuery(
    async () => {
      if (!usuarioId) return [] as Mensalidade[];
      const assoc = await db.associado
        .where("usuario_id")
        .equals(usuarioId)
        .filter((a) => !a.deleted_at)
        .first();
      return db.mensalidade
        .filter(
          (m) =>
            !m.deleted_at &&
            (m.usuario_id === usuarioId ||
              (!!assoc?.id && m.associado_id === assoc.id)),
        )
        .toArray();
    },
    [] as Mensalidade[],
    [usuarioId],
  );

  if (!usuarioId) return null;

  const info = classify(mensalidades);
  const s = styles[info.status];

  if (variant === "compact") {
    return (
      <Link
        to="/app/mensalidades"
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-label border transition-colors",
          s.container,
          className,
        )}
        title={info.detail}
      >
        <span className={cn("w-2 h-2 rounded-full", s.dot)} />
        <span>{info.label}</span>
      </Link>
    );
  }

  return (
    <Link
      to="/app/mensalidades"
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-label transition-colors",
        s.container,
        className,
      )}
      title={info.detail}
    >
      {s.icon}
      <div className="flex flex-col leading-tight">
        <span className="font-semibold">{info.label}</span>
        <span className="text-[10px] opacity-80">{info.detail}</span>
      </div>
    </Link>
  );
}
