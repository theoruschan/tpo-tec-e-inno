import { describe, expect, it } from 'vitest';
import { VerifyListingUseCase } from '../src/application/VerifyListingUseCase';
import { ListingInput } from '../src/domain/entities/types';
import {
  DataQualityValidator,
  MISSING_CONTACT_BLOCKING_MESSAGE,
} from '../src/domain/services/DataQualityValidator';
import { IdentityCbuMatcher } from '../src/domain/services/IdentityCbuMatcher';
import { ImageMiningService } from '../src/domain/services/ImageMiningService';
import { ZonePriceBiService } from '../src/domain/services/ZonePriceBiService';
import {
  INITIAL_FRAUD_DIRECTORY,
  KNOWN_IMAGE_SIGNATURES,
  UNIVERSITY_ZONES,
} from '../src/infrastructure/data/datasets';

const monserrat = UNIVERSITY_ZONES.find((z) => z.id === 'caba-monserrat-uade')!; // promedio $420.000
const rosario = UNIVERSITY_ZONES.find((z) => z.id === 'rosario-centro')!; // registros 'Baja'

/** Anuncio "limpio" de referencia: cada test cambia solo lo que mide. */
function listing(overrides: Partial<ListingInput> = {}): ListingInput {
  return {
    listingUrlOrCapture: 'https://www.zonaprop.com.ar/propiedades/aviso-limpio.html',
    zoneId: monserrat.id,
    monthlyRentArs: 420000,
    depositRequestedArs: 100000,
    ownerName: 'Inmobiliaria de Prueba SRL',
    ownerPhone: '+54 9 11 1234-5678',
    cbuOrAlias: 'alias.de.prueba.ok',
    accountAgeMonths: 36,
    photoCount: 6,
    imageSignatureHash: '',
    requestsAdvanceBeforeVisit: false,
    isRegisteredRealEstate: false,
    authorizedProcessing: true,
    ...overrides,
  };
}

const deps = {
  zones: UNIVERSITY_ZONES,
  knownImages: KNOWN_IMAGE_SIGNATURES,
  fraudDirectory: INITIAL_FRAUD_DIRECTORY,
};

describe('DataQualityValidator — casos borde (Pantalla 4)', () => {
  const validator = new DataQualityValidator();

  it('un link de menos de 8 caracteres sin captura no es legible', () => {
    const q = validator.validate(listing({ listingUrlOrCapture: 'fb.com' }));
    expect(q.isLinkOrCaptureValid).toBe(false);
    expect(q.canProceedAutomatically).toBe(false);
  });

  it('con captura subida el link puede estar vacío', () => {
    const q = validator.validate(listing({ listingUrlOrCapture: '', hasCaptureUploaded: true }));
    expect(q.isLinkOrCaptureValid).toBe(true);
  });

  it('solo el CBU/alias alcanza como dato de contacto, pero avisa que es parcial', () => {
    const q = validator.validate(listing({ ownerName: '', ownerPhone: '' }));
    expect(q.hasContactInfo).toBe(true);
    expect(q.blockingMessage).toBeNull();
    expect(q.warnings.some((w) => w.includes('datos de contacto parciales'))).toBe(true);
  });

  it('nombre de 2 letras y teléfono de 5 dígitos no cuentan como contacto', () => {
    const q = validator.validate(listing({ ownerName: 'Jo', ownerPhone: '12345', cbuOrAlias: 'abc' }));
    expect(q.hasContactInfo).toBe(false);
    expect(q.blockingMessage).toBe(MISSING_CONTACT_BLOCKING_MESSAGE);
  });

  it('1 foto alcanza si hay huella perceptual subida', () => {
    expect(validator.validate(listing({ photoCount: 1 })).hasSufficientPhotos).toBe(false);
    expect(
      validator.validate(listing({ photoCount: 1, uploadedImageDHash: '0123456789abcdef' }))
        .hasSufficientPhotos
    ).toBe(true);
  });

  it('completitud 100 con todos los datos y 0 sin nada', () => {
    expect(validator.validate(listing()).completenessScore).toBe(100);
    expect(
      validator.validate(
        listing({ listingUrlOrCapture: '', ownerName: '', ownerPhone: '', cbuOrAlias: '', photoCount: 0 })
      ).completenessScore
    ).toBe(0);
  });
});

