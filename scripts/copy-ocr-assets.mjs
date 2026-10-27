// Copia a public/ocr los archivos que tesseract.js necesita en el navegador, para
// servirlos desde el mismo origen (privacidad + CSP sin CDNs). Se corre antes de dev/build.
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'package.json'));

const tesseractDir = dirname(require.resolve('tesseract.js/package.json'));
// tesseract.js-core es dependencia de tesseract.js (pnpm no la expone en la raíz).
const coreDir = dirname(
  createRequire(join(tesseractDir, 'package.json')).resolve('tesseract.js-core/package.json')
);
const langDir = dirname(require.resolve('@tesseract.js-data/spa/package.json'));

// La carpeta lleva la versión de tesseract.js: así se puede cachear como inmutable y una
// actualización nunca mezcla un worker nuevo con un core viejo. Debe coincidir con OCR_BASE.
const { version } = JSON.parse(readFileSync(join(tesseractDir, 'package.json'), 'utf-8'));
const out = join(root, 'public', 'ocr', `tesseract-${version}`);
rmSync(join(root, 'public', 'ocr'), { recursive: true, force: true });
const files = [
  [join(tesseractDir, 'dist', 'worker.min.js'), join(out, 'worker.min.js')],
  // Solo el motor LSTM (el que usa OEM.LSTM_ONLY), con y sin SIMD.
  [join(coreDir, 'tesseract-core-simd-lstm.wasm.js'), join(out, 'core', 'tesseract-core-simd-lstm.wasm.js')],
  [join(coreDir, 'tesseract-core-lstm.wasm.js'), join(out, 'core', 'tesseract-core-lstm.wasm.js')],
  // Modelo de español "best_int": el más liviano (~2 MB) compatible con LSTM.
  [join(langDir, '4.0.0_best_int', 'spa.traineddata.gz'), join(out, 'lang', 'spa.traineddata.gz')],
];

for (const [from, to] of files) {
  if (!existsSync(from)) {
    console.error(`[ocr] Falta ${from}. ¿Corriste pnpm install?`);
    process.exit(1);
  }
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
}
console.log(`[ocr] ${files.length} archivos copiados a public/ocr/tesseract-${version}`);
