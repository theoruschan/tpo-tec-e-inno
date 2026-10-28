import React, { useCallback, useEffect, useState } from 'react';
import {
  AdminAuthError,
  AdminRepository,
  AdminStats,
  FeedbackRow,
  PendingReport,
  PublishedEntry,
} from '../../domain/ports/AdminRepository';
import { feedbackToCsv } from '../utils/feedbackCsv';
import { formatDateTime } from '../utils/formatDateTime';

interface AdminViewProps {
  /** null = no hay Supabase configurado. */
  repository: AdminRepository | null;
  onExit: () => void;
}

type Tab = 'reports' | 'published' | 'feedback' | 'summary';

const USEFUL_LABELS = { yes: 'Sí', partly: 'Más o menos', no: 'No' } as const;
const OUTCOME_LABELS = {
  not_paying: 'No pagó',
  paid_ok: 'Pagó y salió bien',
  paid_scam: 'Pagó y era estafa',
  undecided: 'No decidió',
} as const;
const PROPERTY_LABELS: Record<string, string> = {
  room: 'Habitación',
  studio: 'Monoambiente',
  two_rooms: '2 ambientes',
};

const percent = (part: number, total: number) =>
  total > 0 ? `${Math.round((part / total) * 100)}%` : '—';

/**
 * Panel de administración del piloto. Está en /#admin y no tiene link en la app, pero eso solo
 * evita que lo encuentren por casualidad: la protección real es el servidor, que rechaza
 * (403) a cualquier usuario que no esté en private.admins.
 */
