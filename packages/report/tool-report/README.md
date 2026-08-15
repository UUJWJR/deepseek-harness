# @deepseek-ai/dsh-tool-report

English | [中文](README.zh.md)

The **model-facing report tools** — `report_publish` and `report_list` — over the report (display-zone) seam. This is the consumer layer: it owns tool names, JSON schemas, argument validation, and result formatting. It publishes and lists through the `ctx.reports` provider contract ([the Service Definition](../report/README.md)) directly.

`report_publish` copies a source file into the gallery and records it with tags, returning the existing report on a re-publish; `report_list` lists published reports, optionally narrowed to one tag.

## Tools

| Tool | Arguments | Behavior |
|---|---|---|
| `report_publish` | `file_path`, `workspace`, `tags?` | Copies `file_path` (in `workspace`) into the report storage and records it with `tags`; re-publishing the same (workspace, path) returns the existing report with `deduplicated: true`. |
| `report_list` | `tag?` | Lists published reports in publication order, narrowed to `tag` when given. |

## Model Experience

### Tool schemas

#### What the model sees

The model sees the generated [`report_publish` and `report_list` schemas](../../../docs/tool-catalog.md#deepseek-aidsh-tool-report), with snake_case arguments. Scoped tool restrictions can remove either definition for one agent.

#### Token effect

Fixed schema cost on every request in that tool view.

#### KV Cache effect

Prefix-stable while the visible tool definitions and order are unchanged. Registration lifecycle or scoped restrictions may invalidate reuse from the first changed schema token.

### Publish result

#### What the model sees

A successful `report_publish` returns `{ report: { id, source: { workspace, path }, tags, publishedAt }, deduplicated }`. The text rendering is `已发布报告：<path>` for a new report and `已发布过：<path>` when deduplicated to an existing one.

#### Token effect

Small success text; the report id, source, tags, and timestamp are small, and the result is resent until compaction.

#### KV Cache effect

Append-only; newly visible content follows the reusable request prefix and does not invalidate existing KV-cache entries.

### List result

#### What the model sees

A successful `report_list` returns `{ reports: [{ id, source: { workspace, path }, tags, publishedAt }] }`. The text rendering is the source paths, one per line, or `无报告` when empty.

#### Token effect

Proportional to the number of listed reports; retained until compaction.

#### KV Cache effect

Append-only; newly visible content follows the reusable request prefix and does not invalidate existing KV-cache entries.

## Known Limitations and Deferred Work

- **No report deletion** — published reports cannot be removed through a tool; only publication and listing are exposed.
- **No per-report tag editing** — tags are fixed at publish time.
