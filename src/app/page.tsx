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
      </div>

      <StatusPanel />
    </main>
  );
}
