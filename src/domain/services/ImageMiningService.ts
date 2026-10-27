import {
  KnownImageSignature,
  ListingInput,
  VerificationFinding,
} from '../entities/types';

export interface ImageMiningAnalysis {
  matchedSignature?: KnownImageSignature;
  findings: VerificationFinding[];
}

/**
 * Paso 1 de 3 del Motor de Verificación:
 * Data Mining — Búsqueda inversa de imágenes y detección de anuncios duplicados.
 */
export class ImageMiningService {
  public analyze(
    input: ListingInput,
    knownSignatures: KnownImageSignature[]
  ): ImageMiningAnalysis {
    const findings: VerificationFinding[] = [];
    const normalizedHash = input.imageSignatureHash.trim().toLowerCase();

    const matched = knownSignatures.find(
      (sig) => sig.imageHash.toLowerCase() === normalizedHash
    );

    if (matched && matched.isStolenOrReusedPattern) {
      findings.push({
        id: 'img-duplicate-stolen',
        category: 'image_mining',
        severity: 'critical',
        title: 'Esta foto aparece en otro anuncio con un precio distinto',
        description: `La búsqueda inversa detectó la misma fotografía publicada originalmente en "${matched.originalSource}" (${matched.originalCity}) a un valor de $${matched.originalPriceArs.toLocaleString('es-AR')}. ${matched.notes}`,
        riskPoints: 46,
        evidenceDetail: `Hash perceptual: ${matched.imageHash} · Fuente original: ${matched.originalSource}`,
      });
    } else if (matched && !matched.isStolenOrReusedPattern) {
      findings.push({
        id: 'img-verified-original',
        category: 'image_mining',
        severity: 'positive',
        title: 'Fotografías sin duplicados fraudulentos en otras plataformas',
        description: `Las imágenes del aviso coinciden únicamente con la publicación original en ${matched.originalSource} (${matched.originalCity}) y no registran reutilización en denuncias de estafa.`,
        riskPoints: 0,
        evidenceDetail: `Hash perceptual verificado: ${matched.imageHash}`,
      });
    } else {
      findings.push({
        id: 'img-no-duplicate-match',
        category: 'image_mining',
        severity: 'positive',
        title: 'No se hallaron copias de la foto en anuncios denunciados',
        description:
          'La búsqueda inversa sobre la base de anuncios estudiantiles y portales temporales no arrojó duplicaciones sospechosas.',
        riskPoints: 0,
      });
    }

    if (input.photoCount <= 1) {
      findings.push({
        id: 'img-low-photo-count',
        category: 'image_mining',
        severity: 'warning',
        title: 'Cantidad de fotografías insuficiente en la publicación',
        description:
          'El anuncio incluye una sola foto o ninguna imagen de áreas comunes. Los avisos truchos suelen ocultar el resto de la propiedad para evitar que reconozcan el edificio.',
        riskPoints: 14,
      });
    }

    return {
      matchedSignature: matched,
      findings,
    };
  }
}
