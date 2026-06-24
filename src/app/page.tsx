"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  MessageSquare,
  Search,
  Upload,
  ShieldCheck,
  GitBranch,
  FileText,
  FileSpreadsheet,
  Mail,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  RefreshCw,
  Database,
  Cpu,
  Activity,
} from "lucide-react";

// ── Static corpus document list ───────────────────────────────────────────
const DOCS = [
  { name: "SOP-PROC-001 P-101 Startup", type: "pdf", category: "SOP", chunks: 4 },
  { name: "V-201 Vessel Inspection", type: "pdf", category: "Inspection", chunks: 3 },
  { name: "OISD-STD-116 Deluge Spec", type: "txt", category: "Regulatory", chunks: 5 },
  { name: "INC-2024-047 Incident Log", type: "txt", category: "Incident", chunks: 2 },
  { name: "Maintenance Schedule 2025", type: "xlsx", category: "Maintenance", chunks: 6 },
  { name: "Hot-Work Email Thread", type: "txt", category: "Comms", chunks: 2 },
  { name: "WO-2025-0312 Work Order", type: "txt", category: "Work Order", chunks: 3 },
  { name: "NM-2025-003 Near-Miss HX-201", type: "txt", category: "Safety", chunks: 2 },
  { name: "PTW-2025-0142 Permit to Work", type: "txt", category: "PTW", chunks: 3 },
  { name: "SOP-PROC-009 Hazard Analysis", type: "txt", category: "SOP", chunks: 4 },
  { name: "Factories Act 1948 Extract", type: "pdf", category: "Regulatory", chunks: 8 },
  { name: "OISD-STD-116 Fire Water Spec", type: "txt", category: "Regulatory", chunks: 3 },
];

const FILE_ICONS: Record<string, React.ElementType> = {
  pdf: FileText,
  txt: FileText,
  xlsx: FileSpreadsheet,
  msg: Mail,
};

const CATEGORY_COLORS: Record<string, string> = {
  SOP: "bg-blue-100 text-blue-700",
  Inspection: "bg-purple-100 text-purple-700",
  Regulatory: "bg-amber-100 text-amber-700",
  Incident: "bg-red-100 text-red-700",
  Maintenance: "bg-green-100 text-green-700",
  Comms: "bg-sky-100 text-sky-700",
  "Work Order": "bg-orange-100 text-orange-700",
  Safety: "bg-rose-100 text-rose-700",
  PTW: "bg-teal-100 text-teal-700",
};

type HealthData = Record<string, "ok" | "down">;

