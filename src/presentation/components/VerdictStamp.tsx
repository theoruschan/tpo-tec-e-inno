import React from 'react';
import { VerdictType } from '../../domain/entities/types';

const TONE: Record<VerdictType, string> = {
  'Anuncio sospechoso': 'text-red-700',
  Verificado: 'text-emerald-700',
  'Sin datos suficientes': 'text-amber-700',
};

interface VerdictStampProps {
  verdict: VerdictType;
  /** Tamaño del texto del sello. */
  size?: 'md' | 'lg';
  /** Animación de "sellado" al aparecer (se desactiva con prefers-reduced-motion). */
  animate?: boolean;
  className?: string;
}

/**
 * Veredicto como sello de tinta. Es decorativo-semántico: el texto del veredicto sigue
 * siendo texto real (un lector de pantalla lo lee tal cual), solo cambia cómo se dibuja.
 */
export const VerdictStamp: React.FC<VerdictStampProps> = ({
  verdict,
  size = 'md',
  animate = false,
  className = '',
}) => (
  <span
    className={`stamp ${animate ? 'stamp-in' : ''} ${TONE[verdict]} ${
      size === 'lg' ? 'text-xl sm:text-3xl' : 'text-lg sm:text-xl'
    } ${className}`}
  >
    {verdict}
  </span>
);
