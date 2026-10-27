/**
 * Puerto para exportar el reporte de la Pantalla 8 a un archivo PDF.
 * Recibe el contenido ya armado (ver BuildVerificationReportUseCase).
 */
export interface ReportPdfContent {
  id: string;
  issuedAt: string;
  listing: string;
  zone: string;
  rentAndDeposit: string;
  verdict: string;
  confidenceLevel: number;
  primaryReason: string;
  recommendation: string;
  reasons: { title: string; description: string; severity: string }[];
  disclaimer: string;
}

export interface ReportPdfExporter {
  toPdf(report: ReportPdfContent): Promise<Blob>;
}
