import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { ParseExperimentDatasetUseCase } from './application/ParseExperimentDatasetUseCase';
import { RunExperimentBenchmarkUseCase } from './application/RunExperimentBenchmarkUseCase';
import { VerifyListingUseCase } from './application/VerifyListingUseCase';
import { DirectorySourceKind } from './domain/ports/FraudDirectoryRepository';
import {
  ExperimentSampleCase,
  FraudDirectoryEntry,
  ListingInput,
  ScreenId,
  VerificationResult,
} from './domain/entities/types';
import { DataQualityValidator } from './domain/services/DataQualityValidator';
import {
  createFraudDirectoryRepository,
  createPhotoSightingRepository,
} from './infrastructure/createFraudDirectoryRepository';
import {
  EMPTY_LISTING_INPUT,
  INITIAL_FRAUD_DIRECTORY,
  KNOWN_IMAGE_SIGNATURES,
  QUICK_DEMO_SCENARIOS,
  UNIVERSITY_ZONES,
} from './infrastructure/data/datasets';
import { EXPERIMENT_30_REAL_LISTINGS } from './infrastructure/data/experiment30Listings';
import { MARKET_PRICES } from './infrastructure/data/marketPrices';
import { BrowserImageHasher } from './infrastructure/image/BrowserImageHasher';
import { TesseractImageTextReader } from './infrastructure/ocr/TesseractImageTextReader';
import { JsPdfReportExporter } from './infrastructure/report/JsPdfReportExporter';
import { LocalRepository } from './infrastructure/storage/LocalRepository';
import { createPilotFeedbackRepository } from './infrastructure/createPilotRepositories';
import { Navbar } from './presentation/components/Navbar';
import { PilotBanner } from './presentation/components/PilotBanner';
import {
  Screen1Home,
  Screen2Instructions,
} from './presentation/screens/Screen1HomeAnd2Instructions';

// Pantallas 1-2 van en el bundle inicial; el resto se descarga al navegar (un chunk por archivo).
const loadAuxiliary = () => import('./presentation/screens/AuxiliaryViews');
const loadInputAndQuality = () => import('./presentation/screens/Screen3InputAnd4Quality');
const loadProcessingAndResult = () => import('./presentation/screens/Screen5ProcessingAnd6Result');
const loadDetailsAndReport = () => import('./presentation/screens/Screen7DetailsAnd8Report');

const PilotInfoView = lazy(() =>
  import('./presentation/screens/PilotInfoView').then((m) => ({ default: m.PilotInfoView }))
);
const HistoryView = lazy(() => loadAuxiliary().then((m) => ({ default: m.HistoryView })));
const DirectoryView = lazy(() => loadAuxiliary().then((m) => ({ default: m.DirectoryView })));
const ExperimentBenchmarkView = lazy(() =>
  loadAuxiliary().then((m) => ({ default: m.ExperimentBenchmarkView }))
);
const Screen3Input = lazy(() => loadInputAndQuality().then((m) => ({ default: m.Screen3Input })));
const Screen4Quality = lazy(() => loadInputAndQuality().then((m) => ({ default: m.Screen4Quality })));
const Screen5Processing = lazy(() =>
  loadProcessingAndResult().then((m) => ({ default: m.Screen5Processing }))
);
const Screen6Result = lazy(() =>
  loadProcessingAndResult().then((m) => ({ default: m.Screen6Result }))
);
const Screen7Details = lazy(() =>
  loadDetailsAndReport().then((m) => ({ default: m.Screen7Details }))
);
const Screen8Report = lazy(() =>
  loadDetailsAndReport().then((m) => ({ default: m.Screen8Report }))
);

const ScreenFallback: React.FC = () => (
  <p role="status" className="py-16 text-center text-sm text-slate-600">
    Cargando…
  </p>
);

