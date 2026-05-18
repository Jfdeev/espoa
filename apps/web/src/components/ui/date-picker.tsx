import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const MONTHS_SHORT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

// Domingo-primeiro (padrão brasileiro)
const DAYS_PT = ["D", "S", "T", "Q", "Q", "S", "S"];

type CalMode = "days" | "months" | "years";

function toDisplayDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function toIso(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

interface DatePickerInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export function DatePickerInput({
  value,
  onChange,
  placeholder = "Selecione a data...",
  className,
}: DatePickerInputProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<CalMode>("days");

  const initialView = () => {
    const d = value ? new Date(value + "T00:00:00") : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  };
  const [view, setView] = useState(initialView);
  const [yearRangeStart, setYearRangeStart] = useState(() => initialView().year - 5);

  function handleOpenChange(next: boolean) {
    if (next) {
      const v = initialView();
      setView(v);
      setYearRangeStart(v.year - 5);
      setMode("days");
    }
    setOpen(next);
  }

  // ── Navegação dias ────────────────────────────────────────────────────────
  function prevMonth() {
    setView((v) =>
      v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 },
    );
  }
  function nextMonth() {
    setView((v) =>
      v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 },
    );
  }

  // ── Navegação meses ───────────────────────────────────────────────────────
  function prevYearInMonths() {
    setView((v) => ({ ...v, year: v.year - 1 }));
  }
  function nextYearInMonths() {
    setView((v) => ({ ...v, year: v.year + 1 }));
  }
  function selectMonth(month: number) {
    setView((v) => ({ ...v, month }));
    setMode("days");
  }

  // ── Navegação anos ────────────────────────────────────────────────────────
  function selectYear(year: number) {
    setView((v) => ({ ...v, year }));
    setMode("days");
  }

  // ── Grade de dias ─────────────────────────────────────────────────────────
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const firstDayOfWeek = new Date(view.year, view.month, 1).getDay();
  const today = todayIso();

  // Sempre 42 células (6 linhas fixas) para manter altura constante
  const cells: (number | null)[] = [
    ...Array.from<null>({ length: firstDayOfWeek }).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length < 42) cells.push(null);

  // ── Anos na grade ─────────────────────────────────────────────────────────
  const years = Array.from({ length: 12 }, (_, i) => yearRangeStart + i);

  const navBtn =
    "p-1 rounded-md hover:bg-[#f6f3ee] transition-colors shrink-0";
  const modeBtn =
    "px-1.5 py-0.5 rounded hover:bg-[#f6f3ee] transition-colors font-medium text-sm select-none";

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        className={cn(
          "h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm text-left flex items-center justify-between gap-2 transition-colors focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          !value && "text-muted-foreground",
          className,
        )}
      >
        {value ? toDisplayDate(value) : placeholder}
        <CalendarDays size={16} className="text-muted-foreground shrink-0" />
      </PopoverTrigger>

      <PopoverContent align="start" sideOffset={4} className="w-(--anchor-width) min-w-64 p-3">

        {/* ── Cabeçalho modo dias ──────────────────────────────────────────── */}
        {mode === "days" && (
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className={navBtn} aria-label="Mês anterior">
              <ChevronLeft size={15} />
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMode("months")}
                className={modeBtn}
                aria-label="Selecionar mês"
              >
                {MONTHS_PT[view.month]}
              </button>
              <span className="text-sm text-[#414846]">de</span>
              <button
                type="button"
                onClick={() => { setYearRangeStart(view.year - 5); setMode("years"); }}
                className={modeBtn}
                aria-label="Selecionar ano"
              >
                {view.year}
              </button>
            </div>
            <button type="button" onClick={nextMonth} className={navBtn} aria-label="Próximo mês">
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        {/* ── Cabeçalho modo meses ─────────────────────────────────────────── */}
        {mode === "months" && (
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevYearInMonths} className={navBtn} aria-label="Ano anterior">
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={() => { setYearRangeStart(view.year - 5); setMode("years"); }}
              className={modeBtn}
              aria-label="Selecionar ano"
            >
              {view.year}
            </button>
            <button type="button" onClick={nextYearInMonths} className={navBtn} aria-label="Próximo ano">
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        {/* ── Cabeçalho modo anos ──────────────────────────────────────────── */}
        {mode === "years" && (
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setYearRangeStart((s) => s - 12)}
              className={navBtn}
              aria-label="Anos anteriores"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-sm font-medium select-none">
              {yearRangeStart} – {yearRangeStart + 11}
            </span>
            <button
              type="button"
              onClick={() => setYearRangeStart((s) => s + 12)}
              className={navBtn}
              aria-label="Próximos anos"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        {/* ── Corpo: dias ──────────────────────────────────────────────────── */}
        {mode === "days" && (
          <>
            <div className="grid grid-cols-7 mb-1">
              {DAYS_PT.map((d, i) => (
                <div key={i} className="h-8 flex items-center justify-center text-xs font-medium text-[#414846]">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                if (!day) return <div key={`e-${i}`} className="h-8" />;
                const iso = toIso(view.year, view.month, day);
                const isSelected = iso === value;
                const isToday = iso === today;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => { onChange(iso); setOpen(false); }}
                    className={cn(
                      "h-8 w-full flex items-center justify-center text-sm rounded-full transition-colors",
                      isSelected && "bg-[#01261f] text-white font-medium",
                      !isSelected && isToday && "border border-[#01261f] text-[#01261f] font-medium",
                      !isSelected && !isToday && "hover:bg-[#f6f3ee] text-[#1c1c19]",
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between mt-3 pt-2 border-t border-[#e8e5e0]">
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className="text-xs text-[#414846] hover:text-[#1c1c19] transition-colors"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => { onChange(todayIso()); setOpen(false); }}
                className="text-xs text-[#01261f] font-medium hover:underline"
              >
                Hoje
              </button>
            </div>
          </>
        )}

        {/* ── Corpo: meses ─────────────────────────────────────────────────── */}
        {mode === "months" && (
          <div className="grid grid-cols-3 gap-1">
            {MONTHS_SHORT.map((m, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectMonth(i)}
                className={cn(
                  "h-10 rounded-lg text-sm transition-colors",
                  view.month === i
                    ? "bg-[#01261f] text-white font-medium"
                    : "hover:bg-[#f6f3ee] text-[#1c1c19]",
                )}
              >
                {m}
              </button>
            ))}
          </div>
        )}

        {/* ── Corpo: anos ──────────────────────────────────────────────────── */}
        {mode === "years" && (
          <div className="grid grid-cols-3 gap-1">
            {years.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => selectYear(y)}
                className={cn(
                  "h-10 rounded-lg text-sm transition-colors",
                  view.year === y
                    ? "bg-[#01261f] text-white font-medium"
                    : "hover:bg-[#f6f3ee] text-[#1c1c19]",
                )}
              >
                {y}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
