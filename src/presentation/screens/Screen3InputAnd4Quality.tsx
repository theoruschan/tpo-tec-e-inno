import React from 'react';
import {
  Upload,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  ArrowRight,
  Edit3,
  Sparkles,
} from 'lucide-react';
import {
  DataQualityCheckResult,
  ListingInput,
} from '../../domain/entities/types';
import {
  KNOWN_IMAGE_SIGNATURES,
  QUICK_DEMO_SCENARIOS,
  UNIVERSITY_ZONES,
} from '../../infrastructure/data/datasets';

interface Screen3InputProps {
  input: ListingInput;
  onChange: (updated: ListingInput) => void;
  onSubmitToQualityGate: () => void;
  onBack: () => void;
}

export const Screen3Input: React.FC<Screen3InputProps> = ({
  input,
  onChange,
  onSubmitToQualityGate,
  onBack,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitToQualityGate();
  };

  const handleSimulatedFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange({
        ...input,
        hasCaptureUploaded: true,
        captureFileName: file.name,
        listingUrlOrCapture:
          input.listingUrlOrCapture || `captura://${file.name}`,
      });
    }
  };

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
              Adjuntar captura (opcional)
            </label>
            <span className="mb-1 block text-xs text-slate-500">
              Si es de chat o historia IG
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
                onChange={handleSimulatedFileUpload}
                className="sr-only"
              />
            </label>
          </div>
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
                htmlFor="photo-signature"
                className="block text-xs font-semibold text-slate-800"
              >
                Huella visual / Foto del anuncio (Búsqueda inversa)
              </label>
              <span className="mb-1 block text-[11px] text-slate-500">
                Simula el hash perceptual extraído de la foto
              </span>
              <select
                id="photo-signature"
                value={input.imageSignatureHash}
                onChange={(e) =>
                  onChange({ ...input, imageSignatureHash: e.target.value })
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none"
              >
                <option value="">
                  Foto nueva / Sin coincidencias en otros portales
                </option>
                {KNOWN_IMAGE_SIGNATURES.map((sig) => (
                  <option key={sig.imageHash} value={sig.imageHash}>
                    {sig.isStolenOrReusedPattern ? '⚠️ Duplicada: ' : '✅ Verificada: '}
                    {sig.title} ({sig.originalCity})
                  </option>
                ))}
              </select>
            </div>

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