export const AdminView: React.FC<AdminViewProps> = ({ repository, onExit }) => {
  const [email, setEmail] = useState<string | null>(() => repository?.currentEmail() ?? null);
  const [form, setForm] = useState({ email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [busy, setBusy] = useState(false);

  const [tab, setTab] = useState<Tab>('reports');
  const [reports, setReports] = useState<PendingReport[]>([]);
  const [published, setPublished] = useState<PublishedEntry[]>([]);
  const [confirmingTakedown, setConfirmingTakedown] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadError, setLoadError] = useState('');
  const [moderating, setModerating] = useState<string | null>(null);

  const backToLogin = useCallback(
    (message: string) => {
      repository?.signOut();
      setEmail(null);
      setReports([]);
      setPublished([]);
      setFeedback([]);
      setStats(null);
      setAuthError(message);
    },
    [repository]
  );

  const loadAll = useCallback(async () => {
    if (!repository) return;
    setLoadError('');
    try {
      const [pending, entries, rows, summary] = await Promise.all([
        repository.listPendingReports(),
        repository.listPublishedEntries(),
        repository.listFeedback(500),
        repository.stats(),
      ]);
      setReports(pending);
      setPublished(entries);
      setFeedback(rows);
      setStats(summary);
    } catch (error) {
      if (error instanceof AdminAuthError) {
        backToLogin(error.message);
      } else {
        setLoadError('No se pudieron cargar los datos. Probá de nuevo.');
      }
    }
  }, [repository, backToLogin]);

  useEffect(() => {
    if (email) void loadAll();
  }, [email, loadAll]);

  // Al salir del panel (por cualquier camino) la sesión se cierra.
  useEffect(() => () => repository?.signOut(), [repository]);

  if (!repository) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm">
        <h1 className="text-xl font-extrabold text-slate-900">Panel de administración</h1>
        <p className="mt-2">
          El panel necesita Supabase configurado (<code>VITE_SUPABASE_URL</code> y{' '}
          <code>VITE_SUPABASE_ANON_KEY</code>).
        </p>
        <button type="button" onClick={onExit} className="mt-4 font-semibold text-indigo-700 underline">
          Volver a la app
        </button>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setAuthError('');
    try {
      const signedEmail = await repository.signIn(form.email, form.password);
      setForm({ email: '', password: '' });
      setEmail(signedEmail);
    } catch (error) {
      setAuthError(
        error instanceof AdminAuthError ? error.message : 'No pudimos iniciar sesión. Probá de nuevo.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleModerate = async (report: PendingReport, status: 'approved' | 'rejected') => {
    setModerating(report.id);
    setLoadError('');
    try {
      await repository.moderateReport(report.id, status);
      await loadAll();
    } catch (error) {
      if (error instanceof AdminAuthError) backToLogin(error.message);
      else setLoadError('No se pudo guardar la decisión. Probá de nuevo.');
    } finally {
      setModerating(null);
    }
  };

  const handleTakedown = async (entry: PublishedEntry) => {
    setModerating(entry.entryKey);
    setLoadError('');
    try {
      await repository.takedownEntry(entry.entryKey);
      setConfirmingTakedown(null);
      await loadAll();
    } catch (error) {
      if (error instanceof AdminAuthError) backToLogin(error.message);
      else setLoadError('No se pudo dar de baja la entrada. Probá de nuevo.');
    } finally {
      setModerating(null);
    }
  };

  const handleExit = () => {
    repository.signOut();
    onExit();
  };

  const downloadCsv = () => {
    const blob = new Blob(['﻿' + feedbackToCsv(feedback)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'feedback-piloto.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  if (!email) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-extrabold text-slate-900">Panel de administración</h1>
        <p className="mt-1 text-xs text-slate-600">Solo para administradores del piloto.</p>
        <form onSubmit={handleLogin} className="mt-5 space-y-4">
          <div>
            <label htmlFor="admin-email" className="block text-xs font-bold text-slate-800">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="username"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-600 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-xs font-bold text-slate-800">
              Contraseña
            </label>
            <input
              id="admin-password"
              type="password"
              required
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-600 focus:outline-none"
            />
          </div>
          {authError && (
            <p role="alert" className="text-xs font-semibold text-red-700">
              {authError}
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onExit}
              className="text-xs font-semibold text-slate-600 hover:underline"
            >
              Volver a la app
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? 'Ingresando…' : 'Ingresar'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'reports', label: `Reportes pendientes (${reports.length})` },
    { id: 'published', label: `Publicados (${published.length})` },
    { id: 'feedback', label: `Feedback (${feedback.length})` },
    { id: 'summary', label: 'Resumen' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Panel de administración</h1>
          <p className="text-xs text-slate-600">Sesión: {email} · se cierra al recargar la página</p>
        </div>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => void loadAll()}
            className="rounded-xl border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Actualizar
          </button>
          <button
            type="button"
            onClick={handleExit}
            className="rounded-xl bg-slate-900 px-3 py-2 font-semibold text-white hover:bg-slate-700"
          >
            Salir
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 font-semibold ${
              tab === t.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loadError && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
          {loadError}
        </p>
      )}

      {tab === 'reports' && (
        <section aria-label="Reportes pendientes" className="space-y-3">
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-950">
            <strong>Al aprobar, el motivo se publica en el directorio.</strong> Aprobá solo si
            describe hechos y no incluye nombres, teléfonos ni datos personales de terceros. Ante la
            duda, rechazá.
          </p>
          {reports.length === 0 && (
            <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              No hay reportes pendientes.
            </p>
          )}
          {reports.map((report) => (
            <article key={report.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-rose-100 px-2.5 py-1 font-mono font-bold text-rose-900">
                  {report.identifierMasked ?? 'Solo teléfono'}
                </span>
                {report.phoneMasked && <span className="text-slate-600">Tel. {report.phoneMasked}</span>}
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-700">
                  {report.city}
                </span>
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-bold text-amber-950">
                  {report.reportsForIdentifier}{' '}
                  {report.reportsForIdentifier === 1 ? 'dispositivo lo reportó' : 'dispositivos lo reportaron'}
                </span>
                <span className="text-slate-500">{formatDateTime(report.createdAt)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-900">{report.reason}</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={moderating === report.id}
                  onClick={() => void handleModerate(report, 'approved')}
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  Aprobar
                </button>
                <button
                  type="button"
                  disabled={moderating === report.id}
                  onClick={() => void handleModerate(report, 'rejected')}
                  className="rounded-lg bg-red-700 px-3 py-1.5 font-bold text-white hover:bg-red-800 disabled:opacity-60"
                >
                  Rechazar
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {tab === 'published' && (
        <section aria-label="Entradas publicadas" className="space-y-3">
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-950">
            Son las entradas que hoy ve cualquier persona en el directorio. <strong>Dar de baja</strong>{' '}
            rechaza todos los reportes de ese identificador y lo saca del directorio al instante; queda
            registrado quién lo hizo. Usalo si alguien reclama o si el motivo incluye datos personales.
          </p>
          {published.length === 0 && (
            <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              No hay entradas publicadas.
            </p>
          )}
          {published.map((entry) => (
            <article key={entry.entryKey} className="rounded-2xl border border-slate-200 bg-white p-4 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-rose-100 px-2.5 py-1 font-mono font-bold text-rose-900">
                  {entry.identifierMasked ?? 'Solo teléfono'}
                </span>
                {entry.phoneMasked && <span className="text-slate-600">Tel. {entry.phoneMasked}</span>}
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-700">
                  {entry.city}
                </span>
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-bold text-amber-950">
                  {entry.reportsCount} {entry.reportsCount === 1 ? 'reporte' : 'reportes'}
                </span>
                <span className="text-slate-500">Último: {entry.lastReportedAt}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-900">{entry.reason}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {confirmingTakedown === entry.entryKey ? (
                  <>
                    <span className="font-semibold text-red-800">
                      ¿Sacar {entry.identifierMasked ?? 'este teléfono'} del directorio?
                    </span>
                    <button
                      type="button"
                      disabled={moderating === entry.entryKey}
                      onClick={() => void handleTakedown(entry)}
                      className="rounded-lg bg-red-700 px-3 py-1.5 font-bold text-white hover:bg-red-800 disabled:opacity-60"
                    >
                      Confirmar baja
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingTakedown(null)}
                      className="rounded-lg px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingTakedown(entry.entryKey)}
                    className="rounded-lg border border-red-300 px-3 py-1.5 font-bold text-red-800 hover:bg-red-50"
                  >
                    Dar de baja
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

      {tab === 'feedback' && (
        <section aria-label="Feedback de participantes" className="space-y-3">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={downloadCsv}
              disabled={feedback.length === 0}
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Descargar CSV
            </button>
          </div>
          {feedback.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              Todavía no hay feedback.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 text-slate-600 uppercase">
                  <tr>
                    <th scope="col" className="p-3">Fecha</th>
                    <th scope="col" className="p-3">Resultado</th>
                    <th scope="col" className="p-3">Zona</th>
                    <th scope="col" className="p-3">¿Le sirvió?</th>
                    <th scope="col" className="p-3">Qué hizo</th>
                    <th scope="col" className="p-3">Comentario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {feedback.map((row) => {
                    const missed = row.outcome === 'paid_scam' && row.verdict === 'Verificado';
                    return (
                      <tr key={row.id} className={missed ? 'bg-red-50' : undefined}>
                        <td className="p-3 whitespace-nowrap">{formatDateTime(row.updatedAt)}</td>
                        <td className="p-3">
                          {row.verdict} ({row.confidence}%)
                          {missed && (
                            <span className="mt-1 block font-bold text-red-800">Estafa no detectada</span>
                          )}
                        </td>
                        <td className="p-3">
                          {row.city ?? '—'} · {PROPERTY_LABELS[row.propertyType ?? ''] ?? '—'}
                        </td>
                        <td className="p-3">{USEFUL_LABELS[row.useful]}</td>
                        <td className="p-3">{OUTCOME_LABELS[row.outcome]}</td>
                        <td className="p-3 max-w-xs whitespace-pre-wrap break-words">{row.comment ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === 'summary' && stats && (
        <section aria-label="Resumen" className="space-y-4 text-xs">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Reportes pendientes', stats.reportsPending],
              ['Reportes aprobados', stats.reportsApproved],
              ['Reportes rechazados', stats.reportsRejected],
              ['Fotos en el índice', stats.photoSightings],
              ['Respuestas de feedback', stats.feedbackTotal],
              ['Le sirvió (sí)', `${stats.usefulYes} (${percent(stats.usefulYes, stats.feedbackTotal)})`],
              ['Más o menos', `${stats.usefulPartly} (${percent(stats.usefulPartly, stats.feedbackTotal)})`],
              ['No le sirvió', `${stats.usefulNo} (${percent(stats.usefulNo, stats.feedbackTotal)})`],
              ['No pagaron', stats.outcomeNotPaying],
              ['Pagaron y salió bien', stats.outcomePaidOk],
              ['Pagaron y era estafa', stats.outcomePaidScam],
              ['Todavía no decidieron', stats.outcomeUndecided],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4">
                <dt className="text-slate-600">{label}</dt>
                <dd className="mt-1 text-2xl font-black text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
          <div
            className={`rounded-2xl border p-4 ${
              stats.scamMissed > 0 ? 'border-red-300 bg-red-50 text-red-950' : 'border-slate-200 bg-white'
            }`}
          >
            <p className="font-bold">Estafas que el motor dejó pasar: {stats.scamMissed}</p>
            <p className="mt-0.5">
              Participantes que pagaron, era una estafa y el resultado había sido «Verificado». Es el
              error más grave: cada caso hay que revisarlo en la pestaña Feedback.
            </p>
          </div>
          <p className="text-slate-600">
            Con pocas respuestas los porcentajes se mueven mucho: mirá siempre el conteo.
          </p>
        </section>
      )}
    </div>
  );
};
