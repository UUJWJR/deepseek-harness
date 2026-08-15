# @deepseek-ai/dsh-client-ui-tool-compact

English | [中文](README.zh.md)

Compact tool-call capsules. When `compactMode` is on, it registers a per-call compact tool `ConversationNodeDefinition` and its keyed capsule renderer, so each tool call also renders as a one-line capsule (name + settled marker) beside the full call tree. It registers no model-facing surface.

## Config

| Key | Default | Meaning |
|---|---|---|
| `compactMode` | `false` | Register the compact tool capsules. |

## Model Experience

None, as the compact renderer projects already-logged tool calls without changing model context; the model-facing tool surfaces live in the host tool packages.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Additive, not replacing** — the capsules render beside the full call tree; replacing the tree renderer is deferred.
- **Config-only toggle** — `compactMode` is a load-time config, not a runtime settings item.
- **Per-call capsules** — each capsule is per tool call; the turn-level "5 columns + +N" strip (`ToolCapsuleStrip`) is not yet wired to a turn-aggregating Definition.
