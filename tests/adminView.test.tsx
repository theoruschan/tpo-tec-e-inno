// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AdminAuthError,
  AdminRepository,
  AdminStats,
  FeedbackRow,
  PendingReport,
  PublishedEntry,
} from '../src/domain/ports/AdminRepository';
import { AdminView } from '../src/presentation/screens/AdminView';
import { csvCell, feedbackToCsv } from '../src/presentation/utils/feedbackCsv';

afterEach(cleanup);

const pending: PendingReport = {
  id: 'rep-1',
  identifierMasked: 'alq•••.mp',
  phoneMasked: '•••• 9918',
  city: 'CABA',
  reason: 'Pidió seña y bloqueó <b>al estudiante</b>',
  source: 'Verificación usuario',
  createdAt: '2026-10-28T10:00:00Z',
  reportsForIdentifier: 2,
};

const published: PublishedEntry = {
  entryKey: 'hash-alq-key',
  identifierMasked: 'alq•••.mp',
  phoneMasked: '•••• 9918',
  city: 'CABA',
  reportsCount: 7,
  approvedCount: 7,
  reason: 'Pide $120.000 de reserva y bloquea',
  lastReportedAt: '2026-08-29',
};

const feedbackRows: FeedbackRow[] = [
  {
    id: 'f1', createdAt: '2026-10-28T10:00:00Z', updatedAt: '2026-10-28T12:00:00Z',
    verificationId: 'VER-1', verdict: 'Verificado', confidence: 89, city: 'CABA',
    propertyType: 'room', useful: 'no', outcome: 'paid_scam', comment: 'Era una estafa',
  },
  {
    id: 'f2', createdAt: '2026-10-28T11:00:00Z', updatedAt: '2026-10-28T11:00:00Z',
    verificationId: 'VER-2', verdict: 'Anuncio sospechoso', confidence: 89, city: 'Córdoba',
    propertyType: 'two_rooms', useful: 'yes', outcome: 'not_paying', comment: null,
  },
];

const stats: AdminStats = {
  reportsPending: 1, reportsApproved: 25, reportsRejected: 0, photoSightings: 4,
  feedbackTotal: 2, usefulYes: 1, usefulPartly: 0, usefulNo: 1,
  outcomeNotPaying: 1, outcomePaidOk: 0, outcomePaidScam: 1, outcomeUndecided: 0, scamMissed: 1,
};

function fakeRepo(overrides: Partial<AdminRepository> = {}): AdminRepository {
  let email: string | null = null;
  return {
    signIn: vi.fn(async (e: string) => { email = e; return e; }),
    signOut: vi.fn(() => { email = null; }),
    currentEmail: () => email,
    listPendingReports: vi.fn(async () => [pending]),
    moderateReport: vi.fn(async () => true),
    listPublishedEntries: vi.fn(async () => [published]),
    takedownEntry: vi.fn(async () => 7),
    listFeedback: vi.fn(async () => feedbackRows),
    stats: vi.fn(async () => stats),
    ...overrides,
  };
}

async function login(repo: AdminRepository) {
  render(<AdminView repository={repo} onExit={vi.fn()} />);
  await userEvent.type(screen.getByLabelText('Email'), 'admin@ejemplo.com');
  await userEvent.type(screen.getByLabelText('Contraseña'), 'secreta');
  await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
}

