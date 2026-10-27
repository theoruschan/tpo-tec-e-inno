import { ImageHasher } from '../../domain/ports/ImageHasher';
import {
  DHASH_HEIGHT,
  DHASH_WIDTH,
  computeDHashFromGrayscale,
} from '../../domain/services/PerceptualHash';

// Se dibuja primero a una grilla intermedia de (9·k)x(8·k) y se promedia por bloques:
// así el resultado no depende del algoritmo de reescalado de cada navegador.
const BLOCK_SIZE = 16;

/**
 * Adaptador de navegador para el puerto ImageHasher.
 * Decodifica la imagen con createImageBitmap y la reduce con un canvas, todo local:
 * la foto nunca sale del dispositivo del estudiante.
 */
export class BrowserImageHasher implements ImageHasher<Blob> {
  public async hash(image: Blob): Promise<string> {
    if (!image.type.startsWith('image/')) {
      throw new Error('El archivo no es una imagen.');
    }

    const bitmap = await createImageBitmap(image);
    try {
      return hashFromDrawable(bitmap, bitmap.width, bitmap.height);
    } finally {
      bitmap.close();
    }
  }
}

export function hashFromDrawable(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number
): string {
  const gridWidth = DHASH_WIDTH * BLOCK_SIZE;
  const gridHeight = DHASH_HEIGHT * BLOCK_SIZE;

  const canvas = document.createElement('canvas');
  canvas.width = gridWidth;
  canvas.height = gridHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('El navegador no permite leer píxeles de un canvas.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, sourceWidth, sourceHeight, 0, 0, gridWidth, gridHeight);
  const { data } = ctx.getImageData(0, 0, gridWidth, gridHeight);

  const luminance = new Float64Array(DHASH_WIDTH * DHASH_HEIGHT);
  for (let py = 0; py < gridHeight; py++) {
    const cellRow = Math.floor(py / BLOCK_SIZE) * DHASH_WIDTH;
    for (let px = 0; px < gridWidth; px++) {
      const i = (py * gridWidth + px) * 4;
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      luminance[cellRow + Math.floor(px / BLOCK_SIZE)] += gray;
    }
  }

  return computeDHashFromGrayscale(luminance);
}
