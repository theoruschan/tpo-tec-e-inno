import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  ArrowRight,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { VerificationResult } from '../../domain/entities/types';
import { PilotFeedbackRepository } from '../../domain/ports/PilotFeedbackRepository';
import { FeedbackCard } from '../components/FeedbackCard';
import { VerdictStamp } from '../components/VerdictStamp';

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
  // App pasa una función nueva en cada render; con una ref los timers no se reinician.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const t1 = window.setTimeout(() => setActiveStep(2), 650);
    const t2 = window.setTimeout(() => setActiveStep(3), 1300);
    const t3 = window.setTimeout(() => onCompleteRef.current(), 1950);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, []);

  const currentStep = PROCESSING_STEPS.find((item) => item.step === activeStep);

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      {/* Solo se anuncia el paso actual, no toda la tarjeta en cada cambio */}
      <p role="status" aria-live="polite" className="sr-only">
        {currentStep ? currentStep.title : ''}
      </p>
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

      <ol className="mt-6 space-y-3">
        {PROCESSING_STEPS.map((item) => {
          const isDone = activeStep > item.step;
          const isCurrent = activeStep === item.step;
          return (
            <li
              key={item.step}
              aria-current={isCurrent ? 'step' : undefined}
              className={`rounded-2xl border p-4 motion-safe:transition-all ${
                isCurrent
                  ? 'border-indigo-300 bg-indigo-50/70 shadow-xs'
                  : isDone
                    ? 'border-emerald-200 bg-emerald-50/40'
                    : 'border-dashed border-slate-300 bg-slate-50'
              }`}
            >
              <div className="flex items-start gap-3">
                {isDone ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
                ) : isCurrent ? (
                  <Loader2 className="h-5 w-5 shrink-0 motion-safe:animate-spin text-indigo-600 mt-0.5" />
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
            </li>
          );
        })}
      </ol>

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
  /** Si se pasa y está habilitado, se muestra el formulario de feedback del piloto. */
  feedbackRepository?: PilotFeedbackRepository;
}

export const Screen6Result: React.FC<Screen6ResultProps> = ({
  result,
  onViewDetails,
  onViewReport,
  onNewVerification,
  feedbackRepository,
}) => {
  const isSuspicious = result.verdict === 'Anuncio sospechoso';
  const isVerified = result.verdict === 'Verificado';

  // El color del veredicto va en el filo superior de la ficha, como la cinta de un expediente.
  const edge = isSuspicious
    ? 'border-t-red-700'
    : isVerified
      ? 'border-t-emerald-700'
      : 'border-t-amber-600';

  return (
    <div className="mx-auto max-w-2xl">
      <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-slate-600">
        Pantalla 6 de 8 · Resultado
      </p>

      <h1 className="mt-1 text-3xl sm:text-4xl">Veredicto de la verificación.</h1>

      {/* Ficha principal de Veredicto */}
      {/* overflow-x-clip: durante la animación del sello la tinta se agranda y no debe generar scroll horizontal */}
      <div className={`mt-6 overflow-x-clip border border-t-8 border-slate-300 bg-white p-6 shadow-md sm:p-8 ${edge}`}>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 max-w-full">
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-slate-600">
              Veredicto
            </span>
            <h2 className="mt-3 pl-1">
              <VerdictStamp verdict={result.verdict} size="lg" animate />
            </h2>
          </div>

          <div className="min-w-[10rem] border border-slate-300 px-4 py-2.5 text-right">
            <span className="block font-mono text-[10px] font-medium uppercase tracking-wider text-slate-600">
              Nivel de confianza
            </span>
            <span className="font-mono text-3xl font-medium text-slate-900">
              {result.confidenceLevel}%
            </span>
            <span className="mt-0.5 block text-[10px] text-slate-600">
              Índice del motor, no una probabilidad
            </span>
          </div>
        </div>

        <div className="mt-7 border-t border-dashed border-slate-300 pt-5">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-slate-600">
            Motivo principal:
          </span>
          <p className="mt-1 font-serif text-xl font-semibold leading-snug text-slate-900">
            {result.primaryReason}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-slate-800">
            Recomendación inmediata:{' '}
            <strong className="border-b-2 border-slate-900 pb-px">{result.recommendation}</strong>
          </span>
          <span className="text-slate-600">
            Zona analizada: {result.priceComparison.zone.neighborhood} (
            {result.priceComparison.zone.city})
          </span>
        </div>
      </div>

      {/* Acciones principales de Pantalla 6 */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-2">
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

      {feedbackRepository?.enabled && (
        <FeedbackCard key={result.id} result={result} repository={feedbackRepository} />
      )}
    </div>
  );
};
