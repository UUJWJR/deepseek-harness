# Agent Note: 权限窗口与无人值守权限模型

Status: implemented

[English](2026-08-15-permission-window-and-unattended-model.md) | 中文

## 问题

EasyWork 的 ADR 0007/0008 定义了自动批准可信技能工具调用的权限窗口，ADR 0011 为定时运行定义了更严格的无人值守模型。蓝本的关键教训是：开窗信号必须显式（前端上报技能名），绝不能依赖模型行为探测，因为技能是 prompt 注入、模型的工具调用不可预测。DSH 的 `skill` 工具调用本身就是那个显式信号。

## 决策

交付两个相互独立的 interaction 插件：

- `@deepseek-ai/dsh-trusted-skill-window` — 交互态窗口。它在一个指名部署可信技能的 `skill` 工具调用时打开，随后对该会话把 `approval/request` 解析为 `allowed-once`。审批服务仍追加其审计对，因此每笔授权都被记录。它按 TTL（`windowTtlMs`）、会话结束或硬上限（`maxAutoApprovals`）关闭。`never` 审批策略在派发前即拒绝，因此窗口绝不会覆盖它。
- `@deepseek-ai/dsh-unattended-permission` — 无人值守门禁（ADR 0011）。它跟踪技能的 `unattendedLevel`，并对 `tools/pre-execute` 中等级白名单之外的任何调用予以拒绝，绝不询问人类。`sandbox` 允许 read/grep/glob/write/edit/bash；`networked` 增加网页搜索与抓取；`full` 不受限。

两者在同一显式动作上打开，并接入不同面：窗口进 web-app bundle，无人值守门禁进 headless bundle。外部 cron 加 `dsh --profile headless` 是定时运行的传输（ADR 0010：一次运行就是一个无头会话，JSONL 即日志，回放即对话）；不新增调度器包。

## 曾考虑的替代方案

**共享的信任模型。** 否决：ADR 0011 将交互态开窗与无人值守白名单保持为两个独立语义——一个技能可以可信却不可无人值守，反之亦然。

**技能自声明可信。** 否决：ADR 0007 拒绝让任何技能自声明可信，否则普通用户写一个技能即可提权；信任是部署配置。

**内置调度器包。** 否决：ADR 0010 已将一次运行映射到一个无头会话，DSH 的 headless profile 已提供；外部 cron 尊重现有边界。

## 后果

交互态可信技能运行在默认 `ask` 策略下不再逐条撞审批，而每笔授权仍被审计。无人值守运行在越权时失败，而非向无人处提示。记录两处与蓝本的偏差：窗口按 TTL/会话/上限关闭，而非 harness 不暴露的交付信号；无人值守拒绝是工具面限制，而非操作系统沙箱。cron 调度本身、Run 列表 UI 与技能等级编写面仍暂缓。
