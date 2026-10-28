import { describe, expect, it } from 'vitest';
import { ParseExperimentDatasetUseCase } from '../src/application/ParseExperimentDatasetUseCase';
import {
  formatPeriod,
  monthsSince,
  resolvePriceBenchmark,
} from '../src/application/ResolvePriceBenchmark';
import { VerifyListingUseCase } from '../src/application/VerifyListingUseCase';
import { ListingInput, MarketPriceData } from '../src/domain/entities/types';
import {
  INITIAL_FRAUD_DIRECTORY,
  KNOWN_IMAGE_SIGNATURES,
  UNIVERSITY_ZONES,
} from '../src/infrastructure/data/datasets';
import { MARKET_PRICES } from '../src/infrastructure/data/marketPrices';

const market: MarketPriceData = {
  updatedAt: '2026-10-27',
  sources: [
    { id: 'caba', city: 'CABA', label: 'Índice CABA', period: '2026-09', url: 'https://x/caba.pdf', prices: { studio: 780000, two_rooms: 900000 } },
    { id: 'cba', city: 'Córdoba', label: 'Índice Córdoba', period: '2026-03', url: 'https://x/cba.pdf', prices: { two_rooms: 620000 } },
  ],
};
const OCT_2026 = new Date(2026, 9, 27);
const palermo = UNIVERSITY_ZONES.find((z) => z.id === 'caba-palermo')!;
const cordoba = UNIVERSITY_ZONES.find((z) => z.id === 'cba-nueva-cordoba')!;
const rosario = UNIVERSITY_ZONES.find((z) => z.id === 'rosario-centro')!;

describe('resolvePriceBenchmark', () => {
  it('habitación: usa la estimación del equipo y lo dice', () => {
    const zone = resolvePriceBenchmark(palermo, 'room', market, OCT_2026);
    expect(zone.averageRentArs).toBe(palermo.averageRentArs);
    expect(zone.priceSource?.kind).toBe('team-estimate');
    expect(zone.priceSource?.label).toContain('no hay índice público de habitaciones');
  });

  it('sin tipo indicado se trata como habitación (compatibilidad con datos viejos)', () => {
    expect(resolvePriceBenchmark(palermo, undefined, market, OCT_2026).priceSource?.kind).toBe('team-estimate');
  });

  it('monoambiente en CABA: precio del índice, fuente y período legibles, banda ±25%', () => {
    const zone = resolvePriceBenchmark(palermo, 'studio', market, OCT_2026);
    expect(zone.averageRentArs).toBe(780000);
    expect(zone.minReasonableArs).toBe(585000);
    expect(zone.maxReasonableArs).toBe(975000);
    expect(zone.priceSource).toMatchObject({ kind: 'market-index', url: 'https://x/caba.pdf' });
    expect(zone.priceSource?.label).toBe(
      'Índice CABA, monoambiente, septiembre 2026 (promedio de la ciudad o región, no del barrio)'
    );
    expect(zone.priceSource?.note).toBeUndefined();
  });

  it('dato de 7 meses: avisa que puede estar atrasado', () => {
    const zone = resolvePriceBenchmark(cordoba, 'two_rooms', market, OCT_2026);
    expect(zone.averageRentArs).toBe(620000);
    expect(zone.priceSource?.note).toContain('tiene 7 meses');
  });

  it('sin índice para esa ciudad o tipo: precio 0 y fuente "unavailable"', () => {
    expect(resolvePriceBenchmark(rosario, 'studio', market, OCT_2026)).toMatchObject({
      averageRentArs: 0,
      priceSource: { kind: 'unavailable' },
    });
    expect(resolvePriceBenchmark(cordoba, 'studio', market, OCT_2026).priceSource?.label).toBe(
      'No tenemos un índice de precios de monoambiente para Córdoba'
    );
  });

  it('formatPeriod y monthsSince', () => {
    expect(formatPeriod('2026-03')).toBe('marzo 2026');
    expect(monthsSince('2026-09', OCT_2026)).toBe(1);
    expect(monthsSince('2025-12', OCT_2026)).toBe(10);
  });
});

