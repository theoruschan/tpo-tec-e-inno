import {
  ListingInput,
  VerificationFinding,
  ZoneBenchmark,
  ZonePriceComparison,
} from '../entities/types';

export interface ZonePriceBiAnalysis {
  comparison: ZonePriceComparison;
  findings: VerificationFinding[];
}

/**
 * Paso 2 de 3 del Motor de Verificación:
 * Business Intelligence (BI) — Comparación estadística del precio y la seña
 * contra el promedio histórico de la zona universitaria.
 */
export class ZonePriceBiService {
  public analyze(
    input: ListingInput,
    zone: ZoneBenchmark
  ): ZonePriceBiAnalysis {
    const publishedRent = Math.max(1, input.monthlyRentArs);
    const deposit = Math.max(0, input.depositRequestedArs);

    const deviationPercent = Number(
      (((publishedRent - zone.averageRentArs) / zone.averageRentArs) * 100).toFixed(1)
    );

    const zScore = Number(
      ((publishedRent - zone.averageRentArs) / Math.max(1, zone.stdDevRentArs)).toFixed(2)
    );

    const depositToRentRatioPercent = Number(
      ((deposit / publishedRent) * 100).toFixed(1)
    );

    const isTooGoodToBeTrue = deviationPercent <= -34;
    const isModeratelyLow = deviationPercent > -34 && deviationPercent <= -22;
    const isExcessiveDeposit = depositToRentRatioPercent >= 65;

    const findings: VerificationFinding[] = [];

    if (isTooGoodToBeTrue) {
      findings.push({
        id: 'bi-price-too-good',
        category: 'zone_price_bi',
        severity: 'critical',
        title: `Precio ${Math.abs(deviationPercent)}% por debajo del promedio de ${zone.neighborhood}`,
        description: `El alquiler publicado ($${publishedRent.toLocaleString('es-AR')}/mes) está muy por debajo del promedio para cuartos/departamentos estudiantiles en ${zone.neighborhood}, ${zone.city} ($${zone.averageRentArs.toLocaleString('es-AR')}/mes). Las ofertas "demasiado buenas para ser reales" son el principal anzuelo para pedir señas rápidas.`,
        riskPoints: 34,
        evidenceDetail: `Z-Score zonal: ${zScore}σ · Banda razonable en ${zone.neighborhood}: $${zone.minReasonableArs.toLocaleString('es-AR')} – $${zone.maxReasonableArs.toLocaleString('es-AR')}`,
      });
    } else if (isModeratelyLow) {
      findings.push({
        id: 'bi-price-moderately-low',
        category: 'zone_price_bi',
        severity: 'warning',
        title: `Precio ${Math.abs(deviationPercent)}% inferior a la media de ${zone.neighborhood}`,
        description: `El valor mensual ($${publishedRent.toLocaleString('es-AR')}) se ubica por debajo del rango habitual de ${zone.neighborhood} ($${zone.averageRentArs.toLocaleString('es-AR')}). Conviene extremar la validación de identidad antes de señar.`,
        riskPoints: 16,
        evidenceDetail: `Z-Score zonal: ${zScore}σ`,
      });
    } else {
      findings.push({
        id: 'bi-price-consistent',
        category: 'zone_price_bi',
        severity: 'positive',
        title: `Precio alineado con el promedio de mercado en ${zone.neighborhood}`,
        description: `El monto publicado ($${publishedRent.toLocaleString('es-AR')}/mes) presenta una variación de ${deviationPercent > 0 ? `+${deviationPercent}` : deviationPercent}% respecto al promedio de ${zone.neighborhood} ($${zone.averageRentArs.toLocaleString('es-AR')}/mes), dentro de parámetros normales.`,
        riskPoints: 0,
        evidenceDetail: `Z-Score zonal: ${zScore}σ · Polo universitario: ${zone.universityHub}`,
      });
    }

    if (input.requestsAdvanceBeforeVisit && deposit > 0) {
      findings.push({
        id: 'bi-advance-without-visit',
        category: 'zone_price_bi',
        severity: isExcessiveDeposit ? 'critical' : 'warning',
        title: 'Exige transferencia de seña por adelantado sin permitir visita previa',
        description: `Solicita $${deposit.toLocaleString('es-AR')} (${depositToRentRatioPercent}% del alquiler mensual) antes de mostrar la propiedad o permitir que un conocido la visite. Este patrón concentra la mayoría de las estafas al inicio del cuatrimestre.`,
        riskPoints: isExcessiveDeposit ? 24 : 15,
      });
    }

    return {
      comparison: {
        zone,
        publishedRentArs: publishedRent,
        depositRequestedArs: deposit,
        deviationPercent,
        zScore,
        depositToRentRatioPercent,
        isTooGoodToBeTrue,
        isModeratelyLow,
        isExcessiveDeposit,
      },
      findings,
    };
  }
}
