import React from 'react';
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

/** Marca: un sello circular con tilde, dibujado como el sello de un escribano. */
const Seal: React.FC = () => (
  <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0 text-slate-900" aria-hidden="true">
    <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="20" cy="20" r="14.5" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="1.6 2.2" />
    <path
      d="M12.5 20.5l5 5 10-11"
      fill="none"
      stroke="#b42318"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Navbar: React.FC<NavbarProps> = ({
  currentScreen,
  onNavigate,
  historyCount,
  directoryCount,
}) => {
  const activeFlowIndex = STEP_LABELS.findIndex((s) => s.id === currentScreen);

  const linkClass = (active: boolean) =>
    `shrink-0 px-1 py-1.5 text-sm font-medium transition border-b-2 ${
      active
        ? 'border-slate-900 text-slate-900'
        : 'border-transparent text-slate-600 hover:border-slate-400 hover:text-slate-900'
    }`;

  return (
    <header className="no-print top-0 z-30 border-b-2 border-slate-900 bg-slate-50/95 backdrop-blur md:sticky">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <button
          type="button"
          onClick={() => onNavigate('screen-1-home')}
          className="flex items-center gap-3 rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
        >
          <Seal />
          <div>
            <span className="block font-serif text-xl font-semibold leading-none tracking-tight text-slate-900">
              CuartoSeguro
            </span>
            <span className="mt-1 block font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-slate-600">
              Verificación preventiva · UADE G12
            </span>
          </div>
        </button>

        {/* En celular los enlaces van en una sola fila deslizable para no comerse la pantalla */}
        <nav
          aria-label="Navegación principal"
          className="-mx-4 flex w-[calc(100%+2rem)] items-center gap-x-5 overflow-x-auto px-4 whitespace-nowrap [scrollbar-width:none] md:mx-0 md:w-auto md:flex-wrap md:overflow-visible md:px-0"
        >
          <button
            type="button"
            onClick={() => onNavigate('view-history')}
            className={linkClass(currentScreen === 'view-history')}
          >
            Anteriores <span className="font-mono text-xs text-slate-600">({historyCount})</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('view-directory')}
            className={linkClass(currentScreen === 'view-directory')}
          >
            Directorio CBU <span className="font-mono text-xs text-slate-600">({directoryCount})</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('view-experiment')}
            className={linkClass(currentScreen === 'view-experiment')}
          >
            Experimento <span className="font-mono text-xs text-slate-600">(30 anuncios)</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('screen-2-instructions')}
            className="shrink-0 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Nueva verificación
          </button>
        </nav>
      </div>

      {/* Barra de trazabilidad de las 8 Pantallas del Prototipo UX */}
      {activeFlowIndex >= 0 && (
        <div className="border-t border-slate-300 bg-slate-100/70 px-4 py-1.5">
          <ol
            aria-label="Flujo UX (8 Pantallas)"
            className="mx-auto flex max-w-6xl items-center gap-x-3 overflow-x-auto font-mono text-[11px] [scrollbar-width:none]"
          >
            <li className="mr-1 shrink-0 font-medium uppercase tracking-wider text-slate-600">
              Flujo UX (8 Pantallas):
            </li>
            {STEP_LABELS.map((item, idx) => {
              const isCurrent = item.id === currentScreen;
              const isPast = idx < activeFlowIndex;
              return (
                <li
                  key={item.id}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`shrink-0 border-b-2 py-0.5 ${
                    isCurrent
                      ? 'border-red-700 font-bold text-slate-900'
                      : isPast
                        ? 'border-transparent text-slate-900'
                        : 'border-transparent text-slate-500'
                  }`}
                >
                  <span className="font-bold">P{item.step}:</span> {item.label}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </header>
  );
};
