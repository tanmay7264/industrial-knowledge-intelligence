import Link from "next/link";
import { StatusPanel } from "@/components/status-panel";

const PROBLEMS = [
  {
    stat: "~35%",
    label: "of an engineer's time",
    detail:
      "is lost searching for information scattered across manuals, scans, spreadsheets and email.",
  },
  {
    stat: "7–12",
    label: "disconnected systems",
    detail:
      "hold the average plant's operating knowledge, with no single place to ask a question.",
  },
  {
    stat: "The cliff",
    label: "retiring-engineer knowledge loss",
    detail:
      "decades of undocumented expertise walk out the door as the workforce ages.",
  },
];

const CAPABILITIES = [
  {
    title: "Cited Q&A",
    body: "Ask in plain language, get answers grounded in your documents with inline citations and a confidence score.",
    href: "/chat",
    cta: "Open Q&A",
  },
  {
    title: "Knowledge Graph",
    body: "Multi-hop, relationship questions a “chat with PDF” tool can't answer — which regulation governs which equipment, traced visually.",
    href: "/graph",
    cta: "Explore Graph",
  },
  {
    title: "Compliance Gaps",
    body: "An agent checks current records against regulatory requirements and surfaces gaps with evidence — conservatively.",
    href: "/compliance",
    cta: "View Dashboard",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-20 pb-12 flex flex-col items-center text-center gap-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Industrial Knowledge Intelligence
        </div>

        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl max-w-3xl">
          Your plant&apos;s knowledge,
          <br />
          <span className="text-muted-foreground">finally answerable.</span>
        </h1>

        <p className="max-w-xl text-muted-foreground text-lg leading-relaxed">
          IKI ingests heterogeneous industrial documents — PDFs, scans,
          spreadsheets, email — and makes them queryable through cited
          question-answering, a live knowledge graph, and an automated compliance
          auditor.
        </p>

        <div className="flex gap-3 mt-2 flex-wrap justify-center">
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            ▶ Run the Guided Demo
          </Link>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted px-6 py-3 text-sm font-semibold hover:bg-muted/80 transition-colors"
          >
            Open Q&A →
          </Link>
        </div>
      </section>

      {/* Problem framing */}
      <section className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-6">
          The problem
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {PROBLEMS.map((p) => (
            <div
              key={p.label}
              className="rounded-xl border border-border bg-card p-5 text-left"
            >
              <div className="text-3xl font-bold tracking-tight">{p.stat}</div>
              <div className="mt-1 text-sm font-semibold">{p.label}</div>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {p.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Capabilities */}
      <section className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-6">
          What IKI does
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {CAPABILITIES.map((c) => (
            <Link
              key={c.title}
              href={c.href}
              className="group rounded-xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/40 hover:bg-muted/40 flex flex-col"
            >
              <h3 className="text-base font-semibold">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed flex-1">
                {c.body}
              </p>
              <span className="mt-3 text-sm font-medium text-primary group-hover:underline underline-offset-4">
                {c.cta} →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* System status + footer links */}
      <section className="mx-auto max-w-5xl px-6 py-10 flex flex-col items-center gap-6">
        <StatusPanel />
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
          <Link href="/ingest" className="hover:text-foreground transition-colors">
            Upload documents
          </Link>
          <span>·</span>
          <Link
            href="/architecture"
            className="hover:text-foreground transition-colors"
          >
            Architecture
          </Link>
          <span>·</span>
          <Link href="/demo" className="hover:text-foreground transition-colors">
            Guided demo
          </Link>
        </div>
      </section>
    </main>
  );
}
