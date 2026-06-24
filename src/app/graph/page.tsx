"use client";

import { TopNav } from "@/components/top-nav";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
};

const NODE_TYPES: NodeType[] = [
  "Equipment",
  "RegulatoryRef",
  "Document",
  "Person",
  "Parameter",
];

const EXAMPLE_SEARCHES = [
  "p-101",
  "iso 9001",
  "hydraulic pump",
  "pressure",
  "inspector",
];

export default function GraphPage() {
  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    search(term);
  };

  const presentTypes = subgraph
    ? new Set(subgraph.nodes.map((n) => n.type))
    : new Set<NodeType>();

  return (
    <div className="flex flex-col h-screen bg-background">
      <TopNav />

      {/* Search toolbar */}
      <div className="border-b border-border px-4 sm:px-6 py-2.5 flex items-center gap-3 bg-background/80 backdrop-blur-sm">
        <h2 className="font-semibold text-sm shrink-0 hidden sm:block">
          Graph Explorer
        </h2>
        <form onSubmit={handleSubmit} className="flex gap-2 flex-1 max-w-lg">
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search equipment tag, regulation, or keyword…"
            className="flex-1 h-8 rounded-md border border-border bg-muted px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button type="submit" size="sm" disabled={!term.trim() || loading}>
            {loading ? "…" : "Explore"}
          </Button>
        </form>
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 border-r border-border p-4 shrink-0 space-y-5 overflow-y-auto">
          {/* Legend */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Node types
            </p>
            <div className="space-y-1.5">
              {NODE_TYPES.map((t) => (
                <div
                  key={t}
                  className={`flex items-center gap-2 text-xs ${
                    presentTypes.has(t) ? "text-foreground" : "text-muted-foreground"
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
                    <span className="flex items-center gap-1">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: NODE_COLORS[t] }}
                      />
                      {t}
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
              <div className="space-y-1">
                {EXAMPLE_SEARCHES.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setTerm(s);
                      search(s);
                    }}
                    className="block text-left w-full text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Graph canvas */}
        <div ref={containerRef} className="flex-1 bg-slate-950 relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="space-y-2 w-64">
                <Skeleton className="h-3 w-full bg-slate-800" />
                <Skeleton className="h-3 w-4/5 bg-slate-800" />
                <Skeleton className="h-3 w-3/5 bg-slate-800" />
              </div>
              <p className="text-slate-500 text-sm">Querying knowledge graph…</p>
            </div>
          )}

          {error && !loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-2">
                <p className="text-destructive text-sm">{error}</p>
                <p className="text-muted-foreground text-xs">
                  Make sure Neo4j is running and documents are ingested.
                </p>
              </div>
            </div>
          )}

          {!subgraph && !loading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
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
              <p className="text-slate-500 text-sm">
                Search an equipment tag or regulation to explore its knowledge graph
                neighborhood
              </p>
            </div>
          )}

          {subgraph && subgraph.nodes.length === 0 && !loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-slate-500 text-sm">
                No nodes found for &quot;{query}&quot;. Try ingesting documents first or use a
                different search term.
              </p>
            </div>
          )}

          {subgraph && subgraph.nodes.length > 0 && !loading && (
            <ForceGraphInner
              data={subgraph}
              width={dims.w}
              height={dims.h}
            />
          )}
        </div>
      </div>
    </div>
  );
}
