# Porting EasyWork custom capabilities to deepseek-harness — checklist

English | [中文](easywork-porting-checklist.zh.md)

> Target project: github.com/deepseek-ai/deepseek-harness (@deepseek-ai/dsh-root, 0.1.0-rc.5, pnpm monorepo, TypeScript, Cordis plugin architecture, MIT)
>
> Requirements blueprint: docs/secondary-development.md (the complete EasyWork secondary-development document)
>
> Porting principle: **rewrite from the blueprint, do not copy code**; prefer DSH plugin mechanisms; order by business value; mark modules that were designed but not implemented as such.

---

## 1. Porting strategy overview

EasyWork and DSH are two completely different architectures:

| Dimension | EasyWork (source) | deepseek-harness (target) |
|---|---|---|
| Shape | monolithic web app (React + Express + SQLite) | pnpm monorepo (host/client halves, Cordis plugin tree) |
| User model | multi-user (login/RBAC/quota) | single-user local tool (no account system) |
| Session | server session + JSONL sync | SessionEvent log (memory + JSONL/SQLite) |
| Extension | skills (prompt injection) + server routes | skill family + Cordis plugins (everything is a plugin) |
| Permission | acceptEdits + permission window + audit | permission-presets + user-approval + event audit |

**Core judgment**: DSH's session/tool/skill/permission skeleton is complete, so porting = adding 6 incremental capabilities on top of the existing skeleton (knowledge base, cron, multi-user, gallery, GUI file management, role-based UI). **Knowledge base and skills have the lowest landing cost**; multi-user conflicts most with DSH's single-user philosophy and needs design first.

**Suggested implementation order (by business value × landing cost)**:

1. **Skill asset migration** (lowest cost, can be done now) — 12 business skills map directly to the DSH skill family
2. **Knowledge-base retrieval** (highest value, medium cost) — an FTS engine already exists, add a document-directory service + read-only Q&A agent
3. **Scheduled tasks** (high value, medium cost) — headless profile + external cron trigger
4. **Permission window** (low cost, medium value) — extend the interaction layer with per-skill auto-approval + audit
5. **File enhancements** (medium cost) — GUI-layer file management
6. **Message-panel role split** (medium cost) — ui-* plugin extension
7. **Display-zone gallery** (high cost) — needs new storage + publish semantics
8. **Multi-user system** (high cost, philosophy conflict) — needs dedicated design, suggested for v2

---

## 2. Capability mapping (survey conclusions)

| EasyWork capability | DSH status | Porting landing point | Cost |
|---|---|---|---|
| Knowledge base (FTS5 document directory + LLM digestion) | ◐ no KB service; has a SQLite FTS engine (session-query) and web fetching | new kb package, reuse the session-query FTS pattern + skill tool | medium |
| Business skills (12, report-publish etc.) | ✅ skill family + Cordis plugin dual mechanism | migrate .claude/skills → DSH skills directory directly | low |
| Scheduled tasks (cron headless execution + replay) | ◐ no cron; has headless profile / jobs / workflow / acp | external cron + dsh headless; or extend the schedule package | medium |
| Permission window (trusted-skill auto-approval + audit) | ◐ has approval/presets/event audit logs | extend the interaction package: per-skill auto-approve + audit | low |
| Multi-user/login/RBAC/quota/isolation | ❌ none (single-user local) | conflicts with DSH philosophy, needs dedicated design (identity/credential/permission layer) | high |
| Display zone (report gallery) | ❌ none | new report package: publish/tag/cross-session shared storage | high |
| File enhancements (bulk/drag/HTML-to-PDF/hidden) | ◐ no GUI layer; model layer has fs/shell | ui-files plugin + fs service extension | medium |
| Message panel (timeline/role split) | ◐ has event stream + tool tree + trajectory | ui-conversation plugin extension | medium |
| Admin backend/monitoring | ◐ has jobs/trajectory views | ui-admin plugin (if needed) | medium |

---

## 3. Per-module porting checklist

### 3.1 Skill asset migration (first step, do it now)

**Goal**: turn EasyWork's 12 business skills into skills discoverable by the DSH skill family.

**EasyWork source**: .claude/skills/{data-analysis,data-to-md,draft-muti-revision,draft-revision,drafts-merge,html-to-pdf,md-to-docx,md-to-html,md-to-xhtml,references,report-publish,vocab-update}

**DSH landing point**: the DSH skill package discovers skills by directory + loader (isomorphic with EasyWork), so the skill directory structure (SKILL.md + scripts/) can be copied directly.

