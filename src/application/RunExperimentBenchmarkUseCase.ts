import {
  ExperimentBenchmarkSummary,
  ExperimentCaseEvaluation,
  ExperimentSampleCase,
  ExperimentSplit,
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
export interface SplitBenchmarkSummary {
  full: ExperimentBenchmarkSummary;
  calibration: ExperimentBenchmarkSummary;
  evaluation: ExperimentBenchmarkSummary;
  /** 'explicit' = el dataset traía la columna split; 'auto' = 1 de cada 3 casos va a evaluación. */
  splitSource: 'explicit' | 'auto';
}

/**
 * Separa calibración y evaluación. Si el dataset no trae `split`, se manda a evaluación
 * 1 de cada 3 casos (por orden de caseNumber) dentro de cada etiqueta real, así ambas
 * mitades tienen estafas, legítimos y casos sin datos (30 casos → 20/10 aprox.).
 */
export function assignExperimentSplit(
  samples: ExperimentSampleCase[]
): { samples: (ExperimentSampleCase & { split: ExperimentSplit })[]; splitSource: 'explicit' | 'auto' } {
  if (samples.length > 0 && samples.every((s) => s.split)) {
    return {
      samples: samples as (ExperimentSampleCase & { split: ExperimentSplit })[],
      splitSource: 'explicit',
    };
  }
  const positionInLabel = new Map<string, number>();
  const sorted = [...samples].sort((a, b) => a.caseNumber - b.caseNumber);
  const splitByCase = new Map<number, ExperimentSplit>();
  for (const sample of sorted) {
    const index = positionInLabel.get(sample.groundTruth) ?? 0;
    positionInLabel.set(sample.groundTruth, index + 1);
    splitByCase.set(sample.caseNumber, index % 3 === 2 ? 'evaluation' : 'calibration');
  }
  return {
    samples: samples.map((s) => ({ ...s, split: splitByCase.get(s.caseNumber)! })),
    splitSource: 'auto',
  };
}

export class RunExperimentBenchmarkUseCase {
  private readonly verifier = new VerifyListingUseCase();

  public executeWithSplit(
    samples: ExperimentSampleCase[],
    deps: VerificationDependencies
  ): SplitBenchmarkSummary {
    const { samples: withSplit, splitSource } = assignExperimentSplit(samples);
    return {
      full: this.execute(withSplit, deps),
      calibration: this.execute(
        withSplit.filter((s) => s.split === 'calibration'),
        deps
      ),
      evaluation: this.execute(
        withSplit.filter((s) => s.split === 'evaluation'),
        deps
      ),
      splitSource,
    };
  }

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
    const totalActualLegitimate = evaluations.filter(
      (e) => e.sample.groundTruth === 'LEGITIMATE'
    ).length;
    const totalActualInsufficientData = evaluations.filter(
      (e) => e.sample.groundTruth === 'INSUFFICIENT_DATA'
    ).length;

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
      totalActualLegitimate,
      totalActualInsufficientData,
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