const verifierUseCase = new VerifyListingUseCase();
const qualityValidator = new DataQualityValidator();
const fraudRepository = createFraudDirectoryRepository(import.meta.env);
const photoSightingRepository = createPhotoSightingRepository(import.meta.env);
const pilotFeedbackRepository = createPilotFeedbackRepository(import.meta.env);
const benchmarkUseCase = new RunExperimentBenchmarkUseCase();
const imageHasher = new BrowserImageHasher();
const pdfExporter = new JsPdfReportExporter();
const textReader = new TesseractImageTextReader();
const datasetParser = new ParseExperimentDatasetUseCase(UNIVERSITY_ZONES.map((z) => z.id));
const CURATED_DATASET_NAME = 'Dataset curado del TP (30 casos ilustrativos)';

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] =
    useState<ScreenId>('screen-1-home');

  const [fraudDirectory, setFraudDirectory] = useState<FraudDirectoryEntry[]>(
    () => LocalRepository.getFraudDirectory()
  );
  const [directoryKind, setDirectoryKind] = useState<DirectorySourceKind>(
    fraudRepository.kind
  );

  const refreshDirectory = async () => {
    const entries = await fraudRepository.listActiveEntries();
    setFraudDirectory(entries);
    setDirectoryKind(fraudRepository.kind);
  };

  useEffect(() => {
    void refreshDirectory();
  }, []);

  // La verificación es asíncrona (hash del CBU/teléfono en el servidor); la Pantalla 5
  // espera esta promesa antes de mostrar el veredicto.
  const pendingVerification = useRef<Promise<VerificationResult> | null>(null);

  const [history, setHistory] = useState<VerificationResult[]>(() =>
    LocalRepository.getVerificationHistory()
  );

  const [draftInput, setDraftInput] = useState<ListingInput>(() => ({
    ...EMPTY_LISTING_INPUT,
  }));

  const [activeResult, setActiveResult] = useState<VerificationResult>(
    () => history[0]
  );

  const qualityCheck = useMemo(
    () => qualityValidator.validate(draftInput),
    [draftInput]
  );

  const [customDataset, setCustomDataset] = useState<{
    name: string;
    samples: ExperimentSampleCase[];
  } | null>(null);
  const [datasetErrors, setDatasetErrors] = useState<string[]>([]);

  // El experimento corre siempre contra el directorio semilla fijo para que sea reproducible
  // (no cambia porque alguien reporte algo nuevo en el directorio compartido).
  // Se calcula solo al abrir el laboratorio: no frena la carga inicial.
  const isLabOpen = currentScreen === 'view-experiment';
  const benchmarkSummary = useMemo(
    () =>
      isLabOpen &&
      benchmarkUseCase.executeWithSplit(
        customDataset?.samples ?? EXPERIMENT_30_REAL_LISTINGS,
        {
          zones: UNIVERSITY_ZONES,
          knownImages: KNOWN_IMAGE_SIGNATURES,
          fraudDirectory: INITIAL_FRAUD_DIRECTORY,
          marketPrices: MARKET_PRICES,
        }
      ),
    [customDataset, isLabOpen]
  );

  const handleLoadDataset = async (file: File) => {
    const parsed = datasetParser.execute(await file.text(), file.name);
    setDatasetErrors(parsed.errors);
    if (parsed.samples.length > 0) {
      setCustomDataset({ name: file.name, samples: parsed.samples });
    }
  };

  const runVerificationAndSave = async (inputToVerify: ListingInput) => {
    const zone = UNIVERSITY_ZONES.find((z) => z.id === inputToVerify.zoneId);
    const [inputIdentifierHashes, photoSightings] = await Promise.all([
      fraudRepository.hashIdentifiers(inputToVerify.cbuOrAlias, inputToVerify.ownerPhone),
      // Solo con foto subida y autorización: se registra la huella (no la imagen).
      inputToVerify.uploadedImageDHash && inputToVerify.authorizedProcessing && zone
        ? photoSightingRepository.matchAndRegister({
            dHash: inputToVerify.uploadedImageDHash,
            city: zone.city,
            monthlyRentArs: inputToVerify.monthlyRentArs,
            cbuOrAlias: inputToVerify.cbuOrAlias,
            ownerPhone: inputToVerify.ownerPhone,
          })
        : Promise.resolve([]),
    ]);
    const computed = verifierUseCase.execute(inputToVerify, {
      zones: UNIVERSITY_ZONES,
      knownImages: KNOWN_IMAGE_SIGNATURES,
      fraudDirectory,
      inputIdentifierHashes,
      photoSightings,
      marketPrices: MARKET_PRICES,
    });
    setActiveResult(computed);
    const updatedHistory = [
      computed,
      ...history.filter(
        (h) =>
          h.input.listingUrlOrCapture !==
          inputToVerify.listingUrlOrCapture
      ),
    ];
    setHistory(updatedHistory);
    LocalRepository.saveVerificationHistory(updatedHistory);
    return computed;
  };

  const handleLoadQuickScenario = (
    scenarioInput: ListingInput,
    goDirectToQuality = false
  ) => {
    setDraftInput({ ...scenarioInput });
    if (goDirectToQuality) {
      setCurrentScreen('screen-4-quality');
    } else {
      setCurrentScreen('screen-3-input');
    }
  };

  const handleReportFraudFromDetails = async (reason: string) => {
    const zone = UNIVERSITY_ZONES.find((z) => z.id === activeResult.input.zoneId);
    const outcome = await fraudRepository.submitReport({
      cbuOrAlias: activeResult.input.cbuOrAlias,
      ownerPhone: activeResult.input.ownerPhone,
      ownerName: activeResult.input.ownerName,
      listingUrlOrCapture: activeResult.input.listingUrlOrCapture,
      city: zone?.city ?? 'CABA',
      reason,
    });
    await refreshDirectory();
    return outcome.message;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        historyCount={history.length}
        directoryCount={fraudDirectory.length}
      />

      <PilotBanner onOpenInfo={() => setCurrentScreen('view-pilot')} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Suspense fallback={<ScreenFallback />}>
        {currentScreen === 'screen-1-home' && (
          <Screen1Home
            onNavigate={setCurrentScreen}
            onLoadQuickScenario={handleLoadQuickScenario}
            historyCount={history.length}
          />
        )}

        {currentScreen === 'screen-2-instructions' && (
          <Screen2Instructions
            onBack={() => setCurrentScreen('screen-1-home')}
            onUnderstand={() => setCurrentScreen('screen-3-input')}
            onSeeExample={() => {
              setDraftInput({ ...QUICK_DEMO_SCENARIOS[0].input });
              setCurrentScreen('screen-3-input');
            }}
          />
        )}

        {currentScreen === 'screen-3-input' && (
          <Screen3Input
            input={draftInput}
            onChange={setDraftInput}
            onBack={() => setCurrentScreen('screen-2-instructions')}
            onSubmitToQualityGate={() => setCurrentScreen('screen-4-quality')}
            imageHasher={imageHasher}
            textReader={textReader}
          />
        )}

        {currentScreen === 'screen-4-quality' && (
          <Screen4Quality
            quality={qualityCheck}
            onEditInput={() => setCurrentScreen('screen-3-input')}
            onContinueToProcessing={() => {
              pendingVerification.current = runVerificationAndSave(draftInput);
              setCurrentScreen('screen-5-processing');
            }}
          />
        )}

        {currentScreen === 'screen-5-processing' && (
          <Screen5Processing
            onComplete={async () => {
              await pendingVerification.current;
              setCurrentScreen('screen-6-result');
            }}
          />
        )}

        {currentScreen === 'screen-6-result' && (
          <Screen6Result
            result={activeResult}
            onViewDetails={() => setCurrentScreen('screen-7-details')}
            onViewReport={() => setCurrentScreen('screen-8-report')}
            onNewVerification={() => setCurrentScreen('screen-3-input')}
            feedbackRepository={pilotFeedbackRepository}
          />
        )}

        {currentScreen === 'view-pilot' && (
          <PilotInfoView onStart={() => setCurrentScreen('screen-2-instructions')} />
        )}

        {currentScreen === 'screen-7-details' && (
          <Screen7Details
            result={activeResult}
            onReportFraud={handleReportFraudFromDetails}
            onRequestSecondVerification={() => {
              setDraftInput({ ...activeResult.input });
              setCurrentScreen('screen-3-input');
            }}
            onGoToReport={() => setCurrentScreen('screen-8-report')}
            onBackToVerdict={() => setCurrentScreen('screen-6-result')}
          />
        )}

        {currentScreen === 'screen-8-report' && (
          <Screen8Report
            result={activeResult}
            onBackToDetails={() => setCurrentScreen('screen-7-details')}
            pdfExporter={pdfExporter}
          />
        )}

        {currentScreen === 'view-history' && (
          <HistoryView
            history={history}
            onSelectResult={(selected) => {
              setActiveResult(selected);
              setCurrentScreen('screen-6-result');
            }}
            onStartNew={() => setCurrentScreen('screen-2-instructions')}
          />
        )}

        {currentScreen === 'view-directory' && (
          <DirectoryView directory={fraudDirectory} sourceKind={directoryKind} />
        )}

        {currentScreen === 'view-experiment' && benchmarkSummary && (
          <ExperimentBenchmarkView
            benchmark={benchmarkSummary}
            datasetName={customDataset?.name ?? CURATED_DATASET_NAME}
            isCustomDataset={customDataset !== null}
            datasetErrors={datasetErrors}
            onLoadDataset={(file) => void handleLoadDataset(file)}
            onResetDataset={() => {
              setCustomDataset(null);
              setDatasetErrors([]);
            }}
            onInspectCase={(caseResult) => {
              setActiveResult(caseResult);
              setCurrentScreen('screen-6-result');
            }}
          />
        )}
        </Suspense>
      </main>

      <footer className="no-print border-t border-slate-200 bg-white py-5 text-xs text-slate-500">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4">
          <span>
            <strong>CuartoSeguro</strong> · UADE — Tecnología e Innovación /
            Tendencias Tecnológicas · Grupo 12 (Fernández, Lecuenis, Ruschanoff)
          </span>
          <span>
            Motor de Verificación Preventiva (Data Mining + BI + Directorio CBU) ·{' '}
            <button
              type="button"
              onClick={() => setCurrentScreen('view-pilot')}
              className="font-semibold underline underline-offset-2"
            >
              Condiciones del piloto
            </button>
          </span>
        </div>
      </footer>
    </div>
  );
};
