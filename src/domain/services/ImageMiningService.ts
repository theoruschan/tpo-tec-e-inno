import {
  KnownImageSignature,
  ListingInput,
  PhotoSighting,
  VerificationFinding,
} from '../entities/types';
import {
  DEFAULT_DHASH_MATCH_THRESHOLD,
  DHASH_BITS,
  findClosestPerceptualMatch,
} from './PerceptualHash';

/** Diferencia de precio a partir de la cual dos anuncios con la misma foto se consideran distintos. */
export const PRICE_MISMATCH_RATIO = 0.15;

function pricesDiffer(a: number, b: number): boolean {
  if (a <= 0 || b <= 0) return false;
  return Math.abs(a - b) / Math.max(a, b) > PRICE_MISMATCH_RATIO;
}

const ARS = (value: number) => `$${value.toLocaleString('es-AR')}`;

export interface ImageMiningAnalysis {
  matchedSignature?: KnownImageSignature;
  /** Avistamientos de la misma foto que indican reutilización (otro precio u otro contacto). */
  reusedSightings: PhotoSighting[];
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
    knownSignatures: KnownImageSignature[],
    sightings: PhotoSighting[] = []
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

    // 3) Índice colaborativo: la misma foto en anuncios que verificaron otros estudiantes.
    const reusedSightings = sightings.filter(
      (s) => s.sameContact === false || pricesDiffer(s.monthlyRentArs, input.monthlyRentArs)
    );
    const differentPrice = reusedSightings.find((s) =>
      pricesDiffer(s.monthlyRentArs, input.monthlyRentArs)
    );
    const communityEvidence = (s: PhotoSighting) =>
      `Índice colaborativo de CuartoSeguro · Distancia de Hamming: ${s.distance}/${DHASH_BITS} · Visto el ${s.seenAt}`;

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
    } else if (reusedSightings.length > 0) {
      const example = differentPrice ?? reusedSightings[0];
      const otherContact = reusedSightings.some((s) => s.sameContact === false);
      findings.push({
        id: 'img-duplicate-community',
        category: 'image_mining',
        severity: 'critical',
        title: differentPrice
          ? 'Esta foto aparece en otro anuncio con un precio distinto'
          : 'Esta foto aparece en otro anuncio con otro CBU/alias o teléfono',
        description: `${reusedSightings.length === 1 ? 'Otro estudiante verificó' : `${reusedSightings.length} verificaciones de otros estudiantes encontraron`} un anuncio con esta misma foto en ${example.city} a ${ARS(example.monthlyRentArs)}/mes${otherContact ? ', con otro CBU/alias o teléfono de contacto' : ''}. Es el patrón típico de fotos copiadas de otro aviso: pedí ver la propiedad o una videollamada en el lugar antes de transferir.`,
        riskPoints: 46,
        evidenceDetail: communityEvidence(example),
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
    } else if (sightings.length > 0) {
      findings.push({
        id: 'img-seen-same-listing',
        category: 'image_mining',
        severity: 'positive',
        title: 'La misma foto ya fue verificada por otros estudiantes con los mismos datos',
        description: `${sightings.length === 1 ? 'Otra verificación encontró' : `Otras ${sightings.length} verificaciones encontraron`} esta foto con un precio parecido y sin otro contacto: no hay señales de que la foto se esté usando en otro anuncio.`,
        riskPoints: 0,
        evidenceDetail: communityEvidence(sightings[0]),
      });
    } else {
      findings.push({
        id: 'img-no-duplicate-match',
        category: 'image_mining',
        severity: 'positive',
        title: 'No se hallaron copias de la foto en anuncios denunciados',
        description: input.uploadedImageDHash
          ? `La huella de la foto subida no coincide con ninguna de las ${knownSignatures.length} fotos de la base semilla ni con las fotos que otros estudiantes verificaron en CuartoSeguro. Ojo: no es una búsqueda en toda la web.`
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
      reusedSightings,
      perceptualDistance: perceptualMatch?.distance,
      findings,
    };
  }
}