describe('VerifyListingUseCase con precios de mercado', () => {
  const base: ListingInput = {
    listingUrlOrCapture: 'https://www.zonaprop.com.ar/propiedades/aviso.html',
    zoneId: 'caba-palermo',
    propertyType: 'studio',
    monthlyRentArs: 760000,
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
  };
  const deps = {
    zones: UNIVERSITY_ZONES,
    knownImages: KNOWN_IMAGE_SIGNATURES,
    fraudDirectory: INITIAL_FRAUD_DIRECTORY,
    marketPrices: market,
  };
  const verifier = new VerifyListingUseCase();

  it('monoambiente a precio de mercado → Verificado y la evidencia cita la fuente', () => {
    const result = verifier.execute(base, deps);
    expect(result.verdict).toBe('Verificado');
    const bi = result.findings.find((f) => f.id === 'bi-price-consistent');
    expect(bi?.evidenceDetail).toContain('Referencia: Índice CABA, monoambiente, septiembre 2026');
  });

  it('el mismo precio que es normal para una habitación es "anzuelo" para un monoambiente', () => {
    const room = verifier.execute({ ...base, propertyType: 'room', monthlyRentArs: 500000 }, deps);
    const studio = verifier.execute({ ...base, monthlyRentArs: 500000 }, deps);
    expect(room.priceComparison.isTooGoodToBeTrue).toBe(false);
    expect(studio.priceComparison.isTooGoodToBeTrue).toBe(true); // 36% debajo del índice
    // El índice es de toda la ciudad: el motivo no puede decir "promedio de Palermo".
    expect(studio.findings.find((f) => f.id === 'bi-price-too-good')?.title).toBe(
      'Precio 35.9% por debajo del promedio de CABA'
    );
    expect(room.findings.find((f) => f.id === 'bi-price-consistent')?.title).toContain('Palermo');
  });

  it('sin índice: no compara el precio, no suma riesgo y lo explica', () => {
    const result = verifier.execute({ ...base, zoneId: 'rosario-centro', monthlyRentArs: 100000 }, deps);
    const finding = result.findings.find((f) => f.id === 'bi-price-no-benchmark');
    expect(finding?.severity).toBe('info');
    expect(finding?.riskPoints).toBe(0);
    expect(result.priceComparison.isTooGoodToBeTrue).toBe(false);
    expect(result.verdict).toBe('Verificado');
  });

  it('sin índice igual detecta la seña pedida antes de visitar', () => {
    const result = verifier.execute(
      { ...base, zoneId: 'rosario-centro', requestsAdvanceBeforeVisit: true, depositRequestedArs: 600000, monthlyRentArs: 700000 },
      deps
    );
    expect(result.findings.find((f) => f.id === 'bi-advance-without-visit')?.severity).toBe('critical');
  });
});

describe('Datos reales en marketPrices.json', () => {
  it('cada fuente tiene ciudad conocida, período YYYY-MM, URL del reporte y precios plausibles', () => {
    const cities = new Set(UNIVERSITY_ZONES.map((z) => z.city));
    expect(MARKET_PRICES.sources.length).toBeGreaterThan(0);
    for (const source of MARKET_PRICES.sources) {
      expect(cities.has(source.city as never)).toBe(true);
      expect(source.period).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
      expect(source.url).toMatch(/^https:\/\/www\.zonaprop\.com\.ar\/.+\.pdf$/);
      const values = Object.values(source.prices);
      expect(values.length).toBeGreaterThan(0);
      for (const v of values) expect(v).toBeGreaterThan(50000);
    }
  });
});

describe('Dataset propio con property_type', () => {
  it('acepta monoambiente / 2_ambientes / habitacion y rechaza otros', () => {
    const parser = new ParseExperimentDatasetUseCase(UNIVERSITY_ZONES.map((z) => z.id));
    const csv = [
      'ground_truth,zone_id,monthly_rent_ars,property_type',
      'FRAUD,caba-palermo,400000,monoambiente',
      'LEGITIMATE,caba-palermo,900000,2_ambientes',
      'LEGITIMATE,caba-palermo,450000,habitacion',
      'LEGITIMATE,caba-palermo,450000,loft',
    ].join('\n');
    const { samples, errors } = parser.execute(csv);
    expect(samples.map((s) => s.input.propertyType)).toEqual(['studio', 'two_rooms', 'room']);
    expect(errors[0]).toContain('property_type "loft"');
  });
});
