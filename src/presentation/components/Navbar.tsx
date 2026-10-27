import React from 'react';
import {
  ShieldCheck,
  History,
  Database,
  FlaskConical,
  PlusCircle,
} from 'lucide-react';
import { ScreenId } from '../../domain/entities/types';

interface NavbarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  historyCount: number;
  directoryCount: number;
}

const STEP_LABELS: { id: ScreenId; step: number; label: string }[] = [
  { id: 'screen-1-home', step: 1, label: 'Inicio' },
  { id: 'screen-2-instructions', step: 2, label: 'Instrucciones' },
  { id: 'screen-3-input', step: 3, label: 'Carga' },
  { id: 'screen-4-quality', step: 4, label: 'Control Calidad' },
  { id: 'screen-5-processing', step: 5, label: 'Procesando' },
  { id: 'screen-6-result', step: 6, label: 'Veredicto' },
  { id: 'screen-7-details', step: 7, label: 'Detalles' },
  { id: 'screen-8-report', step: 8, label: 'Reporte PDF' },
];

export const Navbar: React.FC<NavbarProps> = ({
  currentScreen,
  onNavigate,
  historyCount,
  directoryCount,
}) => {
  const activeFlowIndex = STEP_LABELS.findIndex((s) => s.id === currentScreen);

  return (
    <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => onNavigate('screen-1-home')}
          className="flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-lg"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-slate-900">
                CuartoSeguro
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                Gratis para estudiantes
              </span>
            </div>
            <p className="text-xs text-slate-500">
              UADE · Grupo 12 · Verificación preventiva de alquileres
            </p>
          </div>
        </button>

        <nav
          aria-label="Navegación principal"
          className="flex flex-wrap items-center gap-1.5"
        >
          <button
            type="button"
            onClick={() => onNavigate('screen-2-instructions')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              activeFlowIndex >= 1
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            Nueva verificación
          </button>

          <button
            type="button"
            onClick={() => onNavigate('view-history')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
              currentScreen === 'view-history'
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <History className="h-4 w-4" />
            Anteriores ({historyCount})
          </button>

          <button
            type="button"
            onClick={() => onNavigate('view-directory')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
              currentScreen === 'view-directory'
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Database className="h-4 w-4" />
            Directorio CBU ({directoryCount})
          </button>

          <button
            type="button"
            onClick={() => onNavigate('view-experiment')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
              currentScreen === 'view-experiment'
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <FlaskConical className="h-4 w-4" />
            Experimento (30 anuncios)
          </button>
        </nav>
      </div>

      {/* Barra de trazabilidad de las 8 Pantallas del Prototipo UX */}
      {activeFlowIndex >= 0 && (
        <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-2">
          <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto text-xs">
            <span className="mr-2 font-semibold text-slate-500 shrink-0">
              Flujo UX (8 Pantallas):
            </span>
            {STEP_LABELS.map((item, idx) => {
              const isCurrent = item.id === currentScreen;
              const isPast = idx < activeFlowIndex;
              return (
                <React.Fragment key={item.id}>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium shrink-0 ${
                      isCurrent
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : isPast
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'text-slate-500'
                    }`}
                  >
                    <span className="font-bold">P{item.step}:</span> {item.label}
                  </span>
                  {idx < STEP_LABELS.length - 1 && (
                    <span className="text-slate-300">›</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
