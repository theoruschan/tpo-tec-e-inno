import { describe, expect, it } from 'vitest';
import { KnownImageSignature } from '../src/domain/entities/types';
import { ImageMiningService } from '../src/domain/services/ImageMiningService';
import {
  DEFAULT_DHASH_MATCH_THRESHOLD,
  DHASH_HEIGHT,
  DHASH_WIDTH,
  computeDHashFromGrayscale,
  findClosestPerceptualMatch,
  hammingDistance,
  isValidDHash,
} from '../src/domain/services/PerceptualHash';
import {
  KNOWN_IMAGE_SIGNATURES,
  QUICK_DEMO_SCENARIOS,
} from '../src/infrastructure/data/datasets';

// ---------- Fixtures sintéticas (sin imágenes con derechos) ----------

/** PRNG determinístico (mulberry32) para que los tests sean reproducibles. */
function seededRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** "Foto" sintética en escala de grises: manchas suaves aleatorias sobre un gradiente. */
function syntheticPhoto(seed: number, width = 180, height = 160): Float64Array {
  const rand = seededRandom(seed);
  const blobs = Array.from({ length: 6 }, () => ({
    cx: rand() * width,
    cy: rand() * height,
    r: 20 + rand() * 50,
    v: rand() * 200 - 100,
  }));
  // Gradiente de fondo con dirección propia de cada "foto": si todas compartieran
  // el mismo gradiente dominante, el dHash las vería parecidas (límite conocido).
  const gx = rand() * 160 - 80;
  const gy = rand() * 160 - 80;
  const pixels = new Float64Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let value = 128 + gx * (x / width - 0.5) + gy * (y / height - 0.5);
      for (const b of blobs) {
        const d2 = (x - b.cx) ** 2 + (y - b.cy) ** 2;
        value += b.v * Math.exp(-d2 / (2 * b.r * b.r));
      }
      pixels[y * width + x] = value;
    }
  }
  return pixels;
}

/** Reducción por bloques a 9x8, igual que el adaptador del navegador. */
function downscaleTo9x8(pixels: Float64Array, width: number, height: number): Float64Array {
  const out = new Float64Array(DHASH_WIDTH * DHASH_HEIGHT);
  for (let y = 0; y < height; y++) {
    const row = Math.min(DHASH_HEIGHT - 1, Math.floor((y * DHASH_HEIGHT) / height));
    for (let x = 0; x < width; x++) {
      const col = Math.min(DHASH_WIDTH - 1, Math.floor((x * DHASH_WIDTH) / width));
      out[row * DHASH_WIDTH + col] += pixels[y * width + x];
    }
  }
  return out;
}

function hashOf(pixels: Float64Array, width = 180, height = 160): string {
  return computeDHashFromGrayscale(downscaleTo9x8(pixels, width, height));
}

/** Invierte los primeros `bits` bits de un hash hexadecimal. */
function flipBits(hash: string, bits: number): string {
  const nibbles = hash.split('').map((c) => parseInt(c, 16));
  for (let i = 0; i < bits; i++) {
    nibbles[Math.floor(i / 4)] ^= 1 << (3 - (i % 4));
  }
  return nibbles.map((n) => n.toString(16)).join('');
}

function signature(overrides: Partial<KnownImageSignature>): KnownImageSignature {
  return {
    imageHash: 'sig-test',
    title: 'Foto sintética',
    originalSource: 'Fixture',
    originalCity: 'CABA',
    originalPriceArs: 500000,
    thumbnailUrl: '',
    isStolenOrReusedPattern: true,
    notes: '',
    ...overrides,
  };
}

// ---------- Tests ----------

