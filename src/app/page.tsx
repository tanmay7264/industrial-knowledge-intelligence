import Link from "next/link";
import { StatusPanel } from "@/components/status-panel";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-14 p-8 bg-background">
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Hackathon Build — v0.1
        </div>

        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Industrial Knowledge
          <br />
          <span className="text-muted-foreground">Intelligence</span>
        </h1>

        <p className="max-w-lg text-muted-foreground text-lg leading-relaxed">
          Ingest heterogeneous industrial documents and query them with a cited
          RAG copilot backed by a live knowledge graph.
        </p>

        <div className="flex gap-3 mt-2 flex-wrap justify-center">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Open Copilot →
          </Link>
          <Link
            href="/graph"
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-purple-700 transition-colors"
          >
            Graph Explorer
          </Link>
          <Link
            href="/ingest"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted px-5 py-2.5 text-sm font-semibold hover:bg-muted/80 transition-colors"
          >
            Upload Documents
          </Link>
        </div>
      </div>

      <StatusPanel />
    </main>
  );
}
