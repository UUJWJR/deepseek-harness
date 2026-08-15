# @deepseek-ai/dsh-client-ui-tool-compact

English | [中文](README.zh.md)

Compact tool-call capsules. It binds a durable `compactMode` setting and, while it is on, replaces the full tool-call tree with a turn-level capsule strip: a `ConversationNodeDefinition` aggregates every tool call in a turn into one strip (5-column cap + "+N" overflow), rendered by a keyed capsule renderer, while a shadowing renderer hides the tree. A compact-mode checkbox row in the settings General section owns the toggle. It registers no model-facing surface.

## Settings

| Namespace | Field | Default |
|---|---|---|
| `ui-tool-compact` | `compactMode` | `false` |

## Model Experience

None, as the compact renderer projects already-logged tool calls without changing model context; the model-facing tool surfaces live in the host tool packages.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **No per-capsule interaction** — the strip is read-only; selecting a capsule or expanding one tool's detail is deferred.
