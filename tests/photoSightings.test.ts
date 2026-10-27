import { describe, expect, it, vi } from 'vitest';
import { VerifyListingUseCase } from '../src/application/VerifyListingUseCase';
import { ListingInput, PhotoSighting } from '../src/domain/entities/types';
import { ImageMiningService } from '../src/domain/services/ImageMiningService';
import {
  INITIAL_FRAUD_DIRECTORY,
  KNOWN_IMAGE_SIGNATURES,
  UNIVERSITY_ZONES,
} from '../src/infrastructure/data/datasets';
import {
  ResilientPhotoSightingRepository,
  SupabasePhotoSightingRepository,
} from '../src/infrastructure/supabase/SupabasePhotoSightingRepository';

const PHOTO = '0f0f0f0f0f0f0f0f'; // no está en la base semilla

function listing(overrides: Partial<ListingInput> = {}): ListingInput {
  return {
    listingUrlOrCapture: 'https://www.zonaprop.com.ar/propiedades/aviso.html',
    zoneId: 'caba-palermo',
    monthlyRentArs: 540000,
    depositRequestedArs: 100000,
    ownerName: 'Inmobiliaria de Prueba SRL',
    ownerPhone: '+54 9 11 1234-5678',
    cbuOrAlias: 'alias.de.prueba.ok',
    accountAgeMonths: 36,
    photoCount: 6,
    imageSignatureHash: '',
    uploadedImageDHash: PHOTO,
    requestsAdvanceBeforeVisit: false,
    isRegisteredRealEstate: false,
    authorizedProcessing: true,
    ...overrides,
  };
}

function sighting(overrides: Partial<PhotoSighting> = {}): PhotoSighting {
  return {
    distance: 0,
    city: 'CABA',
    monthlyRentArs: 540000,
    seenAt: '2026-10-20',
    sameContact: true,
    ...overrides,
  };
}

const mining = new ImageMiningService();

describe('ImageMiningService — índice colaborativo de fotos', () => {
  it('misma foto con precio distinto → crítico con el texto exacto del prototipo', () => {
    const a = mining.analyze(listing({ monthlyRentArs: 300000 }), KNOWN_IMAGE_SIGNATURES, [
      sighting({ monthlyRentArs: 540000, sameContact: null }),
    ]);
    const finding = a.findings.find((f) => f.id === 'img-duplicate-community');
    expect(finding?.severity).toBe('critical');
    expect(finding?.title).toBe('Esta foto aparece en otro anuncio con un precio distinto');
    expect(finding?.description).toContain('$540.000/mes');
    expect(finding?.evidenceDetail).toContain('Distancia de Hamming: 0/64');
    expect(a.reusedSightings).toHaveLength(1);
  });

  it('mismo precio pero otro contacto → crítico "otro CBU/alias o teléfono"', () => {
    const a = mining.analyze(listing(), KNOWN_IMAGE_SIGNATURES, [sighting({ sameContact: false })]);
    const finding = a.findings[0];
    expect(finding.id).toBe('img-duplicate-community');
    expect(finding.title).toBe('Esta foto aparece en otro anuncio con otro CBU/alias o teléfono');
    expect(finding.description).toContain('con otro CBU/alias o teléfono de contacto');
  });

  it('una diferencia de precio de hasta 15% no cuenta como "precio distinto"', () => {
    const a = mining.analyze(listing({ monthlyRentArs: 500000 }), KNOWN_IMAGE_SIGNATURES, [
      sighting({ monthlyRentArs: 540000 }), // 7,4% de diferencia
    ]);
    expect(a.reusedSightings).toHaveLength(0);
    expect(a.findings[0].id).toBe('img-seen-same-listing');
    expect(a.findings[0].severity).toBe('positive');
  });

  it('otros estudiantes verificando el MISMO anuncio no generan alerta', () => {
    const a = mining.analyze(listing(), KNOWN_IMAGE_SIGNATURES, [
      sighting(),
      sighting({ seenAt: '2026-10-21' }),
    ]);
    expect(a.findings[0].id).toBe('img-seen-same-listing');
    expect(a.findings[0].description).toContain('Otras 2 verificaciones');
  });

  it('la base semilla de fotos robadas sigue teniendo prioridad', () => {
    const a = mining.analyze(
      listing({ uploadedImageDHash: KNOWN_IMAGE_SIGNATURES[0].perceptualHash }),
      KNOWN_IMAGE_SIGNATURES,
      [sighting({ sameContact: false })]
    );
    expect(a.findings[0].id).toBe('img-duplicate-stolen');
  });

  it('reutilización en la comunidad pesa más que "foto original verificada" de la semilla', () => {
    const a = mining.analyze(
      listing({ uploadedImageDHash: undefined, imageSignatureHash: 'hash-residencia-uade-legit-001' }),
      KNOWN_IMAGE_SIGNATURES,
      [sighting({ sameContact: false })]
    );
    expect(a.findings[0].id).toBe('img-duplicate-community');
  });

  it('sin avistamientos todo sigue como antes', () => {
    expect(mining.analyze(listing(), KNOWN_IMAGE_SIGNATURES).findings[0].id).toBe('img-no-duplicate-match');
  });
});

