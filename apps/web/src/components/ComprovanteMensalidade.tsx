import { useEffect } from "react";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

interface ComprovanteData {
  numero: string;
  nomeMembro: string;
  cpfMembro?: string | null;
  nomeAssociacao: string;
  valor: number;
  dataPagamento: string;
  mesReferencia: string;
  formaPagamento?: string | null;
}

function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function formatMesReferenciaBR(anoMes: string): string {
  const [y, m] = anoMes.split("-");
  if (!y || !m) return anoMes;
  const meses = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  const idx = Number(m) - 1;
  if (idx < 0 || idx > 11) return anoMes;
  return `${meses[idx]} de ${y}`;
}

interface Props {
  data: ComprovanteData;
  open: boolean;
  onClose: () => void;
}

export function ComprovanteMensalidade({ data, open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Estilo de impressão: esconde tudo exceto o comprovante */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #comprovante-print, #comprovante-print * { visibility: visible !important; }
          #comprovante-print {
            position: absolute !important;
            inset: 0 !important;
            padding: 32px !important;
            background: white !important;
          }
          #comprovante-no-print { display: none !important; }
        }
      `}</style>

      <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          {/* Cabeçalho do modal — não imprime */}
          <div
            id="comprovante-no-print"
            className="flex items-center justify-between px-6 py-4 border-b border-[#c1c8c4]/30"
          >
            <h3 className="font-headline font-bold text-[#01261f]">
              Comprovante de Pagamento
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-[#1A3C34]/5"
              aria-label="Fechar"
            >
              <X size={20} className="text-[#1A3C34]" />
            </button>
          </div>

          {/* Conteúdo impressível */}
          <div id="comprovante-print" className="p-8">
            <div className="border-2 border-[#01261f] rounded-lg p-6">
              <header className="text-center mb-6 pb-4 border-b border-[#01261f]/20">
                <h1 className="font-headline text-2xl font-bold text-[#01261f]">
                  {data.nomeAssociacao}
                </h1>
                <p className="font-label text-xs uppercase tracking-wider text-[#414846] mt-2">
                  Comprovante de pagamento de mensalidade
                </p>
                <p className="font-mono text-xs text-[#414846]/70 mt-1">
                  Nº {data.numero}
                </p>
              </header>

              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="font-label text-[#414846]">Associado(a)</dt>
                  <dd className="font-medium text-[#01261f] text-right">
                    {data.nomeMembro}
                  </dd>
                </div>
                {data.cpfMembro && (
                  <div className="flex justify-between gap-4">
                    <dt className="font-label text-[#414846]">CPF</dt>
                    <dd className="font-mono text-[#01261f]">{data.cpfMembro}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt className="font-label text-[#414846]">Mês de referência</dt>
                  <dd className="font-medium text-[#01261f] capitalize">
                    {formatMesReferenciaBR(data.mesReferencia)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-label text-[#414846]">Data do pagamento</dt>
                  <dd className="font-medium text-[#01261f]">
                    {formatDateBR(data.dataPagamento)}
                  </dd>
                </div>
                {data.formaPagamento && (
                  <div className="flex justify-between gap-4">
                    <dt className="font-label text-[#414846]">Forma</dt>
                    <dd className="font-medium text-[#01261f] capitalize">
                      {data.formaPagamento}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="mt-6 pt-4 border-t-2 border-[#01261f] flex justify-between items-baseline">
                <span className="font-label text-sm text-[#414846]">
                  Valor pago
                </span>
                <span className="font-headline text-2xl font-bold text-[#01261f]">
                  {brl.format(data.valor)}
                </span>
              </div>

              <footer className="mt-6 pt-4 text-xs text-[#414846]/70 text-center">
                Documento gerado pelo Espoá em{" "}
                {new Date().toLocaleDateString("pt-BR")} às{" "}
                {new Date().toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                .
              </footer>
            </div>
          </div>

          {/* Ações — não imprime */}
          <div
            id="comprovante-no-print"
            className="flex justify-end gap-2 px-6 py-4 border-t border-[#c1c8c4]/30"
          >
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            <Button onClick={() => window.print()}>
              <Printer size={16} className="mr-2" />
              Imprimir / Salvar PDF
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
