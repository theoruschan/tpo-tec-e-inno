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
  ShieldCheck,
  Info,
  Printer,
} from 'lucide-react';
import { BuildVerificationReportUseCase } from '../../application/BuildVerificationReportUseCase';
import { VerificationResult } from '../../domain/entities/types';
import { ReportPdfExporter } from '../../domain/ports/ReportPdfExporter';
import { PriceComparisonChart } from '../components/PriceComparisonChart';
import { SupportDialog } from '../components/SupportDialog';
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
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
          Pantalla 7 de 8 · Detalles de la verificación
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
          Por qué marcamos este anuncio.
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Cada motivo de alerta o validación técnica se explica por separado para
          que puedas decidir con evidencia concreta.
        </p>

        {/* Evidencia visual si se detectó foto robada en otro anuncio */}
        {result.matchedDuplicateImage && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50/70 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <img
                src={result.matchedDuplicateImage.thumbnailUrl}
                alt={result.matchedDuplicateImage.title}
                className="h-28 w-40 rounded-xl object-cover border border-red-200 shrink-0"
              />
              <div className="space-y-1 text-xs">
                <span className="inline-block rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">
                  Coincidencia de Búsqueda Inversa de Imagen
                </span>
                <h3 className="text-sm font-bold text-red-950">
                  {result.matchedDuplicateImage.title}
                </h3>
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
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Motivos explicados por separado ({result.findings.length})
          </h2>

          {result.findings.map((finding) => {
            const isCrit = finding.severity === 'critical';
            const isWarn = finding.severity === 'warning';
            const isPos = finding.severity === 'positive';

            return (
              <div
                key={finding.id}
                className={`rounded-2xl border p-4 ${
                  isCrit
                    ? 'border-red-200 bg-red-50/60'
                    : isWarn
                      ? 'border-amber-200 bg-amber-50/60'
                      : isPos
                        ? 'border-emerald-200 bg-emerald-50/50'
                        : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
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
                        <p className="mt-1.5 text-[11px] font-medium text-slate-500">
                          {finding.evidenceDetail}
                        </p>
                      )}
                    </div>
                  </div>
                  {finding.riskPoints > 0 && (
                    <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-800">
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
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Acciones disponibles ante este resultado
          </h2>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Acción 1: Reportar anuncio como estafa confirmada */}
            <button
              type="button"
              disabled={hasReported}
              onClick={() => setShowReportBox(!showReportBox)}
              className={`flex flex-col items-start justify-between rounded-xl border p-3.5 text-left transition ${
                hasReported
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  : 'border-rose-200 bg-white hover:border-rose-400 hover:bg-rose-50/40'
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
              className="flex flex-col items-start justify-between rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40"
            >
              <RefreshCcw className="h-5 w-5 text-indigo-600" />
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
              className="flex flex-col items-start justify-between rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40"
            >
              <LifeBuoy className="h-5 w-5 text-indigo-600" />
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
              className="mt-4 rounded-xl border border-rose-200 bg-rose-50/60 p-4 space-y-3"
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
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
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
      <div className="print-container rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="no-print mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
              Pantalla 8 de 8 · Reporte descargable y compartible
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Resumen de la verificación.
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              ID Reporte: <strong>{result.id}</strong> · Emitido el{' '}
              {formatDateTime(result.createdAt)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-right">
            <span className="block text-[11px] font-bold uppercase text-slate-500">
              CuartoSeguro · UADE G12
            </span>
            <span className="text-xs font-semibold text-emerald-700">
              Certificado Preventivo Estudiantil
            </span>
          </div>
        </div>

        {/* 1. Fecha y anuncio verificado (link o captura) */}
        <div className="mt-5 grid grid-cols-1 gap-4 rounded-2xl bg-slate-50 p-4 text-xs sm:grid-cols-2">
          <div>
            <span className="font-bold text-slate-500 uppercase">
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
            <span className="font-bold text-slate-500 uppercase">
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
          className={`mt-5 rounded-2xl border-2 p-5 ${
            isSuspicious
              ? 'border-red-300 bg-red-50'
              : isVerified
                ? 'border-emerald-300 bg-emerald-50'
                : 'border-amber-300 bg-amber-50'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {isSuspicious ? (
                <ShieldAlert className="h-8 w-8 text-red-600" />
              ) : isVerified ? (
                <ShieldCheck className="h-8 w-8 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-amber-600" />
              )}
              <div>
                <span className="text-xs font-bold uppercase text-slate-600">
                  Veredicto Final
                </span>
                <h2 className="text-xl font-black text-slate-900">
                  {result.verdict} (Nivel de confianza: {result.confidenceLevel}
                  %)
                </h2>
              </div>
            </div>

            <div className="rounded-xl bg-white px-4 py-2 shadow-2xs">
              <span className="block text-[10px] font-bold uppercase text-slate-500">
                Recomendación sugerida
              </span>
              <span className="text-sm font-black text-slate-900">
                {result.recommendation}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Motivos detectados */}
        <div className="mt-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Motivos detectados en el análisis
          </h3>
          <ul className="mt-2.5 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {result.findings.map((f) => (
              <li key={f.id} className="p-3.5 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>• {f.title}</span>
                  <span className="text-[11px] text-slate-500 uppercase">
                    {f.category.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="mt-1 text-slate-600">{f.description}</p>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-5 text-xs font-semibold text-amber-800">
          {report.disclaimer}
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
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
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-300 bg-indigo-50 px-5 py-3 text-xs font-bold text-indigo-800 hover:bg-indigo-100"
            >
              <Share2 className="h-4 w-4" />
              Compartir con quien vaya a pagar (ej. un familiar)
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
            >
              <FileDown className="h-4 w-4" />
              {isGeneratingPdf ? 'Generando PDF…' : 'Descargar PDF'}
            </button>
          </div>
        </div>
        <p aria-live="polite" className="no-print mt-3 text-right text-xs font-semibold text-indigo-800">
          {actionMessage}
        </p>
      </div>
    </div>
  );
};
