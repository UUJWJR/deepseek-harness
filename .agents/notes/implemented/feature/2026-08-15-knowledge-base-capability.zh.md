# Agent Note: 知识库能力 — FTS5 trigram 检索与只读 subagent

Status: implemented

[English](2026-08-15-knowledge-base-capability.md) | 中文

## 问题

EasyWork 的知识库能力（ADR 0004 检索、0005 导入消化、0006 KbAgent）需要落地到 DSH。蓝本得出的关键结论是：在这一文档规模下 FTS5 trigram 优于 embedding，且一个用原生工具探索 vault 的只读 agent 优于任何手写搜索运行时。DSH 已有 FTS5 先例（session-query），但没有知识库服务。

## 决策

在 `kb` 组下交付一个新的能力 seam：

- `@deepseek-ai/dsh-kb` — Service Definition。`KnowledgeBaseRegistry` 拥有命名知识库集合及每个知识库的 `ready | indexing | error` 状态；`index()` 与 `retrieve()` 为抽象方法。
- `@deepseek-ai/dsh-kb-sqlite` — Provider。每个知识库一个自包含 SQLite 文件，位于 `<indexDir>/<name>.sqlite`，以 FTS5 `trigram` 索引、`bm25()` 排序。`index()` 扫描 markdown，将每个文件切分为以 `##` 分隔的分片，并在一个事务中重建。
- `@deepseek-ai/dsh-kb-agent` — Consumer。`kb-ask` 工具解析知识库、确保其已索引、检索带排名提示，然后在 `spawn` 提供方上启动一个带 `toolFilter { allow: ['read', 'grep', 'glob'] }` 的只读 subagent，并返回子 agent 的答案。

检索遵循 ADR 0004：FTS5 trigram（无 embedding）、按 `##` 切分分片、top-N 提示。作答遵循 ADR 0006：通过只读 subagent 复用 harness，检索提示被框定为不精确的起步线索而非答案素材。base bundle 挂载 `kb-sqlite`（indexDir 默认 `~/.dsh/kb/`）与 `kb-agent`（`provider: spawn`）。

## 曾考虑的替代方案

**Embedding 或向量检索。** 否决：ADR 0004 的理由（外部 API 成本、索引延迟、运维负担）成立，且 DSH 没有可复用的向量基础设施。

**独立 KB 运行时。** 否决：ADR 0006 记录了三个被放弃的手写运行时，并得出原生 harness 更优的结论；DSH 的 `ctx.tools.restrict()` 免费提供只读工具面。

**将分片存入 `ctx.storage`。** 否决：storage hub 是键值存储，无法承载 FTS5 虚拟表；索引需要自己的 `node:sqlite` 文件，与 session-query 一致。

**移植 ConceptIndex。** 暂缓：它是 EasyWork 专属的生成资产（112 个概念到文件的映射），核心检索闭环并不需要。

## 后果

只读 KB 问答闭环端到端可用：`kb-ask` 派生的子 agent 只能 read/grep/glob，因此写入与执行工具从其提示词中消失并拒绝执行。trigram 匹配任意子串，因此中文与混合文本无需分词器即可检索。记录两处与 ADR 0006 的偏差：子 agent 的工作目录以提示词携带（subagent seam 从父级派生 cwd 且不提供逐子覆盖），且只读是工具面限制而非操作系统级沙箱。trigram 无语义理解，符合 ADR 0004 声明的限制。导入消化（ADR 0005）与 KB GUI 选择器仍暂缓。
