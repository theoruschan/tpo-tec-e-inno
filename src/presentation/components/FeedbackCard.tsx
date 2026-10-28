import React, { useState } from 'react';
import { VerificationResult } from '../../domain/entities/types';
import {
  FeedbackOutcome,
  FeedbackUseful,
  PilotFeedbackRepository,
} from '../../domain/ports/PilotFeedbackRepository';

interface FeedbackCardProps {
  result: VerificationResult;
  repository: PilotFeedbackRepository;
}

const USEFUL_OPTIONS: { value: FeedbackUseful; label: string }[] = [
  { value: 'yes', label: 'Sí' },
  { value: 'partly', label: 'Más o menos' },
  { value: 'no', label: 'No' },
];

const OUTCOME_OPTIONS: { value: FeedbackOutcome; label: string }[] = [
  { value: 'undecided', label: 'Todavía no decidí' },
  { value: 'not_paying', label: 'No voy a pagar / no pagué' },
  { value: 'paid_ok', label: 'Pagué y salió bien' },
  { value: 'paid_scam', label: 'Pagué y era una estafa' },
];

type Status = 'editing' | 'sending' | 'sent' | 'error';

/** Feedback del piloto sobre un resultado: se puede cambiar más tarde (por ejemplo, tras pagar). */
export const FeedbackCard: React.FC<FeedbackCardProps> = ({ result, repository }) => {
  const [useful, setUseful] = useState<FeedbackUseful | null>(null);
  const [outcome, setOutcome] = useState<FeedbackOutcome>('undecided');
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<Status>('editing');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!useful) return;
    setStatus('sending');
    try {
      await repository.submit({
        verificationId: result.id,
        verdict: result.verdict,
        confidence: result.confidenceLevel,
        city: result.priceComparison.zone.city,
        propertyType: result.input.propertyType ?? 'room',
        useful,
        outcome,
        comment,
      });
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <div
        role="status"
        className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-950"
      >
        <p className="font-bold">¡Gracias por tu opinión!</p>
        <p className="mt-1">
          Si más adelante pagás o descubrís cómo terminó el alquiler, volvé y cambiá tu respuesta: es
          lo que más nos sirve.
        </p>
        <button
          type="button"
          onClick={() => setStatus('editing')}
          className="mt-2 font-semibold underline underline-offset-2"
        >
          Cambiar mi respuesta
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby="feedback-title"
      className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-800"
    >
      <div>
        <h2 id="feedback-title" className="text-sm font-bold text-slate-900">
          Piloto: ¿te sirvió este resultado?
        </h2>
        <p className="mt-0.5 text-slate-600">Tu respuesta es anónima y nos ayuda a mejorar la herramienta.</p>
      </div>

      <fieldset>
        <legend className="mb-1 font-semibold">¿Te sirvió?</legend>
        <div className="flex flex-wrap gap-3">
          {USEFUL_OPTIONS.map((option) => (
            <label key={option.value} className="inline-flex cursor-pointer items-center gap-1.5">
              <input
                type="radio"
                name="feedback-useful"
                value={option.value}
                checked={useful === option.value}
                onChange={() => setUseful(option.value)}
                className="h-4 w-4 accent-indigo-600"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1 font-semibold">¿Qué hiciste con este anuncio?</legend>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:gap-x-4">
          {OUTCOME_OPTIONS.map((option) => (
            <label key={option.value} className="inline-flex cursor-pointer items-center gap-1.5">
              <input
                type="radio"
                name="feedback-outcome"
                value={option.value}
                checked={outcome === option.value}
                onChange={() => setOutcome(option.value)}
                className="h-4 w-4 accent-indigo-600"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="feedback-comment" className="block font-semibold">
          Comentario (opcional)
        </label>
        <span id="feedback-comment-hint" className="mb-1 block text-slate-600">
          No pongas nombres, teléfonos, CBU ni datos personales de nadie.
        </span>
        <textarea
          id="feedback-comment"
          rows={2}
          maxLength={500}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          aria-describedby="feedback-comment-hint"
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!useful || status === 'sending'}
          className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'sending' ? 'Enviando…' : 'Enviar opinión'}
        </button>
        {status === 'error' && (
          <p role="alert" className="font-semibold text-red-700">
            No pudimos enviar tu opinión. Probá de nuevo en un rato.
          </p>
        )}
      </div>
    </form>
  );
};
