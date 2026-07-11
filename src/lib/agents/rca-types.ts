import type { EvidenceCitation } from "./compliance-types";

export interface RCAHypothesis {
  cause: string;
  confidence: number;
}

export interface RCACorrectiveAction {
  action: string;
  urgency: string;
  impact: string;
}

export interface RCAReport {
  asset: string;
  primaryHypothesis: string;
  confidence: number;
  supportingEvidence: EvidenceCitation[];
  alternativeHypotheses: RCAHypothesis[];
  verificationTests: string[];
  correctiveActions: RCACorrectiveAction[];
  relatedAssets: string[];
  generatedAt: string;
  query: string;
}
