import { PhotoSighting } from '../entities/types';

export interface PhotoSubmission {
  /** dHash de 64 bits (16 hex) de la foto subida. */
  dHash: string;
  city: string;
  monthlyRentArs: number;
  cbuOrAlias: string;
  ownerPhone: string;
}

/**
 * Puerto del índice colaborativo de fotos: devuelve otras verificaciones con la misma
 * foto y registra esta. Solo se usa si el estudiante autorizó procesar el anuncio.
 */
export interface PhotoSightingRepository {
  matchAndRegister(submission: PhotoSubmission): Promise<PhotoSighting[]>;
}
