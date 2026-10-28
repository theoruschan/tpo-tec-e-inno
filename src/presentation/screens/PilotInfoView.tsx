import React from 'react';

interface PilotInfoViewProps {
  onStart: () => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mt-6">
    <h2 className="text-base font-bold text-slate-900">{title}</h2>
    <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-700">{children}</div>
  </section>
);

/**
 * Condiciones del piloto en lenguaje llano. No son términos legales definitivos:
 * describen qué hace la herramienta, qué datos guarda y qué límites tiene.
 */
export const PilotInfoView: React.FC<PilotInfoViewProps> = ({ onStart }) => (
  <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
    <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-950">
      Versión piloto
    </span>
    <h1 className="mt-3 text-2xl font-extrabold text-slate-900 sm:text-3xl">
      Condiciones del piloto de CuartoSeguro
    </h1>
    <p className="mt-2 text-sm text-slate-700">
      CuartoSeguro es un proyecto de la UADE (Tecnología e Innovación, Grupo 12) que se está
      probando con un grupo reducido de estudiantes. Estas condiciones están en lenguaje llano y
      <strong> no son términos legales definitivos</strong>.
    </p>

    <Section title="Qué es y qué no es">
      <p>
        Es una ayuda para detectar <strong>señales</strong> de estafa en un anuncio antes de pagar la
        seña: fotos repetidas, precio fuera de lo normal, cuentas nuevas y reportes de otros
        estudiantes.
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>No es una garantía.</strong> Una estafa con foto nueva, un alias sin denuncias y un
          precio razonable puede salir «Verificado».
        </li>
        <li>
          El «nivel de confianza» es un índice del motor, <strong>no una probabilidad</strong>.
        </li>
        <li>
          Las bases de datos todavía son chicas: las fotos conocidas son las que subieron otros
          estudiantes, el directorio de CBU/alias recién arranca y los precios de habitaciones son una
          estimación del equipo.
        </li>
        <li>
          <strong>Nunca transfieras dinero sin ver la propiedad</strong> (o sin que alguien de
          confianza la vea) y sin un contrato.
        </li>
      </ul>
    </Section>

    <Section title="Qué datos se guardan">
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>En tu navegador:</strong> el historial de tus verificaciones. La captura y la foto se
          leen en tu dispositivo y <strong>no se suben</strong>.
        </li>
        <li>
          <strong>En nuestro servidor</strong>, solo si marcás la autorización y subís una foto: la
          «huella» de la foto (no la imagen), la ciudad, el precio y el CBU/alias y teléfono
          convertidos en un código irreversible (hash).
        </li>
        <li>
          <strong>Para consultar el directorio</strong> se envía el CBU/alias y el teléfono a nuestro
          servidor para convertirlos en ese código; no se guardan en claro.
        </li>
        <li>
          <strong>Si reportás una estafa</strong> o dejás tu opinión: lo que escribas en el motivo o el
          comentario. <strong>No pongas nombres, teléfonos, CBU ni datos personales de nadie ahí.</strong>
        </li>
        <li>
          No pedimos tu nombre, email ni cuenta. Los proveedores técnicos (Vercel y Supabase) pueden
          registrar tu dirección IP en sus propios registros.
        </li>
      </ul>
    </Section>

    <Section title="Reportes de estafa">
      <p>
        Los reportes nuevos entran como <strong>pendientes</strong> y los revisa una persona antes de
        mostrarse. Un identificador también aparece si tres dispositivos distintos lo reportan.
      </p>
      <p>
        Si creés que un reporte es falso o te perjudica, avisale a quien te pasó el link del piloto
        para que lo revise y, si corresponde, lo dé de baja.
      </p>
    </Section>

    <Section title="Tu opinión nos ayuda">
      <p>
        Después de cada resultado podés contarnos si te sirvió y qué hiciste. Con eso vamos a medir si
        la herramienta funciona en casos reales y qué hay que corregir.
      </p>
    </Section>

    <div className="mt-8 border-t border-slate-100 pt-5">
      <button
        type="button"
        onClick={onStart}
        className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"
      >
        Entendido, empezar
      </button>
    </div>
  </div>
);
