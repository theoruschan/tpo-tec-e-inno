import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VerifyListingUseCase } from '../src/application/VerifyListingUseCase';
import { FraudDirectoryEntry } from '../src/domain/entities/types';
import { FraudDirectoryRepository } from '../src/domain/ports/FraudDirectoryRepository';
import { maskIdentifier, maskPhone } from '../src/domain/services/IdentifierPrivacy';
import {
  ResilientFraudDirectoryRepository,
  createFraudDirectoryRepository,
} from '../src/infrastructure/createFraudDirectoryRepository';
import {
  INITIAL_FRAUD_DIRECTORY,
  KNOWN_IMAGE_SIGNATURES,
  QUICK_DEMO_SCENARIOS,
  UNIVERSITY_ZONES,
} from '../src/infrastructure/data/datasets';
import { LocalFraudDirectoryRepository } from '../src/infrastructure/storage/LocalFraudDirectoryRepository';
import { SupabaseFraudDirectoryRepository } from '../src/infrastructure/supabase/SupabaseFraudDirectoryRepository';

const IDENTIFIER_HASH = 'a'.repeat(64);
const PHONE_HASH = 'b'.repeat(64);

const sharedEntry: FraudDirectoryEntry = {
  id: IDENTIFIER_HASH,
  cbuOrAlias: 'alq•••.mp',
  normalizedAliasOrCbu: '',
  reportedHolderName: 'Titular no publicado',
  phoneContact: '•••• 9918',
  city: 'CABA',
  reportsCount: 3,
  lastReportedAt: '2026-10-20',
  reason: 'Reportado por varios estudiantes de forma independiente (pendiente de moderación).',
  source: 'Verificación usuario',
  identifierHash: IDENTIFIER_HASH,
  phoneHash: PHONE_HASH,
};

const cleanInput = {
  ...QUICK_DEMO_SCENARIOS[2].input,
  cbuOrAlias: 'alias.que.no.existe',
  ownerPhone: '+54 9 11 1111-2222',
};

function verify(directory: FraudDirectoryEntry[], hashes = {}) {
  return new VerifyListingUseCase().execute(cleanInput, {
    zones: UNIVERSITY_ZONES,
    knownImages: KNOWN_IMAGE_SIGNATURES,
    fraudDirectory: directory,
    inputIdentifierHashes: hashes,
  });
}

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => Array.from(data.keys())[i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Cruce contra el directorio compartido por hash', () => {
  it('detecta el CBU/alias cuando el hash con sal coincide', () => {
    const result = verify([sharedEntry], { identifier: IDENTIFIER_HASH });
    expect(result.matchedFraudDirectoryEntries).toHaveLength(1);
    expect(result.verdict).toBe('Anuncio sospechoso');
  });

  it('detecta por hash del teléfono', () => {
    const result = verify([sharedEntry], { phone: PHONE_HASH });
    expect(result.matchedFraudDirectoryEntries).toHaveLength(1);
  });

  it('una entrada compartida sin hash coincidente nunca matchea en claro (normalizedAliasOrCbu vacío)', () => {
    const result = verify([sharedEntry], { identifier: 'c'.repeat(64) });
    expect(result.matchedFraudDirectoryEntries).toHaveLength(0);
  });

  it('el teléfono enmascarado no produce falsos positivos por sufijo', () => {
    const result = verify([sharedEntry], {});
    expect(result.matchedFraudDirectoryEntries).toHaveLength(0);
  });

  it('el hallazgo no expone el nombre del titular', () => {
    const blacklisted = new VerifyListingUseCase().execute(QUICK_DEMO_SCENARIOS[1].input, {
      zones: UNIVERSITY_ZONES,
      knownImages: KNOWN_IMAGE_SIGNATURES,
      fraudDirectory: INITIAL_FRAUD_DIRECTORY,
    });
    const finding = blacklisted.findings.find((f) => f.id === 'cbu-blacklisted-match');
    expect(finding).toBeDefined();
    for (const entry of INITIAL_FRAUD_DIRECTORY) {
      expect(finding?.description).not.toContain(entry.reportedHolderName);
    }
  });
});

describe('Enmascarado para la lectura pública', () => {
  it('CBU: solo los últimos 4 dígitos', () => {
    expect(maskIdentifier('0000003100098412239104')).toBe('••••••••••••••••••9104');
  });
  it('alias: 3 primeros y 3 últimos caracteres', () => {
    expect(maskIdentifier('alquiler.facil.ya.mp')).toBe('alq•••.mp');
  });
  it('alias corto y valores ya enmascarados', () => {
    expect(maskIdentifier('abc')).toBe('a•••');
    expect(maskIdentifier('alq•••.mp')).toBe('alq•••.mp');
  });
  it('teléfono: últimos 4 dígitos', () => {
    expect(maskPhone('+54 9 11 6402-9918')).toBe('•••• 9918');
    expect(maskPhone(undefined)).toBe('');
  });
});

