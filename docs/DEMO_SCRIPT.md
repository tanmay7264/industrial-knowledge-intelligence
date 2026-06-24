# IKI — 3-Minute Demo Script

A spoken walkthrough mapped to the judging criteria. Total budget ~180 seconds.
Every step is reproducible from the **/demo** page, which runs the four queries below.

## Before you start (pre-flight)

1. `docker compose up -d` — Qdrant, Neo4j, Redis (wait ~20s for Neo4j).
2. Real keys in `.env.local` (`GROQ_API_KEY`, `JINA_API_KEY`) — **do this first**, see risks below.
3. `npm run seed` — ingests the sample corpus into the vector store and graph.
4. `npm run dev`, open `/` then `/demo`. Optionally pre-run all 4 steps once so the
   semantic cache makes the live run instant.

---

## 0:00–0:20 — The problem (sets up Business Impact)

> "Plant engineers lose about a third of their time just *finding* information —
> it's scattered across 7 to 12 disconnected systems: PDFs, scans, spreadsheets,
> email. And as senior engineers retire, decades of undocumented know-how walks
> out the door. IKI turns all of that into one system you can actually ask."

Show the **landing page** — the three problem stats, then click **Run the Guided Demo**.

## 0:20–0:50 — Cited Q&A (UX 15% + Technical Excellence 20%)

Run **Step 1 — factual lookup**:
> *"What is the preventive maintenance interval for the mechanical seal on hydraulic pump P-101?"*

> "Plain-language question, grounded answer — note the inline citation and the
> confidence badge. Click the source: it's the exact snippet, file, and section.
> No answer without a receipt. This view is mobile-first — it's the field
> technician's tool on a phone next to the equipment."

## 0:50–1:30 — The graph contrast (Innovation 25% — the money shot)

Run **Step 2 — multi-hop graph query**:
> *"Which regulations govern pressure vessel V-201, and which documents mention it?"*

> "This is where we go beyond 'chat with a PDF.' That's a *relationship* question —
> equipment, to the regulations that govern it, to every document that touches it.
> Our router detects it needs the knowledge graph and returns this subgraph live.
> A pure vector RAG tool can't answer this — it has no idea these entities are
> connected. This is cross-functional discovery."

Let the subgraph render; trace one equipment → regulation → document edge by hand.

## 1:30–2:00 — Honest abstain (Business Impact 25% — trust)

Run **Step 3 — off-corpus question**:
> *"What is the resale value of the plant manager's company car?"*

> "Watch what it does *not* do. It says 'Not found in the knowledge base' instead
> of inventing an answer. In a safety and compliance context, a confident wrong
> answer is worse than 'I don't know.' That honesty is a feature."

## 2:00–2:35 — Compliance gap detection (Business Impact 25%)

Run **Step 4 — compliance scan**, then open the **/compliance** dashboard:
> "Now the business case. This agent checks every regulatory requirement — OISD
> standards, the Factory Act, API 510 — against the actual records, and labels each
> Covered, Partial, Gap, or Unknown, *with evidence*. It's deliberately
> conservative: if there's no evidence, it says Unknown, never a false gap. Click a
> gap — you see exactly why and the documents it examined. Then 'Export Audit Pack'
> hands an auditor the certified items with citations."

## 2:35–3:00 — Architecture & scale (Technical Excellence 20% + Scalability 15%)

Open **/architecture**:
> "Under the hood: one ingestion pipeline feeds both a vector store and a knowledge
> graph; an agentic router picks vector, graph, or hybrid. The key design choice is
> this provider seam — every model call goes through one function, so flipping one
> env var runs the whole thing on **on-prem open models**. For a refinery, plant
> data never leaves the network. Hash-based dedup means we never re-embed unchanged
> docs, a semantic cache and small-model routing keep cost down, and it scales out
> with a Redis queue and managed Qdrant/Neo4j. That's the path from this demo to a
> multi-plant deployment."

---

## Criteria coverage map

| Criterion | Weight | Where it lands in the script |
| --- | --- | --- |
| Innovation | 25% | 0:50–1:30 graph contrast (multi-hop the graph answers, vector can't) |
| Business Impact | 25% | 1:30–2:35 honest abstain + compliance gap detection + knowledge-cliff intro |
| Technical Excellence | 20% | 0:20–0:50 grounded citations + 2:35–3:00 architecture walkthrough |
| Scalability | 15% | 2:35–3:00 provider seam, dedup, caching, queue, managed stores |
| UX | 15% | 0:20–0:50 mobile-first cited Q&A + the guided demo flow itself |

## Closing line — scope discipline (roadmap)

> "We deliberately shipped three capabilities that work end to end rather than five
> that don't. On the roadmap: full P&ID drawing understanding (today we OCR tag
> callouts), a maintenance RCA and lessons-learned engine, live CMMS/DMS
> connectors — already architected for in our scalability design — and capturing
> tacit knowledge from retiring engineers' conversations. Same foundation, more
> sources and agents on top."

See [ROADMAP.md](./ROADMAP.md) for the full out-of-scope list and rationale.

## If you have only 60 seconds

Landing problem stats → Step 2 (graph contrast) → Step 4 (compliance scan). Those
two carry Innovation and Business Impact, 50% of the score.
