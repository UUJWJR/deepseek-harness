# @deepseek-ai/dsh-client-ui-report

English | [中文](README.zh.md)

Browser gallery for the report (display-zone) capability. It registers a Reports footer action in the sidebar that opens a modal gallery — a tag sidebar, report list, and selected-report preview — driven by one `ReportController` over the host `ctx.reports` Remote. It registers no model-facing surface.

## Model Experience

None, as the browser gallery renders durable report records without changing model context; the host tool consumer owns every model-facing effect.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Gallery is read-only** — the browser surface lists published reports and previews a selected report's body, but offers no publish, edit, or delete controls; publication runs through the host tool consumer.
- **Plain-text preview** — the selected report's copied body renders as plain text; markdown rendering is deferred to a future renderer.
