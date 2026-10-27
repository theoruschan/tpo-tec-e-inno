import {
  FraudDirectoryEntry,
  ListingInput,
} from '../domain/entities/types';
import { normalizeIdentifier } from '../domain/services/IdentityCbuMatcher';
import { UNIVERSITY_ZONES } from '../infrastructure/data/datasets';

export class ReportFraudListingUseCase {
  public execute(
    input: ListingInput,
    reason: string,
    existingDirectory: FraudDirectoryEntry[]
  ): FraudDirectoryEntry[] {
    const cbuOrAlias =
      input.cbuOrAlias.trim() ||
      input.ownerPhone.trim() ||
      input.listingUrlOrCapture.trim().slice(0, 32);

    const normalized = normalizeIdentifier(cbuOrAlias);
    const zone = UNIVERSITY_ZONES.find((z) => z.id === input.zoneId);
    const today = new Date().toISOString().slice(0, 10);

    const existingIndex = existingDirectory.findIndex(
      (entry) => entry.normalizedAliasOrCbu === normalized
    );

    if (existingIndex >= 0) {
      const updated = [...existingDirectory];
      const current = updated[existingIndex];
      updated[existingIndex] = {
        ...current,
        reportsCount: current.reportsCount + 1,
        lastReportedAt: today,
        reason: reason.trim() || current.reason,
      };
      return updated;
    }

    const newEntry: FraudDirectoryEntry = {
      id: `dir-user-${Date.now().toString(36)}`,
      cbuOrAlias,
      normalizedAliasOrCbu: normalized,
      reportedHolderName:
        input.ownerName.trim() || 'Anunciante sin nombre verificado',
      phoneContact: input.ownerPhone.trim() || undefined,
      listingUrlPattern: input.listingUrlOrCapture.trim().slice(0, 48),
      city: zone?.city ?? 'CABA',
      reportsCount: 1,
      lastReportedAt: today,
      reason:
        reason.trim() ||
        'Reportado como estafa confirmada por un estudiante desde CuartoSeguro.',
      source: 'Verificación usuario',
    };

    return [newEntry, ...existingDirectory];
  }
}
