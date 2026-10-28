import { VerificationResult } from '../domain/entities/types';
import { PROPERTY_TYPE_LABELS } from './ResolvePriceBenchmark';

/** Descargo del prototipo (Pantalla 2) que tiene que viajar en todo reporte. */
export const REPORT_DISCLAIMER =
  'La verificación no reemplaza ver la propiedad en persona. Es un chequeo automático preventivo: no firmes ni transfieras sin visitar el lugar o mandar a alguien de confianza.';

export interface VerificationReport {
  id: string;
  issuedAt: string;
  listing: string;
  zone: string;
  rentAndDeposit: string;
  verdict: VerificationResult['verdict'];
  confidenceLevel: number;
  primaryReason: string;
  recommendation: VerificationResult['recommendation'];
  reasons: { title: string; description: string; severity: string }[];
  disclaimer: string;
}

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
  hourCycle: 'h23',
  timeZone: 'America/Argentina/Buenos_Aires',
});

const ARS = (value: number) => `$${value.toLocaleString('es-AR')}`;

/**
 * Pantalla 8: arma el contenido del reporte una sola vez para que el PDF,
 * el texto compartido y la vista en pantalla digan exactamente lo mismo.
 */
export class BuildVerificationReportUseCase {
  public execute(result: VerificationResult): VerificationReport {
    const { input, priceComparison } = result;
    return {
      id: result.id,
      issuedAt: DATE_TIME_FORMAT.format(new Date(result.createdAt)),
      listing: input.captureFileName
        ? `${input.listingUrlOrCapture} (captura: ${input.captureFileName})`
        : input.listingUrlOrCapture,
      zone: `${priceComparison.zone.neighborhood} (${priceComparison.zone.city}) · ${PROPERTY_TYPE_LABELS[input.propertyType ?? 'room']}`,
      rentAndDeposit: `Alquiler ${ARS(input.monthlyRentArs)}/mes · Seña pedida ${ARS(input.depositRequestedArs)}`,
      verdict: result.verdict,
      confidenceLevel: result.confidenceLevel,
      primaryReason: result.primaryReason,
      recommendation: result.recommendation,
      reasons: result.findings.map((f) => ({
        title: f.title,
        description: f.description,
        severity: f.severity,
      })),
      disclaimer: REPORT_DISCLAIMER,
    };
  }

  /** Texto plano para WhatsApp / Web Share API. */
  public toShareText(report: VerificationReport): string {
    return [
      `🛡️ *Reporte CuartoSeguro (${report.id})*`,
      `• Fecha: ${report.issuedAt}`,
      `• Anuncio: ${report.listing}`,
      `• Zona: ${report.zone}`,
      `• Veredicto: *${report.verdict.toUpperCase()}* (Confianza: ${report.confidenceLevel}%)`,
      `• Motivo principal: ${report.primaryReason}`,
      `• Recomendación antes de pagar seña: *${report.recommendation}*`,
      `⚠️ ${report.disclaimer}`,
    ].join('\n');
  }

  public fileName(report: VerificationReport): string {
    return `cuartoseguro-${report.id.toLowerCase()}.pdf`;
  }
}