// ── Page ──────────────────────────────────────────────────────────────────
export default function Home() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("Documents");

  useEffect(() => {
    const fetchHealth = () =>
      fetch("/api/health")
        .then((r) => r.json())
        .then(setHealth)
        .catch(() => setHealth({ qdrant: "down", neo4j: "down", redis: "down" }));
    fetchHealth();
    const id = setInterval(fetchHealth, 15_000);
    return () => clearInterval(id);
  }, []);

  const filtered = DOCS.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const allOnline = health && Object.values(health).every((s) => s === "ok");

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "linear-gradient(135deg, #b8f0dc 0%, #d8d4f4 45%, #ead4f8 100%)",
      }}
    >
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header className="flex h-14 items-center gap-3 px-6 border-b border-black/[0.06] bg-white/40 backdrop-blur-md">
        <div className="flex items-center gap-2 font-bold text-sm tracking-tight">
          <Cpu className="h-4 w-4 text-slate-700" />
          <span className="text-slate-800">IKI.</span>
        </div>
        <div className="flex items-center gap-0.5 ml-3">
          {[
            { label: "Ask", href: "/chat" },
            { label: "Graph", href: "/graph" },
            { label: "Compliance", href: "/compliance" },
            { label: "Ingest", href: "/ingest" },
          ].map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-black/[0.05] transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/ingest"
            className="flex items-center gap-1.5 rounded-xl border border-black/[0.08] bg-white/60 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white/80 transition-all"
          >
            <Upload className="h-3 w-3" />
            Upload docs
          </Link>
          <Link
            href="/compliance"
            className="flex items-center gap-1.5 rounded-xl border border-black/[0.08] bg-white/60 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white/80 transition-all"
          >
            <ShieldCheck className="h-3 w-3" />
            Audit
          </Link>
          <div className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-xs font-bold shadow-sm">
            IK
          </div>
          <button className="flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.08] bg-white/60 text-slate-600 hover:bg-white/80 transition-all">
            <Search className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="px-8 pt-10 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-6 sm:gap-12">
          {/* Big number */}
          <div className="flex items-end gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-black/[0.08] bg-white/50 backdrop-blur-sm">
              <Database className="h-6 w-6 text-slate-600" />
            </div>
            <div>
              <div className="flex items-end">
                <span className="text-[72px] font-black leading-none tracking-tighter text-slate-800">
                  {DOCS.length}
                </span>
                <span className="mb-3 ml-1.5 text-3xl font-bold text-slate-400">docs</span>
              </div>
              <p className="text-sm text-slate-500 -mt-1">Industrial Knowledge Corpus</p>
            </div>
          </div>

          {/* Metadata chips */}
          <div className="flex flex-wrap gap-4 pb-2">
            {[
              { icon: GitBranch, label: "Graph Nodes", value: "~48" },
              { icon: ShieldCheck, label: "Requirements", value: "23" },
              { icon: Activity, label: "Status", value: allOnline === null ? "…" : allOnline ? "All Online" : "Degraded" },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 rounded-2xl border border-black/[0.07] bg-white/50 backdrop-blur-sm px-4 py-2.5"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/70 border border-black/[0.06]">
                  <Icon className="h-4 w-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">{label}</p>
                  <p className="text-sm font-bold text-slate-700 leading-tight">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Status boxes ──────────────────────────────────────────────────── */}
      <section className="px-8 pb-8">
        <div className="flex flex-col sm:flex-row items-stretch gap-3">
          {/* COVERED */}
          <div className="flex flex-1 items-center gap-3 rounded-2xl bg-emerald-300/60 backdrop-blur-sm border border-emerald-200/60 px-5 py-4">
            <ShieldCheck className="h-5 w-5 text-emerald-700 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700/70">Covered</p>
              <p className="text-xl font-black text-emerald-800">1 req</p>
            </div>
          </div>

          {/* PARTIAL */}
          <div className="flex flex-1 items-center gap-3 rounded-2xl bg-amber-200/70 backdrop-blur-sm border border-amber-200/60 px-5 py-4">
            <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-700/70">Partial</p>
              <p className="text-xl font-black text-amber-800">1 req</p>
            </div>
          </div>

          {/* GAP */}
          <div className="flex flex-1 items-center gap-3 rounded-2xl bg-slate-200/70 backdrop-blur-sm border border-slate-200/60 px-5 py-4">
            <AlertCircle className="h-5 w-5 text-slate-600 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Balance</p>
              <p className="text-xl font-black text-slate-700">21 unknown</p>
            </div>
            <div className="ml-2 flex-1 hidden sm:flex items-center gap-1">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className={`h-6 w-1.5 rounded-sm ${i % 3 === 0 ? "bg-slate-400" : "bg-slate-300"}`} />
              ))}
            </div>
            <div className="ml-auto flex items-center gap-1 text-xs text-slate-500">
              <HelpCircle className="h-3.5 w-3.5" />
              <span>91%</span>
            </div>
          </div>

          {/* CTA */}
          <Link
            href="/compliance"
            className="flex items-center gap-2 rounded-2xl bg-slate-800 px-6 py-4 text-sm font-bold text-white hover:bg-slate-700 transition-colors whitespace-nowrap"
          >
            <RefreshCw className="h-4 w-4" />
            Run Audit
          </Link>
        </div>
      </section>

      {/* ── Main grid ─────────────────────────────────────────────────────── */}
      <section className="px-8 pb-10 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">

        {/* ── Left: Knowledge Base ── */}
        <div className="rounded-3xl border border-black/[0.07] bg-white/70 backdrop-blur-md overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-black/[0.05]">
            <div className="flex items-baseline gap-2">
              <h2 className="text-lg font-bold text-slate-800">Knowledge Base</h2>
              <span className="text-sm text-slate-400">{filtered.length} items</span>
            </div>
            <div className="flex items-center gap-2">
              {["Documents", "Graph", "Queries"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-xl px-3 py-1 text-sm font-medium transition-all ${
                    activeTab === tab
                      ? "bg-slate-100 text-slate-800 shadow-sm"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 py-4 border-b border-black/[0.05] flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents…"
                className="w-full rounded-xl border border-black/[0.07] bg-slate-50 pl-8 pr-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <Link
              href="/ingest"
              className="flex items-center gap-1.5 rounded-xl border border-dashed border-black/[0.15] bg-white px-3 py-2 text-xs font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-all"
            >
              <Upload className="h-3.5 w-3.5" />
              Add
            </Link>
          </div>

          {activeTab === "Documents" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-5">
              {filtered.map((doc) => {
                const Icon = FILE_ICONS[doc.type] ?? FileText;
                const catColor = CATEGORY_COLORS[doc.category] ?? "bg-gray-100 text-gray-600";
                return (
                  <div
                    key={doc.name}
                    className="group flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-white p-4 hover:shadow-md hover:border-black/[0.12] transition-all cursor-default"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 border border-black/[0.06]">
                        <Icon className="h-5 w-5 text-slate-500" />
                      </div>
                      <span className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold ${catColor}`}>
                        {doc.category}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">{doc.name}</p>
                      <p className="mt-1 text-[11px] text-slate-400 uppercase tracking-wide">.{doc.type}</p>
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-black/[0.05]">
                      <span className="text-[11px] text-slate-400">{doc.chunks} chunks</span>
                      <Link
                        href={`/chat?q=${encodeURIComponent(doc.name)}`}
                        className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 transition-colors"
                      >
                        Ask <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "Graph" && (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 border border-black/[0.06]">
                <GitBranch className="h-6 w-6 text-slate-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-700">Knowledge Graph</p>
                <p className="text-sm text-slate-400 mt-1">~48 nodes · Equipment, Regulations, People</p>
              </div>
              <Link
                href="/graph"
                className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
              >
                Explore Graph <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {activeTab === "Queries" && (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 border border-black/[0.06]">
                <MessageSquare className="h-6 w-6 text-slate-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-700">Ask a question</p>
                <p className="text-sm text-slate-400 mt-1">Get cited answers from your corpus</p>
              </div>
              <Link
                href="/chat"
                className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
              >
                Open Q&A <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>

        {/* ── Right: Activity ── */}
        <div className="rounded-3xl border border-black/[0.07] bg-white/70 backdrop-blur-md overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-black/[0.05]">
            <h2 className="text-lg font-bold text-slate-800">Activity</h2>
            <div className="flex items-center gap-2">
              {[
                { icon: MessageSquare, href: "/chat", label: "Ask" },
                { icon: GitBranch, href: "/graph", label: "Graph" },
                { icon: ShieldCheck, href: "/compliance", label: "Audit" },
                { icon: Upload, href: "/ingest", label: "Ingest" },
              ].map(({ icon: Icon, href, label }) => (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-black/[0.07] bg-white/80 text-slate-500 hover:bg-white hover:text-slate-800 transition-all"
                >
                  <Icon className="h-3.5 w-3.5" />
                </Link>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {/* Infrastructure status */}
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-1">
              Infrastructure
            </p>
            {[
              { key: "qdrant", label: "Qdrant Vector Store", icon: Database },
              { key: "neo4j", label: "Neo4j Graph DB", icon: GitBranch },
              { key: "redis", label: "Redis Cache", icon: Activity },
            ].map(({ key, label, icon: Icon }) => {
              const status = health?.[key];
              const isOk = status === "ok";
              const isLoading = status === undefined;
              return (
                <div
                  key={key}
                  className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white p-3.5"
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${isOk ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-black/[0.06]"}`}>
                    <Icon className={`h-4 w-4 ${isOk ? "text-emerald-500" : "text-slate-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700">{label}</p>
                    <p className={`text-[11px] font-medium ${isLoading ? "text-slate-400" : isOk ? "text-emerald-600" : "text-red-500"}`}>
                      {isLoading ? "checking…" : isOk ? "online" : "offline"}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                </div>
              );
            })}

            {/* Quick actions */}
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-1 pt-2">
              Quick Actions
            </p>

            <Link href="/demo" className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-violet-50 hover:bg-violet-100 p-3.5 transition-colors group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-200 border border-violet-200">
                <Activity className="h-4 w-4 text-violet-700" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-violet-800">Run Guided Demo</p>
                <p className="text-[11px] text-violet-500">4 steps · ~3 min walkthrough</p>
              </div>
              <ChevronRight className="h-4 w-4 text-violet-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link href="/compliance" className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-amber-50 hover:bg-amber-100 p-3.5 transition-colors group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-200 border border-amber-200">
                <ShieldCheck className="h-4 w-4 text-amber-700" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-800">Compliance Audit</p>
                <p className="text-[11px] text-amber-500">23 requirements · OISD / Factories Act</p>
              </div>
              <ChevronRight className="h-4 w-4 text-amber-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link href="/chat" className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-sky-50 hover:bg-sky-100 p-3.5 transition-colors group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-200 border border-sky-200">
                <MessageSquare className="h-4 w-4 text-sky-700" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-sky-800">Ask the Corpus</p>
                <p className="text-[11px] text-sky-500">Cited answers with confidence scores</p>
              </div>
              <ChevronRight className="h-4 w-4 text-sky-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
