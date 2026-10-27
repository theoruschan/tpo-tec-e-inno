import {
  KnownImageSignature,
  ListingInput,
  VerificationFinding,
} from '../entities/types';
import {
  DEFAULT_DHASH_MATCH_THRESHOLD,
  DHASH_BITS,
  findClosestPerceptualMatch,
} from './PerceptualHash';

export interface ImageMiningAnalysis {
  matchedSignature?: KnownImageSignature;
  /** Distancia de Hamming cuando la coincidencia vino del dHash de la foto subida. */
  perceptualDistance?: number;
  findings: VerificationFinding[];
}

/**
 * Paso 1 de 3 del Motor de Verificación:
 * Data Mining — Búsqueda inversa de imágenes y detección de anuncios duplicados.
 */
export class ImageMiningService {
  constructor(
    private readonly dHashThreshold: number = DEFAULT_DHASH_MATCH_THRESHOLD
  ) {}

  public analyze(
    input: ListingInput,
    knownSignatures: KnownImageSignature[]
  ): ImageMiningAnalysis {
    const findings: VerificationFinding[] = [];
    const normalizedHash = input.imageSignatureHash.trim().toLowerCase();

    // 1) Coincidencia perceptual automática (dHash de la foto subida, tolera recompresión/recorte leve)
    const perceptualMatch = input.uploadedImageDHash
      ? findClosestPerceptualMatch(
          input.uploadedImageDHash,
          knownSignatures,
          this.dHashThreshold
        )
      : undefined;

    // 2) Selección manual del panel avanzado/demo
    const manualMatch = normalizedHash
      ? knownSignatures.find(
          (sig) => sig.imageHash.toLowerCase() === normalizedHash
        )
      : undefined;

    const matched = perceptualMatch?.signature ?? manualMatch;
    const matchEvidence = perceptualMatch
      ? `dHash subido: ${input.uploadedImageDHash} · Distancia de Hamming: ${perceptualMatch.distance}/${DHASH_BITS} (umbral ≤ ${this.dHashThreshold})`
      : `Firma seleccionada manualmente (modo demo): ${matched?.imageHash ?? ''}`;

    if (matched && matched.isStolenOrReusedPattern) {
      findings.push({
        id: 'img-duplicate-stolen',
        category: 'image_mining',
        severity: 'critical',
        title: 'Esta foto aparece en otro anuncio con un precio distinto',
        description: `La búsqueda inversa detectó la misma fotografía publicada originalmente en "${matched.originalSource}" (${matched.originalCity}) a un valor de $${matched.originalPriceArs.toLocaleString('es-AR')}. ${matched.notes}`,
        riskPoints: 46,
        evidenceDetail: `${matchEvidence} · Fuente original: ${matched.originalSource}`,
      });
    } else if (matched && !matched.isStolenOrReusedPattern) {
      findings.push({
        id: 'img-verified-original',
        category: 'image_mining',
        severity: 'positive',
        title: 'Fotografías sin duplicados fraudulentos en otras plataformas',
        description: `Las imágenes del aviso coinciden únicamente con la publicación original en ${matched.originalSource} (${matched.originalCity}) y no registran reutilización en denuncias de estafa.`,
        riskPoints: 0,
        evidenceDetail: matchEvidence,
      });
    } else {
      findings.push({
        id: 'img-no-duplicate-match',
        category: 'image_mining',
        severity: 'positive',
        title: 'No se hallaron copias de la foto en anuncios denunciados',
        description: input.uploadedImageDHash
          ? `La huella de la foto subida no coincide con ninguna de las ${knownSignatures.length} fotos de la base semilla de CuartoSeguro. Ojo: es un dataset acotado de fotos ya reportadas, no una búsqueda en toda la web.`
          : 'No se subió una foto para comparar ni se eligió una firma conocida. La búsqueda inversa se hace contra la base semilla de CuartoSeguro, no contra toda la web.',
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
      perceptualDistance: perceptualMatch?.distance,
      findings,
    };
  }
}
