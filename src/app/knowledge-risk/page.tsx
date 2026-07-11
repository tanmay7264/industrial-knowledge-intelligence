"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronRight,
  User,
  Clock,
  Wrench,
  FileWarning,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { KnowledgeRiskReport } from "@/lib/agents/knowledge-risk";

function riskColor(score: number): string {
  if (score >= 80) return "bg-red-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-emerald-500";
}

export default function KnowledgeRiskPage() {
  const [report, setReport] = useState<KnowledgeRiskReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/knowledge-risk")
      .then((r) => r.json())
      .then((d) => setReport(d.report ?? null))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(135deg, #b8f0dc 0%, #d8d4f4 45%, #ead4f8 100%)" }}
    >
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-800">
            Knowledge Risk Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            When experts retire, knowledge shouldn&apos;t. Track critical expertise at risk.
          </p>
        </div>

        {loading && (
          <p className="text-slate-500 text-sm">Loading knowledge risk report…</p>
        )}

        {report && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Experts Tracked", value: report.expertsTracked, icon: User },
                {
                  label: "Aggregate Risk",
                  value: `${report.aggregateRiskScore}%`,
                  icon: AlertTriangle,
                },
                {
                  label: "Incidents Indexed",
                  value: report.incidentsIndexed,
                  icon: Wrench,
                },
                {
                  label: "Missing Docs",
                  value: report.missingKnowledge.length,
                  icon: FileWarning,
                },
              ].map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm"
                >
                  <Icon className="h-4 w-4 text-slate-400 mb-2" />
                  <p className="font-heading text-2xl font-bold text-slate-800">{value}</p>
                  <p className="text-xs text-slate-500 mt-1">{label}</p>
                </div>
              ))}
            </div>

            <div>
              <h2 className="font-heading text-lg font-semibold text-slate-800 mb-3">
                Experts Retiring Soon
              </h2>
              <div className="space-y-3">
                {report.experts.map((expert) => (
                  <div
                    key={expert.id}
                    className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-heading font-bold text-slate-800">{expert.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {expert.experienceYears} years experience ·{" "}
                          {expert.incidentsSolved} incidents solved
                        </p>
                      </div>
                      <Badge className={`${riskColor(expert.knowledgeRiskScore)} text-white`}>
                        {expert.knowledgeRiskScore}% risk
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-600">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Retiring in {expert.retiringInMonths} months
                      </span>
                      <span>
                        Assets: {expert.assetsManaged.join(", ")}
                      </span>
                    </div>
                    {expert.missingDocumentation.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-xs font-semibold text-amber-700 mb-1">
                          Missing documentation
                        </p>
                        <ul className="text-xs text-slate-600 space-y-1">
                          {expert.missingDocumentation.map((gap) => (
                            <li key={gap}>• {gap}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-heading text-lg font-semibold text-slate-800 mb-3">
                Critical Assets
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {report.criticalAssets.map(({ asset, expertCount, riskLevel }) => (
                  <Link
                    key={asset}
                    href={`/playbook?q=${encodeURIComponent(`${asset} operational issue`)}`}
                    className="rounded-xl border border-white/60 bg-white/70 p-4 hover:bg-white transition-colors group"
                  >
                    <p className="font-heading font-bold text-slate-800">{asset}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {expertCount} expert(s) · {riskLevel} risk
                    </p>
                    <ChevronRight className="h-4 w-4 text-slate-400 mt-2 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                ))}
              </div>
            </div>

            <Link
              href="/ingest"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 text-white px-4 py-2.5 text-sm font-medium hover:bg-slate-700"
            >
              Capture expert knowledge via Ingest
              <ChevronRight className="h-4 w-4" />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
