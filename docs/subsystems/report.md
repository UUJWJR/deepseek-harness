# Report

English | [中文](report.zh.md)

Report (display-zone) vocabulary: a published report is a copy of a source file recorded with tags and a publication timestamp, deduplicated by source. The [Service Definition package](../../packages/report/report) owns the `ReportRegistry` seam, the report vocabulary, and the shared `renderMarkdownLite` prose-to-HTML renderer; the [local provider](../../packages/report/report-local) owns file storage and source deduplication under the home reports directory; the [tool consumer](../../packages/report/tool-report) owns the model-facing `report_publish` and `report_list` tools; and the [gallery plugin](../../packages/client/ui-report) owns the browser gallery.

Source: [`packages/report/report/src/types.ts`](../../packages/report/report/src/types.ts)

## Domain vocabulary

- **report** — a published copy of one source file, carrying an opaque id, the source it was copied from, tags, and the publication epoch.
- **source** — the dedup key: a workspace plus a workspace-relative path identifying the file copied at publish time.
- **tag** — an optional string attached at publish time; `list` narrows to one tag.

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
