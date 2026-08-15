# 在 deepseek-harness 中二次开发实操指南

[English](easywork-development-guide.md) | 中文

> 目标:把 EasyWork 定制能力(EasyWork 侧清单见 docs/secondary-development.md)以 DSH 原生的插件/skill 机制落地。
>
> 已确认事实:DSH 是**一切皆插件**的微内核(基于 vendored Cordis);技能格式与 EasyWork 兼容;开发流程 = pnpm 单仓 + 门禁。

---

## 0. 开发环境搭建

```sh
# 前置:Node 22.19+ / 24+,Corepack pnpm(packageManager 固定 pnpm@11.7.0)
cd ~/Documents/开发/deepseek-harness
corepack enable          # 若 pnpm --version 无法解析
pnpm install             # 安装依赖 + 配置 Lefthook 钩子
pnpm run typecheck       # 搭建完成的验收标准:typecheck 成功退出
```

日常命令(仓库根):
- `pnpm run test` — vitest 单元测试
- `pnpm run test:snapshot` — 无 key 的 ACP/headless 回放
- `pnpm run lint` / `pnpm run typecheck` — 静态检查
- `pnpm run build` — tsc 产出 + tsdown 打包
- `pnpm run hygiene` — knip/publint/workspace 约束
- `pnpm dsh --profile headless "任务"` — 从源码跑一次无头任务(需要 DEEPSEEK_API_KEY)
- Web GUI:apps/web 产物由 dsh 的 web 模式托管(当前 3080 端口)

---

## 1. 扩展机制速查(功能 → 落点)

DSH 是微内核:**任何产品功能 = 在某个文档化扩展点上挂监听器**,不修改 agent-loop 本身。

| 你要做的 | 用哪个机制 | 对应包 |
|---|---|---|
| 加一个工具 | `ctx.tools.register()` / `defineTool` | 任意包 |
| 加权限门禁(如权限窗口) | `ctx.on('tools/pre-execute', ...)` 返回 `{kind:'deny'}` / `{kind:'ask'}` | interaction |
| 包裹工具执行(超时/重试/指标) | `ctx.on('tools/execute', ...)` | guard |
| 观察最终工具结果(审计) | `ctx.on('tools/result', ...)` | — |
| 改系统提示词 | `ctx.systemPrompt.section()` | core |
| 加业务技能 | 技能目录(SKILL.md)放进技能根,零代码 | skill-filesystem |
| 加会话 UI 业务行 | `ConversationNodeDefinition` + keyed Chat renderer | client / ui-* |
| 监听会话事件流(渲染/统计) | `ctx.on('session/event', ...)` | — |
| 给模型发输入/steer | `ctx.agents.get(sid)?.followup()` / `.steer()` | core |
| 持久化数据 | `ctx.storage`(JSON/SQLite 后端)+ 会话 JSONL/SQLite | storage / session |
| 定时/后台任务 | 外部 cron + `dsh --profile headless`,或扩展 jobs/schedule | jobs / headless |

### 技能发现根(关键!)

`@deepseek-ai/dsh-skill-filesystem` 按序扫描(rank 小的优先):

| 来源 | 路径 |
|---|---|
| project-dsh | `<projectRoot>/.dsh/skills` |
| project-agents | `<projectRoot>/.agents/skills` |
| custom | `Config.customSkillDirs`(配置项) |
| user-dsh | `<dshHome>/skills`($DSH_HOME 或 ~/.dsh) |
| user-agents | `<agentsHome>/skills`($DSH_AGENTS_HOME 或 ~/.agents) |

**技能格式**:`<name>/SKILL.md`(目录 bundle,frontmatter 需 `name`(kebab-case)+ `description`,可选 `whenToUse`/`metadata`/`disable-model-invocation`/`user-invocable`),或扁平 `<name>.md`。嵌套 `**/SKILL.md` 不递归发现。技能体每次加载实时重读,无需缓存失效。子资源目录 `references/`、`scripts/`、`assets/` 的变更不触发目录失效。

> ✅ **已验证**:EasyWork 的 12 个技能均为 `<name>/SKILL.md` + kebab-case name + description,与 DSH 格式**完全兼容**,可直接迁移。

---

## 2. 分模块落地指南

### 2.1 技能资产迁移(第一步,零代码,立即执行)

**做法**:把技能目录复制到 DSH 任意技能根,DSH 自动发现、模型经 `skill` 工具加载。

