import { generateText } from "ai";
import { getChatModel } from "@/lib/ai/provider";
import { driver } from "@/lib/clients/neo4j";
import type {
  SubgraphData,
  GraphNode,
  GraphEdge,
  NodeType,
  SimilarIncident,
  LessonRecord,
} from "./types";

const VALID_TYPES = new Set<string>([
  "Document",
  "Equipment",
  "RegulatoryRef",
  "Person",
  "Parameter",
  "Incident",
  "Symptom",
  "RootCause",
  "Resolution",
  "Outcome",
  "LessonLearned",
]);

function toNodeType(label: string | null | undefined): NodeType {
  return label && VALID_TYPES.has(label) ? (label as NodeType) : "Document";
}

async function extractQueryEntities(query: string): Promise<string[]> {
  try {
    const result = await generateText({
      model: getChatModel("fast"),
      system:
        'Extract equipment tags, regulation codes, and proper nouns from the query. Return a JSON array of strings only — no markdown, no explanation. Example: ["P-101","ISO 9001","Smith"]',
      prompt: query,
      maxOutputTokens: 200,
    });
    const match = result.text.match(/\[[\s\S]*?\]/);
    if (match) return (JSON.parse(match[0]) as string[]).slice(0, 8);
  } catch {}
  return [];
}

function serializeSubgraph(nodes: GraphNode[], edges: GraphEdge[]): string {
  if (nodes.length === 0) return "";
  const lines: string[] = ["Knowledge Graph Context:"];
  for (const node of nodes) {
    const connections = edges
      .filter((e) => e.source === node.id || e.target === node.id)
      .map((e) => {
        const otherId = e.source === node.id ? e.target : e.source;
        const other = nodes.find((n) => n.id === otherId);
        return `${e.label.replace(/_/g, " ")} "${other?.label ?? otherId}"`;
      });
    if (connections.length > 0) {
      lines.push(`  ${node.type} "${node.label}": ${connections.join("; ")}`);
    }
  }
  return lines.join("\n");
}

function buildGraphFromRecords(
  records: Array<{ get: (key: string) => string | null }>
): Pick<SubgraphData, "nodes" | "edges"> {
  const nodesMap = new Map<string, GraphNode>();
  const edgesSet = new Set<string>();
  const edges: GraphEdge[] = [];

  for (const rec of records) {
    const srcId = rec.get("srcId");
    const srcLabel = rec.get("srcLabel");
    const srcType = toNodeType(rec.get("srcType"));
    const relType = rec.get("relType");
    const tgtId = rec.get("tgtId");
    const tgtLabel = rec.get("tgtLabel");
    const tgtType = toNodeType(rec.get("tgtType"));

    if (srcId && !nodesMap.has(srcId)) {
      nodesMap.set(srcId, { id: srcId, label: srcLabel ?? srcId, type: srcType });
    }
    if (tgtId && !nodesMap.has(tgtId)) {
      nodesMap.set(tgtId, { id: tgtId, label: tgtLabel ?? tgtId, type: tgtType });
    }
    if (srcId && tgtId && relType) {
      const key = `${srcId}|${relType}|${tgtId}`;
      if (!edgesSet.has(key)) {
        edgesSet.add(key);
        edges.push({ source: srcId, target: tgtId, label: relType });
      }
    }
  }

  return { nodes: Array.from(nodesMap.values()), edges };
}

const SUBGRAPH_CYPHER = `
  UNWIND $terms AS term
  MATCH (anchor)
  WHERE (anchor:Equipment OR anchor:RegulatoryRef OR anchor:Person OR anchor:Parameter OR anchor:Document OR anchor:Incident)
    AND toLower(coalesce(anchor.name, anchor.fileName, anchor.label, '')) CONTAINS toLower(term)
  WITH collect(DISTINCT anchor)[0..6] AS anchors
  UNWIND anchors AS anchor
  OPTIONAL MATCH (anchor)-[r]-(neighbor)
  WHERE neighbor IS NOT NULL
  RETURN
    coalesce(anchor.id, anchor.name) AS srcId,
    coalesce(anchor.name, anchor.fileName, anchor.label) AS srcLabel,
    labels(anchor)[0] AS srcType,
    type(r) AS relType,
    coalesce(neighbor.id, neighbor.name) AS tgtId,
    coalesce(neighbor.name, neighbor.fileName, neighbor.label) AS tgtLabel,
    labels(neighbor)[0] AS tgtType
  LIMIT 50`;

export async function retrieveSubgraph(
  query: string,
  providedTerms?: string[]
): Promise<SubgraphData> {
  const terms = providedTerms ?? (await extractQueryEntities(query));
  if (terms.length === 0) return { nodes: [], edges: [], textContext: "" };

  const session = driver.session();
  try {
    const result = await session.run(SUBGRAPH_CYPHER, { terms });
    const { nodes, edges } = buildGraphFromRecords(result.records);
    return { nodes, edges, textContext: serializeSubgraph(nodes, edges) };
  } finally {
    await session.close();
  }
}

