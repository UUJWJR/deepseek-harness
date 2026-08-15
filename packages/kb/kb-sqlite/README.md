# @deepseek-ai/dsh-kb-sqlite

English | [中文](README.zh.md)

Concrete `ctx.knowledgeBases` provider. `SqliteKnowledgeBaseRegistry` implements the Service Definition's `index()` and `retrieve()` with one self-contained SQLite file per knowledge base, using FTS5 `trigram` tokenization and BM25 ranking.

## Indexing

`index(name, signal?)` scans the knowledge base root for markdown files, splits each into `##`-delimited chunks, and rebuilds the full-text table in one transaction. The base state transitions `ready → indexing → ready` on success, or to `error` on failure; the failure is rethrown with `KB_INDEX_FAILED`. Dot-directories are skipped. The index file lives at `<indexDir>/<name>.sqlite`; it is created owner-only on POSIX filesystems and reset in place when its schema version or application id does not match.

## Retrieval

`retrieve(name, request, signal?)` runs a parameterized FTS5 `MATCH` phrase query ordered by `bm25()` and returns ranked `RetrievalHint`s (path plus `snippet()` excerpt). A blank query returns no hints. The trigram tokenizer matches arbitrary substrings, so Chinese and mixed text search without a segmenter; it has no semantic understanding, per ADR 0004.

## Model Experience

None, as the SQLite backend returns ranked retrieval hints only to callers and registers no model-facing prompt, schema, tool, or message.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **No semantic search** — trigram FTS matches substrings, not meaning; it cannot match synonyms.
- **Synchronous query execution** — Node's `DatabaseSync` blocks the JavaScript thread during MATCH execution.
- **Markdown-only indexing** — only `.md` files are indexed; other formats are ignored.
