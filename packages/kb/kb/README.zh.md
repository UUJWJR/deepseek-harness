# @deepseek-ai/dsh-kb

[English](README.md) | 中文

知识库能力的 Service Definition。知识库是一个命名的本地文档根目录（vault），其 markdown 被切分为以标题分隔的分片并做全文索引以供检索。`KnowledgeBaseRegistry` 拥有命名集合及每个知识库的索引状态；提供方在同一 `ctx.knowledgeBases` 服务上实现 `index()` 与 `retrieve()`。

## 领域词汇

- **knowledge base（知识库）** — 一个命名文档根目录，带 `ready | indexing | error` 索引状态。
- **chunk（分片）** — 一个 markdown 文件中以 `##` 分隔的段落。
- **retrieval hint（检索提示）** — 一个候选文件路径加一段匹配摘录；是 agent 需通过阅读验证的起步线索，绝非答案素材。

`register(name, root)` 校验 kebab-case 名称与绝对根路径并返回注销器；`list()` 与 `get(name)` 返回不可变快照。`index(name, signal?)` 与 `retrieve(name, request, signal?)` 为抽象方法，由诸如 [`@deepseek-ai/dsh-kb-sqlite`](../kb-sqlite/README.md) 的提供方实现。`KnowledgeBaseError.code` 是一个覆盖非法名称与根路径、重复、缺失知识库及索引失败的封闭联合。

## 模型体验

无，注册表仅向调用方返回知识库快照与提示，不注册任何面向模型的提示词、schema、工具或消息。

#### KV Cache 影响

无；此包既不会组装也不会发送提供方请求。

## 已知限制与暂缓事项

- **无提供方协调器** — 这是没有兜底实现的抽象 Service Definition；具体提供方必须实现 `index()` 与 `retrieve()`。
- **无授权** — 这是受信任的上下文级服务；模型工具或 UI 必须自行执行访问策略。
