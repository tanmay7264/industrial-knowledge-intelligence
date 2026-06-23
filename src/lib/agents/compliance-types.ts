export type Verdict = "COVERED" | "PARTIAL" | "GAP" | "UNKNOWN";

export interface EvidenceCitation {
  n: number;
  fileName: string;
  page: number | string;
  snippet: string;
  score: number;
}

export interface RequirementVerdict {
  requirementId: string;
  requirementText: string;
  source: string;
  category: string;
  verdict: Verdict;
  rationale: string;
  evidence: EvidenceCitation[];
  topScore: number;
}

export interface ComplianceReport {
  generatedAt: string;
  totalRequirements: number;
  summary: Record<Verdict, number>;
  results: RequirementVerdict[];
}

export interface AuditPackItem {
  requirementId: string;
  requirementText: string;
  source: string;
  category: string;
  rationale: string;
  evidence: EvidenceCitation[];
}

export interface AuditPack {
  title: string;
  generatedAt: string;
  scanGeneratedAt: string;
  scope: string;
  summary: ComplianceReport["summary"];
  certifiedCount: number;
  certifiedRequirements: AuditPackItem[];
}
