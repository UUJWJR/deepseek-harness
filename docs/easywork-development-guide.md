# Secondary development in deepseek-harness — a hands-on guide

English | [中文](easywork-development-guide.zh.md)

> Goal: land EasyWork's custom capabilities (the EasyWork-side checklist is in docs/secondary-development.md) through DSH's native plugin/skill mechanisms.
>
> Confirmed facts: DSH is an everything-is-a-plugin microkernel (based on vendored Cordis); the skill format is compatible with EasyWork; the development process is a pnpm monorepo plus gates.

---

## 0. Setting up the development environment

```sh
# 前置:Node 22.19+ / 24+,Corepack pnpm(packageManager 固定 pnpm@11.7.0)
cd ~/Documents/开发/deepseek-harness
corepack enable          # 若 pnpm --version 无法解析
pnpm install             # 安装依赖 + 配置 Lefthook 钩子
pnpm run typecheck       # 搭建完成的验收标准:typecheck 成功退出
```

Daily commands (repo root):
- `pnpm run test` — vitest unit tests
- `pnpm run test:snapshot` — keyless ACP/headless replay
- `pnpm run lint` / `pnpm run typecheck` — static checks
- `pnpm run build` — tsc output + tsdown bundling
- `pnpm run hygiene` — knip/publint/workspace constraints
- `pnpm dsh --profile headless "task"` — run one headless task from source (requires DEEPSEEK_API_KEY)
- Web GUI: the apps/web artifact is hosted by dsh's web mode (currently port 3080)

---

## 1. Extension-mechanism quick reference (capability → landing point)

DSH is a microkernel: **any product feature = attach a listener to a documented extension point**, without modifying the agent loop itself.

| What you want to do | Which mechanism | Package |
|---|---|---|
| Add a tool | `ctx.tools.register()` / `defineTool` | any package |
| Add a permission gate (e.g. a permission window) | `ctx.on('tools/pre-execute', ...)` returning `{kind:'deny'}` / `{kind:'ask'}` | interaction |
| Wrap tool execution (timeout/retry/metrics) | `ctx.on('tools/execute', ...)` | guard |
| Observe the final tool result (audit) | `ctx.on('tools/result', ...)` | — |
| Change the system prompt | `ctx.systemPrompt.section()` | core |
| Add a business skill | put a skill directory (SKILL.md) into a skill root, zero code | skill-filesystem |
| Add a session UI business row | `ConversationNodeDefinition` + keyed Chat renderer | client / ui-* |
| Listen to the session event stream (rendering/statistics) | `ctx.on('session/event', ...)` | — |
| Send input to the model / steer | `ctx.agents.get(sid)?.followup()` / `.steer()` | core |
| Persist data | `ctx.storage` (JSON/SQLite backends) + session JSONL/SQLite | storage / session |
| Scheduled/background tasks | external cron + `dsh --profile headless`, or extend jobs/schedule | jobs / headless |

### Skill discovery roots (key!)

`@deepseek-ai/dsh-skill-filesystem` scans in order (lower rank wins):

| Source | Path |
|---|---|
| project-dsh | `<projectRoot>/.dsh/skills` |
| project-agents | `<projectRoot>/.agents/skills` |
| custom | `Config.customSkillDirs` (config item) |
| user-dsh | `<dshHome>/skills` ($DSH_HOME or ~/.dsh) |
| user-agents | `<agentsHome>/skills` ($DSH_AGENTS_HOME or ~/.agents) |

**Skill format**: `<name>/SKILL.md` (directory bundle; frontmatter needs `name` (kebab-case) + `description`, optionally `whenToUse`/`metadata`/`disable-model-invocation`/`user-invocable`), or a flat `<name>.md`. Nested `**/SKILL.md` is not discovered recursively. The skill body is re-read live on every load with no cache invalidation. Changes to the sub-resource directories `references/`, `scripts/`, `assets/` do not trigger directory invalidation.

> ✅ **Verified**: EasyWork's 12 skills are all `<name>/SKILL.md` + kebab-case name + description, fully compatible with the DSH format, and can be migrated directly.

---

## 2. Per-module landing guide

### 2.1 Skill asset migration (first step, zero code, do it now)

**Approach**: copy the skill directories into any DSH skill root; DSH discovers them automatically and the model loads them through the `skill` tool.

```sh
# 方案 A:用户级(所有项目可用)——推荐
mkdir -p ~/.dsh/skills
cp -r <easywork>/.claude/skills/{data-analysis,data-to-md,draft-muti-revision,draft-revision,drafts-merge,html-to-pdf,md-to-docx,md-to-html,md-to-xhtml,report-publish,vocab-update} ~/.dsh/skills/
cp -r <easywork>/.claude/skills/references ~/.dsh/skills/references

# 方案 B:项目级(仅本项目可用)
mkdir -p <projectRoot>/.dsh/skills
cp -r <easywork>/.claude/skills/* <projectRoot>/.dsh/skills/
```

