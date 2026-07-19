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

export interface RCAProblemSummary {
  machine: string;
  symptoms: string[];
  reportedBy: string;
  date: string;
  severity: string;
}

export interface RCASimilarIncident {
  incidentNumber: string;
  similarity: number;
  resolvedBy: string;
  resolutionSuccess: string;
}

export interface RCAConfidenceSignal {
  label: string;
  count?: number;
}

export interface RCAActionPlan {
  inspectionOrder: string[];
  repairProcedure: string[];
  safetyPrecautions: string[];
  requiredSpareParts: string[];
  requiredTools: string[];
  verificationChecklist: string[];
}

export interface RCAInvestigationSummary {
  riskLevel: string;
  estimatedDowntime: string;
  estimatedRepairTime: string;
  affectedComponents: string[];
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
  problemSummary: RCAProblemSummary;
  similarIncidents: RCASimilarIncident[];
  confidenceSignals: RCAConfidenceSignal[];
  actionPlan: RCAActionPlan;
  investigationSummary: RCAInvestigationSummary;
  knowledgeSources: string[];
}
