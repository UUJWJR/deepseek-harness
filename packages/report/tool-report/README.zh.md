# @deepseek-ai/dsh-tool-report

[English](README.md) | 中文

报告（展示区）seam 之上的**面向模型报告工具** —— `report_publish` 与 `report_list`。这是消费层：它拥有工具名、JSON schema、参数校验与结果格式化。它通过 `ctx.reports` 提供方契约（[Service Definition](../report/README.md)）直接发布与列举。

`report_publish` 将源文件复制进画廊并带标签记录，重复发布时返回既有报告；`report_list` 列举已发布报告，可选按单个标签过滤。

## 工具

| 工具 | 参数 | 行为 |
|---|---|---|
| `report_publish` | `file_path`、`workspace`、`tags?` | 将 `file_path`（位于 `workspace`）复制进报告存储并带 `tags` 记录；重复发布同一（工作区，路径）会返回 `deduplicated: true` 的既有报告。 |
| `report_list` | `tag?` | 按发布顺序列举已发布报告，给定 `tag` 时按标签过滤。 |

## 模型体验

### 工具 schema

#### 模型看到什么

模型看到生成的 [`report_publish` 与 `report_list` schema](../../../docs/tool-catalog.md#deepseek-aidsh-tool-report)，参数为 snake_case。作用域化工具限制可为单个 agent 移除任一工具定义。

#### Token 影响

每个请求固定 schema 开销，仅在该工具视图中计费。

#### KV Cache 影响

在可见工具定义与顺序不变时前缀稳定。注册生命周期或作用域限制可能使首个变化后的 schema token 起失效复用。

### 发布结果

#### 模型看到什么

成功的 `report_publish` 返回 `{ report: { id, source: { workspace, path }, tags, publishedAt }, deduplicated }`。文本渲染为新报告时的 `已发布报告：<path>`，去重到既有报告时为 `已发布过：<path>`。

#### Token 影响

成功文本很小；报告 id、源、标签与时间戳都很小，结果会保留到压缩前。

#### KV Cache 影响

只追加；新可见内容位于可复用请求前缀之后，不会使既有 KV Cache 条目失效。

### 列举结果

#### 模型看到什么

成功的 `report_list` 返回 `{ reports: [{ id, source: { workspace, path }, tags, publishedAt }] }`。文本渲染为每行一个源路径，为空时显示 `无报告`。

#### Token 影响

与列举的报告数量成正比；保留到压缩前。

#### KV Cache 影响

只追加；新可见内容位于可复用请求前缀之后，不会使既有 KV Cache 条目失效。

## 已知限制与暂缓事项

- **无报告删除** — 已发布报告无法通过工具移除；仅暴露发布与列举。
- **无按报告标签编辑** — 标签在发布时即固定。
