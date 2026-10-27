import React, { useMemo, useState } from 'react';
import { ReportFraudListingUseCase } from './application/ReportFraudListingUseCase';
import { RunExperimentBenchmarkUseCase } from './application/RunExperimentBenchmarkUseCase';
import { VerifyListingUseCase } from './application/VerifyListingUseCase';
import {
  FraudDirectoryEntry,
  ListingInput,
  ScreenId,
  VerificationResult,
} from './domain/entities/types';
import { DataQualityValidator } from './domain/services/DataQualityValidator';
import {
  KNOWN_IMAGE_SIGNATURES,
  QUICK_DEMO_SCENARIOS,
  UNIVERSITY_ZONES,
} from './infrastructure/data/datasets';
import { EXPERIMENT_30_REAL_LISTINGS } from './infrastructure/data/experiment30Listings';
import { LocalRepository } from './infrastructure/storage/LocalRepository';
import { Navbar } from './presentation/components/Navbar';
import {
  DirectoryView,
  ExperimentBenchmarkView,
  HistoryView,
} from './presentation/screens/AuxiliaryViews';
import {
  Screen1Home,
  Screen2Instructions,
} from './presentation/screens/Screen1HomeAnd2Instructions';
import {
  Screen3Input,
  Screen4Quality,
} from './presentation/screens/Screen3InputAnd4Quality';
import {
  Screen5Processing,
  Screen6Result,
} from './presentation/screens/Screen5ProcessingAnd6Result';
import {
  Screen7Details,
  Screen8Report,
} from './presentation/screens/Screen7DetailsAnd8Report';

const verifierUseCase = new VerifyListingUseCase();
const qualityValidator = new DataQualityValidator();
const reportFraudUseCase = new ReportFraudListingUseCase();
const benchmarkUseCase = new RunExperimentBenchmarkUseCase();

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] =
    useState<ScreenId>('screen-1-home');

  const [fraudDirectory, setFraudDirectory] = useState<FraudDirectoryEntry[]>(
    () => LocalRepository.getFraudDirectory()
  );

  const [history, setHistory] = useState<VerificationResult[]>(() =>
    LocalRepository.getVerificationHistory()
  );

  const [draftInput, setDraftInput] = useState<ListingInput>(
    () => QUICK_DEMO_SCENARIOS[0].input
  );

  const [activeResult, setActiveResult] = useState<VerificationResult>(
    () => history[0]
  );

  const qualityCheck = useMemo(
    () => qualityValidator.validate(draftInput),
    [draftInput]
  );

  const benchmarkSummary = useMemo(
    () =>
      benchmarkUseCase.execute(EXPERIMENT_30_REAL_LISTINGS, {
        zones: UNIVERSITY_ZONES,
        knownImages: KNOWN_IMAGE_SIGNATURES,
        fraudDirectory,
      }),
    [fraudDirectory]
  );

  const runVerificationAndSave = (inputToVerify: ListingInput) => {
    const computed = verifierUseCase.execute(inputToVerify, {
      zones: UNIVERSITY_ZONES,
      knownImages: KNOWN_IMAGE_SIGNATURES,
      fraudDirectory,
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

  const handleReportFraudFromDetails = (reason: string) => {
    const updatedDir = reportFraudUseCase.execute(
      activeResult.input,
      reason,
      fraudDirectory
    );
    setFraudDirectory(updatedDir);
    LocalRepository.saveFraudDirectory(updatedDir);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        historyCount={history.length}
        directoryCount={fraudDirectory.length}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
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
          />
        )}

        {currentScreen === 'screen-4-quality' && (
          <Screen4Quality
            quality={qualityCheck}
            onEditInput={() => setCurrentScreen('screen-3-input')}
            onContinueToProcessing={() => {
              runVerificationAndSave(draftInput);
              setCurrentScreen('screen-5-processing');
            }}
          />
        )}

        {currentScreen === 'screen-5-processing' && (
          <Screen5Processing
            onComplete={() => setCurrentScreen('screen-6-result')}
          />
        )}

        {currentScreen === 'screen-6-result' && (
          <Screen6Result
            result={activeResult}
            onViewDetails={() => setCurrentScreen('screen-7-details')}
            onViewReport={() => setCurrentScreen('screen-8-report')}
            onNewVerification={() => setCurrentScreen('screen-3-input')}
          />
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
          <DirectoryView directory={fraudDirectory} />
        )}

        {currentScreen === 'view-experiment' && (
          <ExperimentBenchmarkView
            benchmark={benchmarkSummary}
            onInspectCase={(caseResult) => {
              setActiveResult(caseResult);
              setCurrentScreen('screen-6-result');
            }}
          />
        )}
      </main>

      <footer className="no-print border-t border-slate-200 bg-white py-5 text-xs text-slate-500">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4">
          <span>
            <strong>CuartoSeguro</strong> · UADE — Tecnología e Innovación /
            Tendencias Tecnológicas · Grupo 12 (Fernández, Lecuenis, Ruschanoff)
          </span>
          <span>
            Motor de Verificación Preventiva (Data Mining + BI + Directorio CBU)
          </span>
        </div>
      </footer>
    </div>
  );
};
