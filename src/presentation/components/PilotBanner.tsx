import React from 'react';

interface PilotBannerProps {
  onOpenInfo: () => void;
}

/** Aviso fijo del piloto: una ayuda para detectar señales de estafa, no una garantía. */
export const PilotBanner: React.FC<PilotBannerProps> = ({ onOpenInfo }) => (
  <div role="note" className="no-print border-b border-amber-200 bg-amber-50 text-xs text-amber-950">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2">
      <p>
        <strong>Versión piloto.</strong> Es una ayuda para detectar señales de estafa, no una
        garantía: que el resultado diga «Verificado» no significa que el anuncio sea seguro.{' '}
        <strong>No reemplaza ver la propiedad en persona.</strong>
      </p>
      <button
        type="button"
        onClick={onOpenInfo}
        className="shrink-0 font-semibold underline decoration-amber-700 underline-offset-2 hover:text-amber-900"
      >
        Condiciones del piloto
      </button>
    </div>
  </div>
);
