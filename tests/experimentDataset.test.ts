import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ParseExperimentDatasetUseCase,
  parseCsv,
} from '../src/application/ParseExperimentDatasetUseCase';
import {
  RunExperimentBenchmarkUseCase,
  assignExperimentSplit,
} from '../src/application/RunExperimentBenchmarkUseCase';
import {
  INITIAL_FRAUD_DIRECTORY,
  KNOWN_IMAGE_SIGNATURES,
  UNIVERSITY_ZONES,
} from '../src/infrastructure/data/datasets';
import { EXPERIMENT_30_REAL_LISTINGS } from '../src/infrastructure/data/experiment30Listings';

const deps = {
  zones: UNIVERSITY_ZONES,
  knownImages: KNOWN_IMAGE_SIGNATURES,
  fraudDirectory: INITIAL_FRAUD_DIRECTORY,
};
const parser = new ParseExperimentDatasetUseCase(UNIVERSITY_ZONES.map((z) => z.id));
const runner = new RunExperimentBenchmarkUseCase();

describe('parseCsv', () => {
  it('respeta comillas, comas internas, comillas escapadas y CRLF', () => {
    expect(parseCsv('a,b\r\n"x, y","dijo ""hola"""\r\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'dijo "hola"'],
    ]);
  });

  it('detecta ";" como separador (Excel en español)', () => {
    expect(parseCsv('a;b\n1;2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('ParseExperimentDatasetUseCase', () => {
  it('carga el CSV de ejemplo de docs sin errores', () => {
    const csv = readFileSync('docs/ejemplos/dataset-ejemplo.csv', 'utf-8');
    const { samples, errors } = parser.execute(csv, 'dataset-ejemplo.csv');
    expect(errors).toEqual([]);
    expect(samples).toHaveLength(5);
    expect(samples[0]).toMatchObject({
      caseNumber: 1,
      groundTruth: 'FRAUD',
      split: 'calibration',
      input: {
        zoneId: 'caba-monserrat-uade',
        monthlyRentArs: 230000,
        requestsAdvanceBeforeVisit: true,
        uploadedImageDHash: '1e9a9abab89983a3',
      },
    });
    expect(samples[1].input.isRegisteredRealEstate).toBe(true);
  });

  it('carga el JSON de ejemplo de docs', () => {
    const json = readFileSync('docs/ejemplos/dataset-ejemplo.json', 'utf-8');
    const { samples, errors } = parser.execute(json, 'dataset-ejemplo.json');
    expect(errors).toEqual([]);
    expect(samples[0].input.requestsAdvanceBeforeVisit).toBe(true);
  });

  it('acepta etiquetas en español y montos con separador de miles', () => {
    const csv = 'ground_truth,zone_id,monthly_rent_ars,deposit_ars\nestafa,caba-palermo,"$ 230.000",115.000';
    const { samples, errors } = parser.execute(csv);
    expect(errors).toEqual([]);
    expect(samples[0]).toMatchObject({
      groundTruth: 'FRAUD',
      input: { monthlyRentArs: 230000, depositRequestedArs: 115000 },
    });
  });

  it('informa filas inválidas con número de fila y conserva las válidas', () => {
    const csv = [
      'ground_truth,zone_id,monthly_rent_ars',
      'FRAUD,caba-palermo,200000',
      'QUIZAS,caba-palermo,200000',
      'LEGITIMATE,zona-inventada,200000',
      'LEGITIMATE,caba-palermo,0',
    ].join('\n');
    const { samples, errors } = parser.execute(csv);
    expect(samples).toHaveLength(1);
    expect(errors).toHaveLength(3);
    expect(errors[0]).toMatch(/^Fila 3: ground_truth/);
    expect(errors[1]).toMatch(/^Fila 4: zone_id/);
    expect(errors[2]).toMatch(/^Fila 5: monthly_rent_ars/);
  });

  it('rechaza JSON que no es un array y archivos vacíos', () => {
    expect(parser.execute('{"a":1}', 'x.json').errors[0]).toContain('array');
    expect(parser.execute('   ').errors[0]).toContain('vacío');
  });

  it('evita case_id duplicados', () => {
    const csv = 'case_id,ground_truth,zone_id,monthly_rent_ars\n7,FRAUD,caba-palermo,1\n7,FRAUD,caba-palermo,1';
    const { samples } = parser.execute(csv);
    expect(new Set(samples.map((s) => s.caseNumber)).size).toBe(2);
  });
});

describe('Split calibración / evaluación', () => {
  it('sin columna split: 1 de cada 3 por etiqueta va a evaluación (30 → 21/9) y es determinístico', () => {
    const { samples, splitSource } = assignExperimentSplit(EXPERIMENT_30_REAL_LISTINGS);
    const evaluation = samples.filter((s) => s.split === 'evaluation');
    expect(splitSource).toBe('auto');
    expect(evaluation).toHaveLength(9);
    expect(evaluation.filter((s) => s.groundTruth === 'FRAUD')).toHaveLength(4);
    expect(evaluation.filter((s) => s.groundTruth === 'LEGITIMATE')).toHaveLength(4);
    expect(evaluation.filter((s) => s.groundTruth === 'INSUFFICIENT_DATA')).toHaveLength(1);
    expect(assignExperimentSplit(EXPERIMENT_30_REAL_LISTINGS).samples.map((s) => s.split)).toEqual(
      samples.map((s) => s.split)
    );
  });

  it('respeta la columna split cuando todas las filas la traen', () => {
    const csv = readFileSync('docs/ejemplos/dataset-ejemplo.csv', 'utf-8');
    const summary = runner.executeWithSplit(parser.execute(csv).samples, deps);
    expect(summary.splitSource).toBe('explicit');
    expect(summary.calibration.totalCases).toBe(2);
    expect(summary.evaluation.totalCases).toBe(3);
    expect(summary.full.totalCases).toBe(5);
  });

  it('calibración + evaluación suman el total en el dataset curado', () => {
    const summary = runner.executeWithSplit(EXPERIMENT_30_REAL_LISTINGS, deps);
    expect(summary.calibration.totalCases + summary.evaluation.totalCases).toBe(30);
    expect(
      summary.calibration.detectedFraudsTruePositives + summary.evaluation.detectedFraudsTruePositives
    ).toBe(summary.full.detectedFraudsTruePositives);
  });

  it('las métricas se recalculan con el dataset propio (un fraude no detectado baja el recall)', () => {
    const csv = [
      'case_id,ground_truth,zone_id,monthly_rent_ars,deposit_ars,owner_name,owner_phone,cbu_or_alias,account_age_months,photo_count,is_registered_real_estate,real_estate_license',
      // Estafa "perfecta": precio de mercado, cuenta vieja, matrícula declarada → el motor no la ve
      '1,FRAUD,caba-palermo,540000,100000,Inmobiliaria Falsa,+54 9 11 2222-3333,alias.limpio.uno,60,8,si,CUCICBA 1',
      // Estafa evidente: foto robada + precio anzuelo
      '2,FRAUD,caba-monserrat-uade,230000,115000,X,+54 9 11 4444-5555,alias.dos,1,2,no,',
    ].join('\n');
    const { samples } = parser.execute(csv);
    samples[1].input.uploadedImageDHash = KNOWN_IMAGE_SIGNATURES[0].perceptualHash;
    const summary = runner.executeWithSplit(samples, deps).full;
    expect(summary.totalActualFrauds).toBe(2);
    expect(summary.detectedFraudsTruePositives).toBe(1);
    expect(summary.fraudDetectionRecallPercent).toBe(50);
  });
});
