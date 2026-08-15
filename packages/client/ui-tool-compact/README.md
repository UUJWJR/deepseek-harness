# @deepseek-ai/dsh-client-ui-tool-compact

English | [中文](README.zh.md)

Compact tool-call capsules. It binds a durable `compactMode` setting and registers a per-call compact tool `ConversationNodeDefinition` and its keyed capsule renderer while the setting is on, so each tool call also renders as a one-line capsule (name + settled marker) beside the full call tree. A compact-mode checkbox row in the settings General section owns the toggle. It registers no model-facing surface.

## Settings

| Namespace | Field | Default |
|---|---|---|
| `ui-tool-compact` | `compactMode` | `false` |

## Model Experience

None, as the compact renderer projects already-logged tool calls without changing model context; the model-facing tool surfaces live in the host tool packages.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Additive, not replacing** — the capsules render beside the full call tree; replacing the tree renderer is deferred.

- **Per-call capsules** — each capsule is per tool call; the turn-level "5 columns + +N" strip (`ToolCapsuleStrip`) is not yet wired to a turn-aggregating Definition.
