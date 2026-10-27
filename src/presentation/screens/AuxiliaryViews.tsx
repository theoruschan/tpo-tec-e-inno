import React, { useState } from 'react';
import {
  Search,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Database,
  FlaskConical,
  History,
  CheckCircle2,
  Upload,
  XCircle,
} from 'lucide-react';
import { SplitBenchmarkSummary } from '../../application/RunExperimentBenchmarkUseCase';
import {
  ExperimentBenchmarkSummary,
  FraudDirectoryEntry,
  VerificationResult,
} from '../../domain/entities/types';
import { DirectorySourceKind } from '../../domain/ports/FraudDirectoryRepository';
import { maskIdentifier, maskPhone } from '../../domain/services/IdentifierPrivacy';
import { formatDateTime } from '../utils/formatDateTime';

interface HistoryViewProps {
  history: VerificationResult[];
  onSelectResult: (result: VerificationResult) => void;
  onStartNew: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onSelectResult,
  onStartNew,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600">
            <History className="h-4 w-4" />
            Historial local del estudiante
          </span>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
            Verificaciones anteriores ({history.length})
          </h1>
          <p className="text-xs text-slate-600">
            Consultá rápidamente los anuncios que ya analizaste antes de tomar
            una decisión.
          </p>
        </div>

        <button
          type="button"
          onClick={onStartNew}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
        >
          Nueva verificación
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {history.map((item) => {
          const isSuspicious = item.verdict === 'Anuncio sospechoso';
          const isVerified = item.verdict === 'Verificado';

          return (
            <div
              key={item.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:flex-row sm:items-center"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      isSuspicious
                        ? 'bg-red-100 text-red-800'
                        : isVerified
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isSuspicious ? (
                      <ShieldAlert className="h-3.5 w-3.5" />
                    ) : isVerified ? (
                      <ShieldCheck className="h-3.5 w-3.5" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    )}
                    {item.verdict} ({item.confidenceLevel}% confianza)
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatDateTime(item.createdAt)}
                  </span>
                </div>

                <h2 className="text-sm font-bold text-slate-900 break-all">
                  {item.input.listingUrlOrCapture}
                </h2>
                <p className="text-xs text-slate-600">
                  <strong>Motivo principal:</strong> {item.primaryReason}
                </p>
                <p className="text-xs text-slate-500">
                  Zona: {item.priceComparison.zone.neighborhood} · Alquiler: $
                  {item.input.monthlyRentArs.toLocaleString('es-AR')} · Seña: $
                  {item.input.depositRequestedArs.toLocaleString('es-AR')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onSelectResult(item)}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
              >
                Abrir veredicto y reporte
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface DirectoryViewProps {
  directory: FraudDirectoryEntry[];
  sourceKind: DirectorySourceKind;
}

const DIRECTORY_SOURCE_NOTE: Record<DirectorySourceKind, string> = {
  shared:
    'Directorio compartido entre estudiantes. Los reportes de la Pantalla 7 entran como pendientes de moderación; solo se muestran identificadores aprobados o reportados por 3 estudiantes de forma independiente.',
  local:
    'Modo local: este directorio vive solo en tu navegador (datos semilla ficticios + tus reportes). No se comparte con otros estudiantes.',
  'local-fallback':
    'Sin conexión con el directorio compartido: se muestra la copia local de este navegador.',
};

export const DirectoryView: React.FC<DirectoryViewProps> = ({
  directory,
  sourceKind,
}) => {
  const [query, setQuery] = useState('');

  const filtered = directory.filter((entry) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      entry.cbuOrAlias.toLowerCase().includes(q) ||
      (entry.phoneContact && entry.phoneContact.toLowerCase().includes(q)) ||
      entry.city.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-600">
          <Database className="h-4 w-4" />
          Alternativas 6 y 11 de la Matriz de Priorización
        </span>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">
          Directorio Colaborativo de CBU, Alias y Reportes Cruzados
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Base comunitaria consultable antes de transferir una seña.
        </p>
        <p
          className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700"
          data-testid="directory-source-note"
        >
          {DIRECTORY_SOURCE_NOTE[sourceKind]} Por privacidad se muestran CBU, alias y
          teléfonos parciales y nunca nombres de personas.
        </p>

        <div className="mt-5">
          <label
            htmlFor="directory-search"
            className="block text-xs font-bold text-slate-800"
          >
            Buscar por CBU, Alias, Teléfono o Ciudad
          </label>
          <span
            id="directory-search-hint"
            className="mb-1 block text-xs text-slate-500"
          >
            Filtra sobre la versión parcial. Para chequear un alias completo, usá la verificación: cruza por hash exacto.
          </span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              id="directory-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-describedby="directory-search-hint"
              placeholder="Ej: alquiler.facil.ya.mp, 00000031..., Córdoba, +54 9 11..."
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-indigo-600 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filtered.map((entry) => (
          <div
            key={entry.id}
            className="rounded-2xl border border-rose-200 bg-white p-5 shadow-2xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-rose-100 px-2.5 py-1 font-mono text-xs font-bold text-rose-900">
                  {maskIdentifier(entry.cbuOrAlias)}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  {entry.city}
                </span>
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                  {entry.reportsCount}{' '}
                  {entry.reportsCount === 1 ? 'reporte' : 'reportes'}
                </span>
              </div>
              <span className="text-xs text-slate-500">
                Fuente: <strong>{entry.source}</strong> · Último:{' '}
                {entry.lastReportedAt}
              </span>
            </div>

            {entry.phoneContact && (
              <h2 className="mt-2.5 text-sm font-bold text-slate-900">
                Teléfono reportado: {maskPhone(entry.phoneContact)}
              </h2>
            )}
            <p className="mt-1 text-xs text-slate-600">{entry.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

interface ExperimentBenchmarkViewProps {
  benchmark: SplitBenchmarkSummary;
  datasetName: string;
  isCustomDataset: boolean;
  datasetErrors: string[];
  onLoadDataset: (file: File) => void;
  onResetDataset: () => void;
  onInspectCase: (result: VerificationResult) => void;
}

const MetricsRow: React.FC<{ title: string; summary: ExperimentBenchmarkSummary; tone: string }> = ({
  title,
  summary,
  tone,
}) => (
  <div className={`rounded-2xl border p-4 ${tone}`}>
    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
      {title} · {summary.totalCases} {summary.totalCases === 1 ? 'caso' : 'casos'} ({summary.totalActualFrauds} estafas,{' '}
      {summary.totalActualLegitimate} legítimos, {summary.totalActualInsufficientData} sin datos)
    </h3>
    <dl className="mt-2 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
      <div>
        <dt className="text-slate-600">Recall de estafas</dt>
        <dd className="text-2xl font-black text-slate-900">
          {summary.totalActualFrauds > 0 ? `${summary.fraudDetectionRecallPercent}%` : '—'}
        </dd>
        <dd className="text-[11px] text-slate-600">
          {summary.detectedFraudsTruePositives}/{summary.totalActualFrauds} detectadas
        </dd>
      </div>
      <div>
        <dt className="text-slate-600">Precisión</dt>
        <dd className="text-2xl font-black text-slate-900">
          {summary.detectedFraudsTruePositives + summary.falseAlarmsFalsePositives > 0
            ? `${summary.precisionPercent}%`
            : '—'}
        </dd>
        <dd className="text-[11px] text-slate-600">
          {summary.falseAlarmsFalsePositives} falsa{summary.falseAlarmsFalsePositives === 1 ? '' : 's'} alarma
          {summary.falseAlarmsFalsePositives === 1 ? '' : 's'}
        </dd>
      </div>
      <div>
        <dt className="text-slate-600">Accuracy (3 clases)</dt>
        <dd className="text-2xl font-black text-slate-900">{summary.overallAccuracyPercent}%</dd>
      </div>
      <div>
        <dt className="text-slate-600">Legítimos / sin datos bien clasificados</dt>
        <dd className="text-2xl font-black text-slate-900">
          {summary.verifiedLegitimateTrueNegatives}/{summary.totalActualLegitimate} ·{' '}
          {summary.insufficientDataDetected}/{summary.totalActualInsufficientData}
        </dd>
      </div>
    </dl>
  </div>
);

export const ExperimentBenchmarkView: React.FC<ExperimentBenchmarkViewProps> = ({
  benchmark,
  datasetName,
  isCustomDataset,
  datasetErrors,
  onLoadDataset,
  onResetDataset,
  onInspectCase,
}) => {
  const [filterTruth, setFilterTruth] = useState<string>('ALL');
  const full = benchmark.full;
  const splitByCase = new Map<number, string>();
  for (const ev of benchmark.calibration.evaluations) splitByCase.set(ev.sample.caseNumber, 'Calibración');
  for (const ev of benchmark.evaluation.evaluations) splitByCase.set(ev.sample.caseNumber, 'Evaluación');

  const filteredEvaluations = full.evaluations.filter((ev) => {
    if (filterTruth === 'ALL') return true;
    return ev.sample.groundTruth === filterTruth;
  });

  return (
    <div className="space-y-6">
      {/* Encabezado del Experimento del Mapa de Oportunidad Tecnológica */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700">
          <FlaskConical className="h-4 w-4" />
          Entregable 2 · Mapa de Oportunidad Tecnológica (Punto 6: Experimento y Métrica)
        </span>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">
          Experimento de validación con {full.totalCases} anuncios
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          <em>
            "Verificar manualmente 30 anuncios reales de una ciudad
            universitaria y comparar contra lo que realmente pasó. Métrica: % de
            anuncios truchos detectados correctamente."
          </em>{' '}
          Cada fila ejecuta el motor real de CuartoSeguro (`VerifyListingUseCase`) y
          contrasta su veredicto contra el resultado informado en el dataset.
        </p>

        {/* Aviso de honestidad metodológica */}
        <div
          role="note"
          className="mt-4 flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
          {isCustomDataset ? (
            <p>
              <strong>Dataset cargado por vos ({datasetName}).</strong> Si estos anuncios no se usaron
              para ajustar las reglas, la fila <strong>Evaluación</strong> es una medición
              independiente. Con pocos casos, cada error mueve mucho el porcentaje: informá
              siempre el conteo (ej. 9/10) además del %.
            </p>
          ) : (
            <p>
              <strong>Estos 30 casos son un dataset curado e ilustrativo</strong>, armado por el
              equipo para mostrar los patrones del TP. Las reglas y umbrales del motor se
              calibraron mirando estos mismos casos, así que el <strong>100% de recall no es una
              validación independiente</strong>: mide si el motor reproduce lo que ya sabíamos.
              Incluso la parte de "evaluación" vio las reglas ajustadas sobre todo el set. Para
              medir de verdad, cargá tus propios anuncios reales con su resultado (formato en
              docs/04).
            </p>
          )}
        </div>

        {/* Carga de dataset propio */}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
          <label
            htmlFor="dataset-upload"
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-2 font-bold text-indigo-800 hover:bg-indigo-100 focus-within:ring-2 focus-within:ring-indigo-600"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Cargar mi dataset (CSV o JSON)
            <input
              id="dataset-upload"
              type="file"
              accept=".csv,.json,text/csv,application/json"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onLoadDataset(file);
                e.target.value = '';
              }}
            />
          </label>
          {isCustomDataset && (
            <button
              type="button"
              onClick={onResetDataset}
              className="rounded-xl px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100"
            >
              Volver al dataset curado
            </button>
          )}
          <span className="text-slate-600">
            Dataset activo: <strong>{datasetName}</strong> ({full.totalCases} casos)
          </span>
        </div>
        {datasetErrors.length > 0 && (
          <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900">
            <p className="font-bold">
              {datasetErrors.length} fila{datasetErrors.length === 1 ? '' : 's'} con problemas
              {isCustomDataset ? ' (se omitieron; el resto se evaluó):' : ' (no se cargó el dataset):'}
            </p>
            <ul className="mt-1 list-disc pl-5">
              {datasetErrors.slice(0, 8).map((err) => (
                <li key={err}>{err}</li>
              ))}
              {datasetErrors.length > 8 && <li>… y {datasetErrors.length - 8} más.</li>}
            </ul>
          </div>
        )}

        {/* Métricas separadas por calibración y evaluación */}
        <div className="mt-6 space-y-3">
          <p className="text-xs text-slate-600">
            {benchmark.splitSource === 'explicit'
              ? 'La separación calibración/evaluación viene de la columna "split" del dataset.'
              : 'Separación automática: 1 de cada 3 casos de cada etiqueta (por número de caso) va a evaluación.'}
          </p>
          <MetricsRow
            title="Calibración"
            summary={benchmark.calibration}
            tone="border-slate-200 bg-slate-50"
          />
          <MetricsRow
            title="Evaluación"
            summary={benchmark.evaluation}
            tone="border-indigo-200 bg-indigo-50/60"
          />
          <MetricsRow title="Total" summary={full} tone="border-slate-200 bg-white" />
        </div>

        {/* Mitigación del Riesgo Principal: Calidad dispar de registros públicos por ciudad */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Riesgo principal: desempeño según calidad de registros públicos por ciudad (total)
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
            {full.byCityBreakdown.map((cityStat) => (
              <div
                key={cityStat.city}
                className="rounded-xl border border-slate-200 bg-white p-3 text-xs"
              >
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>{cityStat.city}</span>
                  <span className="text-emerald-800">
                    {cityStat.accuracyPercent}% acierto
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-600">
                  Calidad registros públicos:{' '}
                  <strong>{cityStat.publicRegistryQuality}</strong> ({cityStat.correct}/
                  {cityStat.total} casos)
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla interactiva de casos */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">
            Detalle de los {full.totalCases} anuncios contra lo que realmente pasó
          </h2>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {[
              { id: 'ALL', label: `Todos (${full.totalCases})` },
              { id: 'FRAUD', label: `Estafas (${full.totalActualFrauds})` },
              { id: 'LEGITIMATE', label: `Legítimos (${full.totalActualLegitimate})` },
              { id: 'INSUFFICIENT_DATA', label: `Sin datos (${full.totalActualInsufficientData})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={filterTruth === tab.id}
                onClick={() => setFilterTruth(tab.id)}
                className={`rounded-lg px-3 py-1.5 font-semibold ${
                  filterTruth === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 uppercase">
                <th scope="col" className="py-3 pr-3">#</th>
                <th scope="col" className="py-3 px-3">Anuncio / Ciudad / Precio</th>
                <th scope="col" className="py-3 px-3">Lo que realmente pasó</th>
                <th scope="col" className="py-3 px-3">Veredicto CuartoSeguro</th>
                <th scope="col" className="py-3 pl-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvaluations.map((ev) => {
                const { sample, result, isCorrectlyClassified } = ev;
                return (
                  <tr key={sample.caseNumber} className="hover:bg-slate-50/80">
                    <td className="py-3.5 pr-3 font-bold text-slate-600">
                      #{sample.caseNumber}
                      <span className="mt-1 block text-[10px] font-semibold uppercase text-slate-500">
                        {splitByCase.get(sample.caseNumber)}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-900">
                        {sample.title}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-600">
                        {sample.platform} ·{' '}
                        {result.priceComparison.zone.city} ($
                        {sample.input.monthlyRentArs.toLocaleString('es-AR')}
                        /mes · Desvío:{' '}
                        {result.priceComparison.deviationPercent}%)
                      </div>
                    </td>
                    <td className="py-3.5 px-3 max-w-xs text-slate-600">
                      {sample.whatActuallyHappened}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-bold ${
                          result.verdict === 'Anuncio sospechoso'
                            ? 'bg-red-100 text-red-800'
                            : result.verdict === 'Verificado'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {result.verdict} ({result.confidenceLevel}%)
                      </span>
                      {isCorrectlyClassified ? (
                        <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 ml-2">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Coincide
                        </div>
                      ) : (
                        <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-red-800 ml-2">
                          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          No coincide (esperado: {ev.expectedVerdict})
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 pl-3 text-right">
                      <button
                        type="button"
                        onClick={() => onInspectCase(result)}
                        className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 font-bold text-indigo-700 hover:bg-indigo-100"
                      >
                        Ver Pantalla 6
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
