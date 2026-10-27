import React, { useRef, useState } from 'react';
import {
  Upload,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  ArrowRight,
  Edit3,
  Sparkles,
  ScanSearch,
  Loader2,
  ScanText,
  WandSparkles,
  Undo2,
} from 'lucide-react';
import {
  DataQualityCheckResult,
  ListingInput,
} from '../../domain/entities/types';
import { ImageHasher } from '../../domain/ports/ImageHasher';
import { ImageTextReader } from '../../domain/ports/ImageTextReader';
import {
  ExtractedListingData,
  ListingTextExtractor,
} from '../../domain/services/ListingTextExtractor';
import {
  DEFAULT_DHASH_MATCH_THRESHOLD,
  DHASH_BITS,
  findClosestPerceptualMatch,
} from '../../domain/services/PerceptualHash';
import {
  KNOWN_IMAGE_SIGNATURES,
  QUICK_DEMO_SCENARIOS,
  UNIVERSITY_ZONES,
  ZONE_KEYWORDS,
} from '../../infrastructure/data/datasets';

interface Screen3InputProps {
  input: ListingInput;
  onChange: (updated: ListingInput) => void;
  onSubmitToQualityGate: () => void;
  onBack: () => void;
  imageHasher: ImageHasher<Blob>;
  textReader: ImageTextReader<Blob>;
}

const textExtractor = new ListingTextExtractor(ZONE_KEYWORDS);

type OcrState =
  | { status: 'idle' }
  | { status: 'reading'; progress: number }
  | { status: 'done'; data: ExtractedListingData }
  | { status: 'applied'; data: ExtractedListingData; previous: ListingInput }
  | { status: 'error'; message: string };

const ARS = (value: number) => `$${value.toLocaleString('es-AR')}`;

/** Filas legibles de lo que encontró el OCR, en el orden del formulario. */
function describeExtracted(data: ExtractedListingData): { label: string; value: string }[] {
  const zone = UNIVERSITY_ZONES.find((z) => z.id === data.zoneId);
  const rows: { label: string; value: string | undefined }[] = [
    { label: 'Link', value: data.listingUrl },
    { label: 'Zona', value: zone ? `${zone.city} — ${zone.neighborhood}` : undefined },
    { label: 'Alquiler mensual', value: data.monthlyRentArs ? ARS(data.monthlyRentArs) : undefined },
    { label: 'Seña', value: data.depositRequestedArs ? ARS(data.depositRequestedArs) : undefined },
    { label: 'Nombre', value: data.ownerName },
    { label: 'Teléfono', value: data.ownerPhone },
    { label: 'CBU / CVU / Alias', value: data.cbuOrAlias },
    {
      label: 'Pide seña antes de ver',
      value: data.requestsAdvanceBeforeVisit ? 'Sí (según el texto)' : undefined,
    },
  ];
  return rows.filter((row): row is { label: string; value: string } => Boolean(row.value));
}

/** Aplica al formulario solo los campos que el OCR encontró. */
function applyExtracted(input: ListingInput, data: ExtractedListingData): ListingInput {
  const keepsUrl = input.listingUrlOrCapture && !input.listingUrlOrCapture.startsWith('captura://');
  return {
    ...input,
    listingUrlOrCapture:
      data.listingUrl && !keepsUrl ? data.listingUrl : input.listingUrlOrCapture,
    zoneId: data.zoneId ?? input.zoneId,
    monthlyRentArs: data.monthlyRentArs ?? input.monthlyRentArs,
    depositRequestedArs: data.depositRequestedArs ?? input.depositRequestedArs,
    ownerName: data.ownerName ?? input.ownerName,
    ownerPhone: data.ownerPhone ?? input.ownerPhone,
    cbuOrAlias: data.cbuOrAlias ?? input.cbuOrAlias,
    requestsAdvanceBeforeVisit: data.requestsAdvanceBeforeVisit || input.requestsAdvanceBeforeVisit,
  };
}

type HashingState =
  | { status: 'idle' }
  | { status: 'hashing' }
  | { status: 'error'; message: string };