describe('dHash — cálculo', () => {
  it('produce 16 caracteres hex (64 bits)', () => {
    const hash = hashOf(syntheticPhoto(1));
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
    expect(isValidDHash(hash)).toBe(true);
  });

  it('un gradiente decreciente de izquierda a derecha da todos los bits en 1', () => {
    const gradient = Array.from({ length: 72 }, (_, i) => 255 - (i % 9) * 20);
    expect(computeDHashFromGrayscale(gradient)).toBe('ffffffffffffffff');
  });

  it('un gradiente creciente da todos los bits en 0', () => {
    const gradient = Array.from({ length: 72 }, (_, i) => (i % 9) * 20);
    expect(computeDHashFromGrayscale(gradient)).toBe('0000000000000000');
  });

  it('rechaza matrices que no son 9x8', () => {
    expect(() => computeDHashFromGrayscale(new Array(64).fill(0))).toThrow();
  });
});

describe('Distancia de Hamming', () => {
  it('es 0 para hashes iguales y 64 para complementarios', () => {
    expect(hammingDistance('0123456789abcdef', '0123456789abcdef')).toBe(0);
    expect(hammingDistance('0000000000000000', 'ffffffffffffffff')).toBe(64);
  });

  it('cuenta bits, no caracteres', () => {
    expect(hammingDistance('0000000000000000', '0000000000000001')).toBe(1);
    expect(hammingDistance('0000000000000000', '000000000000000f')).toBe(4);
    expect(hammingDistance('0000000000000000', '8000000000000003')).toBe(3);
  });

  it('es simétrica e insensible a mayúsculas', () => {
    expect(hammingDistance('ABCDEF0123456789', '0123456789abcdef')).toBe(
      hammingDistance('0123456789abcdef', 'abcdef0123456789')
    );
  });

  it('rechaza hashes inválidos', () => {
    expect(() => hammingDistance('xyz', '0000000000000000')).toThrow();
    expect(() => hammingDistance('hash-airbnb-palermo-8821', '0000000000000000')).toThrow();
  });
});

describe('Robustez del dHash con fotos sintéticas', () => {
  const W = 180;
  const H = 160;
  const original = syntheticPhoto(42, W, H);
  const originalHash = hashOf(original, W, H);

  it('tolera un cambio global de brillo y contraste', () => {
    const edited = original.map((v) => v * 0.8 + 25);
    expect(hammingDistance(originalHash, hashOf(edited, W, H))).toBeLessThanOrEqual(2);
  });

  it('tolera ruido leve tipo recompresión JPEG', () => {
    const rand = seededRandom(7);
    const noisy = original.map((v) => v + (rand() - 0.5) * 12);
    expect(hammingDistance(originalHash, hashOf(noisy, W, H))).toBeLessThanOrEqual(
      DEFAULT_DHASH_MATCH_THRESHOLD
    );
  });

  it('tolera un cambio de tamaño (la misma foto a la mitad de resolución)', () => {
    const half = new Float64Array((W / 2) * (H / 2));
    for (let y = 0; y < H / 2; y++) {
      for (let x = 0; x < W / 2; x++) half[y * (W / 2) + x] = original[2 * y * W + 2 * x];
    }
    expect(hammingDistance(originalHash, hashOf(half, W / 2, H / 2))).toBeLessThanOrEqual(
      DEFAULT_DHASH_MATCH_THRESHOLD
    );
  });

  it('fotos distintas quedan lejos del umbral', () => {
    for (const seed of [3, 11, 99, 1234]) {
      const other = hashOf(syntheticPhoto(seed, W, H), W, H);
      expect(hammingDistance(originalHash, other)).toBeGreaterThan(
        DEFAULT_DHASH_MATCH_THRESHOLD
      );
    }
  });
});

