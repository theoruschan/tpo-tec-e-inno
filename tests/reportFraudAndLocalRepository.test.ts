import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportFraudListingUseCase } from '../src/application/ReportFraudListingUseCase';
import { ListingInput } from '../src/domain/entities/types';
import { INITIAL_FRAUD_DIRECTORY, QUICK_DEMO_SCENARIOS } from '../src/infrastructure/data/datasets';
import { LocalRepository } from '../src/infrastructure/storage/LocalRepository';

const DIRECTORY_KEY = 'cuartoseguro_fraud_directory_v1';
const HISTORY_KEY = 'cuartoseguro_verification_history_v1';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    storage: {
      get length() {
        return data.size;
      },
      clear: () => data.clear(),
      getItem: (k: string) => data.get(k) ?? null,
      key: (i: number) => Array.from(data.keys())[i] ?? null,
      removeItem: (k: string) => void data.delete(k),
      setItem: (k: string, v: string) => void data.set(k, String(v)),
    } as Storage,
  };
}

const baseInput: ListingInput = { ...QUICK_DEMO_SCENARIOS[2].input };

describe('ReportFraudListingUseCase', () => {
  const useCase = new ReportFraudListingUseCase();

  it('suma un reporte a un alias existente sin duplicarlo (insensible a mayúsculas/espacios)', () => {
    const updated = useCase.execute(
      { ...baseInput, cbuOrAlias: ' ALQUILER.FACIL.YA.MP ' },
      'Otra víctima',
      INITIAL_FRAUD_DIRECTORY
    );
    expect(updated).toHaveLength(INITIAL_FRAUD_DIRECTORY.length);
    const entry = updated.find((e) => e.id === 'dir-01')!;
    expect(entry.reportsCount).toBe(8);
    expect(entry.reason).toBe('Otra víctima');
    expect(entry.lastReportedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('no muta el directorio original', () => {
    const before = JSON.stringify(INITIAL_FRAUD_DIRECTORY);
    useCase.execute({ ...baseInput, cbuOrAlias: 'alquiler.facil.ya.mp' }, 'x', INITIAL_FRAUD_DIRECTORY);
    expect(JSON.stringify(INITIAL_FRAUD_DIRECTORY)).toBe(before);
  });

  it('sin CBU usa el teléfono como identificador', () => {
    const [entry] = useCase.execute({ ...baseInput, cbuOrAlias: '', ownerPhone: '+54 9 11 9999-0000' }, '', []);
    expect(entry.cbuOrAlias).toBe('+54 9 11 9999-0000');
  });

  it('sin CBU ni teléfono usa los primeros 32 caracteres del link', () => {
    const url = 'https://facebook.com/marketplace/item/un-aviso-muy-largo-123456789';
    const [entry] = useCase.execute({ ...baseInput, cbuOrAlias: '', ownerPhone: '', listingUrlOrCapture: url }, '', []);
    expect(entry.cbuOrAlias).toBe(url.slice(0, 32));
  });

  it('con motivo vacío usa el texto por defecto y la ciudad de la zona', () => {
    const [entry] = useCase.execute(
      { ...baseInput, cbuOrAlias: 'nuevo.alias.cba', zoneId: 'cba-nueva-cordoba' },
      '   ',
      []
    );
    expect(entry.reason).toContain('Reportado como estafa confirmada');
    expect(entry.city).toBe('Córdoba');
    expect(entry.source).toBe('Verificación usuario');
  });
});

describe('LocalRepository con localStorage simulado', () => {
  let mem: ReturnType<typeof memoryStorage>;

  beforeEach(() => {
    mem = memoryStorage();
    vi.stubGlobal('window', { localStorage: mem.storage });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sin datos guardados devuelve el directorio semilla', () => {
    expect(LocalRepository.getFraudDirectory()).toEqual(INITIAL_FRAUD_DIRECTORY);
  });

  it('persiste y relee el directorio', () => {
    const custom = [{ ...INITIAL_FRAUD_DIRECTORY[0], id: 'propio', reportsCount: 99 }];
    LocalRepository.saveFraudDirectory(custom);
    expect(JSON.parse(mem.data.get(DIRECTORY_KEY)!)).toEqual(custom);
    expect(LocalRepository.getFraudDirectory()).toEqual(custom);
  });

  it('JSON corrupto o array vacío → vuelve a la semilla', () => {
    mem.data.set(DIRECTORY_KEY, '{no es json');
    expect(LocalRepository.getFraudDirectory()).toEqual(INITIAL_FRAUD_DIRECTORY);
    mem.data.set(DIRECTORY_KEY, '[]');
    expect(LocalRepository.getFraudDirectory()).toEqual(INITIAL_FRAUD_DIRECTORY);
  });

  it('el historial se siembra la primera vez con 2 verificaciones y se guarda', () => {
    const history = LocalRepository.getVerificationHistory();
    expect(history.map((h) => h.id)).toEqual(['VER-SEED-82', 'VER-SEED-OK']);
    expect(mem.data.has(HISTORY_KEY)).toBe(true);
  });

  it('el historial guardado se limita a 30 entradas', () => {
    const [seed] = LocalRepository.getVerificationHistory();
    const many = Array.from({ length: 45 }, (_, i) => ({ ...seed, id: `V-${i}` }));
    LocalRepository.saveVerificationHistory(many);
    expect(JSON.parse(mem.data.get(HISTORY_KEY)!)).toHaveLength(30);
  });

  it('si setItem tira (cuota llena / modo privado) no rompe la app', () => {
    mem.storage.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    expect(() => LocalRepository.saveFraudDirectory(INITIAL_FRAUD_DIRECTORY)).not.toThrow();
    expect(() => LocalRepository.getVerificationHistory()).not.toThrow();
  });

  it('sin window (SSR/tests) devuelve semillas', () => {
    vi.unstubAllGlobals();
    expect(LocalRepository.getFraudDirectory()).toEqual(INITIAL_FRAUD_DIRECTORY);
    expect(LocalRepository.getVerificationHistory()).toHaveLength(2);
  });
});
