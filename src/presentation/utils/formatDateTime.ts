/**
 * Fecha y hora en formato argentino de 24 h. `toLocaleString('es-AR')` sin opciones
 * muestra 12 h sin "a. m./p. m." en algunos navegadores (ej. 07:18 en vez de 19:18).
 */
const DATE_TIME_FORMAT = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
  hourCycle: 'h23',
});

export function formatDateTime(isoDate: string): string {
  return DATE_TIME_FORMAT.format(new Date(isoDate));
}
