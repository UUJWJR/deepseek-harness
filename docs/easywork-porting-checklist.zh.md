# EasyWork 定制能力移植到 deepseek-harness 清单

[English](easywork-porting-checklist.md) | 中文

> 目标项目:github.com/deepseek-ai/deepseek-harness(@deepseek-ai/dsh-root,0.1.0-rc.5,pnpm monorepo,TypeScript,Cordis 插件架构,MIT)
>
> 需求蓝本:docs/secondary-development.md(EasyWork 二次开发完整文档)
>
> 移植原则:**以蓝本重写,不搬代码**;优先 DSH 插件机制;按业务价值排序;已设计未实现的模块如实标注。

---

## 1. 移植策略总纲

EasyWork 与 DSH 是两套完全不同的架构:

| 维度 | EasyWork(源) | deepseek-harness(目标) |
|---|---|---|
| 形态 | 单体 Web 应用(React + Express + SQLite) | pnpm monorepo(host/client 双半区,Cordis 插件树) |
| 用户模型 | 多用户(登录/RBAC/配额) | 单用户本地工具(无账号体系) |
| 会话 | 服务端会话 + JSONL 同步 | SessionEvent 日志(内存 + JSONL/SQLite) |
| 扩展 | 技能(prompt 注入)+ 服务端路由 | skill 家族 + Cordis 插件(一切皆插件) |
| 权限 | acceptEdits + 权限窗口 + 审计 | permission-presets + user-approval + 事件审计 |

**核心判断**:DSH 的会话/工具/技能/权限骨架完备,移植 = 在既有骨架上补 6 块增量能力(知识库、cron、多用户、画廊、GUI 文件管理、角色化 UI)。其中**知识库与技能落地成本最低**,多用户与 DSH 单用户哲学冲突最大,需先行设计。

**建议实施顺序(按业务价值 × 落地成本)**:

1. **技能资产迁移**(成本最低,立即可做)——12 个业务技能直接映射 DSH skill 家族
2. **知识库检索**(价值最高,成本中)——FTS 引擎已有,补文档目录服务 + 只读问答 agent
3. **定时任务**(价值高,成本中)——headless profile + 外部 cron 触发
4. **权限窗口**(成本低,价值中)——在 interaction 层扩展按技能自动放行 + 审计
5. **文件增强**(成本中)——GUI 层文件管理
6. **消息面板角色分层**(成本中)——ui-* 插件扩展
7. **展示区画廊**(成本高)——需新增存储 + 发布语义
8. **多用户体系**(成本高,哲学冲突)——需专项设计,建议 v2 再议

---

## 2. 能力对照表(调研结论)

| EasyWork 能力 | DSH 现状 | 移植落点 | 成本 |
|---|---|---|---|
| 知识库(FTS5 文档目录 + LLM 消化) | ◐ 无知识库服务,有 SQLite FTS 引擎(session-query)与 web 抓取 | 新建 kb 包,复用 session-query FTS 模式 + skill 工具 | 中 |
| 业务技能(12 个,report-publish 等) | ✅ skill 家族 + Cordis 插件双机制 | 直接迁移 .claude/skills → DSH skills 目录 | 低 |
| 定时任务(cron 无头执行 + 回放) | ◐ 无 cron;有 headless profile / jobs / workflow / acp | 外部 cron + dsh headless;或扩展 schedule 包 | 中 |
| 权限窗口(可信技能自动批准 + 审计) | ◐ 有 approval/presets/事件审计日志 | 在 interaction 包扩展:技能级 auto-approve + audit | 低 |
| 多用户/登录/RBAC/配额/隔离 | ❌ 无(单用户本地) | 与 DSH 哲学冲突,需专项设计(identity/credential/权限层) | 高 |
| 展示区(报告画廊) | ❌ 无 | 新建 report 包:发布/标签/跨会话共享存储 | 高 |
| 文件增强(批量/拖拽/HTML转PDF/隐藏) | ◐ GUI 层无,模型层有 fs/shell | ui-files 插件 + fs 服务扩展 | 中 |
| 消息面板(时间线/角色分层) | ◐ 有事件流 + tool 树 + trajectory | ui-conversation 插件扩展 | 中 |
| 管理后台/监控 | ◐ 有 jobs/trajectory 视图 | ui-admin 插件(如需) | 中 |

---

## 3. 分模块移植清单

### 3.1 技能资产迁移(第一步,立即执行)

**目标**:把 EasyWork 的 12 个业务技能变为 DSH skill 家族可发现的技能。

**EasyWork 源**:.claude/skills/{data-analysis,data-to-md,draft-muti-revision,draft-revision,drafts-merge,html-to-pdf,md-to-docx,md-to-html,md-to-xhtml,references,report-publish,vocab-update}

