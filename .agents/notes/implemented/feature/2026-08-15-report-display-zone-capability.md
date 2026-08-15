# Agent Note: Report (display-zone) capability — published-report registry with browser Remotes

Status: implemented

English | [中文](2026-08-15-report-display-zone-capability.zh.md)

## Problem

EasyWork's report capability (the published-report gallery: copy a source file, record it with tags, and list or filter the published set) needed to land in DSH. DSH has durable session telemetry and a message-feedback sidecar, but no display-zone registry a tool can publish into and the web GUI can browse.

## Decision

Ship a capability seam under the `report` group:

- `@deepseek-ai/dsh-report` — Service Definition. `ReportRegistry` owns the published-report vocabulary and the source dedup key; `publish()`, `list()`, and `tags()` are abstract, and the boundary types (`Report`, `ReportSource`, `PublishRequest`, `PublishResult`, `ReportListRequest`, `ReportId`) live in the public `./types` subpath. The shared `renderMarkdownLite` helper renders prose markdown to safe HTML for gallery previews.
- `@deepseek-ai/dsh-report-local` — Provider. Stores each published copy under a per-report subdirectory of a configured absolute `root` and records them in a `reports.json` metadata file, deduplicating by (workspace, path) so a re-publish returns the existing report with `deduplicated: true`.
- `@deepseek-ai/dsh-tool-report` — Consumer. The model-facing `report_publish` and `report_list` tools publish and list through `ctx.reports`.
- `@deepseek-ai/dsh-client-ui-report` — Client gallery that renders the published set in the web GUI.

The provider exposes `publish`/`list`/`tags` as browser Remotes through Typert: `@Remote('name')` decorators on the override methods plus `readonly typertRemote = bindTypertRemote(this, 'reports')`. Because a Remote boundary type must be exported from a public non-root type subpath, the Service Definition owns the `./types` export rather than the provider. The base bundle mounts `report-local` (`root: dshHomePath('reports')`) and `tool-report`, and the web-app bundle mounts `ui-report`.

## Alternatives considered

**Store reports in `ctx.storage`.** Rejected: reports are file copies the gallery previews and the source re-publishes, not key-value facts; a directory of copies beside one metadata file is the simpler owner.

**Return rich list projections from the service.** Rejected: the model-facing tool and the gallery both need the same flat report records; projection is a consumer concern and stays out of the Service Definition.

**Hand-roll the gallery data channel.** Rejected: the web GUI already reaches host services through Typert Remotes; exposing `ctx.reports` that way reuses the existing carrier instead of a bespoke transport.

## Consequences

The report loop works end-to-end: a tool publishes a source copy and the gallery lists it, deduplicating by source. Tags are fixed at publish time; there is no report deletion and no per-report tag editing, both deferred. The gallery is read-only (publication runs through the host tool). Cancellation rides the Remote carrier, so the service methods drop the explicit `AbortSignal` parameter that the in-process seam used.
