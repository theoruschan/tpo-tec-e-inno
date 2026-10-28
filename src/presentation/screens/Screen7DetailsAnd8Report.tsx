import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Flag,
  LifeBuoy,
  RefreshCcw,
  FileDown,
  Share2,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  Info,
  Printer,
} from 'lucide-react';
import { BuildVerificationReportUseCase } from '../../application/BuildVerificationReportUseCase';
import { VerificationResult } from '../../domain/entities/types';
import { ReportPdfExporter } from '../../domain/ports/ReportPdfExporter';
import { PriceComparisonChart } from '../components/PriceComparisonChart';
import { SupportDialog } from '../components/SupportDialog';
import { VerdictStamp } from '../components/VerdictStamp';
import { formatDateTime } from '../utils/formatDateTime';

interface Screen7DetailsProps {
  result: VerificationResult;
  /** Devuelve el mensaje a mostrar (pendiente de moderación / guardado localmente). */
  onReportFraud: (reason: string) => Promise<string>;
  onRequestSecondVerification: () => void;
  onGoToReport: () => void;
  onBackToVerdict: () => void;
}

export const Screen7Details: React.FC<Screen7DetailsProps> = ({
  result,
  onReportFraud,
  onRequestSecondVerification,
  onGoToReport,
  onBackToVerdict,
}) => {
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [hasReported, setHasReported] = useState(false);
  const [customReportReason, setCustomReportReason] = useState('');
  const [showReportBox, setShowReportBox] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const handleConfirmReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReport(true);
    try {
      const message = await onReportFraud(
        customReportReason ||
          `Confirmado como estafa por estudiante (${result.primaryReason})`
      );
      setReportMessage(message);
      setHasReported(true);
      setShowReportBox(false);
    } catch {
      setReportMessage('No pudimos enviar el reporte. Probá de nuevo en unos minutos.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-3xl border border-slate-300 bg-white p-6 shadow-md sm:p-8">
        <p className="border-b border-dashed border-slate-300 pb-3 font-mono text-xs font-medium uppercase tracking-[0.18em] text-slate-600">
          Pantalla 7 de 8 · Detalles de la verificación
        </p>

        <h1 className="mt-4 text-3xl sm:text-4xl">
          Por qué marcamos este anuncio.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          Cada motivo de alerta o validación técnica se explica por separado para
          que puedas decidir con evidencia concreta.
        </p>

        {/* Evidencia visual si se detectó foto robada en otro anuncio */}
        {result.matchedDuplicateImage && (
          <div className="mt-5 border-l-4 border-red-700 bg-red-50/70 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <img
                src={result.matchedDuplicateImage.thumbnailUrl}
                alt={result.matchedDuplicateImage.title}
                className="h-28 w-40 shrink-0 -rotate-2 border-4 border-white object-cover shadow-md ring-1 ring-red-300"
              />
              <div className="space-y-1 text-xs">
                <span className="inline-block rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">
                  Coincidencia de Búsqueda Inversa de Imagen
                </span>
                <h2 className="text-sm font-bold text-red-950">
                  {result.matchedDuplicateImage.title}
                </h2>
                <p className="text-red-900">
                  <strong>Fuente original detectada:</strong>{' '}
                  {result.matchedDuplicateImage.originalSource} (
                  {result.matchedDuplicateImage.originalCity}) — Precio real: $
                  {result.matchedDuplicateImage.originalPriceArs.toLocaleString(
                    'es-AR'
                  )}
                </p>
                <p className="text-red-800">
                  {result.matchedDuplicateImage.notes}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Desglose individual de motivos (Requisito de Pantalla 7) */}
        <div className="mt-6 space-y-3">
          <h2 className="border-b-2 border-slate-900 pb-1.5 font-serif text-xl font-semibold text-slate-900">
            Motivos explicados por separado ({result.findings.length})
          </h2>

          {result.findings.map((finding, index) => {
            const isCrit = finding.severity === 'critical';
            const isWarn = finding.severity === 'warning';
            const isPos = finding.severity === 'positive';

            return (
              <div
                key={finding.id}
                className={`border-b border-l-4 border-b-slate-200 py-3 pl-4 pr-1 ${
                  isCrit
                    ? 'border-l-red-700 bg-red-50/50'
                    : isWarn
                      ? 'border-l-amber-600 bg-amber-50/50'
                      : isPos
                        ? 'border-l-emerald-700 bg-emerald-50/40'
                        : 'border-l-slate-400'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span aria-hidden="true" className="w-6 shrink-0 font-mono text-xs text-slate-500">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {isCrit ? (
                      <ShieldAlert className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
                    ) : isWarn ? (
                      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                    ) : isPos ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
                    ) : (
                      <Info className="h-5 w-5 shrink-0 text-indigo-600 mt-0.5" />
                    )}
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {finding.title}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-700">
                        {finding.description}
                      </p>
                      {finding.evidenceDetail && (
                        <p className="mt-1.5 font-mono text-[11px] text-slate-600">
                          {finding.evidenceDetail}
                        </p>
                      )}
                    </div>
                  </div>
                  {finding.riskPoints > 0 && (
                    <span className="shrink-0 border border-red-700 px-2 py-0.5 font-mono text-[11px] font-medium text-red-800">
                      +{finding.riskPoints} pts riesgo
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Gráfico comparativo BI de precios por zona */}
        <div className="mt-6">
          <PriceComparisonChart comparison={result.priceComparison} />
        </div>

        {/* Las 3 Acciones de Usuario especificadas en la Pantalla 7 del PDF */}
        <div className="mt-6 border-2 border-slate-900 p-4">
          <h2 className="font-serif text-xl font-semibold text-slate-900">
            Acciones disponibles ante este resultado
          </h2>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Acción 1: Reportar anuncio como estafa confirmada */}
            <button
              type="button"
              disabled={hasReported}
              onClick={() => setShowReportBox(!showReportBox)}
              className={`flex flex-col items-start justify-between rounded-md border-2 p-3.5 text-left transition ${
                hasReported
                  ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                  : 'border-slate-300 bg-white hover:border-red-700 hover:bg-red-50/40'
              }`}
            >
              <Flag
                className={`h-5 w-5 ${hasReported ? 'text-emerald-600' : 'text-rose-600'}`}
              />
              <div className="mt-2">
                <span className="block text-xs font-bold text-slate-900">
                  {hasReported
                    ? 'Reportado en el directorio'
                    : 'Reportar estafa confirmada'}
                </span>
                <span className="mt-0.5 block text-[11px] text-slate-600">
                  {hasReported
                    ? 'Recibimos tu reporte.'
                    : 'Si lo comprobaste por tu cuenta, alertá a otros estudiantes.'}
                </span>
              </div>
            </button>

            {/* Acción 2: Pedir una segunda verificación si consigue más información */}
            <button
              type="button"
              onClick={onRequestSecondVerification}
              className="flex flex-col items-start justify-between rounded-md border-2 border-slate-300 bg-white p-3.5 text-left transition hover:border-slate-900"
            >
              <RefreshCcw className="h-5 w-5 text-slate-900" />
              <div className="mt-2">
                <span className="block text-xs font-bold text-slate-900">
                  Pedir segunda verificación
                </span>
                <span className="mt-0.5 block text-[11px] text-slate-600">
                  Si conseguiste el CBU, matrícula o más datos del propietario.
                </span>
              </div>
            </button>

            {/* Acción 3: Contactar soporte humano ante dudas */}
            <button
              type="button"
              onClick={() => setIsSupportOpen(true)}
              className="flex flex-col items-start justify-between rounded-md border-2 border-slate-300 bg-white p-3.5 text-left transition hover:border-slate-900"
            >
              <LifeBuoy className="h-5 w-5 text-slate-900" />
              <div className="mt-2">
                <span className="block text-xs font-bold text-slate-900">
                  Contactar soporte humano
                </span>
                <span className="mt-0.5 block text-[11px] text-slate-600">
                  Recibí asistencia de un voluntario ante dudas puntuales.
                </span>
              </div>
            </button>
          </div>

          <p aria-live="polite" className="mt-3 text-xs font-semibold text-slate-700">
            {reportMessage}
          </p>

          {showReportBox && !hasReported && (
            <form
              onSubmit={handleConfirmReport}
              className="mt-4 space-y-3 border-l-4 border-red-700 bg-red-50/60 p-4"
            >
              <label
                htmlFor="report-reason"
                className="block text-xs font-bold text-rose-950"
              >
                Motivo del reporte para el Directorio Colaborativo (CBU/Alias:{' '}
                {result.input.cbuOrAlias || 'Sin alias'})
              </label>
              <input
                id="report-reason"
                type="text"
                required
                value={customReportReason}
                onChange={(e) => setCustomReportReason(e.target.value)}
                placeholder="Ej: Pedí ver el departamento y me bloqueó después de pasarme el alias..."
                className="w-full rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReportBox(false)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-60"
                >
                  {isSubmittingReport ? 'Enviando…' : 'Confirmar reporte comunitario'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Navegación a Pantalla 8 (Reporte) */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={onBackToVerdict}
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al veredicto
          </button>

          <button
            type="button"
            onClick={onGoToReport}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-xs font-bold text-white hover:bg-slate-700"
          >
            Generar Resumen y Reporte (Pantalla 8)
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <SupportDialog
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        listingReference={result.input.listingUrlOrCapture}
      />
    </div>
  );
};

interface Screen8ReportProps {
  result: VerificationResult;
  onBackToDetails: () => void;
  pdfExporter: ReportPdfExporter;
}

const reportBuilder = new BuildVerificationReportUseCase();

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const Screen8Report: React.FC<Screen8ReportProps> = ({
  result,
  onBackToDetails,
  pdfExporter,
}) => {
  const [actionMessage, setActionMessage] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const report = reportBuilder.execute(result);

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const blob = await pdfExporter.toPdf(report);
      triggerDownload(blob, reportBuilder.fileName(report));
      setActionMessage('PDF descargado.');
    } catch {
      setActionMessage(
        'No pudimos generar el PDF. Probá con "Imprimir" y elegí "Guardar como PDF".'
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareWithFamily = async () => {
    const summaryText = reportBuilder.toShareText(report);

    // 1) Web Share API (celulares): comparte el PDF si el navegador lo soporta, si no el texto.
    if (typeof navigator.share === 'function') {
      try {
        let shareData: ShareData = { title: 'Reporte CuartoSeguro', text: summaryText };
        try {
          const pdf = new File(
            [await pdfExporter.toPdf(report)],
            reportBuilder.fileName(report),
            { type: 'application/pdf' }
          );
          if (navigator.canShare?.({ files: [pdf] })) {
            shareData = { ...shareData, files: [pdf] };
          }
        } catch {
          // Sin PDF: se comparte solo el texto.
        }
        await navigator.share(shareData);
        setActionMessage('Reporte compartido.');
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }

    // 2) Fallback: copiar el resumen al portapapeles.
    try {
      await navigator.clipboard.writeText(summaryText);
      setActionMessage('¡Resumen copiado para enviar por WhatsApp!');
    } catch {
      setActionMessage(
        'No pudimos copiar automáticamente. Seleccioná el texto del reporte y copialo a mano.'
      );
    }
  };

  const isSuspicious = result.verdict === 'Anuncio sospechoso';
  const isVerified = result.verdict === 'Verificado';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="print-container rounded-3xl border-4 border-double border-slate-900 bg-white p-6 shadow-md sm:p-10">
        <p className="no-print border-b border-dashed border-slate-300 pb-3 font-mono text-xs font-medium uppercase tracking-[0.18em] text-slate-600">
          Pantalla 8 de 8 · Reporte descargable y compartible
        </p>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-900 pb-5">
          <div>
            <h1 className="text-3xl sm:text-4xl">
              Resumen de la verificación.
            </h1>
            <p className="mt-2 font-mono text-xs text-slate-700">
              ID Reporte: <strong>{result.id}</strong> · Emitido el{' '}
              {formatDateTime(result.createdAt)}
            </p>
          </div>

          <div className="border-2 border-slate-900 px-4 py-2.5 text-right">
            <span className="block font-mono text-[11px] font-medium uppercase tracking-wider text-slate-700">
              CuartoSeguro · UADE G12
            </span>
            <span className="font-serif text-sm font-semibold text-slate-900">
              Certificado Preventivo Estudiantil
            </span>
          </div>
        </div>

        {/* 1. Fecha y anuncio verificado (link o captura) */}
        <div className="mt-5 grid grid-cols-1 gap-4 border-b border-dashed border-slate-300 pb-5 text-xs sm:grid-cols-2">
          <div>
            <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-slate-600">
              Anuncio verificado (Link o Captura):
            </span>
            <p className="mt-1 break-all font-semibold text-slate-900">
              {result.input.listingUrlOrCapture}
            </p>
            {result.input.captureFileName && (
              <p className="mt-0.5 text-slate-600">
                Captura adjunta: {result.input.captureFileName}
              </p>
            )}
          </div>
          <div>
            <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-slate-600">
              Datos del alquiler y propietario:
            </span>
            <p className="mt-1 font-semibold text-slate-900">
              Zona: {result.priceComparison.zone.neighborhood} (
              {result.priceComparison.zone.city})
            </p>
            <p className="text-slate-700">
              Alquiler: $
              {result.input.monthlyRentArs.toLocaleString('es-AR')}/mes · Seña
              pedida: ${result.input.depositRequestedArs.toLocaleString('es-AR')}
            </p>
            <p className="text-slate-700">
              Contacto: {result.input.ownerName || 'No informado'} · CBU/Alias:{' '}
              {result.input.cbuOrAlias || 'No informado'}
            </p>
          </div>
        </div>

        {/* 2. Veredicto final y nivel de confianza + 4. Recomendación */}
        <div
          className={`mt-5 border-b border-t-8 border-slate-300 py-5 ${
            isSuspicious
              ? 'border-t-red-700'
              : isVerified
                ? 'border-t-emerald-700'
                : 'border-t-amber-600'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-slate-600">
                Veredicto Final
              </span>
              <div className="mt-2">
                <VerdictStamp verdict={result.verdict} />
              </div>
              <h2 className="mt-3 font-serif text-lg font-semibold text-slate-900">
                {result.verdict} (Nivel de confianza: {result.confidenceLevel}
                %)
              </h2>
            </div>

            <div className="border-2 border-slate-900 px-4 py-2">
              <span className="block font-mono text-[10px] font-medium uppercase tracking-wider text-slate-600">
                Recomendación sugerida
              </span>
              <span className="font-serif text-base font-semibold text-slate-900">
                {result.recommendation}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Motivos detectados */}
        <div className="mt-5">
          <h3 className="font-serif text-xl font-semibold text-slate-900">
            Motivos detectados en el análisis
          </h3>
          <ul className="mt-2.5 divide-y divide-slate-200 border-y-2 border-slate-900">
            {result.findings.map((f) => (
              <li key={f.id} className="p-3.5 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>• {f.title}</span>
                  <span className="font-mono text-[11px] text-slate-600 uppercase">
                    {f.category.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="mt-1 text-slate-600">{f.description}</p>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-5 border-l-4 border-amber-700 bg-amber-50/60 p-3 text-xs font-semibold text-amber-900">
          {report.disclaimer}
        </p>
        <p className="mt-2 text-[11px] text-slate-600">
          Nota: Este reporte fue generado automáticamente cruzando búsqueda
          inversa de imágenes, estadísticas de precios por zona universitaria
          (BI) y el directorio colaborativo de CBU/reportes de CuartoSeguro. No
          reemplaza la visita presencial ni la firma de contrato.
        </p>

        {/* Acciones de Pantalla 8: Descargar PDF o compartir con quien vaya a pagar (ej. un familiar) */}
        <div className="no-print mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
          <button
            type="button"
            onClick={onBackToDetails}
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a detalles
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>

            <button
              type="button"
              onClick={handleShareWithFamily}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-900 bg-white px-5 py-3 text-xs font-bold text-slate-900 hover:bg-slate-100"
            >
              <Share2 className="h-4 w-4" />
              Compartir con quien vaya a pagar (ej. un familiar)
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-60"
            >
              <FileDown className="h-4 w-4" />
              {isGeneratingPdf ? 'Generando PDF…' : 'Descargar PDF'}
            </button>
          </div>
        </div>
        <p aria-live="polite" className="no-print mt-3 text-right text-xs font-semibold text-slate-800">
          {actionMessage}
        </p>
      </div>
    </div>
  );
};
