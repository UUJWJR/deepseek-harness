# 报告

[English](report.md) | 中文

报告（展示区）词汇：一份已发布报告是源文件的副本，带有标签与发布时间戳，并按源去重。[Service Definition 包](../../packages/report/report) 拥有 `ReportRegistry` seam、报告词汇与共享的 `renderMarkdownLite` 纯文本转 HTML 渲染器；[本地提供方](../../packages/report/report-local) 拥有主目录 reports 目录下的文件存储与按源去重；[工具消费方](../../packages/report/tool-report) 拥有面向模型的 `report_publish` 与 `report_list` 工具；[gallery 插件](../../packages/client/ui-report) 拥有浏览器画廊。

来源：[(`packages/report/report/src/types.ts`)](../../packages/report/report/src/types.ts)

## 领域词汇

- **report（报告）** — 一份源文件的已发布副本，带不透明 id、被复制的源、标签与发布时间戳。
- **source（源）** — 去重键：一个工作区加一个工作区相对路径，标识发布时复制的文件。
- **tag（标签）** — 发布时附加的可选字符串；`list` 可按单个标签过滤。

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — this section is byte-identical in both language sides of the page. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxreports--reportregistry-abstract-seam"></a>

### `ctx.reports` — `ReportRegistry` (abstract seam)

Report registry service. Owns the published-report vocabulary and the dedup key; a provider implements publish and list.

```ts cordis-catalog
/**
 * Publish one source file: copy it into the report storage and record it,
 * returning the existing report when the source was already published.
 * @param request - source file and optional tags.
 * @returns the published report and whether it deduplicated to an existing one.
 */
abstract publish(request: PublishRequest): Promise<PublishResult>

/**
 * List published reports, optionally narrowed to one tag.
 * @param request - optional tag filter.
 * @returns the matching reports in publication order.
 */
abstract list(request?: ReportListRequest): Promise<readonly Report[]>

/**
 * List every distinct tag across published reports.
 * @returns the tags in first-seen order.
 */
abstract tags(): Promise<readonly string[]>
```

Source: [`packages/report/report/src/index.ts:28`](../../packages/report/report/src/index.ts)
<!-- END GENERATED cordis-surface -->
