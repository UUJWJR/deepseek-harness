# @deepseek-ai/dsh-kb

English | [中文](README.zh.md)

Service Definition for the knowledge base capability. A knowledge base is a named local document root (a vault) whose markdown is split into heading-delimited chunks and full-text indexed for retrieval. `KnowledgeBaseRegistry` owns the named set and each base's index state; a provider implements `index()` and `retrieve()` on the same `ctx.knowledgeBases` service.

## Domain vocabulary

- **knowledge base** — a named document root with a `ready | indexing | error` index state.
- **chunk** — one `##`-delimited section of a markdown file.
- **retrieval hint** — a candidate file path plus a match snippet; a starting cue an agent verifies by reading, never answer material.

`register(name, root)` validates a kebab-case name and an absolute root and returns a disposer; `list()` and `get(name)` return immutable snapshots. `index(name, signal?)` and `retrieve(name, request, signal?)` are abstract, implemented by a provider such as [`@deepseek-ai/dsh-kb-sqlite`](../kb-sqlite/README.md). `KnowledgeBaseError.code` is a closed union covering invalid names and roots, duplicates, missing bases, and index failures.

## Model Experience

None, as the registry owns the named knowledge base set and returns snapshots and hints only to its callers; it registers no model-facing prompt, schema, tool, or message.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **No provider coordinator** — this is an abstract Service Definition with no fallback implementation; a concrete provider must implement `index()` and `retrieve()`.
- **No authorization** — this is a trusted context-wide service; a model tool or UI must enforce its own access policy.
