import { KnownImageSignature } from '../entities/types';

/**
 * dHash (difference hash) de 64 bits: se reduce la imagen a 9x8 en escala de grises
 * y cada bit indica si un píxel es más claro que su vecino de la derecha.
 * Es robusto a re-compresión, cambios de tamaño y leves ajustes de brillo,
 * que es lo que suelen hacer quienes reutilizan fotos de otros avisos.
 */
export const DHASH_WIDTH = 9;
export const DHASH_HEIGHT = 8;
export const DHASH_BITS = 64;

/** Distancia de Hamming máxima (sobre 64 bits) para considerar dos fotos "la misma". */
export const DEFAULT_DHASH_MATCH_THRESHOLD = 10;

const HEX_64_PATTERN = /^[0-9a-f]{16}$/;

export function isValidDHash(value: string): boolean {
  return HEX_64_PATTERN.test(value.trim().toLowerCase());
}

/**
 * Calcula el dHash a partir de una matriz de luminancias 9x8 (fila por fila, 0-255).
 * El adaptador de infraestructura se encarga de decodificar y reducir la imagen.
 */
export function computeDHashFromGrayscale(luminance: ArrayLike<number>): string {
  if (luminance.length !== DHASH_WIDTH * DHASH_HEIGHT) {
    throw new Error(
      `Se esperaban ${DHASH_WIDTH * DHASH_HEIGHT} valores de luminancia y llegaron ${luminance.length}.`
    );
  }

  let hex = '';
  let nibble = 0;
  let bitsInNibble = 0;

  for (let y = 0; y < DHASH_HEIGHT; y++) {
    for (let x = 0; x < DHASH_WIDTH - 1; x++) {
      const left = luminance[y * DHASH_WIDTH + x];
      const right = luminance[y * DHASH_WIDTH + x + 1];
      nibble = (nibble << 1) | (left > right ? 1 : 0);
      bitsInNibble++;
      if (bitsInNibble === 4) {
        hex += nibble.toString(16);
        nibble = 0;
        bitsInNibble = 0;
      }
    }
  }

  return hex;
}

/** Cantidad de bits distintos entre dos hashes hexadecimales de 64 bits. */
export function hammingDistance(hashA: string, hashB: string): number {
  const a = hashA.trim().toLowerCase();
  const b = hashB.trim().toLowerCase();
  if (!isValidDHash(a) || !isValidDHash(b)) {
    throw new Error('Los hashes deben ser hexadecimales de 16 caracteres (64 bits).');
  }

  let distance = 0;
  for (let i = 0; i < a.length; i++) {
    let diff = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (diff) {
      distance += diff & 1;
      diff >>= 1;
    }
  }
  return distance;
}

export interface PerceptualMatch {
  signature: KnownImageSignature;
  distance: number;
}

/**
 * Busca la firma conocida más parecida dentro del umbral de tolerancia.
 * Devuelve undefined si ninguna está a una distancia <= threshold.
 */
export function findClosestPerceptualMatch(
  hash: string,
  signatures: KnownImageSignature[],
  threshold: number = DEFAULT_DHASH_MATCH_THRESHOLD
): PerceptualMatch | undefined {
  if (!isValidDHash(hash)) return undefined;

  let best: PerceptualMatch | undefined;
  for (const signature of signatures) {
    if (!signature.perceptualHash || !isValidDHash(signature.perceptualHash)) continue;
    const distance = hammingDistance(hash, signature.perceptualHash);
    if (distance <= threshold && (!best || distance < best.distance)) {
      best = { signature, distance };
    }
  }
  return best;
}
