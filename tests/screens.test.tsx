// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VerifyListingUseCase } from '../src/application/VerifyListingUseCase';
import { DataQualityValidator, MISSING_CONTACT_BLOCKING_MESSAGE } from '../src/domain/services/DataQualityValidator';
import {
  INITIAL_FRAUD_DIRECTORY,
  KNOWN_IMAGE_SIGNATURES,
  QUICK_DEMO_SCENARIOS,
  UNIVERSITY_ZONES,
} from '../src/infrastructure/data/datasets';
import { Screen4Quality } from '../src/presentation/screens/Screen3InputAnd4Quality';
import { Screen5Processing, Screen6Result } from '../src/presentation/screens/Screen5ProcessingAnd6Result';

afterEach(cleanup);

const validator = new DataQualityValidator();
const verifier = new VerifyListingUseCase();
const deps = {
  zones: UNIVERSITY_ZONES,
  knownImages: KNOWN_IMAGE_SIGNATURES,
  fraudDirectory: INITIAL_FRAUD_DIRECTORY,
};

describe('Pantalla 4 — Control de calidad de los datos', () => {
  it('con datos completos muestra los tres chequeos en verde y deja continuar', async () => {
    const onContinue = vi.fn();
    render(
      <Screen4Quality
        quality={validator.validate(QUICK_DEMO_SCENARIOS[0].input)}
        onEditInput={vi.fn()}
        onContinueToProcessing={onContinue}
      />
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Revisando lo que enviaste.' })).toBeTruthy();
    expect(screen.getByText('Legible')).toBeTruthy();
    expect(screen.getByText('Disponibles')).toBeTruthy();
    expect(screen.getByText('Suficientes para comparar')).toBeTruthy();
    expect(screen.queryByText(`"${MISSING_CONTACT_BLOCKING_MESSAGE}"`)).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: /Iniciar verificación automática/ }));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('sin contacto muestra el mensaje EXACTO del prototipo y ofrece editar o resultado parcial', async () => {
    const onEdit = vi.fn();
    const onContinue = vi.fn();
    render(
      <Screen4Quality
        quality={validator.validate(QUICK_DEMO_SCENARIOS[3].input)}
        onEditInput={onEdit}
        onContinueToProcessing={onContinue}
      />
    );

    expect(screen.getByText('Faltantes')).toBeTruthy();
    expect(screen.getByText(`"${MISSING_CONTACT_BLOCKING_MESSAGE}"`)).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: /Completar o corregir datos/ }));
    expect(onEdit).toHaveBeenCalledOnce();

    await userEvent.click(screen.getByRole('button', { name: /Ver resultado parcial/ }));
    expect(onContinue).toHaveBeenCalledOnce();
  });
});

describe('Pantalla 6 — Resultado', () => {
  it('caso prototipo: veredicto, confianza, motivo principal exacto y recomendación', async () => {
    const result = verifier.execute(QUICK_DEMO_SCENARIOS[0].input, deps);
    const onViewDetails = vi.fn();
    const onViewReport = vi.fn();
    render(
      <Screen6Result
        result={result}
        onViewDetails={onViewDetails}
        onViewReport={onViewReport}
        onNewVerification={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Veredicto de la verificación.' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Anuncio sospechoso' })).toBeTruthy();
    expect(screen.getByText(`${result.confidenceLevel}%`)).toBeTruthy();
    expect(screen.getByText('Esta foto aparece en otro anuncio con un precio distinto')).toBeTruthy();
    expect(screen.getByText('No transferir')).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'Ver detalles' }));
    expect(onViewDetails).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: /reporte descargable/ }));
    expect(onViewReport).toHaveBeenCalledOnce();
  });

  it('caso legítimo: veredicto Verificado con su recomendación', () => {
    const result = verifier.execute(QUICK_DEMO_SCENARIOS[2].input, deps);
    const { container } = render(
      <Screen6Result result={result} onViewDetails={vi.fn()} onViewReport={vi.fn()} onNewVerification={vi.fn()} />
    );
    const main = within(container);
    expect(main.getByRole('heading', { name: 'Verificado' })).toBeTruthy();
    expect(main.getByText('Transferir (con recaudos habituales)')).toBeTruthy();
  });

  it('sin datos: muestra "Sin datos suficientes" y pide más información', () => {
    const result = verifier.execute(QUICK_DEMO_SCENARIOS[3].input, deps);
    render(
      <Screen6Result result={result} onViewDetails={vi.fn()} onViewReport={vi.fn()} onNewVerification={vi.fn()} />
    );
    expect(screen.getByRole('heading', { name: 'Sin datos suficientes' })).toBeTruthy();
    expect(screen.getByText('Pedir más información')).toBeTruthy();
    expect(screen.getByText(MISSING_CONTACT_BLOCKING_MESSAGE)).toBeTruthy();
  });
});

describe('Pantalla 5 — Procesamiento', () => {
  it('anuncia solo el paso actual por aria-live y termina una vez aunque el padre re-renderice', () => {
    vi.useFakeTimers();
    try {
      const first = vi.fn();
      const second = vi.fn();
      const { rerender } = render(<Screen5Processing onComplete={first} />);

      const status = screen.getByRole('status');
      expect(status.getAttribute('aria-live')).toBe('polite');
      expect(status.textContent).toBe('Paso 1 de 3: comparando fotos con otros anuncios.');

      act(() => {
        vi.advanceTimersByTime(700);
      });
      expect(status.textContent).toBe('Paso 2 de 3: revisando el precio contra el promedio de la zona.');

      // App pasa una función nueva en cada render: no debe reiniciar los timers.
      rerender(<Screen5Processing onComplete={second} />);
      act(() => {
        vi.advanceTimersByTime(1300);
      });
      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });
});
