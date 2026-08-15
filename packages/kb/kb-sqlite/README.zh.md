# @deepseek-ai/dsh-kb-sqlite

[English](README.md) | 中文

具体 `ctx.knowledgeBases` 提供方。`SqliteKnowledgeBaseRegistry` 用每个知识库一个自包含 SQLite 文件实现 Service Definition 的 `index()` 与 `retrieve()`，采用 FTS5 `trigram` 分词与 BM25 排序。

## 索引

`index(name, signal?)` 扫描知识库根目录下的 markdown 文件，将每个文件切分为以 `##` 分隔的分片，并在一个事务中重建全文表。成功时状态由 `ready → indexing → ready`，失败则转为 `error` 并以 `KB_INDEX_FAILED` 重新抛出。点目录会被跳过。索引文件位于 `<indexDir>/<name>.sqlite`；在 POSIX 文件系统上以仅属主权限创建，且当其 schema 版本或 application id 不匹配时原地重置。

## 检索

`retrieve(name, request, signal?)` 执行一条参数化的 FTS5 `MATCH` 短语查询，按 `bm25()` 排序，返回带排名的 `RetrievalHint`（路径加 `snippet()` 摘录）。空查询不返回提示。trigram 分词器匹配任意子串，因此中文与混合文本无需分词器即可检索；它无语义理解能力，符合 ADR 0004。

## 模型体验

无，SQLite 后端仅向调用方返回带排名的检索提示，不注册任何面向模型的提示词、schema、工具或消息。

#### KV Cache 影响

无；此包既不会组装也不会发送提供方请求。

## 已知限制与暂缓事项

- **无语义检索** — trigram FTS 匹配子串而非语义；无法匹配同义词。
- **同步查询执行** — Node 的 `DatabaseSync` 在 MATCH 执行期间会阻塞 JavaScript 线程。
- **仅索引 markdown** — 只索引 `.md` 文件；其他格式被忽略。
