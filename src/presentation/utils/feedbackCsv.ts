import { FeedbackRow } from '../../domain/ports/AdminRepository';

const HEADERS = [
  'verification_id',
  'creado',
  'actualizado',
  'veredicto',
  'confianza',
  'ciudad',
  'tipo_alojamiento',
  'te_sirvio',
  'que_hizo',
  'comentario',
] as const;

/**
 * Una celda que empieza con = + - @ (o tab/CR) la interpreta Excel/Sheets como fórmula.
 * Los comentarios son texto libre de terceros: se neutralizan con un apóstrofo y se escapan comillas.
 */
export function csvCell(value: string | number | null | undefined): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function feedbackToCsv(rows: FeedbackRow[]): string {
  const lines = rows.map((row) =>
    [
      row.verificationId,
      row.createdAt,
      row.updatedAt,
      row.verdict,
      row.confidence,
      row.city,
      row.propertyType,
      row.useful,
      row.outcome,
      row.comment,
    ]
      .map(csvCell)
      .join(',')
  );
  return [HEADERS.join(','), ...lines].join('\r\n') + '\r\n';
}
