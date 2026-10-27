import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { VerificationResult } from '../../domain/entities/types';

interface Screen5ProcessingProps {
  onComplete: () => void;
}

const PROCESSING_STEPS = [
  {
    step: 1,
    title: 'Paso 1 de 3: comparando fotos con otros anuncios.',
    detail:
      'Ejecutando búsqueda inversa de imagen y detectando fotografías reutilizadas en portales o grupos estudiantiles.',
  },
  {
    step: 2,
    title: 'Paso 2 de 3: revisando el precio contra el promedio de la zona.',
    detail:
      'Calculando desvío estadístico (BI) del alquiler mensual y ratio de seña frente a valores históricos del barrio.',
  },
  {
    step: 3,
    title: 'Paso 3 de 3: cruzando la identidad del propietario.',
    detail:
      'Consultando registros públicos, antigüedad de cuenta, bot de reportes cruzados y directorio colaborativo de CBU/Alias.',
  },
];

export const Screen5Processing: React.FC<Screen5ProcessingProps> = ({
  onComplete,
}) => {
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    const t1 = window.setTimeout(() => setActiveStep(2), 650);
    const t2 = window.setTimeout(() => setActiveStep(3), 1300);
    const t3 = window.setTimeout(() => onComplete(), 1950);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <div
      aria-live="polite"
      className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
        Pantalla 5 de 8 · Procesamiento en curso
      </div>

      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
        Estamos verificando este anuncio.
      </h1>
      <p className="mt-1 text-xs text-slate-600">
        Puede demorar hasta 2 minutos. El progreso se muestra en pantalla en vez
        de dejar la espera en silencio:
      </p>

      <div className="mt-6 space-y-3">
        {PROCESSING_STEPS.map((item) => {
          const isDone = activeStep > item.step;
          const isCurrent = activeStep === item.step;
          return (
            <div
              key={item.step}
              className={`rounded-2xl border p-4 transition-all ${
                isCurrent
                  ? 'border-indigo-300 bg-indigo-50/70 shadow-xs'
                  : isDone
                    ? 'border-emerald-200 bg-emerald-50/40'
                    : 'border-slate-200 bg-slate-50 opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                {isDone ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
                ) : isCurrent ? (
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin text-indigo-600 mt-0.5" />
                ) : (
                  <div className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-300 mt-0.5" />
                )}
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {item.title}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-600">{item.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
        <span>Procesando dentro de la ventana de decisión...</span>
        <button
          type="button"
          onClick={onComplete}
          className="font-semibold text-indigo-600 hover:underline"
        >
          Saltar animación →
        </button>
      </div>
    </div>
  );
};

interface Screen6ResultProps {
  result: VerificationResult;
  onViewDetails: () => void;
  onViewReport: () => void;
  onNewVerification: () => void;
}

export const Screen6Result: React.FC<Screen6ResultProps> = ({
  result,
  onViewDetails,
  onViewReport,
  onNewVerification,
}) => {
  const isSuspicious = result.verdict === 'Anuncio sospechoso';
  const isVerified = result.verdict === 'Verificado';

  const badgeStyles = isSuspicious
    ? 'border-red-300 bg-red-50 text-red-900'
    : isVerified
      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
      : 'border-amber-300 bg-amber-50 text-amber-900';

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
        Pantalla 6 de 8 · Resultado
      </div>

      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
        Veredicto de la verificación.
      </h1>

      {/* Tarjeta principal de Veredicto */}
      <div className={`mt-5 rounded-3xl border-2 p-6 ${badgeStyles}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {isSuspicious ? (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-white">
                <ShieldAlert className="h-7 w-7" />
              </div>
            ) : isVerified ? (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                <ShieldCheck className="h-7 w-7" />
              </div>
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white">
                <AlertTriangle className="h-7 w-7" />
              </div>
            )}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                Veredicto
              </span>
              <h2 className="text-2xl font-black sm:text-3xl">
                {result.verdict}
              </h2>
            </div>
          </div>

          <div className="rounded-2xl bg-white/85 px-4 py-2.5 text-right shadow-2xs">
            <span className="block text-[11px] font-bold uppercase text-slate-500">
              Nivel de confianza
            </span>
            <span className="text-2xl font-black text-slate-900">
              {result.confidenceLevel}%
            </span>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-white/90 p-4 text-slate-900">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Motivo principal:
          </span>
          <p className="mt-1 text-base font-bold text-slate-900">
            {result.primaryReason}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
          <span>
            Recomendación inmediata:{' '}
            <strong className="underline">{result.recommendation}</strong>
          </span>
          <span>
            Zona analizada: {result.priceComparison.zone.neighborhood} (
            {result.priceComparison.zone.city})
          </span>
        </div>
      </div>

      {/* Acciones principales de Pantalla 6 */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={onNewVerification}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Verificar otro anuncio
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onViewReport}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
          >
            <FileText className="h-4 w-4" />
            Ver reporte descargable
          </button>

          <button
            type="button"
            onClick={onViewDetails}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
          >
            Ver detalles
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
