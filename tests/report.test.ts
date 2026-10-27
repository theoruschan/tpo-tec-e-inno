import { describe, expect, it } from 'vitest';
import {
  BuildVerificationReportUseCase,
  REPORT_DISCLAIMER,
} from '../src/application/BuildVerificationReportUseCase';
import { VerifyListingUseCase } from '../src/application/VerifyListingUseCase';
import {
  INITIAL_FRAUD_DIRECTORY,
  KNOWN_IMAGE_SIGNATURES,
  QUICK_DEMO_SCENARIOS,
  UNIVERSITY_ZONES,
} from '../src/infrastructure/data/datasets';
import {
  JsPdfReportExporter,
  toPdfSafeText,
} from '../src/infrastructure/report/JsPdfReportExporter';

const deps = {
  zones: UNIVERSITY_ZONES,
  knownImages: KNOWN_IMAGE_SIGNATURES,
  fraudDirectory: INITIAL_FRAUD_DIRECTORY,
};

const builder = new BuildVerificationReportUseCase();
const prototypeResult = new VerifyListingUseCase().execute(
  { ...QUICK_DEMO_SCENARIOS[0].input, id: 'VER-TEST-01' },
  deps
);

async function pdfText(blob: Blob): Promise<string> {
  return new TextDecoder('latin1').decode(await blob.arrayBuffer());
}

describe('BuildVerificationReportUseCase (Pantalla 8)', () => {
  const report = builder.execute(prototypeResult);

  it('incluye veredicto, confianza, motivo, recomendación, fecha y descargo', () => {
    expect(report.verdict).toBe('Anuncio sospechoso');
    expect(report.confidenceLevel).toBe(prototypeResult.confidenceLevel);
    expect(report.primaryReason).toBe('Esta foto aparece en otro anuncio con un precio distinto');
    expect(report.recommendation).toBe('No transferir');
    expect(report.issuedAt).toMatch(/^\d{1,2}\/\d{1,2}\/\d{2}, \d{2}:\d{2}$/);
    expect(report.disclaimer).toContain('no reemplaza ver la propiedad en persona');
    expect(report.reasons).toHaveLength(prototypeResult.findings.length);
  });

  it('menciona la captura adjunta junto al link', () => {
    expect(report.listing).toContain('captura_marketplace_monserrat.png');
  });

  it('el texto para compartir lleva los mismos datos y el descargo', () => {
    const text = builder.toShareText(report);
    expect(text).toContain('ANUNCIO SOSPECHOSO');
    expect(text).toContain(`${report.confidenceLevel}%`);
    expect(text).toContain('No transferir');
    expect(text).toContain(REPORT_DISCLAIMER);
  });

  it('nombre de archivo estable y en minúsculas', () => {
    expect(builder.fileName(report)).toBe('cuartoseguro-ver-test-01.pdf');
  });
});

describe('toPdfSafeText', () => {
  it('conserva tildes y ñ, reemplaza símbolos fuera de Latin-1 y quita emojis', () => {
    expect(toPdfSafeText('Señá • precio — z ≤ -2σ “ok” 🛡️')).toBe(
      'Señá - precio - z <= -2 desv. "ok"'
    );
  });
});

describe('JsPdfReportExporter (genera el archivo real)', () => {
  it('produce un PDF válido de UNA página con el veredicto y el descargo', async () => {
    const blob = await new JsPdfReportExporter().toPdf(builder.execute(prototypeResult));
    const raw = await pdfText(blob);

    expect(raw.startsWith('%PDF-')).toBe(true);
    expect(raw.match(/\/Type \/Page\b/g)).toHaveLength(1);
    expect(blob.size).toBeGreaterThan(2000);
  });

  it('sigue siendo una página aunque haya muchos motivos largos', async () => {
    const long = builder.execute(prototypeResult);
    long.reasons = Array.from({ length: 25 }, (_, i) => ({
      title: `Motivo ${i + 1} con un título bastante largo para forzar el salto de línea`,
      description: 'Descripción extensa '.repeat(20),
      severity: 'warning',
    }));
    const raw = await pdfText(await new JsPdfReportExporter().toPdf(long));
    expect(raw.match(/\/Type \/Page\b/g)).toHaveLength(1);
  });
});
