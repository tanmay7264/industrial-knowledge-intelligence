/**
 * End-to-end smoke test for IKI — run with: npx tsx scripts/e2e-test.ts
 * Exits 0 if all checks pass, 1 otherwise.
 */

const BASE = process.env.IKI_BASE_URL ?? "http://localhost:3002";

type Result = { name: string; ok: boolean; detail?: string; ms?: number };

const results: Result[] = [];

function pass(name: string, detail?: string, ms?: number) {
  results.push({ name, ok: true, detail, ms });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}${ms != null ? ` (${ms}ms)` : ""}`);
}

function fail(name: string, detail?: string) {
  results.push({ name, ok: false, detail });
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

async function timed<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const t0 = Date.now();
  const value = await fn();
  return { value, ms: Date.now() - t0 };
}

async function getJson<T>(path: string, expectStatus = 200): Promise<{ data: T; status: number; ms: number }> {
  const { value: res, ms } = await timed(() => fetch(`${BASE}${path}`));
  const data = (await res.json()) as T;
  if (res.status !== expectStatus) {
    throw new Error(`GET ${path} → ${res.status}, expected ${expectStatus}: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return { data, status: res.status, ms };
}

async function postJson<T>(path: string, body: unknown, expectStatus = 200): Promise<{ data: T; status: number; ms: number }> {
  const { value: res, ms } = await timed(() =>
    fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
  const data = (await res.json()) as T;
  if (res.status !== expectStatus) {
    throw new Error(`POST ${path} → ${res.status}, expected ${expectStatus}: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return { data, status: res.status, ms };
}

async function checkPage(path: string) {
  const { value: res, ms } = await timed(() => fetch(`${BASE}${path}`));
  if (res.status !== 200) throw new Error(`GET ${path} → ${res.status}`);
  const html = await res.text();
  if (!html.includes("<html") && !html.includes("<!DOCTYPE")) {
    throw new Error(`GET ${path} did not return HTML`);
  }
  return ms;
}

interface SseChatResult {
  answer: string;
  sources: unknown[];
  confidence?: string;
  abstained?: boolean;
  mode?: string;
  error?: boolean;
}

async function chatQuery(query: string, timeoutMs = 90_000): Promise<SseChatResult & { ms: number }> {
  const t0 = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    });

    const ct = res.headers.get("content-type") ?? "";

    // Cached responses come back as JSON
    if (ct.includes("application/json")) {
      const data = (await res.json()) as SseChatResult & { cached?: boolean };
      if (res.status !== 200) throw new Error(`chat JSON ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
      return { ...data, ms: Date.now() - t0 };
    }

    if (!res.ok || !res.body) throw new Error(`chat SSE ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let answer = "";
    let meta: Record<string, unknown> = {};
    let done: Record<string, unknown> = {};

    while (true) {
      const { done: eof, value } = await reader.read();
      if (eof) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const block of parts) {
        const lines = block.split("\n");
        let event = "message";
        let data = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) event = line.slice(7);
          if (line.startsWith("data: ")) data = line.slice(6);
        }
        if (!data) continue;
        const parsed = JSON.parse(data) as Record<string, unknown>;
        if (event === "meta") meta = parsed;
        if (event === "text" && typeof parsed.chunk === "string") answer += parsed.chunk;
        if (event === "done") done = parsed;
      }
    }

    return {
      answer,
      sources: (meta.sources as unknown[]) ?? [],
      confidence: done.confidence as string | undefined,
      abstained: done.abstained as boolean | undefined,
      mode: (meta.mode ?? done.mode) as string | undefined,
      ms: Date.now() - t0,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log(`\nIKI E2E — ${BASE}\n`);

  // ── 1. Health ──────────────────────────────────────────────────────────────
  console.log("1. Infrastructure");
  try {
    const { data, ms } = await getJson<Record<string, string>>("/api/health");
    const allOk = Object.values(data).every((v) => v === "ok");
    if (!allOk) throw new Error(JSON.stringify(data));
    pass("Health endpoint", `qdrant/neo4j/redis ok`, ms);
  } catch (e) {
    fail("Health endpoint", e instanceof Error ? e.message : String(e));
  }

  // ── 2. Stats ───────────────────────────────────────────────────────────────
  console.log("\n2. Corpus stats");
  try {
    const { data, ms } = await getJson<{
      documents: number;
      chunks: number;
      graphNodes: number;
      expertsTracked: number;
      incidentsIndexed: number;
      knowledgeRiskScore: number;
    }>("/api/stats");
    if (data.documents < 1 || data.chunks < 1) {
      throw new Error(`empty corpus: ${JSON.stringify(data)}`);
    }
    pass(
      "Stats",
      `${data.documents} docs, ${data.expertsTracked} experts, ${data.incidentsIndexed} incidents, risk ${data.knowledgeRiskScore}%`,
      ms
    );
  } catch (e) {
    fail("Stats", e instanceof Error ? e.message : String(e));
  }

  // ── 3. Pages ───────────────────────────────────────────────────────────────
  console.log("\n3. Page routes");
  for (const path of [
    "/",
    "/command",
    "/copilot",
    "/query",
    "/chat",
    "/assets",
    "/assets/P-301",
    "/rca",
    "/incidents",
    "/alerts",
    "/documents",
    "/playbook",
    "/knowledge-risk",
    "/graph",
    "/compliance",
    "/ingest",
    "/demo",
  ]) {
    try {
      const ms = await checkPage(path);
      pass(`Page ${path}`, undefined, ms);
    } catch (e) {
      fail(`Page ${path}`, e instanceof Error ? e.message : String(e));
    }
  }

  // ── 4. Graph API ───────────────────────────────────────────────────────────
  console.log("\n4. Graph API");
  try {
    const { data, ms } = await getJson<{ nodes: unknown[]; edges: unknown[] }>(
      "/api/graph?term=P-101"
    );
    if (!data.nodes?.length) throw new Error("no nodes returned for P-101");
    pass("Graph neighborhood", `${data.nodes.length} nodes, ${data.edges?.length ?? 0} edges`, ms);
  } catch (e) {
    fail("Graph neighborhood", e instanceof Error ? e.message : String(e));
  }

  // ── 5. Chat (demo queries) ─────────────────────────────────────────────────
  console.log("\n5. Chat API");
  const chatCases = [
    {
      name: "Factual lookup",
      query: "What is the preventive maintenance interval for the mechanical seal on hydraulic pump P-101?",
      expect: (r: SseChatResult) =>
        r.answer.length > 20 &&
        !r.answer.startsWith("⚠️") &&
        r.sources.length > 0 &&
        !r.abstained,
    },
    {
      name: "Graph/hybrid query",
      query: "Which regulations govern pressure vessel V-201, and which documents mention it?",
      expect: (r: SseChatResult) =>
        r.answer.length > 20 &&
        !r.answer.startsWith("⚠️") &&
        r.sources.length > 0,
    },
    {
      name: "Abstain (off-corpus)",
      query: "What is the resale value of the plant manager's company car?",
      expect: (r: SseChatResult) =>
        r.abstained === true ||
        /not found in the knowledge base/i.test(r.answer),
    },
  ];

  for (const tc of chatCases) {
    try {
      const result = await chatQuery(tc.query);
      if (!tc.expect(result)) {
        throw new Error(
          `unexpected response: abstained=${result.abstained}, sources=${result.sources.length}, answer=${result.answer.slice(0, 120)}…`
        );
      }
      pass(
        tc.name,
        `mode=${result.mode ?? "?"}, conf=${result.confidence ?? "?"}, ${result.sources.length} sources`,
        result.ms
      );
    } catch (e) {
      fail(tc.name, e instanceof Error ? e.message : String(e));
    }
  }

  // ── 6. Industrial Brain APIs ───────────────────────────────────────────────
  console.log("\n6. Industrial Brain APIs");
  try {
    const { data, ms } = await getJson<{ kpis: { connectedAssets: number } }>("/api/command");
    if (!data.kpis?.connectedAssets) throw new Error("missing command KPIs");
    pass("Command GET", `${data.kpis.connectedAssets} assets`, ms);
  } catch (e) {
    fail("Command GET", e instanceof Error ? e.message : String(e));
  }

  try {
    const { data, ms } = await getJson<{ asset: { tag: string } }>("/api/asset/P-301");
    if (data.asset?.tag !== "P-301") throw new Error("P-301 asset not found");
    pass("Asset P-301 GET", data.asset.tag, ms);
  } catch (e) {
    fail("Asset P-301 GET", e instanceof Error ? e.message : String(e));
  }

  try {
    const { data, ms } = await getJson<{ alerts: unknown[] }>("/api/alerts");
    pass("Alerts GET", `${data.alerts?.length ?? 0} alerts`, ms);
  } catch (e) {
    fail("Alerts GET", e instanceof Error ? e.message : String(e));
  }

  try {
    const { data, ms } = await getJson<{ incidents: unknown[] }>("/api/incidents");
    pass("Incidents GET", `${data.incidents?.length ?? 0} incidents`, ms);
  } catch (e) {
    fail("Incidents GET", e instanceof Error ? e.message : String(e));
  }

  try {
    console.log("   (running P-301 RCA — may take 15-30s…)");
    const { data, ms } = await postJson<{
      primaryHypothesis: string;
      confidence: number;
    }>("/api/rca", { query: "Why does Pump P-301 keep failing?", asset: "P-301" });
    if (!data.primaryHypothesis || data.confidence < 70) {
      throw new Error(`weak RCA: conf=${data.confidence}, hypothesis=${data.primaryHypothesis?.slice(0, 80)}`);
    }
    pass("RCA POST P-301", `${data.confidence}% — ${data.primaryHypothesis.slice(0, 60)}…`, ms);
  } catch (e) {
    fail("RCA POST P-301", e instanceof Error ? e.message : String(e));
  }

  // ── 7. Operational Playbook ────────────────────────────────────────────────
  console.log("\n7. Operational Playbook");
  try {
    const { data, ms } = await postJson<{
      playbook: {
        asset: string;
        issue: string;
        mostCommonRootCause: string;
        expertRecommendation: string;
        confidenceScore: number;
        supportingEvidence: unknown[];
      };
    }>("/api/playbook", { query: "Pump P-101 vibration increasing" });
    const p = data.playbook;
    if (!p.asset || !p.mostCommonRootCause || !p.expertRecommendation) {
      throw new Error(`incomplete playbook: ${JSON.stringify(p).slice(0, 200)}`);
    }
    pass(
      "Playbook POST",
      `${p.asset} — ${p.confidenceScore}% conf, ${p.supportingEvidence.length} evidence`,
      ms
    );
  } catch (e) {
    fail("Playbook POST", e instanceof Error ? e.message : String(e));
  }

  // ── 8. Knowledge Risk ──────────────────────────────────────────────────────
  console.log("\n8. Knowledge Risk");
  try {
    const { data, ms } = await getJson<{
      report: { experts: { name: string; knowledgeRiskScore: number }[] };
    }>("/api/knowledge-risk");
    const sharma = data.report.experts.find((e) => /sharma/i.test(e.name));
    if (!sharma || sharma.knowledgeRiskScore < 1) {
      throw new Error("Engineer Sharma not found in risk report");
    }
    pass("Knowledge Risk GET", `Sharma ${sharma.knowledgeRiskScore}% risk`, ms);
  } catch (e) {
    fail("Knowledge Risk GET", e instanceof Error ? e.message : String(e));
  }

  // ── 9. Compliance ──────────────────────────────────────────────────────────
  console.log("\n9. Compliance scan");
  try {
    const { data, ms } = await getJson<{ report: unknown; cached: boolean }>(
      "/api/compliance/scan"
    );
    pass("Compliance GET", data.report ? "cached report present" : "no cache yet (ok)", ms);
  } catch (e) {
    fail("Compliance GET", e instanceof Error ? e.message : String(e));
  }

  try {
    console.log("   (running fresh compliance scan — may take 1-3 min…)");
    const t0 = Date.now();
    const res = await fetch(`${BASE}/api/compliance/scan`, { method: "POST" });
    const data = (await res.json()) as {
      report?: { summary: Record<string, number>; totalRequirements: number };
      error?: string;
    };
    const ms = Date.now() - t0;
    if (!res.ok || data.error) throw new Error(data.error ?? `status ${res.status}`);
    if (!data.report?.totalRequirements) throw new Error("empty compliance report");
    const s = data.report.summary;
    pass(
      "Compliance POST",
      `${data.report.totalRequirements} reqs — covered=${s.COVERED ?? 0} partial=${s.PARTIAL ?? 0} gap=${s.GAP ?? 0}`,
      ms
    );
  } catch (e) {
    fail("Compliance POST", e instanceof Error ? e.message : String(e));
  }

  // ── 10. Ingest ─────────────────────────────────────────────────────────────
  console.log("\n10. Ingest API");
  try {
    const fs = await import("fs");
    const path = await import("path");
    const samplePath = path.join(process.cwd(), "sample-docs", "INCIDENT-NEARMISS-HX201.txt");
    const buf = fs.readFileSync(samplePath);
    const blob = new Blob([buf], { type: "text/plain" });
    const form = new FormData();
    form.append("files", blob, "INCIDENT-NEARMISS-HX201.txt");

    const t0 = Date.now();
    const res = await fetch(`${BASE}/api/ingest`, { method: "POST", body: form });
    const data = (await res.json()) as { results: { status: string; fileName: string; error?: string }[] };
    const ms = Date.now() - t0;
    if (!res.ok && res.status !== 207) throw new Error(`status ${res.status}`);
    const r = data.results[0];
    if (!r || r.status !== "success") throw new Error(r?.error ?? "ingest failed");
    pass("Ingest sample doc", r.fileName, ms);
  } catch (e) {
    fail("Ingest sample doc", e instanceof Error ? e.message : String(e));
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${"─".repeat(50)}`);
  console.log(`Results: ${passed}/${results.length} passed`);
  if (failed.length) {
    console.log("\nFailures:");
    for (const f of failed) console.log(`  • ${f.name}: ${f.detail}`);
    process.exit(1);
  }
  console.log("All checks passed.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
