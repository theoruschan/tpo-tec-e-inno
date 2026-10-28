// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VerifyListingUseCase } from '../src/application/VerifyListingUseCase';
import {
  PilotFeedbackRepository,
  PilotFeedbackSubmission,
} from '../src/domain/ports/PilotFeedbackRepository';
import {
  INITIAL_FRAUD_DIRECTORY,
  KNOWN_IMAGE_SIGNATURES,
  QUICK_DEMO_SCENARIOS,
  UNIVERSITY_ZONES,
} from '../src/infrastructure/data/datasets';
import { FeedbackCard } from '../src/presentation/components/FeedbackCard';
import { PilotBanner } from '../src/presentation/components/PilotBanner';
import { PilotInfoView } from '../src/presentation/screens/PilotInfoView';
import { Screen6Result } from '../src/presentation/screens/Screen5ProcessingAnd6Result';

afterEach(cleanup);

const result = new VerifyListingUseCase().execute(
  { ...QUICK_DEMO_SCENARIOS[0].input, id: 'VER-UI-1', propertyType: 'studio' },
  { zones: UNIVERSITY_ZONES, knownImages: KNOWN_IMAGE_SIGNATURES, fraudDirectory: INITIAL_FRAUD_DIRECTORY }
);

function repo(submit: (f: PilotFeedbackSubmission) => Promise<void>, enabled = true): PilotFeedbackRepository {
  return { enabled, submit };
}

describe('PilotBanner', () => {
  it('avisa que es un piloto, que no es una garantía y que no reemplaza ver la propiedad', async () => {
    const onOpen = vi.fn();
    render(<PilotBanner onOpenInfo={onOpen} />);
    expect(screen.getByRole('complementary', { name: 'Aviso de versión piloto' }).textContent).toContain('Versión piloto');
    expect(screen.getByRole('complementary', { name: 'Aviso de versión piloto' }).textContent).toContain('no significa que el anuncio sea seguro');
    expect(screen.getByRole('complementary', { name: 'Aviso de versión piloto' }).textContent).toContain('No reemplaza ver la propiedad en persona');
    await userEvent.click(screen.getByRole('button', { name: 'Condiciones del piloto' }));
    expect(onOpen).toHaveBeenCalledOnce();
  });
});

describe('PilotInfoView', () => {
  it('explica qué datos se guardan y los límites, y permite empezar', async () => {
    const onStart = vi.fn();
    render(<PilotInfoView onStart={onStart} />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('no son términos legales definitivos');
    expect(text).toContain('no una probabilidad');
    expect(text).toContain('no se suben');
    expect(text).toContain('Vercel y Supabase');
    await userEvent.click(screen.getByRole('button', { name: 'Entendido, empezar' }));
    expect(onStart).toHaveBeenCalledOnce();
  });
});

describe('FeedbackCard', () => {
  it('el botón está deshabilitado hasta elegir si te sirvió', async () => {
    render(<FeedbackCard result={result} repository={repo(async () => {})} />);
    const send = screen.getByRole('button', { name: 'Enviar opinión' });
    expect((send as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(screen.getByRole('radio', { name: 'Más o menos' }));
    expect((send as HTMLButtonElement).disabled).toBe(false);
  });

  it('envía el resultado, la opinión, qué hizo y el comentario; después permite cambiarla', async () => {
    const submit = vi.fn(async () => {});
    render(<FeedbackCard result={result} repository={repo(submit)} />);

    await userEvent.click(screen.getByRole('radio', { name: 'No' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Pagué y era una estafa' }));
    await userEvent.type(screen.getByLabelText(/Comentario/), 'Me dijeron que era seguro');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar opinión' }));

    expect(submit).toHaveBeenCalledWith({
      verificationId: 'VER-UI-1',
      verdict: 'Anuncio sospechoso',
      confidence: result.confidenceLevel,
      city: 'CABA',
      propertyType: 'studio',
      useful: 'no',
      outcome: 'paid_scam',
      comment: 'Me dijeron que era seguro',
    });
    expect(await screen.findByRole('status')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('Gracias');

    await userEvent.click(screen.getByRole('button', { name: 'Cambiar mi respuesta' }));
    expect(screen.getByRole('button', { name: 'Enviar opinión' })).toBeTruthy();
    expect((screen.getByRole('radio', { name: 'No' }) as HTMLInputElement).checked).toBe(true);
  });

  it('si falla el envío avisa con role=alert y deja reintentar sin perder lo escrito', async () => {
    const submit = vi.fn().mockRejectedValueOnce(new Error('sin red')).mockResolvedValueOnce(undefined);
    render(<FeedbackCard result={result} repository={repo(submit)} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Sí' }));
    await userEvent.type(screen.getByLabelText(/Comentario/), 'texto');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar opinión' }));

    expect((await screen.findByRole('alert')).textContent).toContain('No pudimos enviar');
    expect((screen.getByLabelText(/Comentario/) as HTMLTextAreaElement).value).toBe('texto');

    await userEvent.click(screen.getByRole('button', { name: 'Enviar opinión' }));
    expect(await screen.findByRole('status')).toBeTruthy();
    expect(submit).toHaveBeenCalledTimes(2);
  });

  it('el comentario tiene un tope de 500 caracteres y avisa que no se pongan datos personales', () => {
    render(<FeedbackCard result={result} repository={repo(async () => {})} />);
    expect((screen.getByLabelText(/Comentario/) as HTMLTextAreaElement).maxLength).toBe(500);
    expect(document.body.textContent).toContain('No pongas nombres, teléfonos, CBU ni datos personales');
  });
});

describe('Screen6Result con feedback del piloto', () => {
  const props = { result, onViewDetails: vi.fn(), onViewReport: vi.fn(), onNewVerification: vi.fn() };

  it('muestra el formulario cuando el repositorio está habilitado', () => {
    render(<Screen6Result {...props} feedbackRepository={repo(async () => {})} />);
    expect(screen.getByText('Piloto: ¿te sirvió este resultado?')).toBeTruthy();
  });

  it('no muestra nada si está deshabilitado (sin Supabase) o no se pasa', () => {
    const { rerender } = render(<Screen6Result {...props} feedbackRepository={repo(async () => {}, false)} />);
    expect(screen.queryByText('Piloto: ¿te sirvió este resultado?')).toBeNull();
    rerender(<Screen6Result {...props} />);
    expect(screen.queryByText('Piloto: ¿te sirvió este resultado?')).toBeNull();
  });
});
