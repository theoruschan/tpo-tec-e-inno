import React from 'react';
import {
  ShieldAlert,
  ArrowRight,
  History,
  CheckCircle2,
  Sparkles,
  FileSearch,
  AlertTriangle,
  Database,
  FlaskConical,
} from 'lucide-react';
import { ListingInput, ScreenId } from '../../domain/entities/types';
import { QUICK_DEMO_SCENARIOS } from '../../infrastructure/data/datasets';

interface Screen1HomeProps {
  onNavigate: (screen: ScreenId) => void;
  onLoadQuickScenario: (input: ListingInput, goDirectToQuality?: boolean) => void;
  historyCount: number;
}

export const Screen1Home: React.FC<Screen1HomeProps> = ({
  onNavigate,
  onLoadQuickScenario,
  historyCount,
}) => {
  return (
    <div className="space-y-8">
      {/* Pantalla 1: Inicio (Prototipo de Baja Fidelidad - Entregable 3) */}
      <section className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl sm:p-10">
        <div className="max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3.5 py-1 text-xs font-semibold text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            Gratis para estudiantes (la app no cobra al usuario final)
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
            Verificá un alquiler antes de pagar.
          </h1>

          <p className="text-base leading-relaxed text-slate-300 sm:text-lg">
            El primer alquiler o subalquiler a distancia suele ser el primer
            contacto con estafas: señas por adelantado sin ver la propiedad,
            fotos robadas de otros portales o propietarios inexistentes.
            Chequeá el aviso en menos de 2 minutos antes de transferir.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('screen-2-instructions')}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400"
            >
              Nueva verificación
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('view-history')}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              <History className="h-4 w-4" />
              Ver verificaciones anteriores ({historyCount})
            </button>
          </div>
        </div>
      </section>

      {/* Los 3 Pilares Priorizados en la Matriz de Design Thinking (Alternativas 1 + 6 + 11) */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <FileSearch className="h-5 w-5" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">
            1. Motor de verificación automática (17/20 pts)
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Ejecuta búsqueda inversa de la foto del anuncio para detectar imágenes robadas,
            compara el precio contra el promedio estadístico (BI) de la zona universitaria y
            valida datos registrales.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">
            6. Bot de reportes cruzados (18/20 pts)
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Cruza si el mismo anuncio, foto o número de WhatsApp ya fue reportado como
            sospechoso en grupos de ingresantes u otras ciudades universitarias.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <Database className="h-5 w-5" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">
            11. Directorio de CBU o alias fraudulentos (16/20 pts)
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Base colaborativa consultable segundos antes de transferir la seña para evitar
            enviar dinero a cuentas bancarias o billeteras ya denunciadas.
          </p>
        </div>
      </section>

      {/* Casos de Prueba Rápida en 1 Clic para Corrección del TP */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600">
              <Sparkles className="h-3.5 w-3.5" />
              Demostración interactiva del TP
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              Probá los escenarios clave del prototipo en un clic
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('view-experiment')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-200"
          >
            <FlaskConical className="h-4 w-4 text-indigo-600" />
            Ver experimento de 30 anuncios reales
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {QUICK_DEMO_SCENARIOS.map((scenario) => (
            <div
              key={scenario.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-indigo-300 hover:bg-indigo-50/30"
            >
              <div>
                <span className="inline-block rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-800">
                  {scenario.badge}
                </span>
                <h3 className="mt-2 text-sm font-bold text-slate-900">
                  {scenario.title}
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  {scenario.subtitle}
                </p>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onLoadQuickScenario(scenario.input, false)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cargar en Pantalla 3
                </button>
                <button
                  type="button"
                  onClick={() => onLoadQuickScenario(scenario.input, true)}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  Verificar ahora
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

interface Screen2InstructionsProps {
  onUnderstand: () => void;
  onSeeExample: () => void;
  onBack: () => void;
}

export const Screen2Instructions: React.FC<Screen2InstructionsProps> = ({
  onUnderstand,
  onSeeExample,
  onBack,
}) => {
  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
        Pantalla 2 de 8 · Instrucciones previas
      </div>

      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
        Antes de pegar el link.
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        La decisión de pagar una seña suele ocurrir bajo presión en pocos minutos.
        Seguí estos tres pasos simples para que el motor pueda cruzar los datos:
      </p>

      <ul className="mt-6 space-y-4">
        <li className="flex items-start gap-3.5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
            1
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Copiá el link del anuncio
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Puede ser de <strong>Zonaprop</strong>, <strong>Argenprop</strong>,{' '}
              <strong>Facebook Marketplace</strong> o el <strong>grupo de la facultad</strong>.
            </p>
          </div>
        </li>

        <li className="flex items-start gap-3.5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
            2
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Si no hay link, podés cargar una captura de pantalla del anuncio
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Si te pasaron la oferta por WhatsApp o historia de Instagram, adjuntá la captura
              y completá el teléfono o CBU/Alias donde te piden transferir la seña.
            </p>
          </div>
        </li>

        <li className="flex items-start gap-3.5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="h-6 w-6 shrink-0 text-amber-600" />
          <div>
            <h2 className="text-sm font-bold text-amber-900">
              Aclaración importante
            </h2>
            <p className="mt-0.5 text-xs text-amber-800">
              <strong>La verificación no reemplaza ver la propiedad en persona.</strong>{' '}
              CuartoSeguro detecta patrones de avisos truchos, fotos robadas y cuentas denunciadas
              para evitar que transfieras a ciegas ante presión de urgencia.
            </p>
          </div>
        </li>
      </ul>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
        >
          ← Volver al inicio
        </button>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSeeExample}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
          >
            <Sparkles className="h-4 w-4" />
            Ver ejemplo
          </button>

          <button
            type="button"
            onClick={onUnderstand}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
          >
            Entendido
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
