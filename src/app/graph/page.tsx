"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ContentCard } from "@/components/page-shell";
import {
  Boxes,
  AlertTriangle,
  User,
  FileText,
  ShieldCheck,
  Target,
  CheckCircle2,
  Sparkles,
  Loader2,
  Play,
} from "lucide-react";
import type { SubgraphData, NodeType, GraphNode } from "@/lib/graph/types";
import type { OperationalPlaybook } from "@/lib/agents/playbook-types";

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

// Plain-language names for what are, underneath, Neo4j node labels.
const NODE_DISPLAY_NAME: Record<NodeType, string> = {
  Document: "Document",
  Equipment: "Machine",
  RegulatoryRef: "Regulation",
  Person: "Engineer",
  Parameter: "Parameter",
  Incident: "Incident",
  Symptom: "Symptom",
  RootCause: "Root Cause",
  Resolution: "Resolution",
  Outcome: "Outcome",
  LessonLearned: "Expert Insight",
};

const NODE_ICON: Record<NodeType, typeof Boxes> = {
  Document: FileText,
  Equipment: Boxes,
  RegulatoryRef: ShieldCheck,
  Person: User,
  Parameter: Sparkles,
  Incident: AlertTriangle,
  Symptom: AlertTriangle,
  RootCause: Target,
  Resolution: CheckCircle2,
  Outcome: CheckCircle2,
  LessonLearned: Sparkles,
};

function displayName(node: GraphNode): string {
  if (node.type === "Document" && node.docType) return node.docType;
  return NODE_DISPLAY_NAME[node.type];
}

const NODE_TYPES: NodeType[] = [
  "Equipment",
  "Incident",
  "Person",
  "Document",
  "RegulatoryRef",
  "LessonLearned",
];

// The order "Follow AI Reasoning" walks the currently loaded subgraph in.
const REASONING_ORDER: NodeType[] = [
  "Equipment",
  "Incident",
  "RootCause",
  "Resolution",
  "Person",
  "Document",
  "LessonLearned",
];

const EXPLORE_EXAMPLES = [
  "Pump P101",
  "Bearing Failure",
  "Lubrication Issue",
  "Compressor Overheating",
  "Rajesh Sharma",
  "Preventive Maintenance",
  "Recurring Failure",
];

