# @deepseek-ai/dsh-report

[English](README.md) | 中文

报告（展示区）能力的 Service Definition。一份已发布报告是源文件的副本，带有标签与发布时间戳，并按源去重。`ReportRegistry` 拥有已发布报告词汇与去重键；提供方在同一 `ctx.reports` 服务上实现 `publish()`、`list()`、`tags()` 与 `read()`。

## 领域词汇

- **report（报告）** — 一份源文件的已发布副本，带不透明 id、被复制的源、标签与发布时间戳。
- **source（源）** — 去重键：一个工作区加一个工作区相对路径，标识发布时复制的文件。
- **tag（标签）** — 发布时附加的可选字符串；`list()` 可按单个标签过滤。

`publish(request)` 将源复制进报告存储并记录，当源已发布过时返回既有报告；`list(request?)` 按发布顺序返回匹配的报告；`tags()` 按首次出现顺序列出所有不同标签；`read(request)` 返回一份报告及其复制的文件内容。`ReportError.code` 是覆盖源缺失、报告 id 缺失与复制失败的封闭联合。共享的 `renderMarkdownLite` 助手将纯文本 markdown 渲染为画廊预览用的安全 HTML。

## 模型体验

无，注册表仅向调用方返回报告与标签，不注册任何面向模型的提示词、schema、工具或消息。

#### KV Cache 影响

无；此包既不会组装也不会发送提供方请求。

## 已知限制与暂缓事项

- **无提供方协调器** — 这是没有兜底实现的抽象 Service Definition；具体提供方必须实现 `publish()`、`list()`、`tags()` 与 `read()`。
- **无授权** — 这是受信任的上下文级服务；模型工具或 UI 必须自行执行访问策略。
