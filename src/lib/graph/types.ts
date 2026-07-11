export type NodeType =
  | "Document"
  | "Equipment"
  | "RegulatoryRef"
  | "Person"
  | "Parameter"
  | "Incident"
  | "Symptom"
  | "RootCause"
  | "Resolution"
  | "Outcome"
  | "LessonLearned";

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

export interface SubgraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  textContext: string;
}

export interface SimilarIncident {
  id: string;
  summary: string;
  asset?: string;
  date?: string;
  rootCause?: string;
  resolution?: string;
}

export interface LessonRecord {
  text: string;
  asset?: string;
  expertName?: string;
  sourceDoc?: string;
}
