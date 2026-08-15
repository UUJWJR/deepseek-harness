# @deepseek-ai/dsh-fs-remote

English | [中文](README.zh.md)

Browser-facing filesystem Remote: exposes path-based `list`/`delete`/`move` over `ctx.fs` so the web GUI can render a file tree and apply mutations. Absolute paths cross the wire; the browser never joins path segments.

## Domain vocabulary

- **file entry** — one child of a listed directory: its name, absolute path, type, and hidden flag.
- **list** — one directory level of children.
- **delete** — remove one file or one empty directory; a non-empty directory fails with `FS_NOT_EMPTY`.
- **move** — rename one path to another; moving a directory into its own descendant fails with `FS_LOOP`.

## Model Experience

None, as the Remote returns directory listings and applies mutations only to its callers; it registers no model-facing prompt, schema, tool, or message.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Single-level listing** — `list` returns one directory level; the browser composes the tree from successive `list` calls.
- **No bulk endpoint** — `delete`/`move` apply to one path each; the browser folds a multi-selection into per-item calls (ancestor folding lives in the fs seam).
