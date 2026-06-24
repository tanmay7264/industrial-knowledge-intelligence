# Roadmap & Scope

Scope discipline is a feature. IKI ships three working, end-to-end capabilities —
cited question-answering, a knowledge graph with GraphRAG, and a compliance gap auditor —
rather than five half-built ones. The items below are deliberately **out of scope
for this build** and called out here as roadmap.

## Deliberately not built (yet)

| Capability | Status | Why deferred |
| --- | --- | --- |
| Full P&ID / engineering-drawing understanding | **Out of scope.** Today we OCR tag callouts from scans (text layer); we do not do computer-vision parsing of drawing symbols, line connectivity, or instrument loops. | Drawing-CV is a research-grade effort on its own. Tag-level OCR already feeds the graph with the entities that matter for retrieval. |
| Maintenance RCA agent & Lessons-Learned engine | **Roadmap.** We ingest incident and near-miss reports and surface them in retrieval, but we do not yet run an automated root-cause-analysis agent or a cross-incident lessons-learned synthesis. | Builds naturally on the compliance agent pattern; needs a labelled incident corpus to evaluate against. |
| Live CMMS / DMS connectors | **Architected, not built.** Ingestion is connector-ready; today it runs on uploads and the seed corpus. | Real connectors (SAP PM, Maximo, SharePoint/DMS) are integration work, not core IP. The async-queue design in [SCALABILITY.md](./SCALABILITY.md) is built for them. |
| Tacit knowledge capture from speech/conversations | **Future phase.** The retiring-engineer knowledge cliff is the long-term prize; capturing it from interviews/handover calls (ASR → extraction → graph) is a later phase. | High value, but depends on the document foundation being solid first. |

## What this enables next

The same provider abstraction, ingestion pipeline, graph schema, and agent pattern
that power the current three capabilities are the substrate for all four roadmap
items — each is an additional ingestion source or an additional agent over the
existing corpus, not a rebuild.

See [architecture.md](./architecture.md) for the current system and
[SCALABILITY.md](./SCALABILITY.md) for the path to production scale.
