import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Building2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  compact?: boolean;
}

/**
 * Dropdown para alternar entre associações ativas do usuário.
 * Se o usuário só tem 1 vínculo ativo, mostra label estático (sem dropdown).
 */
export function AssociacaoSwitcher({ className, compact = false }: Props) {
  const vinculos = useAuthStore((s) => s.vinculos);
  const associacaoAtiva = useAuthStore((s) => s.associacaoAtiva);
  const setAssociacaoAtiva = useAuthStore((s) => s.setAssociacaoAtiva);

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const ativos = vinculos.filter((v) => v.status === "ativo");

  if (!associacaoAtiva) return null;

  // Apenas 1 vínculo: exibição estática
  if (ativos.length <= 1) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
          compact ? "text-xs" : "",
          className,
        )}
      >
        <Building2
          size={compact ? 12 : 14}
          className="text-[#1A3C34]/60 flex-shrink-0"
        />
        <span className="truncate font-medium text-[#1A3C34]">
          {associacaoAtiva.associacaoNome}
        </span>
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#1A3C34]/20 bg-white hover:bg-[#1A3C34]/5 transition-colors",
          compact ? "text-xs" : "text-sm",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Building2
          size={compact ? 12 : 14}
          className="text-[#1A3C34]/60 flex-shrink-0"
        />
        <span className="truncate max-w-[160px] font-medium text-[#1A3C34]">
          {associacaoAtiva.associacaoNome}
        </span>
        <ChevronDown
          size={compact ? 12 : 14}
          className={cn(
            "text-[#1A3C34]/60 flex-shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-50 top-full mt-1 right-0 min-w-[240px] bg-white rounded-lg shadow-lg border border-[#1A3C34]/10 py-1 max-h-72 overflow-y-auto"
        >
          {ativos.map((v) => {
            const selected = v.associacaoId === associacaoAtiva.associacaoId;
            return (
              <button
                key={v.associacaoId}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  if (!selected) setAssociacaoAtiva(v);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-[#1A3C34]/5 flex items-start gap-2",
                  selected && "bg-[#1A3C34]/5",
                )}
              >
                <Check
                  size={14}
                  className={cn(
                    "flex-shrink-0 mt-0.5",
                    selected ? "text-[#1A3C34]" : "text-transparent",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[#01261f] truncate">
                    {v.associacaoNome}
                  </p>
                  <p className="text-xs text-[#414846]/70 truncate">
                    {v.associacaoMunicipio} · {v.associacaoEstado} ·{" "}
                    {v.role === "adm" ? "Administrador" : "Associado"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
