import React from 'react';
import { AlertTriangle, ArrowRight, History, Sparkles } from 'lucide-react';
import { ListingInput, ScreenId } from '../../domain/entities/types';
import { QUICK_DEMO_SCENARIOS } from '../../infrastructure/data/datasets';
import { VerdictStamp } from '../components/VerdictStamp';

interface Screen1HomeProps {
  onNavigate: (screen: ScreenId) => void;
  onLoadQuickScenario: (input: ListingInput, goDirectToQuality?: boolean) => void;
  historyCount: number;
}

const CHECKS = [
  {
    n: '1',
    title: 'La foto',
    text: 'La comparamos con fotos de avisos que ya verificaron otros estudiantes. Si la misma foto aparece con otro precio u otro contacto, es una señal de alarma.',
  },
  {
    n: '2',
    title: 'El precio',
    text: 'Lo ponemos al lado del precio de mercado de la ciudad cuando hay un índice publicado. Un precio muy por debajo es el anzuelo clásico para cobrar una seña rápida.',
  },
  {
    n: '3',
    title: 'Quién cobra',
    text: 'Cruzamos el CBU, alias o teléfono con reportes de la comunidad, miramos si la cuenta es nueva y si te piden la seña antes de ver el lugar.',
  },
] as const;

export const Screen1Home: React.FC<Screen1HomeProps> = ({
  onNavigate,
  onLoadQuickScenario,
  historyCount,
}) => {
  return (
    <div className="space-y-14">
      {/* Pantalla 1: Inicio (Prototipo de Baja Fidelidad - Entregable 3) */}
      <section className="grid items-center gap-10 pt-2 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <p className="flex flex-wrap items-baseline gap-x-2 border-y border-slate-900 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-slate-900">
            Gratis para estudiantes
            <span className="font-sans normal-case tracking-normal text-slate-600">
              (la app no cobra al usuario final)
            </span>
          </p>

          <h1 className="text-4xl leading-[1.05] sm:text-6xl">
            Verificá un alquiler antes de pagar.
          </h1>

          <p className="max-w-xl text-lg leading-relaxed text-slate-700">
            Te piden una seña por transferencia y no podés ir a ver el lugar. Subí la captura del
            aviso y revisamos tres cosas antes de que pagues, en menos de 2 minutos.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => onNavigate('screen-2-instructions')}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-slate-700"
            >
              Nueva verificación
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('view-history')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-900 px-5 py-3.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              <History className="h-4 w-4" />
              Ver verificaciones anteriores ({historyCount})
            </button>
          </div>
        </div>

        {/* Ficha de ejemplo: ilustra cómo se ve un resultado (no es un aviso real) */}
        <aside aria-label="Ejemplo de resultado" className="relative">
          <div className="rotate-[1.2deg] border border-slate-300 bg-white p-6 shadow-md">
            <div className="flex items-center justify-between border-b border-dashed border-slate-300 pb-3 font-mono text-[11px] uppercase tracking-widest text-slate-500">
              <span>Ficha de verificación</span>
              <span>Ejemplo</span>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex gap-3">
                <dt className="w-16 shrink-0 font-mono text-xs uppercase text-slate-500">Foto</dt>
                <dd className="text-slate-800">Aparece en otro aviso a un precio distinto</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-16 shrink-0 font-mono text-xs uppercase text-slate-500">Precio</dt>
                <dd className="text-slate-800">45 % por debajo del mercado</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-16 shrink-0 font-mono text-xs uppercase text-slate-500">Cuenta</dt>
                <dd className="text-slate-800">Creada hace 1 mes, pide la seña antes de ver</dd>
              </div>
            </dl>
            <div className="mt-6 flex justify-center pb-2">
              <VerdictStamp verdict="Anuncio sospechoso" size="lg" />
            </div>
            <p className="mt-3 text-center text-xs text-slate-500">
              Recomendación: no transferir
            </p>
          </div>
        </aside>
      </section>

      {/* Qué revisamos: las tres alternativas priorizadas, dichas desde el punto de vista del estudiante */}
      <section aria-labelledby="que-revisamos">
        <h2
          id="que-revisamos"
          className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-slate-600"
        >
          Qué revisamos en cada aviso
        </h2>
        <ol className="mt-5 grid gap-px overflow-hidden border border-slate-300 bg-slate-300 md:grid-cols-3">
          {CHECKS.map((check) => (
            <li key={check.n} className="bg-white p-6">
              <span aria-hidden="true" className="font-serif text-5xl font-semibold text-slate-400">
                {check.n}
              </span>
              <h3 className="mt-2 font-serif text-xl font-semibold text-slate-900">{check.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{check.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-slate-600">
          Son señales, no una garantía: las bases todavía son chicas y crecen con el uso.{' '}
          <button
            type="button"
            onClick={() => onNavigate('view-about')}
            className="font-semibold text-slate-900 underline underline-offset-2"
          >
            Sobre el proyecto
          </button>
        </p>
      </section>

      {/* Casos de ejemplo en 1 clic */}
      <section aria-labelledby="casos-ejemplo">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-slate-600">
              Casos de ejemplo
            </p>
            <h2 id="casos-ejemplo" className="mt-1 font-serif text-2xl font-semibold text-slate-900">
              Probalo sin cargar nada
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('view-experiment')}
            className="text-xs font-semibold text-slate-900 underline underline-offset-2"
          >
            Ver experimento de 30 anuncios (dataset curado)
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {QUICK_DEMO_SCENARIOS.map((scenario) => (
            <div
              key={scenario.id}
              className="flex flex-col justify-between border border-slate-300 bg-white p-5 transition hover:border-slate-900"
            >
              <div>
                <span className="inline-block border border-slate-900 px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide text-slate-900">
                  {scenario.badge}
                </span>
                <h3 className="mt-3 text-base font-semibold text-slate-900">{scenario.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{scenario.subtitle}</p>
              </div>
              <div className="mt-5 flex items-center gap-2">
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
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
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
