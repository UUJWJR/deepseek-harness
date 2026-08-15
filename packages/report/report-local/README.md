# @deepseek-ai/dsh-report-local

English | [中文](README.zh.md)

Local filesystem provider for the report (display-zone) capability. It stores published copies under a configured absolute `root` directory and records them in a `reports.json` metadata file, deduplicating by (workspace, path). It implements `publish()`, `list()`, and `tags()` on `ctx.reports` ([the Service Definition](../report/README.md)), and exposes them as browser Remotes through the Typert gateway binding.

## Config

| Key | Meaning |
|---|---|
| `root` | Absolute report-root directory holding published copies and the `reports.json` metadata file. |

`publish` copies the source file (up to 50 MiB) into a per-report subdirectory named by its opaque id and appends a metadata record; re-publishing the same source returns the existing report with `deduplicated: true`. `list` filters by an optional tag; `tags` returns distinct tags in first-seen order.

## Model Experience

None, as the local backend returns published reports and tags only to callers and registers no model-facing prompt, schema, tool, or message.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Single-node storage** — reports live under one local directory and are neither replicated nor shared across hosts.
- **No cross-process lock** — concurrent publishes to one root read-modify-write `reports.json` without a cross-process lock.
