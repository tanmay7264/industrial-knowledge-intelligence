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

export interface ExtractedEntities {
  equipmentTags: string[];
  processParameters: string[];
  regulatoryRefs: string[];
  personnel: string[];
  dates: string[];
  docType: string;
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
