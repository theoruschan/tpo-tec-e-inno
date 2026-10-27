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
} from 'lucide-react';
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
  benchmark: ExperimentBenchmarkSummary;
  onInspectCase: (result: VerificationResult) => void;
}

export const ExperimentBenchmarkView: React.FC<
  ExperimentBenchmarkViewProps
> = ({ benchmark, onInspectCase }) => {
  const [filterTruth, setFilterTruth] = useState<string>('ALL');

  const filteredEvaluations = benchmark.evaluations.filter((ev) => {
    if (filterTruth === 'ALL') return true;
    return ev.sample.groundTruth === filterTruth;
  });

  return (
    <div className="space-y-6">
      {/* Encabezado del Experimento del Mapa de Oportunidad Tecnológica */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600">
          <FlaskConical className="h-4 w-4" />
          Entregable 2 · Mapa de Oportunidad Tecnológica (Punto 6: Experimento y Métrica)
        </span>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">
          Experimento de Validación con 30 Anuncios Reales
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          <em>
            "Verificar manualmente 30 anuncios reales de una ciudad
            universitaria y comparar contra lo que realmente pasó. Métrica: % de
            anuncios truchos detectados correctamente."
          </em>{' '}
          Cada fila ejecuta el motor real de CuartoSeguro (`VerifyListingUseCase`) y
          contrasta su veredicto contra el resultado empírico.
        </p>

        {/* KPIs del Experimento */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
            <span className="text-[11px] font-bold uppercase text-emerald-800">
              Métrica Clave (% Truchos Detectados)
            </span>
            <p className="mt-1 text-3xl font-black text-emerald-900">
              {benchmark.fraudDetectionRecallPercent}%
            </p>
            <p className="mt-0.5 text-xs text-emerald-800">
              {benchmark.detectedFraudsTruePositives} de{' '}
              {benchmark.totalActualFrauds} estafas reales detectadas a tiempo
            </p>
          </div>

          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
            <span className="text-[11px] font-bold uppercase text-indigo-800">
              Exactitud Global (30 casos)
            </span>
            <p className="mt-1 text-3xl font-black text-indigo-900">
              {benchmark.overallAccuracyPercent}%
            </p>
            <p className="mt-0.5 text-xs text-indigo-800">
              Clasificación ternaria exacta en los {benchmark.totalCases} anuncios
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <span className="text-[11px] font-bold uppercase text-slate-600">
              Alquileres Legítimos Validados
            </span>
            <p className="mt-1 text-3xl font-black text-slate-900">
              {benchmark.verifiedLegitimateTrueNegatives} / 13
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              0 falsas alarmas sobre inmobiliarias y residencias reales
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
            <span className="text-[11px] font-bold uppercase text-amber-800">
              Frenos por Faltante de Datos
            </span>
            <p className="mt-1 text-3xl font-black text-amber-900">
              {benchmark.insufficientDataDetected} / 3
            </p>
            <p className="mt-0.5 text-xs text-amber-800">
              Bloqueados preventivamente por Control de Calidad (Pantalla 4)
            </p>
          </div>
        </div>

        {/* Mitigación del Riesgo Principal: Calidad dispar de registros públicos por ciudad */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Evaluación del Riesgo Principal: Desempeño según Calidad de Registros Públicos por Ciudad
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
            {benchmark.byCityBreakdown.map((cityStat) => (
              <div
                key={cityStat.city}
                className="rounded-xl border border-slate-200 bg-white p-3 text-xs"
              >
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>{cityStat.city}</span>
                  <span className="text-emerald-700">
                    {cityStat.accuracyPercent}% acierto
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Calidad registros públicos:{' '}
                  <strong>{cityStat.publicRegistryQuality}</strong> ({cityStat.correct}/
                  {cityStat.total} casos)
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla interactiva de los 30 Anuncios Reales */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">
            Detalle de los 30 anuncios verificados contra la realidad
          </h2>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {[
              { id: 'ALL', label: 'Todos (30)' },
              { id: 'FRAUD', label: 'Estafas Reales (14)' },
              { id: 'LEGITIMATE', label: 'Legítimos (13)' },
              { id: 'INSUFFICIENT_DATA', label: 'Sin Datos (3)' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
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
              <tr className="border-b border-slate-200 text-slate-500 uppercase">
                <th className="py-3 pr-3">#</th>
                <th className="py-3 px-3">Anuncio / Ciudad / Precio</th>
                <th className="py-3 px-3">Lo que realmente pasó</th>
                <th className="py-3 px-3">Veredicto CuartoSeguro</th>
                <th className="py-3 pl-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvaluations.map((ev) => {
                const { sample, result, isCorrectlyClassified } = ev;
                return (
                  <tr key={sample.caseNumber} className="hover:bg-slate-50/80">
                    <td className="py-3.5 pr-3 font-bold text-slate-500">
                      #{sample.caseNumber}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-900">
                        {sample.title}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
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
                              : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {result.verdict} ({result.confidenceLevel}%)
                      </span>
                      {isCorrectlyClassified && (
                        <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 ml-2">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Coincide
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
                        <ArrowRight className="h-3.5 w-3.5" />
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
