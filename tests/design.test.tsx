// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QUICK_DEMO_SCENARIOS } from '../src/infrastructure/data/datasets';
import { Navbar } from '../src/presentation/components/Navbar';
import { VerdictStamp } from '../src/presentation/components/VerdictStamp';
import { AboutView } from '../src/presentation/screens/AboutView';
import { VerifyListingUseCase } from '../src/application/VerifyListingUseCase';
import { INITIAL_FRAUD_DIRECTORY, KNOWN_IMAGE_SIGNATURES, UNIVERSITY_ZONES } from '../src/infrastructure/data/datasets';
import { Screen1Home } from '../src/presentation/screens/Screen1HomeAnd2Instructions';
import { Screen3Input } from '../src/presentation/screens/Screen3InputAnd4Quality';
import { Screen7Details, Screen8Report } from '../src/presentation/screens/Screen7DetailsAnd8Report';

afterEach(cleanup);

function home() {
  const onNavigate = vi.fn();
  const onLoadQuickScenario = vi.fn();
  render(<Screen1Home onNavigate={onNavigate} onLoadQuickScenario={onLoadQuickScenario} historyCount={2} />);
  return { onNavigate, onLoadQuickScenario };
}

describe('Portada (Pantalla 1)', () => {
  it('conserva los textos exactos del prototipo del PDF 3', async () => {
    const { onNavigate } = home();
    expect(screen.getByRole('heading', { level: 1, name: 'Verificá un alquiler antes de pagar.' })).toBeTruthy();
    expect(screen.getByText(/Gratis para estudiantes/)).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'Nueva verificación' }));
    expect(onNavigate).toHaveBeenCalledWith('screen-2-instructions');
    await userEvent.click(screen.getByRole('button', { name: 'Ver verificaciones anteriores (2)' }));
    expect(onNavigate).toHaveBeenCalledWith('view-history');
  });

  it('habla de la situación del estudiante y ya no muestra la matriz de puntajes del TP', () => {
    home();
    expect(document.body.textContent).toContain('Te piden una seña por transferencia');
    expect(document.body.textContent).not.toMatch(/\/20 pts/);
    for (const title of ['La foto', 'El precio', 'Quién cobra']) {
      expect(screen.getByRole('heading', { level: 3, name: title })).toBeTruthy();
    }
  });

  it('aclara que son señales y no una garantía, con acceso a "Sobre el proyecto"', async () => {
    const { onNavigate } = home();
    expect(document.body.textContent).toContain('Son señales, no una garantía');
    await userEvent.click(screen.getByRole('button', { name: 'Sobre el proyecto' }));
    expect(onNavigate).toHaveBeenCalledWith('view-about');
  });

  it('la ficha de ejemplo está rotulada como ejemplo y el sello dice "Anuncio sospechoso"', () => {
    home();
    const sample = screen.getByRole('complementary', { name: 'Ejemplo de resultado' });
    expect(within(sample).getByText('Ejemplo')).toBeTruthy();
    expect(within(sample).getByText('Anuncio sospechoso')).toBeTruthy();
  });

  it('mantiene los casos de ejemplo: "Verificar ahora" va directo a la Pantalla 4 con cada caso', async () => {
    const { onLoadQuickScenario } = home();
    const buttons = screen.getAllByRole('button', { name: /Verificar ahora/ });
    expect(buttons).toHaveLength(QUICK_DEMO_SCENARIOS.length);
    await userEvent.click(buttons[1]);
    expect(onLoadQuickScenario).toHaveBeenCalledWith(QUICK_DEMO_SCENARIOS[1].input, true);
  });
});

