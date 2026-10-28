import React from 'react';
import { ScreenId } from '../../domain/entities/types';

interface AboutViewProps {
  onNavigate: (screen: ScreenId) => void;
}

const PILLARS = [
  {
    n: '1',
    title: 'Motor de verificación automática',
    points: '17/20 pts',
    text: 'Búsqueda inversa de la foto del anuncio para detectar imágenes reutilizadas, comparación del precio contra el mercado de la zona (BI) y chequeos de identidad.',
  },
  {
    n: '6',
    title: 'Bot de reportes cruzados',
    points: '18/20 pts',
    text: 'Cruza si el mismo anuncio, foto o número de WhatsApp ya fue reportado como sospechoso por otros estudiantes.',
  },
  {
    n: '11',
    title: 'Directorio de CBU o alias fraudulentos',
    points: '16/20 pts',
    text: 'Base colaborativa consultable segundos antes de transferir la seña, para no enviar dinero a cuentas ya denunciadas.',
  },
] as const;

/** Contenido del Trabajo Práctico: lo que antes ocupaba la portada. */
export const AboutView: React.FC<AboutViewProps> = ({ onNavigate }) => (
  <div className="mx-auto max-w-3xl space-y-10">
    <header>
      <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-slate-600">
        UADE · Tecnología e Innovación · Grupo 12
      </p>
      <h1 className="mt-2 text-4xl leading-tight sm:text-5xl">Sobre el proyecto</h1>
      <p className="mt-4 text-lg leading-relaxed text-slate-700">
        CuartoSeguro nace de un Trabajo Práctico: ayudar a quien alquila por primera vez a distancia
        a confirmar que un aviso es real <strong>en los minutos en que tiene que decidir</strong> si
        paga la seña. Autores: Matías Fernández, Tomás Matías Lecuenis y Theo Ruschanoff.
      </p>
    </header>

    <section aria-labelledby="alternativas">
      <h2 id="alternativas" className="font-serif text-2xl font-semibold text-slate-900">
        Las tres alternativas priorizadas
      </h2>
      <p className="mt-2 text-sm text-slate-700">
        De 14 alternativas evaluadas con una matriz de deseabilidad, factibilidad, viabilidad y
        diferenciación (máximo 20 puntos), se combinaron estas tres:
      </p>
      <ol className="mt-5 divide-y divide-slate-300 border border-slate-300 bg-white">
        {PILLARS.map((pillar) => (
          <li key={pillar.n} className="flex gap-5 p-5">
            <span aria-hidden="true" className="w-10 shrink-0 font-serif text-4xl font-semibold text-slate-400">
              {pillar.n}
            </span>
            <div>
              <h3 className="font-semibold text-slate-900">
                {pillar.title}{' '}
                <span className="ml-1 font-mono text-xs font-medium text-slate-600">({pillar.points})</span>
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{pillar.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>

    <section aria-labelledby="validacion">
      <h2 id="validacion" className="font-serif text-2xl font-semibold text-slate-900">
        Cómo se validó (y qué no demuestra)
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">
        El experimento corre el motor sobre 30 anuncios y compara el veredicto con lo que pasó.
        Ojo: <strong>es un dataset curado e ilustrativo</strong> y las reglas se ajustaron mirando esos
        mismos casos, así que el 100 % de detección no es una validación independiente. La vista del
        experimento permite cargar un dataset propio y separa calibración de evaluación.
      </p>
      <button
        type="button"
        onClick={() => onNavigate('view-experiment')}
        className="mt-4 inline-flex rounded-xl border border-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100"
      >
        Ver el experimento
      </button>
    </section>

    <section aria-labelledby="documentacion">
      <h2 id="documentacion" className="font-serif text-2xl font-semibold text-slate-900">
        Documentación y límites
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">
        Las decisiones de producto, arquitectura, motor de scoring, experimento y seguridad están en
        la carpeta <code className="font-mono text-xs">docs/</code> del repositorio, junto con los tres
        entregables originales. Los límites conocidos del piloto están en las{' '}
        <button
          type="button"
          onClick={() => onNavigate('view-pilot')}
          className="font-semibold text-slate-900 underline underline-offset-2"
        >
          condiciones
        </button>
        .
      </p>
    </section>

    <div>
      <button
        type="button"
        onClick={() => onNavigate('screen-1-home')}
        className="text-sm font-semibold text-slate-900 underline underline-offset-2"
      >
        ← Volver al inicio
      </button>
    </div>
  </div>
);
