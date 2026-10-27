import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import {
  ListingTextExtractor,
  isValidCbu,
} from '../src/domain/services/ListingTextExtractor';
import { ZONE_KEYWORDS } from '../src/infrastructure/data/datasets';
import { OCR_BASE } from '../src/infrastructure/ocr/TesseractImageTextReader';

const extractor = new ListingTextExtractor(ZONE_KEYWORDS);

// CBU/CVU con dígitos verificadores correctos, armados para el test (no son cuentas reales).
const VALID_CBU = '0110599500000412345678';
const VALID_CVU = '0000003110001234567898';

describe('isValidCbu', () => {
  it('acepta CBU/CVU con dígitos verificadores correctos', () => {
    expect(isValidCbu(VALID_CBU)).toBe(true);
    expect(isValidCbu(VALID_CVU)).toBe(true);
  });

  it('rechaza un dígito cambiado, largos incorrectos y letras', () => {
    expect(isValidCbu('0110599500000412345679')).toBe(false);
    expect(isValidCbu('011059950000041234567')).toBe(false);
    expect(isValidCbu('01105995000004123456a8')).toBe(false);
  });
});

describe('ListingTextExtractor — capturas típicas', () => {
  it('chat de WhatsApp: alquiler, seña, alias, teléfono, zona y presión para señar', () => {
    const text = `
      Hola! Si, el cuarto en Monserrat sigue disponible, a 2 cuadras de UADE.
      El alquiler es $230.000 por mes, todo incluido.
      Para reservarlo necesito una seña de $115.000, hay 3 chicos más interesados.
      Yo estoy en el interior asi que no se puede ver antes, te paso las llaves al llegar.
      Transferí al alias juan.pereyra.alq
      Cualquier cosa escribime al WhatsApp +54 9 11 4982-1104
    `;
    expect(extractor.extract(text)).toEqual({
      monthlyRentArs: 230000,
      depositRequestedArs: 115000,
      cbuOrAlias: 'juan.pereyra.alq',
      ownerPhone: '+54 9 11 4982-1104',
      zoneId: 'caba-monserrat-uade',
      requestsAdvanceBeforeVisit: true,
    });
  });

  it('aviso de portal: precio, expensas que no se confunden con el alquiler, link y titular', () => {
    const text = `
      zonaprop.com.ar/propiedades/cuarto-estudiantil-palermo-123.html
      Departamento 1 ambiente - Palermo
      Precio $ 540.000 / mes
      Expensas $ 85.000
      Inmobiliaria matriculada - Titular: Laura Beatriz Medina
      Tel 11 5555-0101
    `;
    const data = extractor.extract(text);
    expect(data.monthlyRentArs).toBe(540000);
    expect(data.depositRequestedArs).toBeUndefined();
    expect(data.listingUrl).toBe('zonaprop.com.ar/propiedades/cuarto-estudiantil-palermo-123.html');
    expect(data.ownerName).toBe('Laura Beatriz Medina');
    expect(data.ownerPhone).toBe('11 5555-0101');
    expect(data.zoneId).toBe('caba-palermo');
    expect(data.requestsAdvanceBeforeVisit).toBeUndefined();
  });

  it('CBU de 22 dígitos con espacios: lo une, valida el verificador y no lo toma como teléfono', () => {
    const data = extractor.extract(`CBU: 0110 5995 0000 0412 3456 78\nAlquiler 380 mil\nCel 351 781-4402`);
    expect(data.cbuOrAlias).toBe(VALID_CBU);
    expect(data.cbuChecksumValid).toBe(true);
    expect(data.monthlyRentArs).toBe(380000);
    expect(data.ownerPhone).toBe('351 781-4402');
  });

  it('marca un CBU con verificador inválido (posible error de lectura o cuenta inventada)', () => {
    const data = extractor.extract('Pasame la seña al CBU 0000003100098412239104');
    expect(data.cbuOrAlias).toBe('0000003100098412239104');
    expect(data.cbuChecksumValid).toBe(false);
  });

  it('montos en dólares no se usan como alquiler en pesos y se avisa', () => {
    const data = extractor.extract('Depto en Recoleta USD 450 por mes');
    expect(data.monthlyRentArs).toBeUndefined();
    expect(data.foreignCurrencyDetected).toBe(true);
    expect(data.zoneId).toBe('caba-recoleta');
  });

  it('tolera que el OCR lea "$" como "S" y "Córdoba" sin tilde', () => {
    const data = extractor.extract('Nueva Cordoba, alquiler S 390.000, seña S 150.000');
    expect(data).toMatchObject({
      monthlyRentArs: 390000,
      depositRequestedArs: 150000,
      zoneId: 'cba-nueva-cordoba',
    });
  });

  it('sin palabras clave toma el monto más alto como alquiler', () => {
    const data = extractor.extract('Cuarto amplio $ 120.000 ... $ 350.000 Rosario');
    expect(data.monthlyRentArs).toBe(350000);
    expect(data.zoneId).toBe('rosario-centro');
  });

  it('link de wa.me como teléfono', () => {
    expect(extractor.extract('Consultas: https://wa.me/5491164029918').ownerPhone).toBe('+5491164029918');
  });

  it('no confunde dominios ni mails con un alias', () => {
    const data = extractor.extract('Escribime a dueno.directo@gmail.com o mirá www.argenprop.com');
    expect(data.cbuOrAlias).toBeUndefined();
  });

  it('ignora montos fuera de rango (números de piso, años, metros)', () => {
    const data = extractor.extract('Piso 3, 45 m2, año 2024, $ 1.500');
    expect(data.monthlyRentArs).toBeUndefined();
  });

  it('texto vacío o ruido → objeto vacío', () => {
    expect(extractor.extract('')).toEqual({});
    expect(extractor.extract('~~ ||| ### ...')).toEqual({});
  });
});

describe('Archivos del OCR', () => {
  it('OCR_BASE apunta a la versión instalada de tesseract.js (la que copia scripts/copy-ocr-assets.mjs)', () => {
    const pkgPath = createRequire(import.meta.url).resolve('tesseract.js/package.json');
    const { version } = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version: string };
    expect(OCR_BASE).toBe(`/ocr/tesseract-${version}`);
  });
});
