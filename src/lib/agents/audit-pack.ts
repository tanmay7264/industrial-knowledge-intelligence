import type { ComplianceReport, AuditPack } from "./compliance-types";

// Pure builder (no server dependencies) so it can run on the client during export.
// Compiles the COVERED requirements and their citations into a self-contained
// audit document suitable for handing to an external auditor.
export function buildAuditPack(
  report: ComplianceReport,
  isoTimestamp: string
): AuditPack {
  const covered = report.results.filter((r) => r.verdict === "COVERED");

  return {
    title: "IKI Compliance Audit Evidence Pack",
    generatedAt: isoTimestamp,
    scanGeneratedAt: report.generatedAt,
    scope:
      "Contains only requirements assessed as COVERED, each backed by cited corpus evidence. Partial, gap, and unknown items are excluded from the certified set; see summary for the full breakdown.",
    summary: report.summary,
    certifiedCount: covered.length,
    certifiedRequirements: covered.map((r) => ({
      requirementId: r.requirementId,
      requirementText: r.requirementText,
      source: r.source,
      category: r.category,
      rationale: r.rationale,
      evidence: r.evidence,
    })),
  };
}
