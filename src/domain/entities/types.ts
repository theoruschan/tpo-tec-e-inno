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

/** Tipo de alojamiento: define contra qué precio de referencia se compara. */
export type PropertyType = 'room' | 'studio' | 'two_rooms';

export interface PriceSource {
  /** market-index: índice publicado · team-estimate: estimación propia · unavailable: no hay dato. */
  kind: 'market-index' | 'team-estimate' | 'unavailable';
  label: string;
  url?: string;
  /** Advertencia, por ejemplo si el dato es viejo. */
  note?: string;
}

export interface MarketPriceSource {
  id: string;
  city: string;
  label: string;
  /** Mes del reporte, formato YYYY-MM. */
  period: string;
  url: string;
  prices: Partial<Record<Exclude<PropertyType, 'room'>, number>>;
}

export interface MarketPriceData {
  updatedAt: string;
  sources: MarketPriceSource[];
}

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
  /** De dónde sale averageRentArs. Sin valor = dato del dataset semilla. */
  priceSource?: PriceSource;
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

/**
 * Otra verificación de CuartoSeguro (de otro dispositivo) que subió una foto con huella
 * parecida. Sale del índice colaborativo de fotos; nunca trae datos del otro anuncio en claro.
 */
export interface PhotoSighting {
  /** Distancia de Hamming entre las huellas (0 = la misma foto). */
  distance: number;
  city: string;
  monthlyRentArs: number;
  /** Fecha (día) en que se verificó el otro anuncio. */
  seenAt: string;
  /** true: mismo CBU/alias o teléfono · false: otro · null: no se puede saber. */
  sameContact: boolean | null;
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
  /** Sin valor = habitación (lo que cubría el prototipo original). */
  propertyType?: PropertyType;
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
  confidenceLevel: number; // 0 a 100. Índice del motor, no una probabilidad calibrada.
  riskScore: number; // 0 a 100
  primaryReason: string;
  recommendation: RecommendationType;
  findings: VerificationFinding[];
  priceComparison: ZonePriceComparison;
  matchedDuplicateImage?: KnownImageSignature;
  matchedFraudDirectoryEntries: FraudDirectoryEntry[];
}

export type GroundTruthLabel = 'FRAUD' | 'LEGITIMATE' | 'INSUFFICIENT_DATA';

export type ExperimentSplit = 'calibration' | 'evaluation';

export interface ExperimentSampleCase {
  caseNumber: number;
  title: string;
  /** Texto libre: los datasets cargados por el usuario pueden traer cualquier plataforma. */
  platform: string;
  groundTruth: GroundTruthLabel;
  whatActuallyHappened: string;
  input: ListingInput;
  /** Si viene definido en el dataset, se respeta; si no, se asigna de forma determinística. */
  split?: ExperimentSplit;
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
  totalActualLegitimate: number;
  totalActualInsufficientData: number;
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
