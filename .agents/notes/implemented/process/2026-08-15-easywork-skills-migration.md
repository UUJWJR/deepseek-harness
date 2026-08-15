# Agent Note: EasyWork skills migration to the DSH user skill root

Status: implemented

English | [中文](2026-08-15-easywork-skills-migration.zh.md)

## Problem

EasyWork is a separate single-user React/Express/SQLite app whose reusable business capability — 11 report/data-authoring skills, a shared `references/` library, and 22 design ADRs — needs to land in DeepSeek Harness. The port must track the upstream `deepseek-ai/deepseek-harness` repository so later upstream updates merge cleanly without clobbering the secondary-development work.

## Decision

Track upstream on a fork: `origin` is `UUJWJR/deepseek-harness`, `upstream` is `deepseek-ai/deepseek-harness`; `master` stays an upstream mirror and the port lives on the `easywork` branch, synchronized with `git fetch upstream && git merge upstream/master` (merge-forward, no force). Decisions are recorded as Agent Notes, not a new `docs/adr/` tree.

Install the skills to the user skill root `~/.dsh/skills` (rank 400) rather than committing them to the repo. The 11 skill directories and the shared `references/` directory are copied together; `references/` sits as a sibling of the skill directories because every body addresses it as `../references/`.

Edit only what breaks: hardcoded `.claude/skills/…` and `{skillDir}`/`{projectDir}` absolute paths become `{baseDir}`-relative sibling paths (for example `{projectDir}/.claude/skills/vocab-update/scripts/vocab-loader.py` becomes `{baseDir}/../vocab-update/scripts/vocab-loader.py`). The Claude Code `compatibility:` frontmatter and body tool names (`Read`/`Write`/`Edit`/`Agent`/`Glob`/`Grep`) are left as-is and mapped loosely by the model.

The host `python3` shim is broken (an Xcode loader error), so `python3` symlinks to Homebrew `python3.12`, which already carries `yaml`, `markdown`, and `openpyxl`.

## Alternatives considered

**Commit the skills as a repo bundle.** Rejected: M1 is a zero-code runtime migration; keeping skills out of the repo keeps upstream merges conflict-free and defers the bundle decision until the port needs to distribute them.

**Moderate or full body rewrite to DSH tool semantics.** Rejected: skill bodies are prompt prose the model maps loosely; translating `Agent`→`subagent` up front risks introducing errors. Fixes are smoke-driven instead.

**Rebase the `easywork` branch onto `upstream/master`.** Rejected: rewriting the shared branch needs force pushes and contradicts the repo's documented merge-forward convention.

**Record decisions under `docs/adr/`.** Rejected: the repo has no such tree; rationale belongs in Agent Notes per the repo's one-home rule.

## Consequences

The 11 skills are discovered by the running DSH skill catalog immediately, and the deterministic Python pipeline (`data-to-md/convert.py`, `report-publish/summarize.py`, `report-publish/slice-ref.py`) runs end-to-end under the migrated paths. The guide's "12 skills" count is actually 11 plus the `references/` library, and no skill embeds an EasyWork `/api/` call, so that porting concern was moot. The report-publish `{tmpDir}` formula `{baseDir}/../../../tmp/` still resolves to `~/tmp/` rather than a project temp dir — a noted drift, not yet changed. A full model-driven briefing-mode run is pending a `DEEPSEEK_API_KEY`; the keyless verification covers discovery and the script pipeline only.
