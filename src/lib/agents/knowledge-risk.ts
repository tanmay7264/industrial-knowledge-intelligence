import expertsData from "./experts.json";
import { countIncidents, getExpertContributions } from "@/lib/graph/retrieve";

export interface ExpertProfile {
  id: string;
  name: string;
  experienceYears: number;
  retiringInMonths: number;
  incidentsSolved: number;
  assetsManaged: string[];
  knowledgeRiskScore: number;
  missingDocumentation: string[];
  graphIncidents?: number;
  graphLessons?: number;
}

export interface KnowledgeRiskReport {
  generatedAt: string;
  aggregateRiskScore: number;
  expertsTracked: number;
  incidentsIndexed: number;
  criticalAssets: { asset: string; expertCount: number; riskLevel: string }[];
  experts: ExpertProfile[];
  missingKnowledge: { expert: string; gaps: string[] }[];
}

const experts = expertsData as ExpertProfile[];

export async function buildKnowledgeRiskReport(): Promise<KnowledgeRiskReport> {
  const enriched = await Promise.all(
    experts.map(async (expert) => {
      const contrib = await getExpertContributions(expert.name);
      return {
        ...expert,
        graphIncidents: contrib.incidents,
        graphLessons: contrib.lessons,
      };
    })
  );

  const incidentsIndexed = await countIncidents();
  const aggregateRiskScore = Math.round(
    enriched.reduce((sum, e) => sum + e.knowledgeRiskScore, 0) / enriched.length
  );

  const assetMap = new Map<string, number>();
  for (const expert of enriched) {
    for (const asset of expert.assetsManaged) {
      assetMap.set(asset, (assetMap.get(asset) ?? 0) + 1);
    }
  }

  const criticalAssets = [...assetMap.entries()]
    .map(([asset, expertCount]) => ({
      asset,
      expertCount,
      riskLevel: expertCount >= 2 ? "High" : expertCount === 1 ? "Medium" : "Low",
    }))
    .sort((a, b) => b.expertCount - a.expertCount);

  const missingKnowledge = enriched
    .filter((e) => e.missingDocumentation.length > 0)
    .map((e) => ({ expert: e.name, gaps: e.missingDocumentation }));

  return {
    generatedAt: new Date().toISOString(),
    aggregateRiskScore,
    expertsTracked: enriched.length,
    incidentsIndexed,
    criticalAssets,
    experts: enriched.sort(
      (a, b) => b.knowledgeRiskScore - a.knowledgeRiskScore
    ),
    missingKnowledge,
  };
}

export function getExpertsCount(): number {
  return experts.length;
}

export function getAggregateRiskScore(): number {
  if (experts.length === 0) return 0;
  return Math.round(
    experts.reduce((sum, e) => sum + e.knowledgeRiskScore, 0) / experts.length
  );
}