describe('Matching con tolerancia contra firmas conocidas', () => {
  const base = '1e9a9abab89983a3';
  const sigs = [
    signature({ imageHash: 'a', perceptualHash: base, title: 'A' }),
    signature({ imageHash: 'b', perceptualHash: flipBits(base, 40), title: 'B' }),
    signature({ imageHash: 'sin-hash', title: 'Sin hash' }),
  ];

  it('encuentra la firma exacta con distancia 0', () => {
    expect(findClosestPerceptualMatch(base, sigs)).toMatchObject({
      distance: 0,
      signature: { title: 'A' },
    });
  });

  it('acepta hasta el umbral inclusive y rechaza por encima', () => {
    expect(findClosestPerceptualMatch(flipBits(base, 10), sigs, 10)?.distance).toBe(10);
    expect(findClosestPerceptualMatch(flipBits(base, 11), sigs, 10)).toBeUndefined();
  });

  it('el umbral es configurable', () => {
    expect(findClosestPerceptualMatch(flipBits(base, 6), sigs, 5)).toBeUndefined();
    expect(findClosestPerceptualMatch(flipBits(base, 6), sigs, 6)?.distance).toBe(6);
  });

  it('elige la firma más cercana si hay varias dentro del umbral', () => {
    const near = [
      signature({ title: 'Lejos', perceptualHash: flipBits(base, 8) }),
      signature({ title: 'Cerca', perceptualHash: flipBits(base, 2) }),
    ];
    expect(findClosestPerceptualMatch(base, near, 10)?.signature.title).toBe('Cerca');
  });

  it('ignora hashes inválidos sin romper', () => {
    expect(findClosestPerceptualMatch('no-es-hash', sigs)).toBeUndefined();
  });

  it('las 5 firmas semilla son dHash válidos y están separadas entre sí más que el umbral', () => {
    const hashes = KNOWN_IMAGE_SIGNATURES.map((s) => s.perceptualHash!);
    expect(hashes.every(isValidDHash)).toBe(true);
    for (let i = 0; i < hashes.length; i++) {
      for (let j = i + 1; j < hashes.length; j++) {
        expect(hammingDistance(hashes[i], hashes[j])).toBeGreaterThan(
          DEFAULT_DHASH_MATCH_THRESHOLD
        );
      }
    }
  });
});

describe('ImageMiningService con hash subido', () => {
  const stolen = KNOWN_IMAGE_SIGNATURES[0];
  const input = {
    ...QUICK_DEMO_SCENARIOS[0].input,
    imageSignatureHash: '',
    uploadedImageDHash: flipBits(stolen.perceptualHash!, 3),
  };

  it('detecta la foto reutilizada con el texto exacto del prototipo y la distancia como evidencia', () => {
    const analysis = new ImageMiningService().analyze(input, KNOWN_IMAGE_SIGNATURES);
    expect(analysis.matchedSignature?.imageHash).toBe(stolen.imageHash);
    expect(analysis.perceptualDistance).toBe(3);
    const finding = analysis.findings.find((f) => f.id === 'img-duplicate-stolen');
    expect(finding?.title).toBe('Esta foto aparece en otro anuncio con un precio distinto');
    expect(finding?.evidenceDetail).toContain('Distancia de Hamming: 3/64');
  });

  it('respeta un umbral más estricto inyectado por constructor', () => {
    const analysis = new ImageMiningService(2).analyze(input, KNOWN_IMAGE_SIGNATURES);
    expect(analysis.matchedSignature).toBeUndefined();
    expect(analysis.findings[0].description).toContain('base semilla');
  });

  it('la huella automática tiene prioridad sobre la selección manual', () => {
    const analysis = new ImageMiningService().analyze(
      { ...input, imageSignatureHash: 'hash-residencia-uade-legit-001' },
      KNOWN_IMAGE_SIGNATURES
    );
    expect(analysis.matchedSignature?.imageHash).toBe(stolen.imageHash);
  });

  it('sin hash subido mantiene el modo manual/demo', () => {
    const analysis = new ImageMiningService().analyze(
      QUICK_DEMO_SCENARIOS[0].input,
      KNOWN_IMAGE_SIGNATURES
    );
    expect(analysis.matchedSignature?.imageHash).toBe('hash-airbnb-palermo-8821');
  });
});
