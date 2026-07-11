export interface SourceMeta {
  fileName: string;
  fileType: string;
  totalPages?: number;
  rowCount?: number;
  subject?: string;
  from?: string;
  isScanned?: boolean;
  ocrApplied?: boolean;
}

export interface LoaderResult {
  text: string;
  pageOrSection: number | string;
  sourceMeta: SourceMeta;
}

export interface ChunkMetadata {
  docId: string;
  docType: string;
  fileName: string;
  pageOrSection: number | string;
  ingestedAt: string;
  chunkIndex: number;
  totalChunks: number;
  fileHash: string;
}

export type SemanticDocType =
  | "SOP"
  | "datasheet"
  | "inspection_report"
  | "email"
  | "regulation"
  | "manual"
  | "spreadsheet"
  | "incident_report"
  | "work_order"
  | "expert_interview"
  | "maintenance_log"
  | "audit_report"
  | "vendor_manual"
  | "other";

export interface RCARecord {
  asset?: string;
  symptoms?: string[];
  failureMode?: string;
  rootCause?: string;
  resolution?: string;
  outcome?: string;
  lessonsLearned?: string[];
  expertName?: string;
  eventDate?: string;
  incidentId?: string;
}

export interface ExtractedEntities {
  equipmentTags: string[];
  processParameters: string[];
  regulatoryRefs: string[];
  personnel: string[];
  dates: string[];
  docType: SemanticDocType;
  rca?: RCARecord;
}

export interface Chunk {
  id: string;
  text: string;
  metadata: ChunkMetadata;
}

export interface ChunkWithEntities extends Chunk {
  entities: ExtractedEntities;
}

export interface EntityCounts {
  equipmentTags: number;
  processParameters: number;
  regulatoryRefs: number;
  personnel: number;
  dates: number;
  incidents: number;
}

export interface IngestResult {
  fileName: string;
  fileHash: string;
  chunks: number;
  entitiesFound: EntityCounts;
  ocrApplied: boolean;
  status: "success" | "partial" | "error";
  error?: string;
}

export const RCA_DOC_TYPES = new Set<SemanticDocType>([
  "incident_report",
  "work_order",
  "expert_interview",
  "maintenance_log",
  "audit_report",
]);
