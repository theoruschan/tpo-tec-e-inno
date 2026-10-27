import React from 'react';
import { ZonePriceComparison } from '../../domain/entities/types';

interface PriceComparisonChartProps {
  comparison: ZonePriceComparison;
}

export const PriceComparisonChart: React.FC<PriceComparisonChartProps> = ({
  comparison,
}) => {
  const {
    zone,
    publishedRentArs,
    depositRequestedArs,
    deviationPercent,
    zScore,
    depositToRentRatioPercent,
    isTooGoodToBeTrue,
  } = comparison;

  const maxScale = Math.max(
    zone.maxReasonableArs * 1.15,
    publishedRentArs * 1.15
  );

  const publishedWidth = Math.min(
    100,
    Math.max(8, Math.round((publishedRentArs / maxScale) * 100))
  );
  const averageWidth = Math.min(
    100,
    Math.max(8, Math.round((zone.averageRentArs / maxScale) * 100))
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-slate-900">
            Analítica BI: Precio del Anuncio vs. Promedio de Zona
          </h4>
          <p className="text-xs text-slate-600">
            {zone.neighborhood} ({zone.city}) · Polo: {zone.universityHub}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            isTooGoodToBeTrue
              ? 'bg-red-100 text-red-800'
              : deviationPercent <= -22
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          Desvío zonal: {deviationPercent > 0 ? `+${deviationPercent}` : deviationPercent}% (Z = {zScore}σ)
        </span>
      </div>

      <div className="space-y-3 text-xs">
        <div>
          <div className="mb-1 flex justify-between font-medium">
            <span className="text-slate-700">Precio publicado en el aviso</span>
            <span className="font-bold text-slate-900">
              ${publishedRentArs.toLocaleString('es-AR')} / mes
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all ${
                isTooGoodToBeTrue
                  ? 'bg-red-600'
                  : deviationPercent <= -22
                    ? 'bg-amber-500'
                    : 'bg-emerald-600'
              }`}
              style={{ width: `${publishedWidth}%` }}
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex justify-between font-medium">
            <span className="text-slate-700">
              Promedio histórico estudiantil ({zone.neighborhood})
            </span>
            <span className="font-bold text-slate-900">
              ${zone.averageRentArs.toLocaleString('es-AR')} / mes
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-indigo-600"
              style={{ width: `${averageWidth}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 border-t border-slate-200 pt-3 text-xs sm:grid-cols-3">
        <div>
          <span className="text-slate-500">Banda normal de mercado:</span>
          <p className="font-semibold text-slate-800">
            ${zone.minReasonableArs.toLocaleString('es-AR')} – $
            {zone.maxReasonableArs.toLocaleString('es-AR')}
          </p>
        </div>
        <div>
          <span className="text-slate-500">Seña solicitada:</span>
          <p className="font-semibold text-slate-800">
            ${depositRequestedArs.toLocaleString('es-AR')} ({depositToRentRatioPercent}% del mes)
          </p>
        </div>
        <div>
          <span className="text-slate-500">Calidad registros públicos ({zone.city}):</span>
          <p className="font-semibold text-slate-800">
            Nivel {zone.publicRegistryQuality}
          </p>
        </div>
      </div>
    </div>
  );
};