describe('AdminView — acceso', () => {
  it('sin Supabase configurado explica qué falta', () => {
    render(<AdminView repository={null} onExit={vi.fn()} />);
    expect(screen.getByText(/necesita Supabase configurado/)).toBeTruthy();
  });

  it('muestra el login primero y no pide ningún dato antes de iniciar sesión', () => {
    const repo = fakeRepo();
    render(<AdminView repository={repo} onExit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeTruthy();
    expect(repo.listPendingReports).not.toHaveBeenCalled();
    expect(repo.stats).not.toHaveBeenCalled();
  });

  it('credenciales incorrectas → alerta y sigue en el login', async () => {
    const repo = fakeRepo({ signIn: vi.fn(async () => { throw new AdminAuthError('Email o contraseña incorrectos.'); }) });
    await login(repo);
    expect((await screen.findByRole('alert')).textContent).toBe('Email o contraseña incorrectos.');
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeTruthy();
    expect(repo.listPendingReports).not.toHaveBeenCalled();
  });

  it('un usuario autenticado que no es admin (403) vuelve al login con el motivo y se cierra su sesión', async () => {
    const repo = fakeRepo({
      stats: vi.fn(async () => { throw new AdminAuthError('Tu usuario no está autorizado como administrador.'); }),
    });
    await login(repo);
    expect((await screen.findByRole('alert')).textContent).toContain('no está autorizado');
    expect(repo.signOut).toHaveBeenCalled();
    expect(screen.queryByText('Reportes pendientes (1)')).toBeNull();
  });

  it('al ingresar limpia la contraseña del estado y carga reportes, feedback y resumen', async () => {
    const repo = fakeRepo();
    await login(repo);
    expect(await screen.findByText('Sesión: admin@ejemplo.com · se cierra al recargar la página')).toBeTruthy();
    expect(repo.listPendingReports).toHaveBeenCalled();
    expect(repo.listFeedback).toHaveBeenCalled();
    expect(repo.stats).toHaveBeenCalled();
  });

  it('"Salir" cierra la sesión y vuelve a la app', async () => {
    const onExit = vi.fn();
    const repo = fakeRepo();
    render(<AdminView repository={repo} onExit={onExit} />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Salir' }));
    expect(repo.signOut).toHaveBeenCalled();
    expect(onExit).toHaveBeenCalled();
  });
});

describe('AdminView — moderación', () => {
  it('muestra el reporte con el aviso de publicación y el motivo como texto (sin interpretar HTML)', async () => {
    await login(fakeRepo());
    expect(await screen.findByText('alq•••.mp')).toBeTruthy();
    expect(screen.getByText('2 dispositivos lo reportaron')).toBeTruthy();
    expect(screen.getByText(/Al aprobar, el motivo se publica en el directorio/)).toBeTruthy();
    expect(screen.getByText('Pidió seña y bloqueó <b>al estudiante</b>')).toBeTruthy();
    expect(document.querySelector('article b')).toBeNull();
  });

  it('aprobar y rechazar llaman al repositorio con el id y el estado y recargan la lista', async () => {
    const listPending = vi.fn().mockResolvedValueOnce([pending]).mockResolvedValue([]);
    const repo = fakeRepo({ listPendingReports: listPending });
    await login(repo);
    await userEvent.click(await screen.findByRole('button', { name: 'Aprobar' }));
    expect(repo.moderateReport).toHaveBeenCalledWith('rep-1', 'approved');
    expect(await screen.findByText('No hay reportes pendientes.')).toBeTruthy();

    const listPending2 = vi.fn().mockResolvedValueOnce([pending]).mockResolvedValue([]);
    cleanup();
    const repo2 = fakeRepo({ listPendingReports: listPending2 });
    await login(repo2);
    await userEvent.click(await screen.findByRole('button', { name: 'Rechazar' }));
    expect(repo2.moderateReport).toHaveBeenCalledWith('rep-1', 'rejected');
  });

  it('si falla guardar la decisión avisa y deja el reporte', async () => {
    const repo = fakeRepo({ moderateReport: vi.fn(async () => { throw new Error('boom'); }) });
    await login(repo);
    await userEvent.click(await screen.findByRole('button', { name: 'Aprobar' }));
    expect((await screen.findByRole('alert')).textContent).toContain('No se pudo guardar la decisión');
    expect(screen.getByText('alq•••.mp')).toBeTruthy();
  });
});

describe('AdminView — baja de entradas publicadas', () => {
  async function openPublished(repo: AdminRepository) {
    await login(repo);
    await userEvent.click(await screen.findByRole('button', { name: /Publicados \(1\)/ }));
  }

  it('lista lo que ve el público y avisa que la baja es inmediata y queda registrada', async () => {
    await openPublished(fakeRepo());
    expect(screen.getByText('alq•••.mp')).toBeTruthy();
    expect(screen.getByText('7 reportes')).toBeTruthy();
    expect(screen.getByText('Pide $120.000 de reserva y bloquea')).toBeTruthy();
    expect(screen.getByText(/queda\s+registrado quién lo hizo/)).toBeTruthy();
  });

  it('pide confirmación en dos pasos: el primer clic no da de baja nada', async () => {
    const repo = fakeRepo();
    await openPublished(repo);
    await userEvent.click(screen.getByRole('button', { name: 'Dar de baja' }));
    expect(repo.takedownEntry).not.toHaveBeenCalled();
    expect(screen.getByText('¿Sacar alq•••.mp del directorio?')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(repo.takedownEntry).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Dar de baja' })).toBeTruthy();
  });

  it('confirmar llama a la baja con la clave y recarga la lista', async () => {
    const list = vi.fn().mockResolvedValueOnce([published]).mockResolvedValue([]);
    const repo = fakeRepo({ listPublishedEntries: list });
    await openPublished(repo);
    await userEvent.click(screen.getByRole('button', { name: 'Dar de baja' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar baja' }));
    expect(repo.takedownEntry).toHaveBeenCalledWith('hash-alq-key');
    expect(await screen.findByText('No hay entradas publicadas.')).toBeTruthy();
  });

  it('si falla la baja avisa y mantiene la entrada; si vence la sesión vuelve al login', async () => {
    const failing = fakeRepo({ takedownEntry: vi.fn(async () => { throw new Error('boom'); }) });
    await openPublished(failing);
    await userEvent.click(screen.getByRole('button', { name: 'Dar de baja' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar baja' }));
    expect((await screen.findByRole('alert')).textContent).toContain('No se pudo dar de baja');
    expect(screen.getByText('alq•••.mp')).toBeTruthy();

    cleanup();
    const expired = fakeRepo({ takedownEntry: vi.fn(async () => { throw new AdminAuthError('La sesión venció.'); }) });
    await openPublished(expired);
    await userEvent.click(screen.getByRole('button', { name: 'Dar de baja' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar baja' }));
    expect((await screen.findByRole('alert')).textContent).toBe('La sesión venció.');
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeTruthy();
  });
});

describe('AdminView — feedback y resumen', () => {
  it('resalta como "Estafa no detectada" a quien pagó una estafa tras un "Verificado"', async () => {
    await login(fakeRepo());
    await userEvent.click(await screen.findByRole('button', { name: /Feedback \(2\)/ }));
    const rows = screen.getAllByRole('row');
    expect(within(rows[1]).getByText('Estafa no detectada')).toBeTruthy();
    expect(within(rows[2]).queryByText('Estafa no detectada')).toBeNull();
    expect(screen.getByText('Era una estafa')).toBeTruthy();
  });

  it('el resumen muestra conteos, porcentajes y las estafas que dejó pasar el motor', async () => {
    await login(fakeRepo());
    await userEvent.click(await screen.findByRole('button', { name: 'Resumen' }));
    expect(screen.getByText('Estafas que el motor dejó pasar: 1')).toBeTruthy();
    // Cada tarjeta es <dt>etiqueta</dt><dd>valor</dd>: se busca el valor junto a su etiqueta.
    const valueOf = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling?.textContent;
    expect(valueOf('Le sirvió (sí)')).toBe('1 (50%)');
    expect(valueOf('No le sirvió')).toBe('1 (50%)');
    expect(valueOf('Más o menos')).toBe('0 (0%)');
    expect(valueOf('Reportes aprobados')).toBe('25');
    expect(screen.getByText(/mirá siempre el conteo/)).toBeTruthy();
  });
});

describe('Exportación CSV', () => {
  it('neutraliza fórmulas y escapa comillas, comas y saltos de línea', () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(csvCell('+54 9 11')).toBe("'+54 9 11");
    expect(csvCell('-1')).toBe("'-1");
    expect(csvCell('@cmd')).toBe("'@cmd");
    expect(csvCell('hola, "mundo"')).toBe('"hola, ""mundo"""');
    expect(csvCell('línea 1\nlínea 2')).toBe('"línea 1\nlínea 2"');
    expect(csvCell(null)).toBe('');
    expect(csvCell(89)).toBe('89');
  });

  it('arma encabezado + una fila por respuesta', () => {
    const csv = feedbackToCsv(feedbackRows);
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('verification_id,creado,actualizado,veredicto,confianza,ciudad,tipo_alojamiento,te_sirvio,que_hizo,comentario');
    expect(lines[1]).toContain('VER-1,2026-10-28T10:00:00Z');
    expect(lines[1]).toContain('paid_scam,Era una estafa');
  });
});

describe('AdminView — sesión', () => {
  it('cierra la sesión al desmontarse el panel', async () => {
    const repo = fakeRepo();
    const { unmount } = render(<AdminView repository={repo} onExit={vi.fn()} />);
    unmount();
    await waitFor(() => expect(repo.signOut).toHaveBeenCalled());
  });
});