```sh
# 方案 A:用户级(所有项目可用)——推荐
mkdir -p ~/.dsh/skills
cp -r <easywork>/.claude/skills/{data-analysis,data-to-md,draft-muti-revision,draft-revision,drafts-merge,html-to-pdf,md-to-docx,md-to-html,md-to-xhtml,report-publish,vocab-update} ~/.dsh/skills/
cp -r <easywork>/.claude/skills/references ~/.dsh/skills/references

# 方案 B:项目级(仅本项目可用)
mkdir -p <projectRoot>/.dsh/skills
cp -r <easywork>/.claude/skills/* <projectRoot>/.dsh/skills/
```

**核对清单**:
1. 每个技能 frontmatter 的 `name` 是 kebab-case、`description` 存在(DSH 必需)。
2. 技能内跨目录相对引用(`../references/INDEX.md`)——references 须与技能同级或按技能内声明的 resourceBase 调整。
3. 脚本依赖:html-to-pdf 需 Playwright/WeasyPrint;md-to-xhtml/report-publish 需 Python(gen-datajson.py 等)——在 DSH 环境装齐或把依赖写进技能说明。
4. 技能内嵌 EasyWork 特有 API(如 `/api/tasks/upsert` 上报)替换为 DSH 等价机制(会话事件/`ctx.todo`/`ctx.jobs`)或删除。
5. **语义注意**:EasyWork 技能是 Claude Code 系(compatibility: Read/Write/Edit/Agent…),DSH 工具名不同(bash/fs/web/subagent),技能正文中的工具名提示需过一遍;DSH 无 `Agent` 工具,子代理走 `ctx.subagent`。

**验收**:DSH GUI 技能列表出现 12 个技能;新会话中模型能用 `skill` 工具加载 report-publish 并跑通简报模式。

---

### 2.2 知识库检索(最高业务价值)

**蓝本**:ADR 0004(检索)/ 0005(导入消化)/ 0006(KbAgent)。DSH 已有 SQLite FTS 先例(session-query)。

**做法**:新增一个能力包 `packages/kb/`(参考 adding-a-package.md 清单)。

1. **领域模型**:KnowledgeBase(注册、状态 ready/indexing/error、chunk 表)——用 `ctx.storage` 或独立 SQLite。
2. **索引器**:扫描本地文档目录(md 按 `##` 切 chunk)→ FTS5 trigram 建表(照抄 session-query 的 FTS 模式)→ `ctx.fs` 监听增量 + 手动重建。
3. **检索器**:概念匹配 + FTS BM25 合并取 top-N → 产出 RetrievalHints。
4. **只读问答 agent**:复用 DSH agent-loop——新 agent 会话 `cwd` 指向 KB 根,工具注册表 restrict 到 read/grep/glob,系统提示注入 VaultMap + RetrievalHints。DSH 的 `ctx.tools.restrict()` 天然支持"只读工具面",比 EasyWork 的服务端拒绝更干净。
5. **导入消化**(第二阶段):文件上传 → 归档 → LLM 消化(digester)→ 重索引;进度走 `session/event` + `ctx.jobs`。
6. **GUI**:会话输入框 KB 选择器(ui-* 插件);KB 管理页。

**决策点(建议记 ADR)**:DSH 用 FTS 还是引入 embedding?——蓝本 ADR 0004 的理由(FTS5 零依赖/中文友好)在 DSH 同样成立,建议沿用。

---

### 2.3 权限窗口 / 可信技能

**蓝本**:ADR 0007/0008。DSH 已有 approval/presets/审计事件。

**做法**:interaction 包扩展,或新插件 `trusted-skill-window`:

