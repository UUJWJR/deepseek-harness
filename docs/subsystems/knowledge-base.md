# Knowledge Base

English | [中文](knowledge-base.zh.md)

Knowledge base vocabulary: a named local document root whose markdown is split into heading-delimited chunks and full-text indexed. The [Service Definition package](../../packages/kb/kb) owns the named registry and each base's index state, the [SQLite provider](../../packages/kb/kb-sqlite) owns the concrete FTS5 trigram index and retrieval, and the [kb-agent consumer](../../packages/kb/kb-agent) owns the read-only answering tool.

Source: [`packages/kb/kb/src/types.ts`](../../packages/kb/kb/src/types.ts)

## Domain vocabulary

- **knowledge base** — a named document root with a `ready | indexing | error` index state.
- **chunk** — one `##`-delimited section of a markdown file.
- **retrieval hint** — a ranked candidate path plus a match snippet; a starting cue an agent verifies by reading, never answer material.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — this section is byte-identical in both language sides of the page. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxknowledgebases--knowledgebaseregistry-abstract-seam"></a>

### `ctx.knowledgeBases` — `KnowledgeBaseRegistry` (abstract seam)

Knowledge base registry service. Backend-independent members own the named set and its state; a provider implements indexing and retrieval.

```ts cordis-catalog
/**
 * Register a named knowledge base and return its disposer.
 * @param name - kebab-case name.
 * @param root - absolute path to the document root.
 * @returns the disposer that unregisters the knowledge base.
 */
register(name: string, root: string): () => void

/**
 * List every registered knowledge base in registration order.
 * @returns immutable knowledge base snapshots.
 */
list(): readonly KnowledgeBase[]

/**
 * Resolve one registered knowledge base.
 * @param name - kebab-case name.
 * @returns the knowledge base snapshot, or undefined when unregistered.
 */
get(name: string): KnowledgeBase | undefined

/**
 * Rebuild one knowledge base's full-text index.
 * @param name - registered knowledge base name.
 * @param signal - optional cancellation.
 * @returns resolution once the index is rebuilt and the state is ready or error.
 */
abstract index(name: string, signal?: AbortSignal): Promise<void>

/**
 * Retrieve ranked hints for one query.
 * @param name - registered knowledge base name.
 * @param request - query text and optional limit.
 * @param signal - optional cancellation.
 * @returns ranked retrieval hints.
 */
abstract retrieve(name: string, request: RetrieveRequest, signal?: AbortSignal): Promise<RetrieveResult>
```

Source: [`packages/kb/kb/src/index.ts:41`](../../packages/kb/kb/src/index.ts)
<!-- END GENERATED cordis-surface -->
