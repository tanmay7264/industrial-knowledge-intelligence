import { useCallback, useRef } from "react";
import ForceGraph2D from "react-force-graph-2d";
import type { SubgraphData, NodeType } from "@/lib/graph/types";

interface FGNode {
  id: string;
  name: string;
  nodeType: NodeType;
  color: string;
  val?: number;
  // set by the force simulation at runtime
  x?: number;
  y?: number;
}

interface FGLink {
  source: string;
  target: string;
  label: string;
}

const NODE_COLORS: Record<NodeType, string> = {
  Document: "#3b82f6",
  Equipment: "#f97316",
  RegulatoryRef: "#ef4444",
  Person: "#22c55e",
  Parameter: "#a855f7",
  Incident: "#dc2626",
  Symptom: "#f59e0b",
  RootCause: "#b45309",
  Resolution: "#10b981",
  Outcome: "#64748b",
  LessonLearned: "#8b5cf6",
};

interface Props {
  data: SubgraphData;
  width: number;
  height: number;
  onNodeClick?: (node: FGNode) => void;
}

export default function ForceGraphInner({ data, width, height, onNodeClick }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);

  const graphData = {
    nodes: data.nodes.map((n) => ({
      id: n.id,
      name: n.label,
      nodeType: n.type,
      color: NODE_COLORS[n.type] ?? "#888",
      val: n.type === "Document" ? 3 : 2,
    })) as FGNode[],
    links: data.edges.map((e) => ({
      source: e.source,
      target: e.target,
      label: e.label,
    })) as FGLink[],
  };

  const paintNode = useCallback(
    (node: FGNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const r = (node.val ?? 2) * 2.5;
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, r, 0, 2 * Math.PI);
      ctx.fillStyle = node.color;
      ctx.fill();

      const label = node.name.length > 20 ? node.name.slice(0, 18) + "…" : node.name;
      const fontSize = Math.max(8, 11 / globalScale);
      ctx.font = `${fontSize}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillText(label, node.x!, node.y! + r + fontSize * 0.9);
    },
    []
  );

  const paintLink = useCallback(
    (link: FGLink, ctx: CanvasRenderingContext2D, globalScale: number) => {
      if (globalScale < 1.5) return;
      const src = link.source as unknown as FGNode;
      const tgt = link.target as unknown as FGNode;
      if (!src?.x || !tgt?.x) return;
      const mx = (src.x + tgt.x) / 2;
      const my = (src.y! + tgt.y!) / 2;
      const fontSize = 8 / globalScale;
      ctx.font = `${fontSize}px Inter, sans-serif`;
      ctx.fillStyle = "rgba(148,163,184,0.8)";
      ctx.textAlign = "center";
      ctx.fillText(link.label.replace(/_/g, " "), mx, my);
    },
    []
  );

  return (
    <ForceGraph2D
      ref={fgRef}
      graphData={graphData}
      width={width}
      height={height}
      backgroundColor="#020617"
      nodeCanvasObject={paintNode as (n: object, ctx: CanvasRenderingContext2D, gs: number) => void}
      nodeCanvasObjectMode={() => "replace"}
      linkCanvasObjectMode={() => "after"}
      linkCanvasObject={paintLink as (l: object, ctx: CanvasRenderingContext2D, gs: number) => void}
      linkColor={() => "#334155"}
      linkDirectionalArrowLength={4}
      linkDirectionalArrowRelPos={1}
      linkDirectionalArrowColor={() => "#475569"}
      enableNodeDrag
      onEngineStop={() => fgRef.current?.zoomToFit(400, 30)}
      onNodeClick={
        onNodeClick
          ? (node: object) => onNodeClick(node as FGNode)
          : undefined
      }
      cooldownTicks={80}
    />
  );
}
