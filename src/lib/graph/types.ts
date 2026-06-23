export type NodeType =
  | "Document"
  | "Equipment"
  | "RegulatoryRef"
  | "Person"
  | "Parameter";

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