describe('ZonePriceBiService — umbrales exactos', () => {
  const bi = new ZonePriceBiService();

  it('exactamente -34% ya es "demasiado bueno para ser real" (crítico)', () => {
    const a = bi.analyze(listing({ monthlyRentArs: 277200 }), monserrat);
    expect(a.comparison.deviationPercent).toBe(-34);
    expect(a.comparison.isTooGoodToBeTrue).toBe(true);
    expect(a.findings[0].severity).toBe('critical');
  });

  it('exactamente -22% es "moderadamente bajo" y -21.9% es normal', () => {
    expect(bi.analyze(listing({ monthlyRentArs: 327600 }), monserrat).comparison.isModeratelyLow).toBe(true);
    const normal = bi.analyze(listing({ monthlyRentArs: 328020 }), monserrat);
    expect(normal.comparison.isModeratelyLow).toBe(false);
    expect(normal.findings[0].id).toBe('bi-price-consistent');
  });

  it('seña >= 65% del alquiler pedida sin visita es crítica; 64% es advertencia', () => {
    const excessive = bi.analyze(
      listing({ depositRequestedArs: 273000, requestsAdvanceBeforeVisit: true }),
      monserrat
    );
    expect(excessive.comparison.isExcessiveDeposit).toBe(true);
    expect(excessive.findings.find((f) => f.id === 'bi-advance-without-visit')?.severity).toBe('critical');

    const warning = bi.analyze(
      listing({ depositRequestedArs: 268800, requestsAdvanceBeforeVisit: true }),
      monserrat
    );
    expect(warning.findings.find((f) => f.id === 'bi-advance-without-visit')?.severity).toBe('warning');
  });

  it('sin pedido de seña previa a la visita no hay hallazgo de seña aunque sea alta', () => {
    const a = bi.analyze(listing({ depositRequestedArs: 400000 }), monserrat);
    expect(a.findings.find((f) => f.id === 'bi-advance-without-visit')).toBeUndefined();
  });

  it('alquiler 0 o negativo no rompe el cálculo (se acota a 1)', () => {
    const a = bi.analyze(listing({ monthlyRentArs: 0, depositRequestedArs: -5 }), monserrat);
    expect(a.comparison.publishedRentArs).toBe(1);
    expect(a.comparison.depositRequestedArs).toBe(0);
    expect(Number.isFinite(a.comparison.zScore)).toBe(true);
  });
});

describe('IdentityCbuMatcher — casos borde', () => {
  const matcher = new IdentityCbuMatcher();

  it('cruza el teléfono por los últimos 8 dígitos aunque cambie el prefijo (011 15 vs +54 9 11)', () => {
    const a = matcher.analyze(
      listing({ cbuOrAlias: '', ownerPhone: '011 15 6402-9918' }),
      INITIAL_FRAUD_DIRECTORY,
      monserrat
    );
    expect(a.matchedEntries.map((e) => e.id)).toContain('dir-01');
  });

  it('cruza por patrón de URL del aviso', () => {
    const a = matcher.analyze(
      listing({ cbuOrAlias: '', ownerPhone: '', listingUrlOrCapture: 'https://x.com/rosario-cuartos-economicos-2026?ref=1' }),
      INITIAL_FRAUD_DIRECTORY,
      rosario
    );
    expect(a.matchedEntries.map((e) => e.id)).toContain('dir-04');
  });

  it('normaliza mayúsculas y espacios del alias', () => {
    const a = matcher.analyze(listing({ cbuOrAlias: '  ALQUILER.FACIL.YA.MP ' }), INITIAL_FRAUD_DIRECTORY, monserrat);
    expect(a.findings[0].id).toBe('cbu-blacklisted-match');
    expect(a.findings[0].title).toContain('7 veces');
  });

  it('un alias de menos de 4 caracteres no se consulta ni se informa como limpio', () => {
    const a = matcher.analyze(listing({ cbuOrAlias: 'ab' }), [], monserrat);
    expect(a.findings.some((f) => f.category === 'cbu_directory')).toBe(false);
  });

  it('cuenta de 0 meses dice "menos de 1 mes"', () => {
    const a = matcher.analyze(listing({ accountAgeMonths: 0 }), [], monserrat);
    expect(a.findings.find((f) => f.id === 'identity-new-account')?.description).toContain('menos de 1 mes');
  });

  it('en ciudades con registros de baja calidad, un nombre corto suma riesgo', () => {
    const a = matcher.analyze(listing({ ownerName: 'Ana', zoneId: rosario.id }), [], rosario);
    expect(a.findings.find((f) => f.id === 'identity-disparate-public-registry')?.riskPoints).toBe(10);
  });

  it('matrícula declarada da hallazgo positivo', () => {
    const a = matcher.analyze(
      listing({ isRegisteredRealEstate: true, realEstateLicense: 'CUCICBA 1234' }),
      [],
      monserrat
    );
    expect(a.findings.find((f) => f.id === 'identity-registered-agency')?.severity).toBe('positive');
  });
});