**DSH 落点**:DSH skill 包按目录 + 加载器发现技能(与 EasyWork 同构),技能目录结构(SKILL.md + scripts/)可直接拷贝。

**步骤**:
1. 复制技能目录到 DSH 技能搜索路径(核对 DSH skill 包的实际目录约定)。
2. 校验每个 SKILL.md 的 frontmatter(name/description)符合 DSH skill 规范。
3. references 共享库(INDEX.md + write-style/word-format/indicator-system/stand-chart/vocab)整体迁移。
4. 脚本依赖核对:html-to-pdf 需 Playwright/WeasyPrint;md-to-xhtml/report-publish 需 Python(gen-datajson.py 等)。
5. 技能内嵌的 EasyWork 特有 API 调用(如任务上报 /api/tasks/upsert)替换为 DSH 等价机制(或移除)。

**验收**:DSH 会话中能通过 skill 工具发现并加载 report-publish,跑通简报模式生成 HTML。

### 3.2 知识库检索(最高业务价值)

**需求蓝本**:ADR 0004(检索)、ADR 0005(导入消化)、ADR 0006(KbAgent)。

**DSH 落点**:
- 新建 kb 服务包(建议 packages/kb):知识库注册 + 索引 + 检索。
- 索引复用 DSH SQLite FTS 模式(session-query 包已有先例);检索 = FTS + 概念索引(可选)。
- 只读问答 agent:DSH agent 会话 cwd 指向 KB 目录 + 工具白名单(Read/Grep/Glob)+ skill 提示注入 VaultMap —— 天然对应 DSH 的会话/工具守卫能力。
- GUI:kb 管理页 + 会话内 KB 选择器(ui-* 插件)。

**EasyWork 参考实现**:server/modules/knowledge-base/{indexer,searcher,watcher,digester,import,vault-map}、server/routes/knowledge-bases.js。

**步骤**:
1. 设计 KnowledgeBase 领域模型(注册、状态 ready/indexing/error、chunk 结构)。
2. 索引器:FTS 建表 + markdown 按 ## 切分 + fs.watch 增量/手动重建。
3. 检索器:概念匹配 + FTS BM25 合并取 top-N。
4. 问答:复用 DSH agent-loop,KB 会话注入 RetrievalHints + VaultMap,工具白名单只读。
5. 导入消化(可选第二阶段):文件上传 → 归档 → LLM 消化 → 重新索引,进度走 DSH 事件流。

**验收**:选中知识库后每句消息自动检索,agent 以 vault 为工作目录只读回答,底部可追溯引用来源。

### 3.3 定时任务(cron 无头执行 + 回放)

**需求蓝本**:ADR 0010(Run = HeadlessSession)、ADR 0011(无人值守权限)。

**DSH 现状**:headless profile 已支持一次性无头执行;schedule 包仅会话内提醒(明确不支持 cron);jobs 是会话内后台任务;acp/sdk 是自动化协议。

**方案(推荐,尊重 DSH 现有边界)**:
- 外部 cron(系统 crontab 或 DSH 新增调度器包)按计划触发 dsh headless 会话,启动指令 = 技能调用。
- 回放:headless 会话本就写入 JSONL,DSH 会话回放(fork/replay)天然支持——与 ADR 0010 的"Run = 无头 Session,JSONL 即日志"同构。
- 无人值守权限:headless profile 的权限预设按技能等级(sandbox/networked/full)选择;越权 = deny + 审计 + Run 失败。DSH 已有 permission-presets,补"按技能选择预设"映射即可。

**步骤**:
1. 设计 Schedule 实体(名称/技能/启动指令/目标 workspace/触发规则)。
2. 触发器:cron 表达式解析(新增或复用) → 生成 headless run。
3. Run 状态(等待中/运行中/成功/失败/超时)+ 事件流回放入口。
4. 技能等级字段 + 权限预设映射。

**注意**:ADR 0011 在 EasyWork 中**未落地**(无表无代码),移植时以 ADR 文档为蓝本全新实现,不受源代码约束。

### 3.4 权限窗口(可信技能自动批准 + 审计)

**需求蓝本**:ADR 0007、ADR 0008。

**DSH 现状**:interaction 包提供审批(user-approval)、权限预设(permission-presets)、事件审计日志——与 EasyWork 的权限窗口机制对应。

**移植**:
1. 技能声明 trusted 标记(前端显式上报 skillName 或会话内技能激活信号)。
2. interaction 扩展:trusted 技能执行期 auto-approve 其工具调用(含子 agent),逐条写审计事件。
3. TTL/硬上限/异常关窗:映射 DSH 的会话生命周期事件。
4. 关键教训(ADR 0008):技能是 prompt 注入,开窗信号必须显式(前端上报/会话内声明),不能依赖模型行为探测——DSH 的 skill 工具调用恰好是显式的,落地比 EasyWork 更顺。

