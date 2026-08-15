# Agent Note: Knowledge base capability — FTS5 trigram retrieval with a read-only subagent

Status: implemented

English | [中文](2026-08-15-knowledge-base-capability.zh.md)

## Problem

EasyWork's knowledge base capability (ADR 0004 retrieval, 0005 import digestion, 0006 KbAgent) needed to land in DSH. The blueprints' hard-won conclusion is that FTS5 trigram beats embedding for this document size, and that a read-only agent exploring the vault with native tools beats any hand-written search runtime. DSH has an FTS5 precedent (session-query) but no knowledge base service.

## Decision

Ship a new capability seam under the `kb` group:

- `@deepseek-ai/dsh-kb` — Service Definition. `KnowledgeBaseRegistry` owns the named knowledge base set and each base's `ready | indexing | error` state; `index()` and `retrieve()` are abstract.
- `@deepseek-ai/dsh-kb-sqlite` — Provider. One self-contained SQLite file per base at `<indexDir>/<name>.sqlite`, indexed with FTS5 `trigram` and ranked by `bm25()`. `index()` scans markdown, splits each file into `##`-delimited chunks, and rebuilds in one transaction.
- `@deepseek-ai/dsh-kb-agent` — Consumer. The `kb-ask` tool resolves a base, ensures it is indexed, retrieves ranked hints, then starts a read-only subagent on the `spawn` provider with `toolFilter { allow: ['read', 'grep', 'glob'] }` and returns the child's answer.

Retrieval follows ADR 0004: FTS5 trigram (no embedding), chunks split by `##`, top-N hints. Answering follows ADR 0006: reuse the harness through a read-only subagent, with retrieval hints framed as imprecise starting cues rather than answer material. The base bundle mounts `kb-sqlite` (indexDir defaulting to `~/.dsh/kb/`) and `kb-agent` (`provider: spawn`).

## Alternatives considered

**Embedding or vector search.** Rejected: ADR 0004's rationale (external API cost, indexing latency, operational burden) holds, and DSH has no vector infrastructure to reuse.

**A standalone KB runtime.** Rejected: ADR 0006 documents three abandoned hand-written runtimes and concludes the native harness wins; DSH's `ctx.tools.restrict()` gives the read-only tool surface for free.

**Store chunks in `ctx.storage`.** Rejected: the storage hub is a key-value store and cannot host FTS5 virtual tables; the index needs its own `node:sqlite` file, mirroring session-query.

**Port the ConceptIndex.** Deferred: it is an EasyWork-specific generated asset (112 concept-to-file mappings) and not required for the core retrieval loop.

## Consequences

The read-only KB question loop works end-to-end: `kb-ask` spawns a child that can only read/grep/glob, so write and execution tools are absent from its prompt and refuse to execute. Trigram matches arbitrary substrings, so Chinese and mixed text search without a segmenter. Two deviations from ADR 0006 are recorded: the child's working directory is prompt-carried (the subagent seam derives cwd from the parent and offers no per-child override), and read-only is a tool-surface restriction rather than an OS-level sandbox. Trigram has no semantic understanding, matching ADR 0004's stated limitation. Import digestion (ADR 0005) and the KB GUI selector remain deferred.
