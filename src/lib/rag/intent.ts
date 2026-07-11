export type QueryIntent = "playbook" | "explorer" | "graph" | "rca";

const RCA_PATTERNS = [
  /\bwhy does .+ keep failing\b/i,
  /\broot cause\b/i,
  /\brca\b/i,
  /\bwhy .+ fail(ing|ed|s)?\b/i,
  /\brecurring failure\b/i,
  /\brepeated failure\b/i,
];

const PLAYBOOK_PATTERNS = [
  /\b(p|b|v|hx|t)-?\d{2,4}\b/i,
  /\bvibration\b/i,
  /\btemperature\b/i,
  /\babnormal\s+noise\b/i,
  /\bbearing\b/i,
  /\balarm\b/i,
  /\btrip\b/i,
  /\bleak\b/i,
  /\bpressure\b/i,
  /\bpump\b.*\b(increasing|rising|high|abnormal)\b/i,
];

const EXPLORER_PATTERNS = [
  /^what (are|is|causes|caused|should|inspections)/i,
  /^why (does|do|is|are|did)/i,
  /^how (to|do|should|can)/i,
  /^what inspections/i,
  /^list (the|all)/i,
];

const GRAPH_PATTERNS = [
  /\bwhich (regulations|documents|standards)\b/i,
  /\btrace\b/i,
  /\bconnected to\b/i,
  /\bmention(s|ed)?\b/i,
  /\bgovern(s|ed)?\b/i,
  /\brelationship\b/i,
];

export function detectQueryIntent(query: string): QueryIntent {
  const q = query.trim();
  if (RCA_PATTERNS.some((p) => p.test(q))) return "rca";
  if (GRAPH_PATTERNS.some((p) => p.test(q))) return "graph";
  if (EXPLORER_PATTERNS.some((p) => p.test(q))) return "explorer";
  if (PLAYBOOK_PATTERNS.some((p) => p.test(q))) return "playbook";
  return "explorer";
}
