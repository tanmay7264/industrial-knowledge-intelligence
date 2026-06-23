import { generateText } from "ai";
import { getChatModel } from "@/lib/ai/provider";
import { driver } from "@/lib/clients/neo4j";
import type { SubgraphData, GraphNode, GraphEdge, NodeType } from "./types";

const VALID_TYPES = new Set<string>([
  "Document",
  "Equipment",
  "RegulatoryRef",
  "Person",
  "Parameter",
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
  records: Array<{
    get: (key: string) => string | null;
  }>
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
  WHERE (anchor:Equipment OR anchor:RegulatoryRef OR anchor:Person OR anchor:Parameter OR anchor:Document)
    AND toLower(coalesce(anchor.name, anchor.fileName, '')) CONTAINS toLower(term)
  WITH collect(DISTINCT anchor)[0..6] AS anchors
  UNWIND anchors AS anchor
  OPTIONAL MATCH (anchor)-[r]-(neighbor)
  WHERE neighbor IS NOT NULL
  RETURN
    coalesce(anchor.id, anchor.name) AS srcId,
    coalesce(anchor.name, anchor.fileName) AS srcLabel,
    labels(anchor)[0] AS srcType,
    type(r) AS relType,
    coalesce(neighbor.id, neighbor.name) AS tgtId,
    coalesce(neighbor.name, neighbor.fileName) AS tgtLabel,
    labels(neighbor)[0] AS tgtType
  LIMIT 50`;

// 1-hop subgraph used in chat (fast)
export async function retrieveSubgraph(
  query: string,
  providedTerms?: string[]
): Promise<SubgraphData> {
  const terms = providedTerms ?? (await extractQueryEntities(query));
  if (terms.length === 0) return { nodes: [], edges: [], textContext: "" };

  const session = driver.session();
  try {
    const result = await session.run(SUBGRAPH_CYPHER, { terms });
    const { nodes, edges } = buildGraphFromRecords(
      result.records as Parameters<typeof buildGraphFromRecords>[0]
    );
    return { nodes, edges, textContext: serializeSubgraph(nodes, edges) };
  } finally {
    await session.close();
  }
}

// 2-hop neighborhood for the graph explorer page
export async function retrieveNeighborhood(term: string): Promise<SubgraphData> {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (anchor)
       WHERE (anchor:Equipment OR anchor:RegulatoryRef OR anchor:Person OR anchor:Parameter OR anchor:Document)
         AND toLower(coalesce(anchor.name, anchor.fileName, '')) CONTAINS toLower($term)
       WITH collect(DISTINCT anchor)[0..3] AS anchors
       UNWIND anchors AS a
       MATCH path = (a)-[*1..2]-(n)
       WITH DISTINCT relationships(path) AS rels
       UNWIND rels AS r
       RETURN
         coalesce(startNode(r).id, startNode(r).name) AS srcId,
         coalesce(startNode(r).name, startNode(r).fileName) AS srcLabel,
         labels(startNode(r))[0] AS srcType,
         type(r) AS relType,
         coalesce(endNode(r).id, endNode(r).name) AS tgtId,
         coalesce(endNode(r).name, endNode(r).fileName) AS tgtLabel,
         labels(endNode(r))[0] AS tgtType
       LIMIT 80`,
      { term }
    );
    const { nodes, edges } = buildGraphFromRecords(
      result.records as Parameters<typeof buildGraphFromRecords>[0]
    );
    return { nodes, edges, textContext: serializeSubgraph(nodes, edges) };
  } finally {
    await session.close();
  }
}