**Checklist**:
1. Each skill's frontmatter has a kebab-case `name` and a `description` (both required by DSH).
2. Cross-directory relative references inside a skill (`../references/INDEX.md`) — references must sit at the same level as the skill, or be adjusted to the resourceBase declared inside the skill.
3. Script dependencies: html-to-pdf needs Playwright/WeasyPrint; md-to-xhtml/report-publish need Python (gen-datajson.py etc.) — install them in the DSH environment or document the dependencies in the skill description.
4. Replace any EasyWork-specific API embedded in a skill (e.g. `/api/tasks/upsert` reporting) with the DSH equivalent (session events / `ctx.todo` / `ctx.jobs`) or delete it.
5. **Semantic note**: EasyWork skills are Claude Code-style (compatibility: Read/Write/Edit/Agent…), whereas DSH tool names differ (bash/fs/web/subagent); the tool-name hints in the skill bodies need a pass. DSH has no `Agent` tool — subagents go through `ctx.subagent`.

**Acceptance**: 12 skills appear in the DSH GUI skill list; in a new session the model can load report-publish through the `skill` tool and run the briefing mode end-to-end.

---

### 2.2 Knowledge-base retrieval (highest business value)

**Blueprint**: ADR 0004 (retrieval) / 0005 (import digestion) / 0006 (KbAgent). DSH already has a SQLite FTS precedent (session-query).

**Approach**: add a capability package `packages/kb/` (see the adding-a-package.md checklist).

