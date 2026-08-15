# @deepseek-ai/dsh-report-local

[English](README.md) | 中文

报告（展示区）能力的本地文件系统提供方。它把已发布副本存放在配置的绝对 `root` 目录下，并在 `reports.json` 元数据文件中记录，按（工作区，路径）去重。它在 `ctx.reports` 上实现 `publish()`、`list()`、`tags()` 与 `read()`（[Service Definition](../report/README.md)），并通过 Typert 网关绑定将其暴露为浏览器 Remote。

## 配置

| 键 | 含义 |
|---|---|
| `root` | 存放已发布副本与 `reports.json` 元数据文件的绝对报告根目录。 |

`publish` 将源文件（上限 50 MiB）复制进以其不透明 id 命名的每报告子目录并追加一条元数据记录；重复发布同一源会返回 `deduplicated: true` 的既有报告。`list` 可按可选标签过滤；`tags` 按首次出现顺序返回不同标签；`read` 返回一份报告及其复制的文件内容，对缺失 id 抛出 `REPORT_NOT_FOUND`。

## 模型体验

无，本地后端仅向调用方返回已发布报告与标签，不注册任何面向模型的提示词、schema、工具或消息。

#### KV Cache 影响

无；此包既不会组装也不会发送提供方请求。

## 已知限制与暂缓事项

- **单机存储** — 报告只存在于一个本地目录，既不跨主机复制也不共享。
- **无跨进程锁** — 对同一根目录的并发发布会无锁地读-改-写 `reports.json`。
