import type { EvidenceCitation } from "./compliance-types";

export interface PlaybookIncidentRef {
  id: string;
  summary: string;
  date?: string;
}

export interface OperationalPlaybook {
  asset: string;
  issue: string;
  similarIncidents: PlaybookIncidentRef[];
  mostCommonRootCause: string;
  previousSuccessfulResolution: string;
  lessonsLearned: string[];
  expertRecommendation: string;
  supportingEvidence: EvidenceCitation[];
  confidenceScore: number;
  generatedAt: string;
  query: string;
}
