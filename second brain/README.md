# VELCORA SECOND BRAIN

A standalone, production-grade persistent knowledge, reasoning, and memory architecture for the Velcora Retail & POS Ecosystem.

```text
SOURCE
 ↓
INGEST
 ↓
EXTRACT
 ↓
CONNECT
 ↓
STORE
 ↓
UPDATE
 ↓
RETRIEVE
 ↓
REASON
 ↓
LEARN
```

## Architectural Overview

- **Storage Layers**:
  - `raw/`: Immutable raw sources (documents, conversations, business ledgers, studio assets)
  - `wiki/`: Structured Markdown knowledge pages with YAML frontmatter and `[[wikilinks]]` across entities, concepts, topics, decisions, insights, sources, syntheses, and conversations
  - `memory/`: Tiered memory system with `permanent`, `contextual`, `temporary`, and `user` private spaces
  - `schemas/`: JSON schemas for memory, source, entity, relationship, and event models

- **Core Capabilities**:
  - **Memory Classification**: Temporary, Context, Memory, Knowledge, Decision, Insight
  - **Conflict & Contradiction Resolution**: Preserves conflicting claims with provenance, source, confidence, and authority tiers (PRIMARY, SECONDARY, USER_PROVIDED, SYSTEM_GENERATED, INFERRED) without silent overwriting
  - **Graph Relationships & Backlinks**: Multi-hop bidirectional entity linking and query expansion
  - **Continuous Learning**: Extracts durable decisions and facts while ignoring trivial conversational noise
  - **Health & Linting**: Automated checks for broken wikilinks, orphan pages, malformed frontmatter, schema violations, stale memories, and unresolved contradictions

## API Endpoints

- `GET /health` — Full health and graph integrity diagnostics
- `POST /memory/ingest` — Ingest raw sources into memory and wiki
- `POST /memory/store` — Store structured memories
- `POST /memory/update` — Update or reclassify memory
- `POST /memory/query` — Compact relevance query
- `GET /memory/search` — Unified search across wiki and memories
- `GET /memory/context` — Build grounding context for AI reasoning
- `GET /memory/entity/:id` — Retrieve wiki entity by slug/ID
- `GET /memory/topic/:id` — Retrieve wiki topic by slug/ID
- `POST /memory/relationships` — Create graph edge
- `GET /memory/relationships/:id` — Get graph neighbors
- `POST /memory/lint` — Execute health and consistency audit
- `POST /memory/synthesize` — Generate strategic wiki synthesis
- `POST /memory/learn` — Evaluate conversation for durable knowledge
