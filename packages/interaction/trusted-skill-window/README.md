# @deepseek-ai/dsh-trusted-skill-window

English | [中文](README.zh.md)

Trusted-skill permission window. While a deployment-trusted skill is running, this plugin auto-approves the skill's tool calls under TTL and hard-cap bounds, with every grant still logged by the approval service's audit pair.

## Behavior

The window opens on the explicit skill-load gesture — a `skill` tool call naming a skill in `trustedSkills` — never on model-behavior probing (ADR 0008). While a window is open for a session, `approval/request` resolves `allowed-once` instead of prompting. The window closes when it expires (`windowTtlMs`), when the session ends (windows are per-session), or after `maxAutoApprovals` grants. A session whose approval policy is `never` rejects before dispatch, so the window never overrides that deterministic stance.

## Configuration

| Key | Default | Contract |
|---|---:|---|
| `trustedSkills` | `[]` | Skill names the deployment trusts; loading one opens the window. |
| `windowTtlMs` | `600000` | Window lifetime in milliseconds. |
| `maxAutoApprovals` | `50` | Maximum auto-approved tool calls per window. |

## Model Experience

None, as the window auto-approves approval requests during a trusted skill but registers no model-facing prompt, schema, tool, or message.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **No delivery-boundary close** — the window closes on TTL, session end, or hard cap, not on a "skill finished" signal, which the harness does not expose.
- **Trust is deployment-wide** — any session in the deployment inherits the trusted set; per-session trust is not supported.
