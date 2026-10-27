/**
 * Puerto de dominio: lee el texto de una imagen (OCR). El adaptador decide el motor
 * (Tesseract en el navegador, un servicio en la nube, etc.).
 */
export interface ImageTextReader<TImage> {
  /** `onProgress` recibe un valor entre 0 y 1 mientras se reconoce el texto. */
  read(image: TImage, onProgress?: (ratio: number) => void): Promise<string>;
}
