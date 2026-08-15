# 知识库

[English](knowledge-base.md) | 中文

知识库词汇：一个命名的本地文档根目录，其 markdown 被切分为以标题分隔的分片并做全文索引。[Service Definition 包](../../packages/kb/kb) 拥有命名注册表与每个知识库的索引状态，[SQLite 提供方](../../packages/kb/kb-sqlite) 拥有具体的 FTS5 trigram 索引与检索，[kb-agent 消费方](../../packages/kb/kb-agent) 拥有只读问答工具。

来源：[`packages/kb/kb/src/types.ts`](../../packages/kb/kb/src/types.ts)

## 领域词汇

- **knowledge base（知识库）** — 一个带 `ready | indexing | error` 索引状态的命名文档根目录。
- **chunk（分片）** — 一个 markdown 文件中以 `##` 分隔的段落。
- **retrieval hint（检索提示）** — 一条带排名的候选路径加匹配摘录；是 agent 需通过阅读验证的起步线索，绝非答案素材。

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
