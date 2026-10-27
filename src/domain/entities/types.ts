/**
 * Capa de Dominio — Entidades y Tipos Centrales de CuartoSeguro
 * Trazabilidad directa con los 3 entregables del Grupo 12 (Fernández, Lecuenis, Ruschanoff)
 */

export type ScreenId =
  | 'screen-1-home'
  | 'screen-2-instructions'
  | 'screen-3-input'
  | 'screen-4-quality'
  | 'screen-5-processing'
  | 'screen-6-result'
  | 'screen-7-details'
  | 'screen-8-report'
  | 'view-history'
  | 'view-directory'
  | 'view-experiment';

export type VerdictType = 'Anuncio sospechoso' | 'Verificado' | 'Sin datos suficientes';

export type RecommendationType =
  | 'No transferir'
  | 'Transferir (con recaudos habituales)'
  | 'Pedir más información';

export type AlertSeverity = 'critical' | 'warning' | 'info' | 'positive';

export type VerificationCategory =
  | 'image_mining'
  | 'zone_price_bi'
  | 'identity_registry'
  | 'cbu_directory'
  | 'cross_reports'
  | 'data_quality';

export interface ZoneBenchmark {
  id: string;
  city: 'CABA' | 'Córdoba' | 'La Plata' | 'Rosario';
  neighborhood: string;
  universityHub: string;
  averageRentArs: number;
  stdDevRentArs: number;
  minReasonableArs: number;
  maxReasonableArs: number;
  typicalDepositRatio: number; // Ej: 0.30 (30% del mes)
  publicRegistryQuality: 'Alta' | 'Media' | 'Baja';
}

export interface KnownImageSignature {
  imageHash: string;
  /** dHash de 64 bits (16 hex) de la foto original, para comparar por distancia de Hamming. */
  perceptualHash?: string;
  title: string;
  originalSource: string;
  originalCity: string;
  originalPriceArs: number;
  thumbnailUrl: string;
  isStolenOrReusedPattern: boolean;
  notes: string;
}

export interface FraudDirectoryEntry {
  id: string;
  cbuOrAlias: string;
  normalizedAliasOrCbu: string;
  reportedHolderName: string;
  phoneContact?: string;
  listingUrlPattern?: string;
  city: string;
  reportsCount: number;
  lastReportedAt: string;
  reason: string;
  source: 'Comunidad estudiantil' | 'Centro de Estudiantes' | 'Verificación usuario';
  /** Directorio compartido: HMAC-SHA256 con sal secreta del CBU/alias normalizado. */
  identifierHash?: string;
  /** Directorio compartido: HMAC-SHA256 con sal secreta de los últimos 8 dígitos del teléfono. */
  phoneHash?: string;
}

export interface ListingInput {
  id?: string;
  listingUrlOrCapture: string;
  hasCaptureUploaded?: boolean;
  captureFileName?: string;
  zoneId: string;
  monthlyRentArs: number;
  depositRequestedArs: number;
  ownerName: string;
  ownerPhone: string;
  cbuOrAlias: string;
  accountAgeMonths: number;
  photoCount: number;
  /** Selección manual de una firma conocida (panel avanzado/demo). */
  imageSignatureHash: string;
  /** dHash calculado automáticamente a partir de la foto/captura subida. */
  uploadedImageDHash?: string;
  requestsAdvanceBeforeVisit: boolean;
  isRegisteredRealEstate: boolean;
  realEstateLicense?: string;
  authorizedProcessing: boolean;
}

export interface DataQualityCheckResult {
  isLinkOrCaptureValid: boolean;
  hasContactInfo: boolean;
  hasSufficientPhotos: boolean;
  canProceedAutomatically: boolean;
  blockingMessage: string | null;
  warnings: string[];
  completenessScore: number; // 0 a 100
}

export interface VerificationFinding {
  id: string;
  category: VerificationCategory;
  severity: AlertSeverity;
  title: string;
  description: string;
  riskPoints: number;
  evidenceDetail?: string;
}

export interface ZonePriceComparison {
  zone: ZoneBenchmark;
  publishedRentArs: number;
  depositRequestedArs: number;
  deviationPercent: number; // Ej: -46.5%
  zScore: number;
  depositToRentRatioPercent: number;
  isTooGoodToBeTrue: boolean;
  isModeratelyLow: boolean;
  isExcessiveDeposit: boolean;
}

export interface VerificationResult {
  id: string;
  createdAt: string;
  input: ListingInput;
  qualityCheck: DataQualityCheckResult;
  verdict: VerdictType;
  confidenceLevel: number; // 0 a 100 (ej. 82%)
  riskScore: number; // 0 a 100
  primaryReason: string;
  recommendation: RecommendationType;
  findings: VerificationFinding[];
  priceComparison: ZonePriceComparison;
  matchedDuplicateImage?: KnownImageSignature;
  matchedFraudDirectoryEntries: FraudDirectoryEntry[];
}

export type GroundTruthLabel = 'FRAUD' | 'LEGITIMATE' | 'INSUFFICIENT_DATA';

export interface ExperimentSampleCase {
  caseNumber: number;
  title: string;
  platform: 'Facebook Marketplace' | 'Zonaprop' | 'Argenprop' | 'Grupo Facultad WhatsApp' | 'Instagram / Clasificados';
  groundTruth: GroundTruthLabel;
  whatActuallyHappened: string;
  input: ListingInput;
}

export interface ExperimentCaseEvaluation {
  sample: ExperimentSampleCase;
  result: VerificationResult;
  expectedVerdict: VerdictType;
  isCorrectlyClassified: boolean;
}

export interface ExperimentBenchmarkSummary {
  totalCases: number;
  totalActualFrauds: number;
  detectedFraudsTruePositives: number;
  missedFraudsFalseNegatives: number;
  falseAlarmsFalsePositives: number;
  verifiedLegitimateTrueNegatives: number;
  insufficientDataDetected: number;
  fraudDetectionRecallPercent: number; // Métrica clave del Mapa Tecnológico: % de anuncios truchos detectados
  precisionPercent: number;
  overallAccuracyPercent: number;
  byCityBreakdown: {
    city: string;
    publicRegistryQuality: string;
    total: number;
    correct: number;
    accuracyPercent: number;
  }[];
  evaluations: ExperimentCaseEvaluation[];
}
