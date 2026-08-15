# Agent Note: Permission window and unattended permission model

Status: implemented

English | [中文](2026-08-15-permission-window-and-unattended-model.zh.md)

## Problem

EasyWork's ADR 0007/0008 defined a permission window that auto-approves a trusted skill's tool calls, and ADR 0011 defined a stricter unattended model for scheduled runs. The blueprints' hard-won lesson is that the window-open signal must be explicit (frontend-reported skill name), never model-behavior probing, because a skill is prompt injection and the model's tool calls are unpredictable. DSH's `skill` tool call is itself that explicit signal.

## Decision

Ship two independent interaction plugins:

- `@deepseek-ai/dsh-trusted-skill-window` — the interactive window. It opens on a `skill` tool call naming a deployment-trusted skill, then resolves `approval/request` to `allowed-once` for that session. The approval service still appends its audit pair, so every grant is logged. It closes on TTL (`windowTtlMs`), session end, or a hard cap (`maxAutoApprovals`). A `never` approval policy rejects before dispatch, so the window never overrides it.
- `@deepseek-ai/dsh-unattended-permission` — the unattended gate (ADR 0011). It tracks a skill's `unattendedLevel` and denies any `tools/pre-execute` call outside the level's whitelist, never asking a human. `sandbox` allows read/grep/glob/write/edit/bash; `networked` adds web search and fetch; `full` is unrestricted.

Both open on the same explicit gesture and are wired into different surfaces: the window into the web-app bundle, the unattended gate into the headless bundle. External cron plus `dsh --profile headless` is the scheduled-run transport (ADR 0010: a run is a headless session, JSONL is the log, replay is the conversation); no scheduler package is added.

## Alternatives considered

**A shared trust model.** Rejected: ADR 0011 keeps interactive windowing and unattended whitelisting as two independent semantics — a skill can be trusted but not unattended-safe, or vice versa.

**Skill self-declared trust.** Rejected: ADR 0007 refuses to let any skill declare itself trusted, or a normal user could escalate by writing a skill; trust is a deployment config.

**A built-in scheduler package.** Rejected: ADR 0010 already maps a run onto a headless session, which DSH's headless profile provides; external cron respects the existing boundary.

## Consequences

Interactive trusted-skill runs no longer trip per-tool approval under the default `ask` policy, while every grant stays audited. Unattended runs fail on escalation rather than prompting nobody. Two deviations from the blueprints are recorded: the window closes on TTL/session/cap rather than a delivery signal the harness does not expose, and the unattended deny is a tool-surface restriction rather than an OS sandbox. Cron scheduling itself, the Run list UI, and the skill-level authoring surface remain deferred.