function GraphPageInner() {
  const searchParams = useSearchParams();
  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<NodeType | "all">("all");
  const [subgraph, setSubgraph] = useState<SubgraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playbook, setPlaybook] = useState<OperationalPlaybook | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [reasoningStep, setReasoningStep] = useState<string | null>(null);
  const [reasoningPlaying, setReasoningPlaying] = useState(false);
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
    setPlaybook(null);
    setHighlightedNodeId(null);

    const graphP = fetch(`/api/graph?term=${encodeURIComponent(searchTerm)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<SubgraphData>;
      });
    const playbookP = fetch("/api/playbook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: searchTerm }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d?.playbook as OperationalPlaybook) ?? null)
      .catch(() => null);

    try {
      const [graphData, playbookData] = await Promise.all([graphP, playbookP]);
      setSubgraph(graphData);
      setPlaybook(playbookData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Search failed";
      setError(message);
      toast.error("Couldn't explain this recommendation", {
        description: "Make sure Neo4j is running and knowledge has been added.",
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

  const documentsByType = (subgraph?.nodes ?? [])
    .filter((n) => n.type === "Document")
    .reduce<Record<string, number>>((acc, n) => {
      const key = n.docType ?? "Document";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

  const followReasoning = useCallback(() => {
    if (!subgraph || reasoningPlaying) return;
    const path = REASONING_ORDER
      .map((t) => subgraph.nodes.find((n) => n.type === t))
      .filter((n): n is GraphNode => !!n);
    if (path.length === 0) return;

    setReasoningPlaying(true);
    let i = 0;
    const step = () => {
      const node = path[i];
      setHighlightedNodeId(node.id);
      setReasoningStep(`${displayName(node)} — ${node.label}`);
      i++;
      if (i < path.length) {
        setTimeout(step, 1400);
      } else {
        setTimeout(() => {
          setReasoningPlaying(false);
        }, 1400);
      }
    };
    step();
  }, [subgraph, reasoningPlaying]);

  const connectedNodes = (node: GraphNode | null) => {
    if (!node || !subgraph) return [];
    const neighborIds = subgraph.edges
      .filter((e) => e.source === node.id || e.target === node.id)
      .map((e) => (e.source === node.id ? e.target : e.source));
    return subgraph.nodes.filter((n) => neighborIds.includes(n.id));
  };

  return (
    <div className="flex flex-col lg:h-[calc(100dvh-3.5rem)] lg:overflow-hidden">
      <div className="px-4 sm:px-6 pt-4 pb-2 shrink-0 space-y-2">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold">AI Reasoning Graph</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualize how Industrial Brain connected historical incidents, expert
            knowledge, maintenance history, SOPs and operational documents to
            generate this recommendation.
          </p>
        </div>

        <ContentCard title="AI Recommendation Summary">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : playbook ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Problem</p>
                <p className="text-sm font-semibold">{playbook.issue}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Most Likely Cause</p>
                <p className="text-sm font-semibold">{playbook.mostCommonRootCause}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Confidence</p>
                <Badge className="bg-emerald-500 text-white">{playbook.confidenceScore}%</Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Knowledge Sources Used</p>
                  <p className="text-sm font-semibold">{playbook.supportingEvidence.length}</p>
                </div>
                <a href="#explainability">
                  <Button size="sm" variant="outline">View AI Reasoning</Button>
                </a>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Search below to see why Industrial Brain would recommend a resolution.
            </p>
          )}
        </ContentCard>
      </div>

      {/* Search toolbar */}
      <div className="border-b border-border px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 glass shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2 flex-1 w-full sm:max-w-lg min-w-0">
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Explain recommendation for…"
            className="flex-1 min-w-0 h-8 rounded-lg border border-input bg-muted/40 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
          />
          <Button type="submit" size="sm" disabled={!term.trim() || loading} className="shrink-0">
            {loading ? "…" : "Explain"}
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
          {NODE_TYPES.filter((t) => presentTypes.has(t)).map((t) => {
            const Icon = NODE_ICON[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border shrink-0 ${typeFilter === t ? "bg-primary/15 border-primary/40" : "border-border"}`}
              >
                <Icon className="h-3 w-3" />
                {NODE_DISPLAY_NAME[t]}
              </button>
            );
          })}
        </div>
        {subgraph && subgraph.nodes.length > 0 && (
          <Button
            type="button"
            size="sm"
            variant={reasoningPlaying ? "secondary" : "default"}
            disabled={reasoningPlaying}
            onClick={followReasoning}
            className="shrink-0 gap-1.5"
          >
            {reasoningPlaying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Follow AI Reasoning
          </Button>
        )}
      </div>

      {reasoningStep && (
        <div className="px-4 sm:px-6 py-1.5 text-xs text-primary bg-primary/5 border-b border-primary/20 shrink-0">
          Now viewing: {reasoningStep}
        </div>
      )}

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
                Connecting organizational memory…
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="text-center space-y-2">
                <p className="text-destructive text-sm">{error}</p>
                <p className="text-muted-foreground text-xs">
                  Make sure Neo4j is running and knowledge has been added.
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
                Search a machine, symptom, or engineer to see why Industrial Brain
                would recommend a resolution.
              </p>
            </div>
          )}

          {subgraph && subgraph.nodes.length === 0 && !loading && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <p className="text-slate-500 text-sm text-center">
                No connected knowledge found for &quot;{query}&quot;. Try adding
                documents first or use a different search term.
              </p>
            </div>
          )}

          {filteredSubgraph && filteredSubgraph.nodes.length > 0 && !loading && (
            <ForceGraphInner
              data={filteredSubgraph}
              width={dims.w}
              height={dims.h}
              highlightedNodeId={highlightedNodeId}
              onNodeClick={(n) =>
                setSelectedNode({
                  id: n.id,
                  label: n.name,
                  type: n.nodeType,
                  date: n.date,
                  docType: n.docType,
                })
              }
            />
          )}
        </div>

        {/* Sidebar — below graph on mobile, left on desktop */}
        <aside
          id="explainability"
          className="order-2 lg:order-1 w-full lg:w-72 lg:max-w-[18rem] border-t lg:border-t-0 lg:border-r border-border bg-card/60 p-4 shrink-0 space-y-5 overflow-y-auto max-h-[50vh] lg:max-h-none"
        >
          {playbook ? (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Why AI Recommended This
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Matched Historical Incidents</span>
                  <span className="font-medium tabular-nums">{playbook.similarIncidents.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Matched Machine History</span>
                  <span className="font-medium tabular-nums">
                    {subgraph?.nodes.filter((n) => n.type === "Equipment").length ?? 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Matched Expert Experience</span>
                  <span className="font-medium tabular-nums">{playbook.lessonsLearned.length}</span>
                </div>
                {Object.entries(documentsByType).map(([type, count]) => (
                  <div key={type} className="flex justify-between">
                    <span className="text-muted-foreground">Matched {type}</span>
                    <span className="font-medium tabular-nums">{count}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-border/60">
                  <span className="text-muted-foreground">Overall Confidence</span>
                  <span className="font-semibold text-primary">{playbook.confidenceScore}%</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Explore Organizational Memory
              </p>
              <div className="flex flex-wrap lg:flex-col gap-1">
                {EXPLORE_EXAMPLES.map((s) => (
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

      {/* Node detail — side panel on desktop, bottom sheet on mobile via the same Dialog */}
      <Dialog open={!!selectedNode} onOpenChange={(o) => !o && setSelectedNode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedNode?.label}</DialogTitle>
          </DialogHeader>
          {selectedNode && (
            <div className="space-y-3 text-sm">
              <Badge variant="outline" style={{ borderColor: NODE_COLORS[selectedNode.type] }}>
                {displayName(selectedNode)}
              </Badge>
              {selectedNode.date && (
                <p>
                  <strong>Date:</strong> {selectedNode.date}
                </p>
              )}
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5">
                  Connected Knowledge
                </p>
                {connectedNodes(selectedNode).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No connections in this view.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {connectedNodes(selectedNode).map((n) => (
                      <Badge key={n.id} variant="outline" className="text-[10px]">
                        {displayName(n)}: {n.label}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
