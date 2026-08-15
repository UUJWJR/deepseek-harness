# @deepseek-ai/dsh-client-ui-report

English | [中文](README.zh.md)

Browser gallery for the report (display-zone) capability. It renders the published reports of the host `ctx.reports` service as a gallery, and owns the client-side report view component and list rendering. It registers no model-facing surface.

## Model Experience

None, as the browser gallery renders durable report records without changing model context; the host tool consumer owns every model-facing effect.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Gallery is read-only** — the browser surface lists and previews published reports but offers no publish, edit, or delete controls; publication runs through the host tool consumer.
