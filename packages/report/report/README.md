# @deepseek-ai/dsh-report

English | [中文](README.zh.md)

Service Definition for the report (display-zone) capability. A published report is a copy of a source file recorded with tags and a publication timestamp, deduplicated by source. `ReportRegistry` owns the published-report vocabulary and the dedup key; a provider implements `publish()`, `list()`, `tags()`, and `read()` on the same `ctx.reports` service.

## Domain vocabulary

- **report** — a published copy of one source file, carrying an opaque id, the source it was copied from, tags, and the publication epoch.
- **source** — the dedup key: a workspace plus a workspace-relative path identifying the file copied at publish time.
- **tag** — an optional string attached at publish time; `list()` narrows to one tag.

`publish(request)` copies the source into the report storage and records it, returning the existing report when the source was already published; `list(request?)` returns the matching reports in publication order; `tags()` lists every distinct tag in first-seen order; `read(request)` returns one report and its copied file content. `ReportError.code` is a closed union covering a missing source, a missing report id, and a failed copy. The shared `renderMarkdownLite` helper turns prose markdown into safe HTML for gallery previews.

## Model Experience

None, as the registry owns the published-report vocabulary and returns reports and tags only to its callers; it registers no model-facing prompt, schema, tool, or message.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **No provider coordinator** — this is an abstract Service Definition with no fallback implementation; a concrete provider must implement `publish()`, `list()`, `tags()`, and `read()`.
- **No authorization** — this is a trusted context-wide service; a model tool or UI must enforce its own access policy.
