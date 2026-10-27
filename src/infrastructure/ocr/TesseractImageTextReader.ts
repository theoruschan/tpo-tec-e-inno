import type { Worker } from 'tesseract.js';
import { ImageTextReader } from '../../domain/ports/ImageTextReader';

/**
 * Archivos copiados a public/ocr por scripts/copy-ocr-assets.mjs. Se sirven desde el
 * propio sitio: la captura nunca sale del navegador y la CSP no necesita CDNs externos.
 */
// Tiene que coincidir con la versión de tesseract.js instalada (ver package.json).
export const OCR_BASE = '/ocr/tesseract-6.0.1';

/**
 * Adaptador OCR con tesseract.js (WebAssembly en un Web Worker). La librería y el
 * modelo de español (~2 MB) se descargan recién la primera vez que se lee una captura.
 */
export class TesseractImageTextReader implements ImageTextReader<Blob> {
  private workerPromise: Promise<Worker> | null = null;
  private onProgress?: (ratio: number) => void;

  public async read(image: Blob, onProgress?: (ratio: number) => void): Promise<string> {
    if (!image.type.startsWith('image/')) {
      throw new Error('El archivo no es una imagen.');
    }
    this.onProgress = onProgress;
    try {
      const worker = await this.getWorker();
      const { data } = await worker.recognize(image);
      return data.text;
    } catch (error) {
      // Si falló la carga del worker, el próximo intento arranca de cero.
      this.workerPromise = null;
      throw error;
    } finally {
      this.onProgress = undefined;
    }
  }

  private getWorker(): Promise<Worker> {
    this.workerPromise ??= (async () => {
      const { createWorker, OEM } = await import('tesseract.js');
      return createWorker('spa', OEM.LSTM_ONLY, {
        workerPath: `${OCR_BASE}/worker.min.js`,
        corePath: `${OCR_BASE}/core`,
        langPath: `${OCR_BASE}/lang`,
        workerBlobURL: false,
        logger: (message) => {
          if (message.status === 'recognizing text') this.onProgress?.(message.progress);
        },
      });
    })();
    return this.workerPromise;
  }
}
