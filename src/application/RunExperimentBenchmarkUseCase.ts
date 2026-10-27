import {
  ExperimentBenchmarkSummary,
  ExperimentCaseEvaluation,
  ExperimentSampleCase,
  VerdictType,
} from '../domain/entities/types';
import {
  VerificationDependencies,
  VerifyListingUseCase,
} from './VerifyListingUseCase';

/**
 * Ejecuta el Experimento de Validación definido en el Punto 6 del
 * Mapa de Oportunidad Tecnológica:
 * "Verificar manualmente 30 anuncios reales de una ciudad universitaria y
 * comparar contra lo que realmente pasó. Métrica: % de anuncios truchos
 * detectados correctamente."
 */
export class RunExperimentBenchmarkUseCase {
  private readonly verifier = new VerifyListingUseCase();

  public execute(
    samples: ExperimentSampleCase[],
    deps: VerificationDependencies
  ): ExperimentBenchmarkSummary {
    const evaluations: ExperimentCaseEvaluation[] = samples.map((sample) => {
      const result = this.verifier.execute(sample.input, deps);

      const expectedVerdict: VerdictType =
        sample.groundTruth === 'FRAUD'
          ? 'Anuncio sospechoso'
          : sample.groundTruth === 'LEGITIMATE'
            ? 'Verificado'
            : 'Sin datos suficientes';

      const isCorrectlyClassified = result.verdict === expectedVerdict;

      return {
        sample,
        result,
        expectedVerdict,
        isCorrectlyClassified,
      };
    });

    const totalCases = evaluations.length;
    const actualFrauds = evaluations.filter(
      (e) => e.sample.groundTruth === 'FRAUD'
    );
    const totalActualFrauds = actualFrauds.length;

    const detectedFraudsTruePositives = actualFrauds.filter(
      (e) => e.result.verdict === 'Anuncio sospechoso'
    ).length;

    const missedFraudsFalseNegatives =
      totalActualFrauds - detectedFraudsTruePositives;

    const falseAlarmsFalsePositives = evaluations.filter(
      (e) =>
        e.sample.groundTruth !== 'FRAUD' &&
        e.result.verdict === 'Anuncio sospechoso'
    ).length;

    const verifiedLegitimateTrueNegatives = evaluations.filter(
      (e) =>
        e.sample.groundTruth === 'LEGITIMATE' &&
        e.result.verdict === 'Verificado'
    ).length;

    const insufficientDataDetected = evaluations.filter(
      (e) =>
        e.sample.groundTruth === 'INSUFFICIENT_DATA' &&
        e.result.verdict === 'Sin datos suficientes'
    ).length;

    const fraudDetectionRecallPercent =
      totalActualFrauds > 0
        ? Number(
            ((detectedFraudsTruePositives / totalActualFrauds) * 100).toFixed(1)
          )
        : 0;

    const totalFlaggedAsSuspicious =
      detectedFraudsTruePositives + falseAlarmsFalsePositives;

    const precisionPercent =
      totalFlaggedAsSuspicious > 0
        ? Number(
            (
              (detectedFraudsTruePositives / totalFlaggedAsSuspicious) *
              100
            ).toFixed(1)
          )
        : 0;

    const totalCorrect = evaluations.filter(
      (e) => e.isCorrectlyClassified
    ).length;
    const overallAccuracyPercent =
      totalCases > 0
        ? Number(((totalCorrect / totalCases) * 100).toFixed(1))
        : 0;

    // Desglose por ciudad universitaria para evaluar el riesgo de "calidad dispar de registros públicos"
    const cityMap = new Map<
      string,
      {
        city: string;
        publicRegistryQuality: string;
        total: number;
        correct: number;
      }
    >();

    for (const ev of evaluations) {
      const city = ev.result.priceComparison.zone.city;
      const quality = ev.result.priceComparison.zone.publicRegistryQuality;
      const current = cityMap.get(city) ?? {
        city,
        publicRegistryQuality: quality,
        total: 0,
        correct: 0,
      };
      current.total += 1;
      if (ev.isCorrectlyClassified) {
        current.correct += 1;
      }
      cityMap.set(city, current);
    }

    const byCityBreakdown = Array.from(cityMap.values()).map((item) => ({
      ...item,
      accuracyPercent: Number(((item.correct / item.total) * 100).toFixed(1)),
    }));

    return {
      totalCases,
      totalActualFrauds,
      detectedFraudsTruePositives,
      missedFraudsFalseNegatives,
      falseAlarmsFalsePositives,
      verifiedLegitimateTrueNegatives,
      insufficientDataDetected,
      fraudDetectionRecallPercent,
      precisionPercent,
      overallAccuracyPercent,
      byCityBreakdown,
      evaluations,
    };
  }
}
