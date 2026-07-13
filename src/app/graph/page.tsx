"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HeroBand, HeroMetricCard } from "@/components/page-shell";
import { sparklineFromSeed } from "@/lib/ui/sparkline-data";
import { GitBranch, Network, Share2 } from "lucide-react";
import type { SubgraphData, NodeType } from "@/lib/graph/types";

const ForceGraphInner = dynamic(
  () => import("@/components/force-graph-inner"),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-slate-500 text-sm">Loading graph…</div> }
);

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

const NODE_TYPES: NodeType[] = [
  "Equipment",
  "Incident",
  "RegulatoryRef",
  "Document",
  "Person",
  "Parameter",
  "LessonLearned",
];

const EXAMPLE_SEARCHES = [
  "p-101",
  "iso 9001",
  "hydraulic pump",
  "pressure",
  "inspector",
];

function GraphPageInner() {
  const searchParams = useSearchParams();
  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<NodeType | "all">("all");
  const [subgraph, setSubgraph] = useState<SubgraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setDims({
        w: entry.contentRect.width,
        h: Math.max(500, entry.contentRect.height),
      });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const search = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setQuery(searchTerm);
    setLoading(true);
    setError(null);
    setSubgraph(null);
    try {
      const res = await fetch(
        `/api/graph?term=${encodeURIComponent(searchTerm)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SubgraphData = await res.json();
      setSubgraph(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Graph query failed";
      setError(message);
      toast.error("Graph query failed", {
        description: "Make sure Neo4j is running and documents are ingested.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const urlTerm = searchParams.get("term");
    if (urlTerm) {
      setTerm(urlTerm);
      search(urlTerm);
    }
  }, [searchParams, search]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    search(term);
  };

  const presentTypes = subgraph
    ? new Set(subgraph.nodes.map((n) => n.type))
    : new Set<NodeType>();

  const filteredSubgraph =
    subgraph && typeFilter !== "all"
      ? {
          ...subgraph,
          nodes: subgraph.nodes.filter((n) => n.type === typeFilter),
          edges: subgraph.edges.filter(
            (e) =>
              subgraph.nodes.some(
                (n) =>
                  (n.id === e.source || n.id === e.target) && n.type === typeFilter
              )
          ),
        }
      : subgraph;

  const nodeCount = subgraph?.nodes.length ?? 0;
  const edgeCount = subgraph?.edges.length ?? 0;
  const typeCount = presentTypes.size;

  return (
    <div className="flex flex-col lg:h-[calc(100dvh-3.5rem)] lg:overflow-hidden">
      <div className="px-4 sm:px-6 pt-4 pb-2 shrink-0">
        <HeroBand cols={3} className="mb-0">
          <HeroMetricCard
            label="Nodes Found"
            value={nodeCount || "—"}
            icon={Network}
            trend={nodeCount ? 10 : undefined}
            sparklineData={sparklineFromSeed(nodeCount || 24)}
          />
          <HeroMetricCard
            label="Edges"
            value={edgeCount || "—"}
            icon={Share2}
            sparklineData={sparklineFromSeed(edgeCount || 48)}
            sparklineColor="#10b981"
          />
          <HeroMetricCard
            label="Entity Types"
            value={typeCount || "—"}
            icon={GitBranch}
            trendLabel={query ? `Query: ${query}` : "Search to explore"}
            sparklineData={sparklineFromSeed(typeCount || 6)}
          />
        </HeroBand>
      </div>

      {/* Search toolbar */}
      <div className="border-b border-border px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 glass shrink-0">
        <h2 className="font-heading font-semibold text-sm shrink-0">
          Graph Explorer
        </h2>
        <form onSubmit={handleSubmit} className="flex gap-2 flex-1 w-full sm:max-w-lg min-w-0">
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search tag, regulation, keyword…"
            className="flex-1 min-w-0 h-8 rounded-lg border border-input bg-muted/40 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
          />
          <Button type="submit" size="sm" disabled={!term.trim() || loading} className="shrink-0">
            {loading ? "…" : "Explore"}
          </Button>
        </form>
        <div className="flex flex-wrap gap-1 w-full sm:w-auto overflow-x-auto no-scrollbar pb-0.5 sm:pb-0">
          <button
            type="button"
            onClick={() => setTypeFilter("all")}
            className={`px-2 py-0.5 rounded text-[10px] border shrink-0 ${typeFilter === "all" ? "bg-primary/15 border-primary/40" : "border-border"}`}
          >
            All
          </button>
          {NODE_TYPES.filter((t) => presentTypes.has(t)).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`px-2 py-0.5 rounded text-[10px] border shrink-0 ${typeFilter === t ? "bg-primary/15 border-primary/40" : "border-border"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
        {/* Graph canvas — first on mobile */}
        <div
          ref={containerRef}
          className="order-1 lg:order-2 flex-1 min-h-[280px] sm:min-h-[360px] lg:min-h-0 bg-slate-950 relative overflow-hidden"
        >
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="space-y-2 w-64 max-w-[85vw]">
                <Skeleton className="h-3 w-full bg-slate-800" />
                <Skeleton className="h-3 w-4/5 bg-slate-800" />
                <Skeleton className="h-3 w-3/5 bg-slate-800" />
              </div>
              <p className="text-slate-500 text-sm px-4 text-center">
                Querying knowledge graph…
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="text-center space-y-2">
                <p className="text-destructive text-sm">{error}</p>
                <p className="text-muted-foreground text-xs">
                  Make sure Neo4j is running and documents are ingested.
                </p>
              </div>
            </div>
          )}

          {!subgraph && !loading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-4">
              <div className="w-16 h-16 rounded-full border-2 border-slate-700 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-slate-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <circle cx="5" cy="12" r="2" strokeWidth="1.5" />
                  <circle cx="19" cy="5" r="2" strokeWidth="1.5" />
                  <circle cx="19" cy="19" r="2" strokeWidth="1.5" />
                  <line x1="7" y1="11" x2="17" y2="6" strokeWidth="1.5" />
                  <line x1="7" y1="13" x2="17" y2="18" strokeWidth="1.5" />
                </svg>
              </div>
              <p className="text-slate-500 text-sm max-w-xs">
                Search an equipment tag or regulation to explore its knowledge graph
                neighborhood
              </p>
            </div>
          )}

          {subgraph && subgraph.nodes.length === 0 && !loading && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <p className="text-slate-500 text-sm text-center">
                No nodes found for &quot;{query}&quot;. Try ingesting documents first or use a
                different search term.
              </p>
            </div>
          )}

          {filteredSubgraph && filteredSubgraph.nodes.length > 0 && !loading && (
            <ForceGraphInner
              data={filteredSubgraph}
              width={dims.w}
              height={dims.h}
            />
          )}
        </div>

        {/* Sidebar — below graph on mobile, left on desktop */}
        <aside className="order-2 lg:order-1 w-full lg:w-56 lg:max-w-[14rem] border-t lg:border-t-0 lg:border-r border-border bg-card/60 p-4 shrink-0 space-y-5 overflow-y-auto max-h-[40vh] lg:max-h-none">
          {/* Legend */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Node types
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-1.5">
              {NODE_TYPES.map((t) => (
                <div
                  key={t}
                  className={`flex items-center gap-2 text-xs ${
                    presentTypes.has(t) ? "text-foreground" : "text-muted-foreground/50"
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: NODE_COLORS[t] }}
                  />
                  {t}
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          {subgraph && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Results for &quot;{query}&quot;
              </p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Nodes</span>
                  <span className="text-foreground font-medium tabular-nums">
                    {subgraph.nodes.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Edges</span>
                  <span className="text-foreground font-medium tabular-nums">
                    {subgraph.edges.length}
                  </span>
                </div>
                {NODE_TYPES.filter((t) => presentTypes.has(t)).map((t) => (
                  <div key={t} className="flex justify-between">
                    <span className="flex items-center gap-1 min-w-0">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: NODE_COLORS[t] }}
                      />
                      <span className="truncate">{t}</span>
                    </span>
                    <span className="text-foreground font-medium tabular-nums">
                      {subgraph.nodes.filter((n) => n.type === t).length}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Example searches */}
          {!subgraph && !loading && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Try searching
              </p>
              <div className="flex flex-wrap lg:flex-col gap-1">
                {EXAMPLE_SEARCHES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setTerm(s);
                      search(s);
                    }}
                    className="text-left text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted/60 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function GraphPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading graph…</div>}>
      <GraphPageInner />
    </Suspense>
  );
}