**Steps**:
1. Copy the skill directories into a DSH skill search path (verify the DSH skill package's actual directory convention).
2. Verify each SKILL.md's frontmatter (name/description) against the DSH skill spec.
3. Migrate the references shared library (INDEX.md + write-style/word-format/indicator-system/stand-chart/vocab) wholesale.
4. Verify script dependencies: html-to-pdf needs Playwright/WeasyPrint; md-to-xhtml/report-publish need Python (gen-datajson.py etc.).
5. Replace any EasyWork-specific API call embedded in a skill (e.g. task reporting /api/tasks/upsert) with the DSH equivalent (or remove it).

**Acceptance**: a DSH session can discover and load report-publish through the skill tool, and run the briefing mode to generate HTML.

### 3.2 Knowledge-base retrieval (highest business value)

**Requirements blueprint**: ADR 0004 (retrieval), ADR 0005 (import digestion), ADR 0006 (KbAgent).

**DSH landing point**:
- A new kb service package (suggested packages/kb): KB registration + indexing + retrieval.
- Indexing reuses DSH's SQLite FTS pattern (the session-query package already has a precedent); retrieval = FTS + concept index (optional).
- Read-only Q&A agent: a DSH agent session with cwd pointing at the KB directory + a tool whitelist (Read/Grep/Glob) + skill prompt injecting VaultMap — this maps naturally to DSH's session/tool guard capabilities.
- GUI: a kb management page + an in-session KB selector (ui-* plugin).

**EasyWork reference implementation**: server/modules/knowledge-base/{indexer,searcher,watcher,digester,import,vault-map}, server/routes/knowledge-bases.js.

**Steps**:
1. Design the KnowledgeBase domain model (registration, state ready/indexing/error, chunk structure).
2. Indexer: FTS table + markdown split by ## + fs.watch incremental/manual rebuild.
3. Retriever: concept matching + FTS BM25 merge into top-N.
4. Q&A: reuse the DSH agent loop; inject RetrievalHints + VaultMap into the KB session; read-only tool whitelist.
5. Import digestion (optional phase two): file upload → archive → LLM digestion → re-index; progress goes through the DSH event stream.

**Acceptance**: after selecting a KB, every message auto-retrieves, the agent answers read-only with vault as the working directory, and the bottom can trace citation sources.

### 3.3 Scheduled tasks (cron headless execution + replay)

**Requirements blueprint**: ADR 0010 (Run = HeadlessSession), ADR 0011 (unattended permissions).

**DSH status**: the headless profile already supports one-shot headless execution; the schedule package is session-internal reminders only (explicitly no cron); jobs are session-internal background tasks; acp/sdk are automation protocols.

**Plan (recommended, respecting DSH's existing boundaries)**:
- External cron (system crontab or a new DSH scheduler package) triggers a dsh headless session on schedule; the startup instruction = skill invocation.
- Replay: headless sessions already write JSONL, and DSH session replay (fork/replay) supports it naturally — isomorphic with ADR 0010's "Run = headless Session, JSONL is the log".
- Unattended permissions: the headless profile's permission presets are chosen by skill level (sandbox/networked/full); escalation = deny + audit + Run failure. DSH already has permission-presets; only the "choose preset by skill" mapping is missing.

**Steps**:
1. Design the Schedule entity (name/skill/startup instruction/target workspace/trigger rule).
2. Trigger: cron expression parsing (new or reused) → generate a headless run.
3. Run status (waiting/running/success/failure/timeout) + event-stream replay entry.
4. Skill-level field + permission-preset mapping.

**Note**: ADR 0011 is **not implemented** in EasyWork (no table, no code); implement fresh from the ADR document, unconstrained by source code.

### 3.4 Permission window (trusted-skill auto-approval + audit)

**Requirements blueprint**: ADR 0007, ADR 0008.

**DSH status**: the interaction package provides approval (user-approval), permission presets (permission-presets), and event audit logs — corresponding to EasyWork's permission-window mechanism.

**Porting**:
1. The skill declares a trusted marker (frontend reports skillName explicitly, or an in-session skill-activation signal).
2. interaction extension: during a trusted skill's execution, auto-approve its tool calls (including subagents), writing an audit event per call.
3. TTL/hard cap/abnormal window close: map to DSH's session lifecycle events.
4. Key lesson (ADR 0008): a skill is prompt injection, so the window-open signal must be explicit (frontend reporting / in-session declaration), not model-behavior detection — DSH's skill tool call happens to be explicit, so the landing is smoother than EasyWork.

### 3.5 File enhancements (GUI-layer file management)

**Requirements blueprint**: ADR 0012 (multi-select bulk delete), 0013 (HTML-to-PDF), 0014 (hidden files), 0015 (drag to move).

**DSH status**: no file management at the GUI layer; the fs service family provides model-layer read/write/edit + rg glob/grep; the workspace entity manages directories.

**Porting** (all GUI increments):
1. ui-files plugin: file tree (simple/compact/detail views), SelectionMode multi-select, bulk delete/move endpoints (server-side fs service extension: ancestor folding + loop protection + 409 semantics).
2. Hidden files: showHidden parameter + toggle button (pure UX, same as ADR 0014).
3. HTML to PDF: the server calls render.py (Playwright) directly + fake percentage progress through the DSH event stream; needs server-side python.
4. Drag to move: dataTransfer.types distinguishes internal moves from OS uploads.

### 3.6 Message-panel role split

**Requirements blueprint**: ADR 0016~0020 (timeline unification + the ordinary-user horizontal node strip's five iterations).

**DSH status**: ui-conversation already renders the tool-call tree/node timeline (event-stream driven) — i.e. the "admin view" already exists.

**Porting**:
1. Introduce a role/simplified preference (without multi-user, it degrades to a "compact mode toggle").
2. Ordinary-user view: ToolNodeStrip horizontal capsule strip (5 fixed columns, basename preview, +N soft cap, always visible when done) — a pure frontend component, ui-conversation plugin extension.
3. Streaming smoothness (stable key / flush coalescing / direction-aware scrolling): under DSH's event-stream architecture, focus on coalescing and memo to avoid per-event re-rendering.

### 3.7 Display-zone gallery

**Requirements blueprint**: ADR 0001 (independent storage), 0002 (AppShell), 0003 (publish dedup), 0021 (cross-user visibility), 0022 (markdown-lite rendering).

**DSH status**: none.

**Porting**:
1. report service package: Report/Tag entities + publishing (copy file + record) + dedup key (sourceWorkspace, sourcePath).
2. Gallery UI: tag sidebar + report list + preview (HTML/PDF/docx iframe/new page).
3. markdown-lite renderer (0022): prose fields to HTML (block: p/ul/table; inline: strong/em/code, escape first).
4. Single-user stage: the gallery is shared across all sessions; after multi-user lands, switch to read-shared/write-isolated (0021).

### 3.8 Multi-user system (suggest v2, philosophy conflict)

**Requirements blueprint**: DEVELOPMENT_PLAN.md + section 3.1.

**Conflict**: DSH is a single-user local tool (identity is only a telemetry ID, no account/credential/isolation). Multi-user needs:
1. identity/credential package: user, login, JWT (can reuse DSH's existing settings/credentials pattern).
2. workspace-level isolation: per-user workspace root + agent path constraints (DSH already has workspace and sandbox; extend ownership semantics).
3. RBAC: is_admin role + UI trimming (sidebar/Tab/command menu/settings items).
4. Quota/validity: token_quota, expires_at (storage-layer extension).
5. Admin backend: user CRUD + connection monitoring + audit views.

**Suggestion**: design it as a standalone milestone; first confirm whether DSH accepts the multi-user direction (align with the open-source project upstream before moving).

---

## 4. Decision-record suggestions

During porting, the following decision points are suggested to be recorded as ADRs on the DSH side (following this repo's docs/adr/ style):

| Topic | Suggested record | Blueprint |
|---|---|---|
| Knowledge-base retrieval technology choice | Should DSH use FTS or introduce embedding? | ADR 0004 |
| KB Q&A runtime | Reuse the DSH agent loop or a standalone runtime? | ADR 0006 |
| Scheduled-task trigger method | External cron vs built-in scheduler? | ADR 0010 |
| Unattended permissions | Skill-level preset mapping | ADR 0011 |
| Permission-window signal | DSH skill tool call is the explicit signal | ADR 0008 |
| Display-zone storage | Standalone directory copy vs reference | ADR 0001 |

---

## 5. Designed but not implemented (implement fresh from the blueprint)

The following EasyWork capabilities have only design documents and no code; implement them directly from the ADR as the blueprint, unconstrained by source code:

- Schedule/Run scheduled tasks (ADR 0010/0011)
- unattended_level skill level (ADR 0011)
- AppShell layout skeleton standalone component (ADR 0002)
