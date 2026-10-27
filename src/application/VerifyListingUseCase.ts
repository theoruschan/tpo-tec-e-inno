import {
  FraudDirectoryEntry,
  KnownImageSignature,
  ListingInput,
  RecommendationType,
  VerdictType,
  VerificationResult,
  ZoneBenchmark,
} from '../domain/entities/types';
import { DataQualityValidator } from '../domain/services/DataQualityValidator';
import { IdentityCbuMatcher } from '../domain/services/IdentityCbuMatcher';
import { ImageMiningService } from '../domain/services/ImageMiningService';
import { ZonePriceBiService } from '../domain/services/ZonePriceBiService';

export interface VerificationDependencies {
  zones: ZoneBenchmark[];
  knownImages: KnownImageSignature[];
  fraudDirectory: FraudDirectoryEntry[];
}

export class VerifyListingUseCase {
  private readonly qualityValidator = new DataQualityValidator();
  private readonly imageMining = new ImageMiningService();
  private readonly zoneBi = new ZonePriceBiService();
  private readonly identityMatcher = new IdentityCbuMatcher();

  public execute(
    input: ListingInput,
    deps: VerificationDependencies
  ): VerificationResult {
    const zone =
      deps.zones.find((z) => z.id === input.zoneId) ?? deps.zones[0];

    // Paso 0: Control de calidad de los datos (Pantalla 4)
    const qualityCheck = this.qualityValidator.validate(input);

    // Paso 1: Búsqueda inversa de imagen y anuncios duplicados
    const imageAnalysis = this.imageMining.analyze(input, deps.knownImages);

    // Paso 2: Business Intelligence (BI) de precios por zona universitaria
    const priceAnalysis = this.zoneBi.analyze(input, zone);

    // Paso 3: Identidad, reportes cruzados y directorio colaborativo CBU/alias
    const identityAnalysis = this.identityMatcher.analyze(
      input,
      deps.fraudDirectory,
      zone
    );

    const allFindings = [
      ...imageAnalysis.findings,
      ...priceAnalysis.findings,
      ...identityAnalysis.findings,
    ];

    // Ordenamos los hallazgos por severidad y puntaje de riesgo para elegir el motivo principal
    const severityOrder = {
      critical: 4,
      warning: 3,
      info: 2,
      positive: 1,
    };

    const sortedFindings = [...allFindings].sort((a, b) => {
      if (severityOrder[b.severity] !== severityOrder[a.severity]) {
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return b.riskPoints - a.riskPoints;
    });

    const rawRiskScore = allFindings.reduce(
      (sum, f) => sum + f.riskPoints,
      0
    );
    const riskScore = Math.min(100, Math.max(0, rawRiskScore));

    const hasCriticalAlert = allFindings.some((f) => f.severity === 'critical');

    let verdict: VerdictType;
    let confidenceLevel: number;
    let recommendation: RecommendationType;
    let primaryReason: string;

    if (!qualityCheck.canProceedAutomatically && !hasCriticalAlert) {
      verdict = 'Sin datos suficientes';
      confidenceLevel = Math.max(38, Math.min(58, qualityCheck.completenessScore));
      recommendation = 'Pedir más información';
      primaryReason =
        qualityCheck.blockingMessage ??
        'Faltan datos de contacto del propietario o fotos suficientes para confirmar la autenticidad del anuncio.';
    } else if (hasCriticalAlert || riskScore >= 40) {
      verdict = 'Anuncio sospechoso';
      // Escala de confianza calibrada: ej. foto duplicada (46) + seña/precio (15-34) -> ~82%
      confidenceLevel = Math.min(98, Math.max(72, Math.round(64 + riskScore * 0.25)));
      recommendation = 'No transferir';

      // Priorizar el mensaje exacto del prototipo si hay foto duplicada
      const duplicatePhotoFinding = allFindings.find(
        (f) => f.id === 'img-duplicate-stolen'
      );
      primaryReason = duplicatePhotoFinding
        ? duplicatePhotoFinding.title
        : sortedFindings[0]?.title ??
          'Se detectaron múltiples patrones de alerta asociados a estafas de alquiler.';
    } else if (riskScore >= 24 || !qualityCheck.hasSufficientPhotos) {
      verdict = 'Sin datos suficientes';
      confidenceLevel = 62;
      recommendation = 'Pedir más información';
      primaryReason =
        sortedFindings[0]?.title ??
        'El anuncio presenta señales grises (pocas fotos o cuenta reciente) y requiere validación adicional antes de señar.';
    } else {
      verdict = 'Verificado';
      const registryBonus = input.isRegisteredRealEstate ? 8 : 0;
      confidenceLevel = Math.min(
        96,
        Math.round(78 + (24 - riskScore) * 0.45 + registryBonus)
      );
      recommendation = 'Transferir (con recaudos habituales)';
      primaryReason =
        'No se detectaron fotos duplicadas, el precio es consistente con el promedio de la zona y el contacto/CBU no registra denuncias.';
    }

    return {
      id: input.id ?? `VER-${Date.now().toString(36).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      input,
      qualityCheck,
      verdict,
      confidenceLevel,
      riskScore,
      primaryReason,
      recommendation,
      findings: sortedFindings,
      priceComparison: priceAnalysis.comparison,
      matchedDuplicateImage: imageAnalysis.matchedSignature,
      matchedFraudDirectoryEntries: identityAnalysis.matchedEntries,
    };
  }
}
