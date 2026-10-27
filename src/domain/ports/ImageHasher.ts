/**
 * Puerto de dominio: calcula la huella perceptual (dHash de 64 bits, 16 caracteres hex)
 * de una imagen. El tipo de imagen lo define el adaptador (Blob en el navegador,
 * Buffer en un servidor), así el dominio no depende de ninguna API de plataforma.
 */
export interface ImageHasher<TImage> {
  hash(image: TImage): Promise<string>;
}