```ts
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

**关键**:DSH 的 `skill` 工具调用是**显式事件**——ADR 0008 在 EasyWork 里要靠前端上报,在 DSH 里天然成立,落地更顺。审计写 `session/event` 或独立 storage 表。

---

### 2.4 定时任务(cron 无头执行 + 回放)

**蓝本**:ADR 0010(Run = HeadlessSession)/ 0011(无人值守权限)。

**做法(尊重 DSH 现有边界,外部触发 + 原生回放)**:
1. **触发器**:系统 crontab / launchd 定时执行 `dsh --profile headless "<技能调用指令>"`(DSH 已有 headless profile 一次性无头执行)。
2. **回放**:headless 会话本就写 JSONL,DSH 会话回放(fork/replay)天然满足"对话式回放执行细节"——与 ADR 0010 同构。
3. **无人值守权限**:headless profile 的 permission-presets 按技能等级(sandbox/networked/full)选择;越权 = deny + 审计 + 标记失败。
4. **管理 UI**(可选):Schedule 列表页(ui-* 插件),记录触发规则 + Run 状态。

**若需内置 cron**:扩展 schedule 包(当前仅会话内提醒,明确不支持 cron 表达式),或新建 jobs 调度器——先评估外部 cron 是否够用。

---

### 2.5 文件增强(GUI 层)

**蓝本**:ADR 0012/0013/0014/0015。

**做法**:全部是 GUI + fs 服务扩展:
1. **文件树 + 多选批量删除/移动**:ui-files 插件渲染文件树;fs 服务扩展批量端点(祖先折叠 + 循环防护 + 409 语义)。
2. **隐藏文件**:showHidden 参数 + 切换按钮(纯 UX,同 ADR 0014)。
3. **HTML 转 PDF**:服务端直调 html-to-pdf 的 render.py + 伪百分比进度走 `session/event`;需 server 端 python/Playwright。
4. **拖拽移动**:dataTransfer.types 区分内部移动与 OS 上传。

---

### 2.6 消息面板角色分层 / 流式平滑

**蓝本**:ADR 0016~0020。

**做法**:DSH ui-conversation 已渲染工具调用树/时间线(即"管理员视图")。增加:
1. **紧凑模式**:ConversationNodeDefinition + keyed Chat renderer,横向胶囊条(5 列固定/basename/+N 软上限/完成后常显)。
2. **流式平滑**:稳定 key + flush 合并 + 方向感知滚动——DSH 事件流下重点是合并与 memo(照搬 ADR 0019 三件套思路)。
3. **无多用户时**:角色分层退化为"紧凑模式开关"(settings 项),不必等 2.8 多用户。

---

### 2.7 展示区画廊

**蓝本**:ADR 0001/0002/0003/0021/0022。

**做法**:新包 `packages/report/` + ui 插件:
1. Report/Tag 实体(`ctx.storage`),发布 = 复制文件 + 记录,去重键(sourceWorkspace, sourcePath)。
2. 画廊 UI:标签侧边栏 + 报告列表 + 预览(iframe/新页)。
3. markdown-lite 渲染器(ADR 0022):散文字段 → p/ul/table + 行内 strong/em/code(先转义)。
4. 单用户阶段:画廊对所有会话共享即可;跨用户读共享/写隔离(0021)待 2.8 落地后启用。

---

### 2.8 多用户体系(建议 v2,哲学冲突)

**蓝本**:DEVELOPMENT_PLAN.md + 3.1 节。

**冲突**:DSH 是单用户本地工具(identity 仅遥测 ID)。多用户需要 identity/credential、workspace 归属、RBAC、配额、管理后台——**先与 DSH 上游对齐方向再做**,否则与项目哲学冲突,难以合入。建议:
1. 先用 `settings`/`credentials` 模式做单机多 profile(轻量替代)。
2. 若有强需求,单独开设计文档评估(身份/隔离/审计三个子问题)。

---

## 3. 新包开发规范(按 adding-a-package.md)

新增能力包必须满足:

| 项 | 要求 |
|---|---|
| 目录 | `packages/<group>/<pkg>/`(已有分组:core/llm/shell/fs/skill/subagent/todo/session/ui/util/support…) |
| package.json | `private: true`、version 与根一致、`@deepseek-ai/cordis` 在 peer + dev 双声明、files 仅 lib 产物 |
| tsconfig | extends `../../../tsconfig.base.json`,rootDir src,references 指向 cordis/schemastery/依赖包 |
| 登记 | 普通包加进 `tsconfig.host.json` 或 `tsconfig.client.json` 的 references(二选一,不可同时) |
| README | 服务 API/事件/扩展点 + Model Experience 三 H4 + Known Limitations |
| 验证 | `pnpm run constraints && pnpm run typecheck && pnpm run lint && pnpm run build && pnpm run hygiene` |

包拓扑原则:能力定义 / Provider / Consumer 拆包(参考 shell 三件套);命名用 role 后缀(Registry/Provider/Policy/Store…)且 `ctx` 键单复数与类名一致。

---

## 4. 建议的实施里程碑

| 里程碑 | 内容 | 预计形态 |
|---|---|---|
| M1(立即) | 12 技能迁入技能根 + 依赖核对 | 零代码,1 天 |
| M2 | 知识库包(kb):模型/索引/检索/只读问答 | 新包 ~1-2 周 |
| M3 | 权限窗口插件 + 定时任务(外部 cron + headless) | 2 个插件/脚本 ~1 周 |
| M4 | 文件增强 + 消息面板紧凑模式 | ui 插件 ~1-2 周 |
| M5 | 展示区画廊 | 新包 + ui ~1 周 |
| M6 | 多用户(v2,需先对齐方向) | 专项设计 |

每完成一个里程碑,在 DSH 侧补一份 ADR(沿用本仓库 docs/adr/ 风格),记录与蓝本的差异。