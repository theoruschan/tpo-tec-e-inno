import { DataQualityCheckResult, ListingInput } from '../entities/types';

/**
 * Mensaje exacto especificado en el Prototipo de Baja Fidelidad (Pantalla 4)
 * del Entregable 3: Aplicación de Design Thinking y UX — CuartoSeguro.
 */
export const MISSING_CONTACT_BLOCKING_MESSAGE =
  'No podemos verificar este anuncio sin datos de contacto del propietario. Pedile el nombre completo o el teléfono antes de continuar.';

export class DataQualityValidator {
  /**
   * Evalúa la completitud y legibilidad de los datos ingresados en la Pantalla 3
   * para alimentar la Pantalla 4 ("Control de calidad de los datos").
   */
  public validate(input: ListingInput): DataQualityCheckResult {
    const trimmedLink = input.listingUrlOrCapture.trim();
    const isLinkOrCaptureValid =
      Boolean(input.hasCaptureUploaded) || trimmedLink.length >= 8;

    const hasOwnerName = input.ownerName.trim().length >= 3;
    const hasOwnerPhone = input.ownerPhone.replace(/\D/g, '').length >= 6;
    const hasCbuOrAlias = input.cbuOrAlias.trim().length >= 4;

    // Requiere al menos nombre o teléfono (o alias/CBU identificable)
    const hasContactInfo = hasOwnerName || hasOwnerPhone || hasCbuOrAlias;

    const hasSufficientPhotos =
      input.photoCount >= 2 ||
      (input.photoCount >= 1 &&
        (Boolean(input.imageSignatureHash.trim()) ||
          Boolean(input.uploadedImageDHash)));

    const warnings: string[] = [];

    if (!isLinkOrCaptureValid) {
      warnings.push(
        'El link o la referencia de la captura es demasiado corto o ilegible. Asegurate de pegar la URL completa o adjuntar la captura del aviso.'
      );
    }

    if (!hasContactInfo) {
      warnings.push(MISSING_CONTACT_BLOCKING_MESSAGE);
    } else if (!hasOwnerName || !hasOwnerPhone) {
      warnings.push(
        'Contás con datos de contacto parciales. Tener tanto el nombre completo como el teléfono y CBU/Alias aumenta la precisión del cruce.'
      );
    }

    if (!hasSufficientPhotos) {
      warnings.push(
        'El anuncio tiene muy pocas fotos (menos de 2). Los avisos legítimos suelen mostrar varios ángulos del cuarto y espacios comunes.'
      );
    }

    let completenessScore = 0;
    if (isLinkOrCaptureValid) completenessScore += 30;
    if (hasOwnerName) completenessScore += 20;
    if (hasOwnerPhone) completenessScore += 20;
    if (hasCbuOrAlias) completenessScore += 15;
    if (hasSufficientPhotos) completenessScore += 15;

    const blockingMessage = !hasContactInfo
      ? MISSING_CONTACT_BLOCKING_MESSAGE
      : null;

    return {
      isLinkOrCaptureValid,
      hasContactInfo,
      hasSufficientPhotos,
      canProceedAutomatically: isLinkOrCaptureValid && hasContactInfo,
      blockingMessage,
      warnings,
      completenessScore,
    };
  }
}
