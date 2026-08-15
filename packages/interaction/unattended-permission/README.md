# @deepseek-ai/dsh-unattended-permission

English | [中文](README.zh.md)

Unattended permission model (ADR 0011). While a skill with a declared `unattendedLevel` runs, this plugin denies any tool call outside that level's whitelist rather than asking a human — an unattended run fails on escalation instead of prompting nobody.

## Behavior

The level is tracked from the explicit skill-load gesture, then `tools/pre-execute` denies any tool not in the level's whitelist. `sandbox` allows read/grep/glob/write/edit/bash; `networked` adds web search and fetch; `full` is unrestricted. Skills absent from `unattendedLevels` are unrestricted.

## Configuration

| Key | Default | Contract |
|---|---:|---|
| `unattendedLevels` | `{}` | Skill name to `sandbox` / `networked` / `full`; absent skills are unrestricted. |

## Model Experience

None, as the level gate denies tool calls outside a skill's level but registers no model-facing prompt, schema, tool, or message.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Tool-surface restriction, not an OS sandbox** — the deny is enforced at the tool registry, not by process isolation.
- **Session-scoped level** — the level applies to the session that loaded the skill; it does not carry across sessions.
