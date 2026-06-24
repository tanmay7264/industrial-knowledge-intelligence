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
    accent: "from-primary/20",
    icon: (
      <path d="M8 10h8M8 14h5M21 12a9 9 0 1 1-3.5-7.1L21 4v5h-5" strokeWidth="1.6" />
    ),
  },
  {
    title: "Knowledge Graph",
    body: "Multi-hop, relationship questions a “chat with PDF” tool can't answer — which regulation governs which equipment, traced visually.",
    href: "/graph",
    cta: "Explore Graph",
    accent: "from-chart-4/20",
    icon: (
      <>
        <circle cx="5" cy="6" r="2" strokeWidth="1.6" />
        <circle cx="19" cy="7" r="2" strokeWidth="1.6" />
        <circle cx="12" cy="18" r="2" strokeWidth="1.6" />
        <path d="M7 7l3.5 9M17 8.5L13 16M7 6.5h10" strokeWidth="1.6" />
      </>
    ),
  },
  {
    title: "Compliance Gaps",
    body: "An agent checks current records against regulatory requirements and surfaces gaps with evidence — conservatively.",
    href: "/compliance",
    cta: "View Dashboard",
    accent: "from-signal/20",
    icon: (
      <path
        d="M12 3l7 3v6c0 4-3 6.5-7 9-4-2.5-7-5-7-9V6l7-3zM9 12l2 2 4-4"
        strokeWidth="1.6"
      />
    ),
  },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh" aria-hidden />
        <div className="absolute inset-0 bg-grid" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-16 flex flex-col items-center text-center gap-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border glass px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Industrial Knowledge Intelligence
            <span className="text-border">·</span>
            <span className="text-emerald-400">systems online</span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl max-w-3xl leading-[1.05]">
            Your plant&apos;s knowledge,
            <br />
            <span className="text-gradient">finally answerable.</span>
          </h1>

          <p className="max-w-xl text-muted-foreground text-base sm:text-lg leading-relaxed">
            IKI ingests heterogeneous industrial documents — PDFs, scans,
            spreadsheets, email — and makes them queryable through cited
            question-answering, a live knowledge graph, and an automated compliance
            auditor.
          </p>

          <div className="flex gap-3 mt-2 flex-wrap justify-center">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:bg-primary/90 transition-colors glow-primary"
            >
              ▶ Run the Guided Demo
            </Link>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 rounded-lg border border-border glass px-6 py-3 text-sm font-semibold hover:border-primary/40 transition-colors"
            >
              Open Q&amp;A →
            </Link>
          </div>
        </div>
      </section>

      {/* Problem framing */}
      <section className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-6">
          The problem
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {PROBLEMS.map((p) => (
            <div
              key={p.label}
              className="card-rich rounded-xl border border-border p-5 text-left"
            >
              <div className="text-3xl font-bold tracking-tight text-signal">
                {p.stat}
              </div>
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
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-6">
          What IKI does
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {CAPABILITIES.map((c) => (
            <Link
              key={c.title}
              href={c.href}
              className="card-rich group rounded-xl border border-border p-5 text-left flex flex-col"
            >
              <div
                className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-gradient-to-b ${c.accent} to-transparent`}
              >
                <svg
                  className="h-5 w-5 text-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {c.icon}
                </svg>
              </div>
              <h3 className="text-base font-semibold">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed flex-1">
                {c.body}
              </p>
              <span className="mt-3 text-sm font-medium text-primary group-hover:translate-x-0.5 transition-transform">
                {c.cta} →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* System status + footer links */}
      <section className="mx-auto max-w-5xl px-6 py-12 flex flex-col items-center gap-6">
        <StatusPanel />
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
          <Link href="/ingest" className="hover:text-foreground transition-colors">
            Upload documents
          </Link>
          <span className="text-border">·</span>
          <Link
            href="/architecture"
            className="hover:text-foreground transition-colors"
          >
            Architecture
          </Link>
          <span className="text-border">·</span>
          <Link href="/demo" className="hover:text-foreground transition-colors">
            Guided demo
          </Link>
        </div>
      </section>
    </main>
  );
}