describe('ImageMiningService — casos borde', () => {
  const mining = new ImageMiningService();

  it('foto original verificada da hallazgo positivo, no crítico', () => {
    const a = mining.analyze(listing({ imageSignatureHash: 'hash-residencia-uade-legit-001' }), KNOWN_IMAGE_SIGNATURES);
    expect(a.findings[0].id).toBe('img-verified-original');
  });

  it('una sola foto suma una advertencia', () => {
    const a = mining.analyze(listing({ photoCount: 1 }), KNOWN_IMAGE_SIGNATURES);
    expect(a.findings.some((f) => f.id === 'img-low-photo-count')).toBe(true);
  });

  it('firma manual inexistente = sin coincidencias', () => {
    const a = mining.analyze(listing({ imageSignatureHash: 'hash-que-no-existe' }), KNOWN_IMAGE_SIGNATURES);
    expect(a.matchedSignature).toBeUndefined();
  });
});

describe('VerifyListingUseCase — ramas del veredicto', () => {
  const verifier = new VerifyListingUseCase();

  it('anuncio limpio y completo → Verificado', () => {
    expect(verifier.execute(listing(), deps).verdict).toBe('Verificado');
  });

  it('sin contacto y sin alertas críticas → Sin datos suficientes con el mensaje exacto', () => {
    const r = verifier.execute(listing({ ownerName: '', ownerPhone: '', cbuOrAlias: '' }), deps);
    expect(r.verdict).toBe('Sin datos suficientes');
    expect(r.primaryReason).toBe(MISSING_CONTACT_BLOCKING_MESSAGE);
    expect(r.recommendation).toBe('Pedir más información');
  });

  it('sin contacto pero con foto robada → igual es Anuncio sospechoso (la alerta crítica manda)', () => {
    const r = verifier.execute(
      listing({ ownerName: '', ownerPhone: '', cbuOrAlias: '', imageSignatureHash: 'hash-airbnb-palermo-8821' }),
      deps
    );
    expect(r.verdict).toBe('Anuncio sospechoso');
    expect(r.primaryReason).toBe('Esta foto aparece en otro anuncio con un precio distinto');
  });

  it('zona gris (riesgo 24-39 sin críticos) → Sin datos suficientes', () => {
    // Cuenta nueva (+20) + precio moderadamente bajo (+16) = 36
    const r = verifier.execute(listing({ accountAgeMonths: 1, monthlyRentArs: 320000 }), deps);
    expect(r.riskScore).toBe(36);
    expect(r.verdict).toBe('Sin datos suficientes');
  });

  it('el riesgo se acota a 100', () => {
    const r = verifier.execute(
      listing({
        imageSignatureHash: 'hash-airbnb-palermo-8821',
        monthlyRentArs: 200000,
        depositRequestedArs: 200000,
        requestsAdvanceBeforeVisit: true,
        accountAgeMonths: 0,
        cbuOrAlias: 'alquiler.facil.ya.mp',
        photoCount: 1,
      }),
      deps
    );
    expect(r.riskScore).toBe(100);
    expect(r.confidenceLevel).toBeLessThanOrEqual(98);
  });

  it('zona inexistente cae a la primera zona sin romper', () => {
    const r = verifier.execute(listing({ zoneId: 'zona-que-no-existe' }), deps);
    expect(r.priceComparison.zone.id).toBe(UNIVERSITY_ZONES[0].id);
  });
});