1. **Domain model**: KnowledgeBase (registration, state ready/indexing/error, chunk table) — use `ctx.storage` or a standalone SQLite.
2. **Indexer**: scan a local document directory (split md into chunks by `##`) → build an FTS5 trigram table (copy session-query's FTS pattern) → incremental updates via `ctx.fs` watching + manual rebuild.
3. **Retriever**: concept matching + FTS BM25 merge into top-N → produce RetrievalHints.
4. **Read-only Q&A agent**: reuse the DSH agent loop — a new agent session with `cwd` pointing at the KB root, a tool registry restricted to read/grep/glob, and the system prompt injected with VaultMap + RetrievalHints. DSH's `ctx.tools.restrict()` natively supports a "read-only tool surface", cleaner than EasyWork's server-side rejection.
5. **Import digestion** (phase two): file upload → archive → LLM digestion (digester) → re-index; progress goes through `session/event` + `ctx.jobs`.
6. **GUI**: a KB selector in the session composer (ui-* plugin); a KB management page.

**Decision point (suggest recording an ADR)**: should DSH use FTS or introduce embedding? — the blueprint ADR 0004's rationale (FTS5 zero-dependency / Chinese-friendly) holds equally in DSH, so keep FTS.

---

### 2.3 Permission window / trusted skills

**Blueprint**: ADR 0007/0008. DSH already has approval/presets/audit events.

**Approach**: extend the interaction package, or add a plugin `trusted-skill-window` (illustrative sketch):

```tsx
import type { Context } from '@deepseek-ai/cordis'

export const name = 'trusted-skill-window'
export const inject = ['skills', 'approval']

export function apply(ctx: Context) {
  let windowOpen = false
  // 技能加载/激活 = 显式开窗信号(ADR 0008 教训:不依赖模型行为探测)
  ctx.on('skill/load', ({ name }) => { if (isTrusted(name)) windowOpen = true })
  ctx.on('tools/pre-execute', async (exec, next) => {
    if (windowOpen && isTrustedSkillTool(exec)) {
      return next() // 窗口内自动批准 + 审计(写 ctx.storage 或事件)
    }
    return next() // 否则走原审批
  })
  // 关窗:技能完成 / 会话切换 / TTL 超时
}
```

**Key point**: DSH's `skill` tool call is an **explicit event** — ADR 0008 required frontend reporting in EasyWork, but it holds naturally in DSH, so the landing is smoother. Audit goes to `session/event` or a standalone storage table.

---

### 2.4 Scheduled tasks (cron headless execution + replay)

**Blueprint**: ADR 0010 (Run = HeadlessSession) / 0011 (unattended permissions).

**Approach (respect DSH's existing boundaries, external trigger + native replay)**:
1. **Trigger**: system crontab / launchd runs `dsh --profile headless "<skill invocation instruction>"` on schedule (DSH's headless profile already does one-shot headless execution).
2. **Replay**: headless sessions already write JSONL, and DSH session replay (fork/replay) naturally satisfies "conversational replay of execution details" — isomorphic with ADR 0010.
3. **Unattended permissions**: the headless profile's permission-presets are chosen by skill level (sandbox/networked/full); escalation = deny + audit + mark failed.
4. **Management UI** (optional): a Schedule list page (ui-* plugin) recording trigger rules + Run status.

**If built-in cron is needed**: extend the schedule package (currently session-internal reminders only, explicitly no cron expressions), or add a jobs scheduler — first assess whether external cron suffices.

---

### 2.5 File enhancements (GUI layer)

**Blueprint**: ADR 0012/0013/0014/0015.

**Approach**: all GUI + fs service extensions:
1. **File tree + multi-select bulk delete/move**: a ui-files plugin renders the file tree; the fs service extends bulk endpoints (ancestor folding + loop protection + 409 semantics).
2. **Hidden files**: a showHidden parameter + toggle button (pure UX, same as ADR 0014).
3. **HTML to PDF**: the server calls html-to-pdf's render.py directly + fake percentage progress via `session/event`; needs server-side python/Playwright.
4. **Drag to move**: dataTransfer.types distinguishes internal moves from OS uploads.

---

### 2.6 Message-panel role split / streaming smoothness

**Blueprint**: ADR 0016~0020.

**Approach**: DSH ui-conversation already renders the tool-call tree/timeline (the "admin view"). Add:
1. **Compact mode**: ConversationNodeDefinition + keyed Chat renderer, a horizontal capsule strip (5 fixed columns / basename / +N soft cap / always visible when done).
2. **Streaming smoothness**: stable key + flush coalescing + direction-aware scrolling — under DSH's event stream the focus is coalescing and memo (port ADR 0019's three-piece approach).
3. **Without multi-user**: the role split degrades to a "compact mode toggle" (a settings item); no need to wait for 2.8 multi-user.

---

### 2.7 Display-zone gallery

**Blueprint**: ADR 0001/0002/0003/0021/0022.

**Approach**: a new package `packages/report/` + ui plugin:
1. Report/Tag entities (`ctx.storage`); publishing = copy file + record, dedup key (sourceWorkspace, sourcePath).
2. Gallery UI: tag sidebar + report list + preview (iframe/new page).
3. markdown-lite renderer (ADR 0022): prose fields → p/ul/table + inline strong/em/code (escape first).
4. Single-user stage: the gallery is shared across all sessions; cross-user read-shared/write-isolated (0021) activates after 2.8 lands.

---

### 2.8 Multi-user system (suggest v2, philosophy conflict)

**Blueprint**: DEVELOPMENT_PLAN.md + section 3.1.

**Conflict**: DSH is a single-user local tool (identity is only a telemetry ID). Multi-user needs identity/credential, workspace ownership, RBAC, quotas, an admin backend — **align direction with DSH upstream first**, otherwise it conflicts with the project philosophy and is hard to merge. Suggestions:
1. First use the `settings`/`credentials` pattern for single-machine multi-profile (a lightweight substitute).
2. If there is strong demand, open a dedicated design document to evaluate the three sub-problems (identity/isolation/audit).

---

## 3. New-package development rules (per adding-a-package.md)

A new capability package must satisfy:

| Item | Requirement |
|---|---|
| Directory | `packages/<group>/<pkg>/` (existing groups: core/llm/shell/fs/skill/subagent/todo/session/ui/util/support…) |
| package.json | `private: true`, version matching the root, `@deepseek-ai/cordis` in both peer + dev, files only the lib artifact |
| tsconfig | extends `../../../tsconfig.base.json`, rootDir src, references pointing to cordis/schemastery/dependency packages |
| Registration | add the package to `tsconfig.host.json` or `tsconfig.client.json` references (one of the two, never both) |
| README | service API/events/extension points + the three Model Experience H4s + Known Limitations |
| Verification | `pnpm run constraints && pnpm run typecheck && pnpm run lint && pnpm run build && pnpm run hygiene` |

Package-topology principle: split capability definition / Provider / Consumer into packages (see the shell trio); name with role suffixes (Registry/Provider/Policy/Store…) and keep the `ctx` key's singular/plural consistent with the class name.

---

## 4. Suggested implementation milestones

| Milestone | Content | Expected form |
|---|---|---|
| M1 (now) | 12 skills into the skill root + dependency check | zero code, 1 day |
| M2 | knowledge-base package (kb): model/index/retrieval/read-only Q&A | new package ~1-2 weeks |
| M3 | permission-window plugin + scheduled tasks (external cron + headless) | 2 plugins/scripts ~1 week |
| M4 | file enhancements + message-panel compact mode | ui plugin ~1-2 weeks |
| M5 | display-zone gallery | new package + ui ~1 week |
| M6 | multi-user (v2, needs direction alignment first) | dedicated design |

After each milestone, add an ADR on the DSH side (following this repo's docs/adr/ style), recording the differences from the blueprint.
