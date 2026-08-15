# @deepseek-ai/dsh-client-ui-report

English | [中文](README.zh.md)

Browser gallery for the report (display-zone) capability. It registers a Reports footer action in the sidebar that opens a modal gallery — a tag sidebar, report list, and selected-report source preview — driven by one `ReportController` over the host `ctx.reports` Remote. It registers no model-facing surface.

## Model Experience

None, as the browser gallery renders durable report records without changing model context; the host tool consumer owns every model-facing effect.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Gallery is read-only** — the browser surface lists published reports and shows a selected report's source metadata, but offers no publish, edit, or delete controls; publication runs through the host tool consumer.
- **No report-body preview** — the Remote exposes only `list`/`tags`/`publish`, not report content, so the preview shows source metadata rather than the copied file's body.