describe('VerifyListingUseCase con avistamientos', () => {
  it('foto reutilizada a otro precio → Anuncio sospechoso con ese motivo principal', () => {
    const result = new VerifyListingUseCase().execute(listing({ monthlyRentArs: 330000 }), {
      zones: UNIVERSITY_ZONES,
      knownImages: KNOWN_IMAGE_SIGNATURES,
      fraudDirectory: INITIAL_FRAUD_DIRECTORY,
      photoSightings: [sighting({ monthlyRentArs: 540000, sameContact: false })],
    });
    expect(result.verdict).toBe('Anuncio sospechoso');
    expect(result.primaryReason).toBe('Esta foto aparece en otro anuncio con un precio distinto');
    expect(result.recommendation).toBe('No transferir');
  });
});

describe('SupabasePhotoSightingRepository (fetch simulado)', () => {
  const submission = {
    dHash: PHOTO,
    city: 'CABA',
    monthlyRentArs: 300000,
    cbuOrAlias: 'alias.x',
    ownerPhone: '+54 9 11 0000-0000',
  };

  it('manda huella, ciudad, precio, contacto y el id del dispositivo; mapea la respuesta', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify([
          { distance: 2, city: 'CABA', monthly_rent_ars: 540000, seen_at: '2026-10-20', same_contact: false },
        ]),
        { status: 200 }
      )
    );
    const repo = new SupabasePhotoSightingRepository(
      'https://demo.supabase.co',
      'anon',
      () => 'device-1',
      fetchMock as unknown as typeof fetch
    );

    const sightings = await repo.matchAndRegister(submission);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://demo.supabase.co/rest/v1/rpc/match_and_register_photo');
    expect(JSON.parse(init.body as string)).toEqual({
      p_dhash: PHOTO,
      p_city: 'CABA',
      p_monthly_rent_ars: 300000,
      p_identifier: 'alias.x',
      p_phone: '+54 9 11 0000-0000',
      p_reporter_id: 'device-1',
    });
    expect(sightings).toEqual([
      { distance: 2, city: 'CABA', monthlyRentArs: 540000, seenAt: '2026-10-20', sameContact: false },
    ]);
  });

  it('si Supabase falla, el wrapper devuelve [] y la verificación sigue', async () => {
    const repo = new ResilientPhotoSightingRepository(
      new SupabasePhotoSightingRepository(
        'https://demo.supabase.co',
        'anon',
        () => 'device-1',
        (async () => new Response('{}', { status: 500 })) as unknown as typeof fetch
      )
    );
    expect(await repo.matchAndRegister(submission)).toEqual([]);
  });
});