export const Screen3Input: React.FC<Screen3InputProps> = ({
  input,
  onChange,
  onSubmitToQualityGate,
  onBack,
  imageHasher,
  textReader,
}) => {
  // El hash es asíncrono: guardamos el último input para no pisar lo que se tipeó mientras tanto.
  const latestInput = useRef(input);
  latestInput.current = input;
  const [hashing, setHashing] = useState<HashingState>({ status: 'idle' });
  const [ocr, setOcr] = useState<OcrState>({ status: 'idle' });

  const perceptualMatch = input.uploadedImageDHash
    ? findClosestPerceptualMatch(input.uploadedImageDHash, KNOWN_IMAGE_SIGNATURES)
    : undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitToQualityGate();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onChange({
      ...input,
      hasCaptureUploaded: true,
      captureFileName: file.name,
      uploadedImageDHash: undefined,
      listingUrlOrCapture:
        input.listingUrlOrCapture || `captura://${file.name}`,
    });

    void readCaptureText(file);

    setHashing({ status: 'hashing' });
    try {
      const dHash = await imageHasher.hash(file);
      onChange({ ...latestInput.current, uploadedImageDHash: dHash });
      setHashing({ status: 'idle' });
    } catch (error) {
      setHashing({
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No pudimos leer la imagen para calcular su huella.',
      });
    }
  };

  const readCaptureText = async (file: File) => {
    setOcr({ status: 'reading', progress: 0 });
    try {
      const text = await textReader.read(file, (progress) =>
        setOcr({ status: 'reading', progress })
      );
      setOcr({ status: 'done', data: textExtractor.extract(text) });
    } catch {
      setOcr({
        status: 'error',
        message: 'No pudimos leer el texto de la imagen. Completá los datos a mano.',
      });
    }
  };

  const extractedRows = ocr.status === 'done' || ocr.status === 'applied' ? describeExtracted(ocr.data) : [];

  return (
    <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
          Pantalla 3 de 8 · Carga del anuncio
        </div>

        {/* Botones rápidos para autocompletar casos de prueba */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-500">
            Autocompletar caso:
          </span>
          {QUICK_DEMO_SCENARIOS.map((demo) => (
            <button
              key={demo.id}
              type="button"
              onClick={() => onChange({ ...demo.input })}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
            >
              <Sparkles className="h-3 w-3 text-indigo-600" />
              {demo.badge}
            </button>
          ))}
        </div>
      </div>

      <h1 className="mt-3 text-2xl font-extrabold text-slate-900 sm:text-3xl">
        Pegá el link o la captura.
      </h1>
      <p className="mt-1 text-xs text-slate-600">
        Completá los datos del aviso y lo que te informó el propietario por chat
        para cruzar fotos, precio de la zona, identidad y CBU/Alias.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {/* Link o captura */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label
              htmlFor="listing-url"
              className="block text-xs font-bold text-slate-800"
            >
              Link del anuncio o referencia de publicación *
            </label>
            <span
              id="listing-url-hint"
              className="mb-1 block text-xs text-slate-500"
            >
              Zonaprop, Facebook Marketplace, Argenprop o grupo de WhatsApp de la facultad
            </span>
            <input
              id="listing-url"
              type="text"
              required
              minLength={5}
              value={input.listingUrlOrCapture}
              onChange={(e) =>
                onChange({ ...input, listingUrlOrCapture: e.target.value })
              }
              aria-describedby="listing-url-hint"
              placeholder="https://www.facebook.com/marketplace/item/..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-600 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="capture-upload"
              className="block text-xs font-bold text-slate-800"
            >
              Adjuntar foto o captura (opcional)
            </label>
            <span className="mb-1 block text-xs text-slate-500">
              Leemos el texto y comparamos la foto
            </span>
            <label
              htmlFor="capture-upload"
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 px-3 py-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100/60"
            >
              <Upload className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {input.captureFileName
                  ? input.captureFileName
                  : 'Subir captura...'}
              </span>
              <input
                id="capture-upload"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="sr-only"
              />
            </label>
          </div>
        </div>

        {ocr.status !== 'idle' && (
          <div
            aria-live="polite"
            className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-3 text-xs text-slate-800"
          >
            <p className="flex items-center gap-1.5 font-bold text-slate-900">
              <ScanText className="h-4 w-4 text-indigo-700" aria-hidden="true" />
              Datos leídos de la captura (OCR en tu navegador)
            </p>

            {ocr.status === 'reading' && (
              <div className="mt-2">
                <p className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" aria-hidden="true" />
                  {ocr.progress > 0
                    ? `Leyendo el texto… ${Math.round(ocr.progress * 100)}%`
                    : 'Preparando el lector (la primera vez descarga ~2 MB)…'}
                </p>
                <progress
                  className="mt-1 h-1.5 w-full"
                  max={1}
                  value={ocr.progress}
                  aria-label="Progreso de lectura de la captura"
                />
              </div>
            )}

            {ocr.status === 'error' && (
              <p className="mt-1 font-semibold text-red-700">{ocr.message}</p>
            )}

            {(ocr.status === 'done' || ocr.status === 'applied') && extractedRows.length === 0 && (
              <p className="mt-1">
                No encontramos datos claros en la imagen (puede ser una foto sin texto o una
                captura borrosa). Completá los campos a mano.
              </p>
            )}

            {(ocr.status === 'done' || ocr.status === 'applied') && extractedRows.length > 0 && (
              <>
                <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                  {extractedRows.map((row) => (
                    <div key={row.label} className="flex gap-1.5">
                      <dt className="text-slate-600">{row.label}:</dt>
                      <dd className="break-all font-semibold">{row.value}</dd>
                    </div>
                  ))}
                </dl>
                {ocr.data.cbuChecksumValid === false && (
                  <p className="mt-2 font-semibold text-red-700">
                    El CBU/CVU leído no pasa la verificación de dígitos del BCRA: o el OCR leyó
                    mal un número, o la cuenta no existe. Compará con la captura.
                  </p>
                )}
                {ocr.data.foreignCurrencyDetected && (
                  <p className="mt-2 font-semibold text-amber-900">
                    Hay montos en dólares: el precio en pesos completalo a mano.
                  </p>
                )}
                {ocr.status === 'done' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOcr({ status: 'applied', data: ocr.data, previous: latestInput.current });
                      onChange(applyExtracted(latestInput.current, ocr.data));
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 font-bold text-white hover:bg-indigo-700"
                  >
                    <WandSparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    Completar el formulario con estos datos
                  </button>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <p className="font-semibold text-emerald-800">
                      Listo: revisá cada campo antes de seguir, el OCR puede equivocarse.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(ocr.previous);
                        setOcr({ status: 'done', data: ocr.data });
                      }}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-slate-700 hover:bg-white"
                    >
                      <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Deshacer
                    </button>
                  </div>
                )}
              </>
            )}
            <p className="mt-2 text-[11px] text-slate-600">
              La lectura es automática y aproximada. La antigüedad de la cuenta y la cantidad de
              fotos no se pueden leer de una captura: completalas vos.
            </p>
          </div>
        )}

        <div
          aria-live="polite"
          className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-700"
        >
          <p className="flex items-center gap-1.5 font-bold text-slate-800">
            <ScanSearch className="h-4 w-4 text-indigo-600" />
            Búsqueda inversa de la foto (huella perceptual dHash, calculada en tu navegador)
          </p>
          {hashing.status === 'hashing' && (
            <p className="mt-1 flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Calculando la huella de la imagen…
            </p>
          )}
          {hashing.status === 'error' && (
            <p className="mt-1 font-semibold text-red-700">{hashing.message}</p>
          )}
          {hashing.status === 'idle' && input.uploadedImageDHash && (
            <p className="mt-1">
              Huella: <code className="font-mono">{input.uploadedImageDHash}</code> ·{' '}
              {perceptualMatch ? (
                <strong
                  className={
                    perceptualMatch.signature.isStolenOrReusedPattern
                      ? 'text-red-700'
                      : 'text-emerald-700'
                  }
                >
                  Coincide con «{perceptualMatch.signature.title}» (distancia{' '}
                  {perceptualMatch.distance}/{DHASH_BITS}, umbral ≤{' '}
                  {DEFAULT_DHASH_MATCH_THRESHOLD})
                </strong>
              ) : (
                <strong>
                  Sin coincidencias en la base semilla ({KNOWN_IMAGE_SIGNATURES.length} fotos). Al
                  verificar se compara también con fotos de anuncios que verificaron otros estudiantes.
                </strong>
              )}
            </p>
          )}
          {hashing.status === 'idle' && !input.uploadedImageDHash && (
            <p className="mt-1">
              {input.imageSignatureHash
                ? `Modo demo: se usa la firma elegida manualmente en "Avanzado / demo" (${input.imageSignatureHash}). Subí una foto para reemplazarla por la huella real.`
                : 'Subí la foto del aviso para compararla automáticamente.'}
            </p>
          )}
          <p className="mt-1 text-[11px] text-slate-500">
            Límite: se compara contra fotos ya reportadas y contra las que subieron otros
            estudiantes en CuartoSeguro, no contra toda la web. Funciona mejor con la foto del aviso o un recorte; una
            captura de pantalla completa (con texto y botones) puede no coincidir.
          </p>
        </div>

        {/* Ciudad / Zona y Montos */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="zone-select"
              className="block text-xs font-bold text-slate-800"
            >
              Ciudad o zona del alquiler *
            </label>
            <span
              id="zone-select-hint"
              className="mb-1 block text-xs text-slate-500"
            >
              Para comparar contra el promedio BI zonal
            </span>
            <select
              id="zone-select"
              value={input.zoneId}
              onChange={(e) => onChange({ ...input, zoneId: e.target.value })}
              aria-describedby="zone-select-hint"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-600 focus:outline-none"
            >
              {UNIVERSITY_ZONES.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.city} — {z.neighborhood} (Prom: $
                  {(z.averageRentArs / 1000).toFixed(0)}k)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="monthly-rent"
              className="block text-xs font-bold text-slate-800"
            >
              Precio mensual publicado (ARS) *
            </label>
            <span
              id="monthly-rent-hint"
              className="mb-1 block text-xs text-slate-500"
            >
              Valor mensual del cuarto o depto
            </span>
            <input
              id="monthly-rent"
              type="number"
              required
              min={10000}
              step={5000}
              value={input.monthlyRentArs}
              onChange={(e) =>
                onChange({
                  ...input,
                  monthlyRentArs: Number(e.target.value) || 0,
                })
              }
              aria-describedby="monthly-rent-hint"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-600 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="deposit-amount"
              className="block text-xs font-bold text-slate-800"
            >
              Monto de la seña solicitada (ARS) *
            </label>
            <span
              id="deposit-amount-hint"
              className="mb-1 block text-xs text-slate-500"
            >
              Lo que te piden transferir ahora
            </span>
            <input
              id="deposit-amount"
              type="number"
              required
              min={0}
              step={5000}
              value={input.depositRequestedArs}
              onChange={(e) =>
                onChange({
                  ...input,
                  depositRequestedArs: Number(e.target.value) || 0,
                })
              }
              aria-describedby="deposit-amount-hint"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Datos de contacto e identidad del propietario y CBU/Alias */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Datos del propietario / inmobiliaria y cuenta de destino
            </h2>
            <span className="text-[11px] text-slate-500">
              Requeridos por el Control de Calidad (Pantalla 4)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="owner-name"
                className="block text-xs font-semibold text-slate-800"
              >
                Nombre completo o Inmobiliaria
              </label>
              <span className="mb-1 block text-[11px] text-slate-500">
                Quien dice alquilar la propiedad
              </span>
              <input
                id="owner-name"
                type="text"
                value={input.ownerName}
                onChange={(e) =>
                  onChange({ ...input, ownerName: e.target.value })
                }
                placeholder="Ej: Juan Ignacio Pereyra"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="owner-phone"
                className="block text-xs font-semibold text-slate-800"
              >
                Teléfono / WhatsApp de contacto
              </label>
              <span className="mb-1 block text-[11px] text-slate-500">
                Para cruzar con reportes estudiantiles
              </span>
              <input
                id="owner-phone"
                type="text"
                value={input.ownerPhone}
                onChange={(e) =>
                  onChange({ ...input, ownerPhone: e.target.value })
                }
                placeholder="Ej: +54 9 11 4982-1104"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="owner-cbu"
                className="block text-xs font-semibold text-slate-800"
              >
                CBU / CVU o Alias para la seña
              </label>
              <span className="mb-1 block text-[11px] text-slate-500">
                Cruza contra Directorio Fraudulento
              </span>
              <input
                id="owner-cbu"
                type="text"
                value={input.cbuOrAlias}
                onChange={(e) =>
                  onChange({ ...input, cbuOrAlias: e.target.value })
                }
                placeholder="Ej: alquiler.facil.ya.mp"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Parámetros de Búsqueda Inversa de Imagen y Perfil */}
          <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-3">
            <div>
              <label
                htmlFor="photo-count"
                className="block text-xs font-semibold text-slate-800"
              >
                Cantidad de fotos en el aviso
              </label>
              <span className="mb-1 block text-[11px] text-slate-500">
                Mínimo recomendado: 2 o más fotos
              </span>
              <input
                id="photo-count"
                type="number"
                min={0}
                max={30}
                value={input.photoCount}
                onChange={(e) =>
                  onChange({
                    ...input,
                    photoCount: Number(e.target.value) || 0,
                  })
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="account-age"
                className="block text-xs font-semibold text-slate-800"
              >
                Antigüedad de la cuenta (meses)
              </label>
              <span className="mb-1 block text-[11px] text-slate-500">
                0 a 2 meses = cuenta recién creada
              </span>
              <input
                id="account-age"
                type="number"
                min={0}
                max={240}
                value={input.accountAgeMonths}
                onChange={(e) =>
                  onChange({
                    ...input,
                    accountAgeMonths: Number(e.target.value) || 0,
                  })
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
              />
            </div>
          </div>

          <details className="rounded-xl border border-slate-200 bg-white p-3">
            <summary className="cursor-pointer text-xs font-semibold text-slate-700">
              Avanzado / demo: elegir manualmente una foto conocida
            </summary>
            <label
              htmlFor="photo-signature"
              className="mt-2 block text-xs font-semibold text-slate-800"
            >
              Firma de la base semilla
            </label>
            <span id="photo-signature-hint" className="mb-1 block text-[11px] text-slate-500">
              Para probar el flujo sin subir una imagen. Si subiste una foto, su huella
              automática tiene prioridad.
            </span>
            <select
              id="photo-signature"
              value={input.imageSignatureHash}
              onChange={(e) =>
                onChange({ ...input, imageSignatureHash: e.target.value })
              }
              aria-describedby="photo-signature-hint"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none"
            >
              <option value="">
                Ninguna (sin coincidencia manual)
              </option>
              {KNOWN_IMAGE_SIGNATURES.map((sig) => (
                <option key={sig.imageHash} value={sig.imageHash}>
                  {sig.isStolenOrReusedPattern ? '⚠️ Duplicada: ' : '✅ Verificada: '}
                  {sig.title} ({sig.originalCity})
                </option>
              ))}
            </select>
          </details>

          <div className="flex flex-wrap items-center gap-6 pt-1 text-xs text-slate-700">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={input.requestsAdvanceBeforeVisit}
                onChange={(e) =>
                  onChange({
                    ...input,
                    requestsAdvanceBeforeVisit: e.target.checked,
                  })
                }
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              <span>
                Me pide transferir la seña <strong>antes de poder ver</strong> la propiedad
              </span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={input.isRegisteredRealEstate}
                onChange={(e) =>
                  onChange({
                    ...input,
                    isRegisteredRealEstate: e.target.checked,
                    realEstateLicense: e.target.checked
                      ? input.realEstateLicense || 'CUCICBA Mat. 4821'
                      : '',
                  })
                }
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              <span>Informa matrícula inmobiliaria oficial (CUCICBA / CPCPI / Colegio)</span>
            </label>
          </div>
        </div>

        {/* Confirmación de autorización (Requisito explícito de Pantalla 3) */}
        <label className="flex items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 text-xs text-slate-800 cursor-pointer">
          <input
            type="checkbox"
            required
            checked={input.authorizedProcessing}
            onChange={(e) =>
              onChange({ ...input, authorizedProcessing: e.target.checked })
            }
            className="mt-0.5 h-4 w-4 rounded border-indigo-300 text-indigo-600"
          />
          <span>
            <strong>Confirmar autorización para procesar el anuncio:</strong> Autorizo a CuartoSeguro
            a analizar la información pública del enlace/captura y cruzarla contra el directorio
            colaborativo estudiantil (Solo información pública — Mapa de Oportunidad Tecnológica).
            <span className="mt-1 block text-slate-600">
              Si subiste una foto, se guarda solo su huella (no la imagen) con la zona, el precio y
              el CBU/alias y teléfono convertidos en un código irreversible (hash), para avisarle a otros estudiantes si la misma foto
              aparece en otro anuncio.
            </span>
          </span>
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            ← Volver a instrucciones
          </button>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"
          >
            Revisar calidad de los datos
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

interface Screen4QualityProps {
  quality: DataQualityCheckResult;
  onEditInput: () => void;
  onContinueToProcessing: () => void;
}

export const Screen4Quality: React.FC<Screen4QualityProps> = ({
  quality,
  onEditInput,
  onContinueToProcessing,
}) => {
  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
        Pantalla 4 de 8 · Control de calidad de los datos
      </div>

      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
        Revisando lo que enviaste.
      </h1>
      <p className="mt-1 text-xs text-slate-600">
        Antes de correr el motor de verificación, comprobamos que el anuncio tenga los datos mínimos
        para no darte una respuesta vacía.
      </p>

      <div className="mt-6 space-y-3">
        {/* Item 1: Link o captura */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            {quality.isLinkOrCaptureValid ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="h-6 w-6 text-red-600 shrink-0" />
            )}
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Link o captura
              </h2>
              <p className="text-xs text-slate-600">
                Formato de enlace o imagen de publicación
              </p>
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              quality.isLinkOrCaptureValid
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {quality.isLinkOrCaptureValid ? 'Legible' : 'No legible'}
          </span>
        </div>

        {/* Item 2: Datos de contacto del propietario */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            {quality.hasContactInfo ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="h-6 w-6 text-red-600 shrink-0" />
            )}
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Datos de contacto del propietario
              </h2>
              <p className="text-xs text-slate-600">
                Nombre completo, teléfono/WhatsApp o CBU/Alias
              </p>
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              quality.hasContactInfo
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {quality.hasContactInfo ? 'Disponibles' : 'Faltantes'}
          </span>
        </div>

        {/* Item 3: Fotos del anuncio */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            {quality.hasSufficientPhotos ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
            ) : (
              <AlertOctagon className="h-6 w-6 text-amber-600 shrink-0" />
            )}
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Fotos del anuncio
              </h2>
              <p className="text-xs text-slate-600">
                Cantidad e información visual para búsqueda inversa
              </p>
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              quality.hasSufficientPhotos
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {quality.hasSufficientPhotos
              ? 'Suficientes para comparar'
              : 'Pocas fotos (parcial)'}
          </span>
        </div>
      </div>

      {/* Mensaje bloqueante exacto de la Pantalla 4 si faltan datos de contacto */}
      {quality.blockingMessage && (
        <div
          role="alert"
          className="mt-6 rounded-2xl border-2 border-red-300 bg-red-50 p-5 text-red-900"
        >
          <div className="flex items-start gap-3">
            <AlertOctagon className="h-6 w-6 shrink-0 text-red-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-extrabold">
                Faltan datos obligatorios para verificar
              </h3>
              <p className="mt-1 text-sm font-medium leading-relaxed">
                "{quality.blockingMessage}"
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={onEditInput}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          <Edit3 className="h-4 w-4" />
          Completar o corregir datos
        </button>

        {quality.canProceedAutomatically ? (
          <button
            type="button"
            onClick={onContinueToProcessing}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
          >
            Iniciar verificación automática
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onContinueToProcessing}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-700"
          >
            Ver resultado parcial ("Sin datos suficientes")
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
