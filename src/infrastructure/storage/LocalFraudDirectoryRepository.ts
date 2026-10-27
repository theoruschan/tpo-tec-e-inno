import { ReportFraudListingUseCase } from '../../application/ReportFraudListingUseCase';
import { FraudDirectoryEntry, ListingInput } from '../../domain/entities/types';
import {
  FraudDirectoryRepository,
  FraudReportSubmission,
  InputIdentifierHashes,
  SubmitReportResult,
} from '../../domain/ports/FraudDirectoryRepository';
import { UNIVERSITY_ZONES } from '../data/datasets';
import { LocalRepository } from './LocalRepository';

/**
 * Adaptador offline del directorio: persiste en localStorage de este navegador.
 * Se usa cuando no hay Supabase configurado o cuando la red falla.
 */
export class LocalFraudDirectoryRepository implements FraudDirectoryRepository {
  private readonly reportUseCase = new ReportFraudListingUseCase();

  constructor(public readonly kind: 'local' | 'local-fallback' = 'local') {}

  public async listActiveEntries(): Promise<FraudDirectoryEntry[]> {
    return LocalRepository.getFraudDirectory();
  }

  public async submitReport(report: FraudReportSubmission): Promise<SubmitReportResult> {
    const zoneId =
      UNIVERSITY_ZONES.find((z) => z.city === report.city)?.id ?? UNIVERSITY_ZONES[0].id;
    // ReportFraudListingUseCase trabaja sobre un ListingInput; solo usa estos campos.
    const asInput = {
      cbuOrAlias: report.cbuOrAlias,
      ownerPhone: report.ownerPhone,
      ownerName: report.ownerName,
      listingUrlOrCapture: report.listingUrlOrCapture,
      zoneId,
    } as ListingInput;

    const updated = this.reportUseCase.execute(
      asInput,
      report.reason,
      LocalRepository.getFraudDirectory()
    );
    LocalRepository.saveFraudDirectory(updated);

    return {
      status: 'saved-locally',
      message:
        this.kind === 'local-fallback'
          ? 'Sin conexión con el directorio compartido: el reporte quedó guardado solo en este navegador.'
          : 'Modo local: el reporte quedó guardado solo en este navegador (no se comparte con otros estudiantes).',
    };
  }

  public async hashIdentifiers(): Promise<InputIdentifierHashes> {
    // En modo local el cruce se hace en claro contra el localStorage del propio usuario.
    return {};
  }
}
