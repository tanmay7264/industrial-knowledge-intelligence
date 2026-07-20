"use client";

import dynamic from "next/dynamic";
import type { SubgraphData, NodeType } from "@/lib/graph/types";

const ForceGraphInner = dynamic(
  () => import("./force-graph-inner"),
  { ssr: false, loading: () => <GraphSkeleton /> }
);

function GraphSkeleton() {
  return (
    <div className="flex items-center justify-center h-full w-full bg-forest text-white/55 text-xs">
      Loading graph…
    </div>
  );
}

const NODE_COLORS: Record<NodeType, string> = {
  Document: "#17402f",
  Equipment: "#f97316",
  RegulatoryRef: "#ef4444",
  Person: "#22c55e",
  Parameter: "#8a6d1f",
  Incident: "#dc2626",
  Symptom: "#f59e0b",
  RootCause: "#b45309",
  Resolution: "#10b981",
  Outcome: "#64748b",
  LessonLearned: "#d9f36e",
};

const NODE_TYPES: NodeType[] = [
  "Equipment",
  "Incident",
  "RegulatoryRef",
  "Document",
  "Person",
  "Parameter",
  "LessonLearned",
];

interface Props {
  data: SubgraphData;
  height?: number;
  width?: number;
  className?: string;
}

export function SubgraphView({ data, height = 240, width = 380, className = "" }: Props) {
  if (data.nodes.length === 0) return null;

  const presentTypes = new Set(data.nodes.map((n) => n.type));

  return (
    <div className={`rounded-xl overflow-hidden border border-forest-2 bg-forest ${className}`}>
      <div
        className="text-[10px] text-white/65 px-3 py-1.5 border-b border-forest-2 flex items-center gap-3 flex-wrap"
      >
        <span className="font-semibold text-white/80">
          Knowledge Graph · {data.nodes.length} nodes · {data.edges.length} edges
        </span>
        {NODE_TYPES.filter((t) => presentTypes.has(t)).map((t) => (
          <span key={t} className="flex items-center gap-1">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: NODE_COLORS[t] }}
            />
            {t}
          </span>
        ))}
      </div>

      <div style={{ height, width }}>
        <ForceGraphInner data={data} width={width} height={height} />
      </div>
    </div>
  );
}