describe('SupabaseFraudDirectoryRepository (fetch simulado)', () => {
  const rows = [
    {
      identifier_hash: IDENTIFIER_HASH,
      identifier_masked: 'alq•••.mp',
      phone_hash: PHONE_HASH,
      phone_masked: '•••• 9918',
      city: 'CABA',
      reports_count: '7',
      last_reported_at: '2026-08-29',
      reason: 'Pide seña por WhatsApp.',
      source: 'Comunidad estudiantil',
      is_approved: true,
    },
  ];

  it('lee el directorio por RPC con la clave anon y mapea sin datos en claro', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(rows));
    const repo = new SupabaseFraudDirectoryRepository(
      'https://demo.supabase.co/',
      'anon-key',
      () => 'reporter-1',
      fetchMock as unknown as typeof fetch
    );

    const entries = await repo.listActiveEntries();

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://demo.supabase.co/rest/v1/rpc/get_public_fraud_directory');
    expect((init.headers as Record<string, string>).apikey).toBe('anon-key');
    expect(entries[0]).toMatchObject({
      cbuOrAlias: 'alq•••.mp',
      normalizedAliasOrCbu: '',
      reportedHolderName: 'Titular no publicado',
      reportsCount: 7,
      identifierHash: IDENTIFIER_HASH,
    });
  });

  it('envía el reporte con el id anónimo del dispositivo y devuelve estado pendiente', async () => {
    const fetchMock = vi.fn(async () => jsonResponse('pending'));
    const repo = new SupabaseFraudDirectoryRepository(
      'https://demo.supabase.co',
      'anon-key',
      () => 'reporter-xyz',
      fetchMock as unknown as typeof fetch
    );

    const outcome = await repo.submitReport({
      cbuOrAlias: 'nuevo.alias.mp',
      ownerPhone: '+54 9 11 1234-5678',
      ownerName: 'No se envía',
      listingUrlOrCapture: 'https://example.com',
      city: 'CABA',
      reason: 'Me bloqueó después de transferir.',
    });

    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body).toEqual({
      p_identifier: 'nuevo.alias.mp',
      p_phone: '+54 9 11 1234-5678',
      p_city: 'CABA',
      p_reason: 'Me bloqueó después de transferir.',
      p_reporter_id: 'reporter-xyz',
    });
    expect(JSON.stringify(body)).not.toContain('No se envía');
    expect(outcome.status).toBe('pending');
  });

  it('propaga errores HTTP para que el wrapper caiga a modo local', async () => {
    const repo = new SupabaseFraudDirectoryRepository(
      'https://demo.supabase.co',
      'anon-key',
      () => 'r',
      (async () => jsonResponse({ message: 'boom' }, 500)) as unknown as typeof fetch
    );
    await expect(repo.listActiveEntries()).rejects.toThrow('500');
  });
});

describe('Fallback offline detrás del mismo puerto', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: memoryStorage() });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sin variables de entorno usa el repositorio local', () => {
    expect(createFraudDirectoryRepository({}).kind).toBe('local');
  });

  it('si Supabase falla, lista el directorio local y marca local-fallback', async () => {
    const failing: FraudDirectoryRepository = {
      kind: 'shared',
      listActiveEntries: async () => {
        throw new Error('sin red');
      },
      submitReport: async () => {
        throw new Error('sin red');
      },
      hashIdentifiers: async () => {
        throw new Error('sin red');
      },
    };
    const repo = new ResilientFraudDirectoryRepository(failing);

    const entries = await repo.listActiveEntries();
    expect(entries).toEqual(INITIAL_FRAUD_DIRECTORY);
    expect(repo.kind).toBe('local-fallback');
    expect(await repo.hashIdentifiers('x', 'y')).toEqual({});

    const outcome = await repo.submitReport({
      cbuOrAlias: 'offline.alias',
      ownerPhone: '',
      ownerName: '',
      listingUrlOrCapture: 'https://example.com/aviso',
      city: 'Rosario',
      reason: 'Reporte sin conexión',
    });
    expect(outcome.status).toBe('saved-locally');
    expect(outcome.message).toContain('Sin conexión');
  });

  it('el repositorio local persiste el reporte en localStorage y suma reportes al mismo alias', async () => {
    const repo = new LocalFraudDirectoryRepository();
    const report = {
      cbuOrAlias: 'alquiler.facil.ya.mp',
      ownerPhone: '',
      ownerName: '',
      listingUrlOrCapture: 'https://example.com/aviso',
      city: 'CABA',
      reason: 'Otra víctima más',
    };

    await repo.submitReport(report);
    const entries = await repo.listActiveEntries();
    const entry = entries.find((e) => e.normalizedAliasOrCbu === 'alquiler.facil.ya.mp');
    expect(entry?.reportsCount).toBe(8);

    await repo.submitReport({ ...report, cbuOrAlias: 'alias.nuevo.local', city: 'Córdoba' });
    const updated = await repo.listActiveEntries();
    expect(updated[0]).toMatchObject({ cbuOrAlias: 'alias.nuevo.local', city: 'Córdoba' });
  });
});