export async function retrieveNeighborhood(term: string): Promise<SubgraphData> {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (anchor)
       WHERE (anchor:Equipment OR anchor:RegulatoryRef OR anchor:Person OR anchor:Parameter OR anchor:Document OR anchor:Incident)
         AND toLower(coalesce(anchor.name, anchor.fileName, anchor.label, '')) CONTAINS toLower($term)
       WITH collect(DISTINCT anchor)[0..3] AS anchors
       UNWIND anchors AS a
       MATCH path = (a)-[*1..2]-(n)
       WITH DISTINCT relationships(path) AS rels
       UNWIND rels AS r
       RETURN
         coalesce(startNode(r).id, startNode(r).name) AS srcId,
         coalesce(startNode(r).name, startNode(r).fileName, startNode(r).label) AS srcLabel,
         labels(startNode(r))[0] AS srcType,
         type(r) AS relType,
         coalesce(endNode(r).id, endNode(r).name) AS tgtId,
         coalesce(endNode(r).name, endNode(r).fileName, endNode(r).label) AS tgtLabel,
         labels(endNode(r))[0] AS tgtType
       LIMIT 80`,
      { term }
    );
    const { nodes, edges } = buildGraphFromRecords(result.records);
    return { nodes, edges, textContext: serializeSubgraph(nodes, edges) };
  } finally {
    await session.close();
  }
}

function toNum(value: unknown): number {
  if (value == null) return 0;
  const v = value as { toNumber?: () => number };
  return typeof v.toNumber === "function" ? v.toNumber() : Number(value);
}

export async function findSimilarIncidents(
  asset: string,
  symptoms: string[] = []
): Promise<SimilarIncident[]> {
  const session = driver.session();
  const assetNorm = asset.trim().toLowerCase();
  try {
    const result = await session.run(
      `MATCH (e:Equipment)-[:EXPERIENCED]->(i:Incident)
       WHERE toLower(e.name) CONTAINS $assetNorm
       OPTIONAL MATCH (i)-[:CAUSED_BY]->(rc:RootCause)
       OPTIONAL MATCH (i)-[:RESOLVED_BY]->(res:Resolution)
       RETURN i.id AS id, i.label AS label, i.eventDate AS eventDate,
              rc.label AS rootCause, res.label AS resolution
       ORDER BY i.eventDate DESC
       LIMIT 10`,
      { assetNorm }
    );

    let incidents = result.records.map((rec) => ({
      id: String(rec.get("label") ?? rec.get("id") ?? "incident"),
      summary:
        [
          rec.get("rootCause") ? `Root cause: ${rec.get("rootCause")}` : null,
          rec.get("resolution") ? `Resolution: ${rec.get("resolution")}` : null,
        ]
          .filter(Boolean)
          .join(" · ") || String(rec.get("label") ?? "Incident"),
      asset,
      date: rec.get("eventDate") ? String(rec.get("eventDate")) : undefined,
      rootCause: rec.get("rootCause") ? String(rec.get("rootCause")) : undefined,
      resolution: rec.get("resolution") ? String(rec.get("resolution")) : undefined,
    }));

    if (symptoms.length > 0 && incidents.length > 0) {
      const symptomTerms = symptoms.map((s) => s.toLowerCase());
      incidents = incidents.sort((a, b) => {
        const aMatch = symptomTerms.some((t) => a.summary.toLowerCase().includes(t)) ? 1 : 0;
        const bMatch = symptomTerms.some((t) => b.summary.toLowerCase().includes(t)) ? 1 : 0;
        return bMatch - aMatch;
      });
    }

    return incidents;
  } catch {
    return [];
  } finally {
    await session.close();
  }
}

export async function getLessonsForAsset(asset: string): Promise<LessonRecord[]> {
  const session = driver.session();
  const assetNorm = asset.trim().toLowerCase();
  try {
    const result = await session.run(
      `MATCH (e:Equipment)-[:EXPERIENCED]->(i:Incident)-[:LESSON]->(l:LessonLearned)
       WHERE toLower(e.name) CONTAINS $assetNorm
       OPTIONAL MATCH (d:Document)-[:CAPTURES]->(l)
       OPTIONAL MATCH (p:Person)-[:RECOMMENDED]->(l)
       RETURN DISTINCT l.label AS lesson, p.name AS expertName, d.fileName AS sourceDoc
       LIMIT 20`,
      { assetNorm }
    );
    return result.records.map((rec) => ({
      text: String(rec.get("lesson") ?? ""),
      asset,
      expertName: rec.get("expertName") ? String(rec.get("expertName")) : undefined,
      sourceDoc: rec.get("sourceDoc") ? String(rec.get("sourceDoc")) : undefined,
    }));
  } catch {
    return [];
  } finally {
    await session.close();
  }
}

export async function getExpertContributions(
  personName: string
): Promise<{ incidents: number; lessons: number; assets: string[] }> {
  const session = driver.session();
  const nameNorm = personName.trim().toLowerCase();
  try {
    const result = await session.run(
      `MATCH (p:Person)
       WHERE toLower(p.name) CONTAINS $nameNorm
       OPTIONAL MATCH (p)-[:INVESTIGATED]->(i:Incident)
       OPTIONAL MATCH (p)-[:RECOMMENDED]->(l:LessonLearned)
       OPTIONAL MATCH (e:Equipment)-[:EXPERIENCED]->(i)
       RETURN count(DISTINCT i) AS incidents, count(DISTINCT l) AS lessons,
              collect(DISTINCT e.name) AS assets`,
      { nameNorm }
    );
    const rec = result.records[0];
    if (!rec) return { incidents: 0, lessons: 0, assets: [] };
    return {
      incidents: toNum(rec.get("incidents")),
      lessons: toNum(rec.get("lessons")),
      assets: (rec.get("assets") as string[] | null)?.filter(Boolean) ?? [],
    };
  } catch {
    return { incidents: 0, lessons: 0, assets: [] };
  } finally {
    await session.close();
  }
}

export async function countIncidents(): Promise<number> {
  const session = driver.session();
  try {
    const result = await session.run(`MATCH (i:Incident) RETURN count(i) AS c`);
    return toNum(result.records[0]?.get("c"));
  } catch {
    return 0;
  } finally {
    await session.close();
  }
}
