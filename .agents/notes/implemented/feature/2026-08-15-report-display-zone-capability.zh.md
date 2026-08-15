# Agent Note：报告（展示区）能力 —— 带浏览器 Remote 的已发布报告注册表

状态：已实现

[English](2026-08-15-report-display-zone-capability.md) | 中文

## 问题

EasyWork 的报告能力（已发布报告画廊：复制源文件、带标签记录，并列举或过滤已发布集合）需要落地到 DSH。DSH 已有持久会话遥测与 message-feedback sidecar，但没有可供工具发布、可供 Web GUI 浏览的展示区注册表。

## 决策

在 `report` 分组下落地一个能力 seam：

- `@deepseek-ai/dsh-report` —— Service Definition。`ReportRegistry` 拥有已发布报告词汇与源去重键；`publish()`、`list()`、`tags()` 为抽象方法，边界类型（`Report`、`ReportSource`、`PublishRequest`、`PublishResult`、`ReportListRequest`、`ReportId`）位于公共 `./types` 子路径。共享的 `renderMarkdownLite` 助手将纯文本 markdown 渲染为画廊预览用的安全 HTML。
- `@deepseek-ai/dsh-report-local` —— 提供方。把每份已发布副本存放到配置的绝对 `root` 下按报告命名的子目录，并在 `reports.json` 元数据文件中记录，按（工作区，路径）去重，因此重复发布会返回 `deduplicated: true` 的既有报告。
- `@deepseek-ai/dsh-tool-report` —— 消费方。面向模型的 `report_publish` 与 `report_list` 工具通过 `ctx.reports` 发布与列举。
- `@deepseek-ai/dsh-client-ui-report` —— 在 Web GUI 中渲染已发布集合的客户端画廊。

提供方通过 Typert 把 `publish`/`list`/`tags` 暴露为浏览器 Remote：在 override 方法上使用 `@Remote('name')` 装饰器，加上 `readonly typertRemote = bindTypertRemote(this, 'reports')`。由于 Remote 边界类型必须从公共非根类型子路径导出，`./types` 导出由 Service Definition 拥有，而非提供方。base bundle 挂载 `report-local`（`root: dshHomePath('reports')`）与 `tool-report`，web-app bundle 挂载 `ui-report`。

## 已考虑的替代方案

**存入 `ctx.storage`。** 拒绝：报告是画廊预览、源可重新发布的文件副本，而非键值事实；一个副本目录加一份元数据文件是更简单的所有者。

**从服务返回富列表投影。** 拒绝：面向模型的工具与画廊都需要相同的扁平报告记录；投影是消费方关注点，不进入 Service Definition。

**手写画廊数据通道。** 拒绝：Web GUI 已经通过 Typert Remote 访问宿主服务；这样暴露 `ctx.reports` 复用了既有载体，而非另建传输。

## 后果

报告链路端到端可用：工具发布一份源副本，画廊列举它并按源去重。标签在发布时即固定；无报告删除、无按报告标签编辑，均暂缓。画廊只读（发布通过宿主工具进行）。取消随 Remote 载体传递，因此服务方法去掉了进程内 seam 曾使用的显式 `AbortSignal` 参数。
