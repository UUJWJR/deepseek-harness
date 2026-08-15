# @deepseek-ai/dsh-client-ui-files

English | [中文](README.zh.md)

Browser file tree for the filesystem. It registers a Files footer action in the sidebar that opens a modal file tree — breadcrumbs, a directory listing, a show-hidden toggle, multi-select bulk delete, and drag-to-move — driven by the host `ctx.remote.files` Remote. It registers no model-facing surface.

## Model Experience

None, as the browser file tree lists and deletes files without changing model context; the host tool consumer owns every model-facing effect.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Filesystem-root start** — the tree opens at the filesystem root; a workspace-root default is deferred.
- **Drag-only move** — a move is a drag onto a directory; there is no move-to dialog or bulk-move target picker.
- **Single-level navigation** — the tree lists one directory level at a time; the browser composes the tree from successive list calls.
