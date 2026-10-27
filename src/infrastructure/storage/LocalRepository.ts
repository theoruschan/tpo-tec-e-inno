import {
  FraudDirectoryEntry,
  VerificationResult,
} from '../../domain/entities/types';
import { VerifyListingUseCase } from '../../application/VerifyListingUseCase';
import {
  INITIAL_FRAUD_DIRECTORY,
  KNOWN_IMAGE_SIGNATURES,
  QUICK_DEMO_SCENARIOS,
  UNIVERSITY_ZONES,
} from '../data/datasets';

const HISTORY_STORAGE_KEY = 'cuartoseguro_verification_history_v1';
const DIRECTORY_STORAGE_KEY = 'cuartoseguro_fraud_directory_v1';

export class LocalRepository {
  public static getFraudDirectory(): FraudDirectoryEntry[] {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return INITIAL_FRAUD_DIRECTORY;
      }
      const raw = window.localStorage.getItem(DIRECTORY_STORAGE_KEY);
      if (!raw) {
        return INITIAL_FRAUD_DIRECTORY;
      }
      const parsed = JSON.parse(raw) as FraudDirectoryEntry[];
      return Array.isArray(parsed) && parsed.length > 0
        ? parsed
        : INITIAL_FRAUD_DIRECTORY;
    } catch {
      return INITIAL_FRAUD_DIRECTORY;
    }
  }

  public static saveFraudDirectory(entries: FraudDirectoryEntry[]): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(
          DIRECTORY_STORAGE_KEY,
          JSON.stringify(entries)
        );
      }
    } catch {
      // Ignorar errores de cuota de almacenamiento
    }
  }

  public static getVerificationHistory(): VerificationResult[] {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return LocalRepository.buildInitialSeedHistory();
      }
      const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!raw) {
        const seeded = LocalRepository.buildInitialSeedHistory();
        LocalRepository.saveVerificationHistory(seeded);
        return seeded;
      }
      const parsed = JSON.parse(raw) as VerificationResult[];
      return Array.isArray(parsed) && parsed.length > 0
        ? parsed
        : LocalRepository.buildInitialSeedHistory();
    } catch {
      return LocalRepository.buildInitialSeedHistory();
    }
  }

  public static saveVerificationHistory(history: VerificationResult[]): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(
          HISTORY_STORAGE_KEY,
          JSON.stringify(history.slice(0, 30))
        );
      }
    } catch {
      // Ignorar errores de cuota de almacenamiento
    }
  }

  private static buildInitialSeedHistory(): VerificationResult[] {
    const verifier = new VerifyListingUseCase();
    const deps = {
      zones: UNIVERSITY_ZONES,
      knownImages: KNOWN_IMAGE_SIGNATURES,
      fraudDirectory: INITIAL_FRAUD_DIRECTORY,
    };

    const firstDemo = verifier.execute(
      {
        ...QUICK_DEMO_SCENARIOS[0].input,
        id: 'VER-SEED-82',
      },
      deps
    );

    const thirdDemo = verifier.execute(
      {
        ...QUICK_DEMO_SCENARIOS[2].input,
        id: 'VER-SEED-OK',
      },
      deps
    );

    return [firstDemo, thirdDemo];
  }
}
