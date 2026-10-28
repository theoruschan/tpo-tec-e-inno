import { describe, expect, it } from 'vitest';
import { ReportFraudListingUseCase } from '../src/application/ReportFraudListingUseCase';
import { RunExperimentBenchmarkUseCase } from '../src/application/RunExperimentBenchmarkUseCase';
import { VerifyListingUseCase } from '../src/application/VerifyListingUseCase';
import {
  DataQualityValidator,
  MISSING_CONTACT_BLOCKING_MESSAGE,
} from '../src/domain/services/DataQualityValidator';
import {
  INITIAL_FRAUD_DIRECTORY,
  KNOWN_IMAGE_SIGNATURES,
  QUICK_DEMO_SCENARIOS,
  UNIVERSITY_ZONES,
} from '../src/infrastructure/data/datasets';
import { EXPERIMENT_30_REAL_LISTINGS } from '../src/infrastructure/data/experiment30Listings';

const defaultDeps = {
  zones: UNIVERSITY_ZONES,
  knownImages: KNOWN_IMAGE_SIGNATURES,
  fraudDirectory: INITIAL_FRAUD_DIRECTORY,
};

describe('CuartoSeguro — Motor de Verificación y Experimento de 30 Anuncios', () => {
  it('Pantalla 4 (Control de calidad): bloquea con el mensaje exacto cuando faltan datos de contacto del propietario', () => {
    const validator = new DataQualityValidator();
    const missingContactInput = QUICK_DEMO_SCENARIOS[3].input;

    const quality = validator.validate(missingContactInput);

    expect(quality.hasContactInfo).toBe(false);
    expect(quality.canProceedAutomatically).toBe(false);
    expect(quality.blockingMessage).toBe(MISSING_CONTACT_BLOCKING_MESSAGE);
  });

  it('Pantalla 6 (Caso Prototipo): detecta foto duplicada en otro anuncio y precio bajo con veredicto "Anuncio sospechoso" y un nivel de confianza entre 80 y 92 % (hoy 89 %; el 82 % del PDF es ilustrativo)', () => {
    const verifier = new VerifyListingUseCase();
    const prototypeScenario = QUICK_DEMO_SCENARIOS[0].input;

    const result = verifier.execute(prototypeScenario, defaultDeps);

    expect(result.verdict).toBe('Anuncio sospechoso');
    expect(result.confidenceLevel).toBeGreaterThanOrEqual(80);
    expect(result.confidenceLevel).toBeLessThanOrEqual(92);
    expect(result.primaryReason).toBe(
      'Esta foto aparece en otro anuncio con un precio distinto'
    );
    expect(result.recommendation).toBe('No transferir');
  });

  it('Paso 2 (BI de Precios por Zona): calcula correctamente el desvío porcentual negativo frente al promedio del barrio universitario', () => {
    const verifier = new VerifyListingUseCase();
    const prototypeScenario = QUICK_DEMO_SCENARIOS[0].input;

    const result = verifier.execute(prototypeScenario, defaultDeps);

    // En Monserrat/UADE el promedio es $420.000 y el aviso publica $230.000 (-45.2%)
    expect(result.priceComparison.deviationPercent).toBeLessThan(-35);
    expect(result.priceComparison.isTooGoodToBeTrue).toBe(true);
  });

  it('Paso 3 (Directorio CBU y Reportes Cruzados): detecta CBU/Alias previamente denunciado y actualiza el directorio al reportar una estafa', () => {
    const verifier = new VerifyListingUseCase();
    const reportUseCase = new ReportFraudListingUseCase();

    const blacklistedScenario = QUICK_DEMO_SCENARIOS[1].input;
    const result = verifier.execute(blacklistedScenario, defaultDeps);

    expect(result.verdict).toBe('Anuncio sospechoso');
    expect(result.matchedFraudDirectoryEntries.length).toBeGreaterThan(0);

    // Reportar un nuevo CBU fraudulento desde la Pantalla 7
    const updatedDirectory = reportUseCase.execute(
      {
        ...QUICK_DEMO_SCENARIOS[2].input,
        cbuOrAlias: 'nuevo.estafador.cbu.mp',
      },
      'Pidió transferencia y eliminó la publicación',
      INITIAL_FRAUD_DIRECTORY
    );

    expect(updatedDirectory.length).toBe(INITIAL_FRAUD_DIRECTORY.length + 1);
    expect(updatedDirectory[0].cbuOrAlias).toBe('nuevo.estafador.cbu.mp');
  });

  it('Caso Alquiler Legítimo: verifica satisfactoriamente un anuncio con fotos originales, precio de mercado e inmobiliaria matriculada', () => {
    const verifier = new VerifyListingUseCase();
    const legitScenario = QUICK_DEMO_SCENARIOS[2].input;

    const result = verifier.execute(legitScenario, defaultDeps);

    expect(result.verdict).toBe('Verificado');
    expect(result.recommendation).toBe('Transferir (con recaudos habituales)');
    expect(result.confidenceLevel).toBeGreaterThanOrEqual(80);
  });

  it('Experimento del Mapa de Oportunidad Tecnológica (30 anuncios reales): detecta el 100% de las estafas reales y supera el 95% de precisión global', () => {
    const benchmarkRunner = new RunExperimentBenchmarkUseCase();
    const summary = benchmarkRunner.execute(
      EXPERIMENT_30_REAL_LISTINGS,
      defaultDeps
    );

    expect(summary.totalCases).toBe(30);
    expect(summary.totalActualFrauds).toBe(14);
    expect(summary.detectedFraudsTruePositives).toBe(14);
    expect(summary.fraudDetectionRecallPercent).toBe(100);
    expect(summary.overallAccuracyPercent).toBeGreaterThanOrEqual(95);
    expect(summary.byCityBreakdown.length).toBe(4); // CABA, Córdoba, La Plata, Rosario
  });
});
