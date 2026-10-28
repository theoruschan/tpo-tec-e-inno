import type { jsPDF as JsPdfDocument } from 'jspdf';
import {
  ReportPdfContent,
  ReportPdfExporter,
} from '../../domain/ports/ReportPdfExporter';

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 16;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_TOP = PAGE_HEIGHT - 34;

type Rgb = [number, number, number];

const VERDICT_COLORS: Record<string, { fill: Rgb; text: Rgb }> = {
  'Anuncio sospechoso': { fill: [254, 226, 226], text: [153, 27, 27] },
  Verificado: { fill: [209, 250, 229], text: [6, 95, 70] },
  'Sin datos suficientes': { fill: [254, 243, 199], text: [146, 64, 14] },
};

/**
 * Las fuentes estándar de PDF (Helvetica) solo cubren Latin-1: reemplazamos los
 * símbolos tipográficos que usa la app y descartamos emojis para no imprimir basura.
 */
export function toPdfSafeText(text: string): string {
  return text
    .replace(/[•▪]/g, '-')
    .replace(/[—–]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, '...')
    .replace(/σ/g, ' desv.')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/[^\n\x20-\xFF]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Adaptador PDF con jsPDF cargado con import dinámico: la librería (~350 kB)
 * solo se descarga cuando el estudiante toca "Descargar PDF".
 */
export class JsPdfReportExporter implements ReportPdfExporter {
  public async toPdf(report: ReportPdfContent): Promise<Blob> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    doc.setProperties({
      title: `Reporte CuartoSeguro ${report.id}`,
      subject: 'Verificación preventiva de alquiler estudiantil',
      creator: 'CuartoSeguro (UADE · Grupo 12)',
    });

    let y = MARGIN;

    // Encabezado
    doc.setFillColor(26, 22, 16);
    doc.rect(0, 0, PAGE_WIDTH, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('CuartoSeguro', MARGIN, 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(toPdfSafeText('Resumen de la verificación'), MARGIN, 17.5);
    doc.text(toPdfSafeText(`ID ${report.id} · ${report.issuedAt}`), PAGE_WIDTH - MARGIN, 17.5, {
      align: 'right',
    });
    y = 32;

    // Anuncio y datos
    doc.setTextColor(15, 23, 42);
    y = this.labelValue(doc, 'Anuncio verificado', report.listing, y);
    y = this.labelValue(doc, 'Zona', `${report.zone} · ${report.rentAndDeposit}`, y);

    // Veredicto + confianza + recomendación
    const colors = VERDICT_COLORS[report.verdict] ?? VERDICT_COLORS['Sin datos suficientes'];
    const reasonLines = doc.splitTextToSize(
      toPdfSafeText(`Motivo principal: ${report.primaryReason}`),
      CONTENT_WIDTH - 8
    ) as string[];
    const boxHeight = 24 + reasonLines.length * 4.6;
    doc.setFillColor(...colors.fill);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, boxHeight, 3, 3, 'F');
    doc.setTextColor(...colors.text);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('VEREDICTO', MARGIN + 4, y + 7);
    doc.text('NIVEL DE CONFIANZA', PAGE_WIDTH - MARGIN - 4, y + 7, { align: 'right' });
    doc.setFontSize(17);
    doc.text(toPdfSafeText(report.verdict), MARGIN + 4, y + 15);
    doc.text(`${report.confidenceLevel}%`, PAGE_WIDTH - MARGIN - 4, y + 15, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(reasonLines, MARGIN + 4, y + 21.5);
    y += boxHeight + 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(toPdfSafeText(`Recomendación: ${report.recommendation}`), MARGIN, y);
    y += 8;

    // Motivos (hasta donde entre en una página)
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('MOTIVOS DETECTADOS', MARGIN, y);
    y += 5;

    let printed = 0;
    for (const reason of report.reasons) {
      const titleLines = doc.splitTextToSize(toPdfSafeText(`- ${reason.title}`), CONTENT_WIDTH) as string[];
      const descLines = doc.splitTextToSize(toPdfSafeText(reason.description), CONTENT_WIDTH - 4) as string[];
      const needed = titleLines.length * 4.4 + descLines.length * 3.8 + 3;
      if (y + needed > FOOTER_TOP - 6) break;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(titleLines, MARGIN, y);
      y += titleLines.length * 4.4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(descLines, MARGIN + 4, y);
      y += descLines.length * 3.8 + 3;
      printed++;
    }

    const remaining = report.reasons.length - printed;
    if (remaining > 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.text(
        toPdfSafeText(`(+${remaining} motivo${remaining === 1 ? '' : 's'} más en la app, Pantalla 7)`),
        MARGIN,
        y
      );
    }

    // Pie: descargo obligatorio
    doc.setDrawColor(203, 213, 225);
    doc.line(MARGIN, FOOTER_TOP, PAGE_WIDTH - MARGIN, FOOTER_TOP);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(180, 83, 9);
    const disclaimerLines = doc.splitTextToSize(toPdfSafeText(report.disclaimer), CONTENT_WIDTH) as string[];
    doc.text(disclaimerLines, MARGIN, FOOTER_TOP + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      toPdfSafeText(
        'Generado automáticamente por CuartoSeguro (TP UADE · Tecnología e Innovación · Grupo 12). Las bases de fotos y de CBU/alias son acotadas: un resultado "Verificado" no garantiza que el anuncio sea real.'
      ),
      MARGIN,
      PAGE_HEIGHT - 12,
      { maxWidth: CONTENT_WIDTH }
    );

    return doc.output('blob');
  }

  private labelValue(doc: JsPdfDocument, label: string, value: string, y: number): number {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(toPdfSafeText(label.toUpperCase()), MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    const lines = (doc.splitTextToSize(toPdfSafeText(value), CONTENT_WIDTH) as string[]).slice(0, 2);
    doc.text(lines, MARGIN, y + 4.5);
    return y + 4.5 + lines.length * 4.4 + 2.5;
  }
}