### 3.5 文件增强(GUI 层文件管理)

**需求蓝本**:ADR 0012(多选批量删除)、0013(HTML转PDF)、0014(隐藏文件)、0015(拖拽移动)。

**DSH 现状**:GUI 层无文件管理;fs 服务族提供模型层 read/write/edit + rg glob/grep;workspace 实体管理目录。

**移植**(全部是 GUI 增量):
1. ui-files 插件:文件树(简单/紧凑/详细视图)、SelectionMode 多选、批量删除/移动端点(服务端 fs 服务扩展:祖先折叠 + 循环防护 + 409 语义)。
2. 隐藏文件:showHidden 参数 + 切换按钮(纯 UX,同 ADR 0014)。
3. HTML 转 PDF:服务端直调 render.py(Playwright)+ 伪百分比进度走 DSH 事件流;需 server 端 python 依赖。
4. 拖拽移动:dataTransfer.types 区分内部移动与 OS 上传。

### 3.6 消息面板角色分层

**需求蓝本**:ADR 0016~0020(时间线统一 + 普通用户横向节点条五连迭代)。

**DSH 现状**:ui-conversation 已渲染工具调用树/节点时间线(事件流驱动)——即"管理员视图"已存在。

**移植**:
1. 引入角色/简化偏好(若无多用户,可退化为"紧凑模式开关")。
2. 普通用户视图:ToolNodeStrip 横向胶囊条(5 列固定、basename 预览、+N 软上限、完成后常显)——纯前端组件,ui-conversation 插件扩展。
3. 流式平滑(稳定 key / flush 合并 / 方向感知滚动):DSH 事件流架构下重点做合并与 memo,避免逐事件重渲染。

### 3.7 展示区画廊

**需求蓝本**:ADR 0001(独立存储)、0002(AppShell)、0003(发布去重)、0021(跨用户可见)、0022(markdown-lite 渲染)。

**DSH 现状**:无。

**移植**:
1. report 服务包:Report/Tag 实体 + 发布(复制文件 + 记录)+ 去重键(sourceWorkspace, sourcePath)。
2. 画廊 UI:标签侧边栏 + 报告列表 + 预览(HTML/PDF/docx iframe/新页)。
3. markdown-lite 渲染器(0022):散文字段转 HTML(block: p/ul/table;inline: strong/em/code,先转义)。
4. 单用户阶段:画廊对所有会话共享即可;多用户落地后改为读共享/写隔离(0021)。

### 3.8 多用户体系(建议 v2,哲学冲突)

**需求蓝本**:DEVELOPMENT_PLAN.md + 3.1 节。

**冲突点**:DSH 是单用户本地工具(identity 仅遥测 ID,无账号/凭据/隔离)。多用户需要:
1. identity/credential 包:用户、登录、JWT(可复用 DSH 现有 settings/credentials 模式)。
2. workspace 级隔离:每用户 workspace 根 + agent 路径约束(DSH 已有 workspace 与 sandbox,扩展归属语义)。
3. RBAC:is_admin 角色 + 界面裁剪(侧边栏/Tab/命令菜单/设置项)。
4. 配额/有效期:token_quota、expires_at(存储层扩展)。
5. 管理后台:用户 CRUD + 连接监控 + 审计视图。

**建议**:作为独立里程碑设计,先确认 DSH 是否接受多用户方向(与开源项目上游对齐后再动)。

---

## 4. 决策记录建议

移植过程中,以下决策点建议在 DSH 侧记录 ADR(沿用本仓库 docs/adr/ 风格):

| 主题 | 建议记录 | 蓝本 |
|---|---|---|
| 知识库检索技术选型 | DSH 用 FTS 还是引入 embedding? | ADR 0004 |
| KB 回答运行时 | 复用 DSH agent-loop 还是独立运行时? | ADR 0006 |
| 定时任务触发方式 | 外部 cron vs 内置调度器? | ADR 0010 |
| 无人值守权限 | 技能等级预设映射 | ADR 0011 |
| 权限窗口信号 | DSH skill 工具调用即显式信号 | ADR 0008 |
| 展示区存储 | 独立目录复制 vs 引用 | ADR 0001 |

---

## 5. 已设计未实现(移植时按蓝本全新实现)

EasyWork 侧以下能力只有设计文档没有代码,移植时以 ADR 为蓝本直接实现,不受源代码约束:

- Schedule/Run 定时任务(ADR 0010/0011)
- unattended_level 技能等级(ADR 0011)
- AppShell 布局骨架独立组件(ADR 0002)
