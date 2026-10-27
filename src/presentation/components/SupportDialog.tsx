import React, { useEffect, useRef, useState } from 'react';
import { LifeBuoy, X, CheckCircle2 } from 'lucide-react';

interface SupportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  listingReference: string;
}

export const SupportDialog: React.FC<SupportDialogProps> = ({
  isOpen,
  onClose,
  listingReference,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [studentContact, setStudentContact] = useState('');
  const [question, setQuestion] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      setSubmitted(false);
      dialog.showModal();
      // autoFocus de React no aplica dentro de showModal(): llevamos el foco al primer campo.
      dialog.querySelector<HTMLInputElement>('#support-contact')?.focus();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Modern Web Guidance: Light dismiss fallback for <dialog>
  const handlePointerUp = (e: React.PointerEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const rect = dialog.getBoundingClientRect();
    const clickedOutside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;
    if (clickedOutside) {
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onPointerUp={handlePointerUp}
      aria-labelledby="support-dialog-title"
      aria-describedby="support-dialog-desc"
      className="m-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <h2 id="support-dialog-title" className="text-lg font-bold text-slate-900">
                Contactar soporte humano ante dudas
              </h2>
              <p id="support-dialog-desc" className="text-xs text-slate-600">
                Prototipo: todavía no hay una mesa de ayuda conectada.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana de soporte"
            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {submitted ? (
          <div
            role="status"
            className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
          >
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="h-5 w-5 text-amber-700" aria-hidden="true" />
              Consulta registrada solo en esta demo
            </div>
            <p className="mt-1 text-xs leading-relaxed">
              Este prototipo todavía <strong>no envía</strong> la consulta a ninguna persona y
              nadie va a escribirte a <span className="font-semibold">{studentContact}</span>.
              Si tenés dudas sobre el anuncio{' '}
              <span className="font-semibold">{listingReference}</span>, consultá con el centro
              de estudiantes o bienestar estudiantil de tu facultad y, mientras tanto,{' '}
              <strong>no transfieras ninguna seña</strong>.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              Volver a los detalles de la verificación
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              <strong>Anuncio en revisión:</strong> {listingReference}
            </div>

            <div>
              <label
                htmlFor="support-contact"
                className="block text-xs font-semibold text-slate-800"
              >
                Tu WhatsApp o correo institucional
              </label>
              <span
                id="support-contact-hint"
                className="mb-1 block text-xs text-slate-500"
              >
                Formato sugerido: +54 9 11 1234-5678 o usuario@uade.edu.ar
              </span>
              <input
                id="support-contact"
                type="text"
                required
                minLength={5}
                value={studentContact}
                onChange={(e) => setStudentContact(e.target.value)}
                aria-describedby="support-contact-hint"
                placeholder="Ej: +54 9 11 5544-3322"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-600 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="support-question"
                className="block text-xs font-semibold text-slate-800"
              >
                ¿Qué te pidió el propietario o qué duda tenés?
              </label>
              <span
                id="support-question-hint"
                className="mb-1 block text-xs text-slate-500"
              >
                Contanos si te apura con la transferencia o si el CBU está a nombre de otra persona.
              </span>
              <textarea
                id="support-question"
                required
                rows={3}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                aria-describedby="support-question-hint"
                placeholder="Ej: Me dijo que vive en el sur y que si le transfiero $120.000 ahora me guarda la llave..."
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-600 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Enviar consulta (demo)
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
};
