import {
  MarketPriceData,
  PropertyType,
  ZoneBenchmark,
} from '../domain/entities/types';

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  room: 'Habitación (depto compartido, casa o residencia)',
  studio: 'Monoambiente',
  two_rooms: '2 ambientes / 1 dormitorio',
};

// El índice publica solo el promedio: la dispersión y la banda son supuestos nuestros.
const ESTIMATED_SPREAD = 0.15;
const REASONABLE_BAND = 0.25;
/** A partir de cuántos meses de antigüedad se avisa que el dato puede estar atrasado. */
export const STALE_AFTER_MONTHS = 4;

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function formatPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number);
  return `${MONTHS[month - 1] ?? period} ${year}`;
}

export function monthsSince(period: string, today: Date): number {
  const [year, month] = period.split('-').map(Number);
  return (today.getFullYear() - year) * 12 + (today.getMonth() + 1 - month);
}

/**
 * Elige contra qué precio se compara el anuncio:
 * - Habitación: la estimación del equipo por zona (no hay índice público de habitaciones).
 * - Monoambiente / 2 ambientes: el índice de mercado de la ciudad, con fuente y período.
 * - Sin índice para esa ciudad y tipo: precio 0 y fuente "unavailable" (el motor no compara).
 */
export function resolvePriceBenchmark(
  zone: ZoneBenchmark,
  propertyType: PropertyType = 'room',
  market?: MarketPriceData,
  today: Date = new Date()
): ZoneBenchmark {
  if (propertyType === 'room') {
    return {
      ...zone,
      priceSource: {
        kind: 'team-estimate',
        label: 'Estimación del equipo para habitaciones (no hay índice público de habitaciones)',
      },
    };
  }

  const typeLabel = PROPERTY_TYPE_LABELS[propertyType].toLowerCase();
  const source = market?.sources.find((s) => s.city === zone.city);
  const price = source?.prices[propertyType];

  if (!source || !price) {
    return {
      ...zone,
      averageRentArs: 0,
      stdDevRentArs: 0,
      minReasonableArs: 0,
      maxReasonableArs: 0,
      priceSource: {
        kind: 'unavailable',
        label: `No tenemos un índice de precios de ${typeLabel} para ${zone.city}`,
      },
    };
  }

  const age = monthsSince(source.period, today);
  return {
    ...zone,
    averageRentArs: price,
    stdDevRentArs: Math.round(price * ESTIMATED_SPREAD),
    minReasonableArs: Math.round(price * (1 - REASONABLE_BAND)),
    maxReasonableArs: Math.round(price * (1 + REASONABLE_BAND)),
    priceSource: {
      kind: 'market-index',
      label: `${source.label}, ${typeLabel}, ${formatPeriod(source.period)} (promedio de la ciudad, no del barrio)`,
      url: source.url,
      note:
        age >= STALE_AFTER_MONTHS
          ? `Es el último dato publicado y tiene ${age} meses: los precios actuales probablemente sean más altos.`
          : undefined,
    },
  };
}
