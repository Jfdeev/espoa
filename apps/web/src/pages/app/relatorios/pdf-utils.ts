import { createElement } from "react";
import { pdf } from "@react-pdf/renderer";
import type { RelatoriosData } from "@/lib/relatorios-api";
import type { UsuarioVinculo } from "@/types/auth";
import { RelatoriosPDFDoc } from "./RelatoriosPDFDoc";

/**
 * Renders the institutional PDF document and returns a Blob ready for download.
 * Kept in a plain .ts module (not .tsx) so that `react-refresh/only-export-components`
 * does not flag the non-component export.
 */
export async function generatePDFBlob(
  data: RelatoriosData,
  associacao: UsuarioVinculo,
): Promise<Blob> {
  const element = createElement(RelatoriosPDFDoc, { data, associacao });
  return pdf(element).toBlob();
}