describe('Sobre el proyecto', () => {
  it('conserva el contenido del TP: las 3 alternativas con sus puntajes y la salvedad del experimento', () => {
    render(<AboutView onNavigate={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Sobre el proyecto' })).toBeTruthy();
    for (const points of ['17/20 pts', '18/20 pts', '16/20 pts']) {
      expect(document.body.textContent).toContain(points);
    }
    expect(document.body.textContent).toContain('es un dataset curado e ilustrativo');
    expect(document.body.textContent).toContain('Grupo 12');
  });

  it('navega al experimento, a las condiciones y de vuelta al inicio', async () => {
    const onNavigate = vi.fn();
    render(<AboutView onNavigate={onNavigate} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ver el experimento' }));
    await userEvent.click(screen.getByRole('button', { name: 'condiciones' }));
    await userEvent.click(screen.getByRole('button', { name: /Volver al inicio/ }));
    expect(onNavigate.mock.calls.map((c) => c[0])).toEqual(['view-experiment', 'view-pilot', 'screen-1-home']);
  });
});

describe('VerdictStamp', () => {
  it('muestra el veredicto como texto real y cada uno con su color', () => {
    const { rerender, container } = render(<VerdictStamp verdict="Anuncio sospechoso" />);
    expect(screen.getByText('Anuncio sospechoso').className).toContain('text-red-700');
    rerender(<VerdictStamp verdict="Verificado" />);
    expect(screen.getByText('Verificado').className).toContain('text-emerald-700');
    rerender(<VerdictStamp verdict="Sin datos suficientes" />);
    expect(screen.getByText('Sin datos suficientes').className).toContain('text-amber-700');
    expect(container.querySelector('.stamp')).toBeTruthy();
  });

  it('la animación de sellado es opcional', () => {
    const { rerender } = render(<VerdictStamp verdict="Verificado" />);
    expect(screen.getByText('Verificado').className).not.toContain('stamp-in');
    rerender(<VerdictStamp verdict="Verificado" animate />);
    expect(screen.getByText('Verificado').className).toContain('stamp-in');
  });
});

describe('Navbar', () => {
  const props = { onNavigate: vi.fn(), historyCount: 3, directoryCount: 5 };

  it('muestra los accesos con sus contadores y no tiene ningún link al panel admin', () => {
    render(<Navbar currentScreen="screen-1-home" {...props} />);
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' });
    expect(within(nav).getByRole('button', { name: /Anteriores \(3\)/ })).toBeTruthy();
    expect(within(nav).getByRole('button', { name: /Directorio CBU \(5\)/ })).toBeTruthy();
    expect(within(nav).getByRole('button', { name: /Experimento/ })).toBeTruthy();
    expect(within(nav).getByRole('button', { name: 'Nueva verificación' })).toBeTruthy();
    expect(document.body.textContent?.toLowerCase()).not.toContain('admin');
  });

  it('marca el paso actual del flujo de 8 pantallas con aria-current', () => {
    render(<Navbar currentScreen="screen-6-result" {...props} />);
    const flow = screen.getByRole('list', { name: 'Flujo UX (8 Pantallas)' });
    const current = within(flow).getAllByRole('listitem').filter((li) => li.getAttribute('aria-current') === 'step');
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toContain('P6:');
    expect(current[0].textContent).toContain('Veredicto');
  });

  it('fuera del flujo (historial) no muestra la barra de pasos y resalta la sección activa', async () => {
    const onNavigate = vi.fn();
    render(<Navbar currentScreen="view-history" {...props} onNavigate={onNavigate} />);
    expect(screen.queryByRole('list', { name: 'Flujo UX (8 Pantallas)' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Directorio CBU/ }));
    expect(onNavigate).toHaveBeenCalledWith('view-directory');
  });
});

describe('Segunda pasada de diseño: Pantallas 3, 7 y 8', () => {
  const noopHasher = { hash: async () => '0'.repeat(16) } as never;
  const noopReader = { read: async () => '' } as never;
  const deps = {
    zones: UNIVERSITY_ZONES,
    knownImages: KNOWN_IMAGE_SIGNATURES,
    fraudDirectory: INITIAL_FRAUD_DIRECTORY,
  };
  const result = new VerifyListingUseCase().execute(QUICK_DEMO_SCENARIOS[0].input, deps);

  it('Pantalla 3: ficha con las 4 secciones numeradas y el mismo título exacto', () => {
    render(
      <Screen3Input
        input={QUICK_DEMO_SCENARIOS[0].input}
        onChange={vi.fn()}
        onSubmitToQualityGate={vi.fn()}
        onBack={vi.fn()}
        imageHasher={noopHasher}
        textReader={noopReader}
      />
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Pegá el link o la captura.' })).toBeTruthy();
    for (const title of ['El anuncio', 'El alquiler', 'Quién cobra', 'Autorización']) {
      expect(screen.getByRole('heading', { level: 2, name: title })).toBeTruthy();
    }
    expect(screen.getByRole('button', { name: 'Revisar calidad de los datos' })).toBeTruthy();
  });

  it('Pantalla 7: cada motivo va numerado y se conservan las tres acciones', () => {
    render(
      <Screen7Details
        result={result}
        onReportFraud={async () => 'ok'}
        onRequestSecondVerification={vi.fn()}
        onGoToReport={vi.fn()}
        onBackToVerdict={vi.fn()}
      />
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Por qué marcamos este anuncio.' })).toBeTruthy();
    expect(document.body.textContent).toContain('01');
    expect(screen.getByRole('heading', { level: 3, name: result.findings[0].title })).toBeTruthy();
    expect(screen.getByText('Reportar estafa confirmada')).toBeTruthy();
    expect(screen.getByText('Pedir segunda verificación')).toBeTruthy();
    expect(screen.getByText('Contactar soporte humano')).toBeTruthy();
  });

  it('Pantalla 8: certificado con sello del veredicto y el texto del prototipo', () => {
    const { container } = render(
      <Screen8Report result={result} onBackToDetails={vi.fn()} pdfExporter={{ toPdf: async () => new Blob() }} />
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Resumen de la verificación.' })).toBeTruthy();
    expect(container.querySelector('.stamp')?.textContent).toBe(result.verdict);
    expect(screen.getByText(`${result.verdict} (Nivel de confianza: ${result.confidenceLevel}%)`, { exact: false })).toBeTruthy();
    expect(screen.getByText('Certificado Preventivo Estudiantil')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Descargar PDF' })).toBeTruthy();
  });
});
