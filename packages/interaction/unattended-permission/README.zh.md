# @deepseek-ai/dsh-unattended-permission

[English](README.md) | 中文

无人值守权限模型（ADR 0011）。当一个声明了 `unattendedLevel` 的技能运行时，本插件拒绝该等级白名单之外的任何工具调用，而不是询问人类——无人值守运行在越权时失败，而非向无人处提示。

## 行为

等级从显式的技能加载动作跟踪，随后 `tools/pre-execute` 拒绝该等级白名单之外的任何工具。`sandbox` 允许 read/grep/glob/write/edit/bash；`networked` 增加网页搜索与抓取；`full` 不受限。不在 `unattendedLevels` 中的技能不受限。

## 配置

| 键 | 默认 | 约定 |
|---|---:|---|
| `unattendedLevels` | `{}` | 技能名到 `sandbox` / `networked` / `full`；缺席的技能不受限。 |

## 模型体验

无，等级门禁拒绝技能等级之外的工具调用，但不注册任何面向模型的提示词、schema、工具或消息。

#### KV Cache 影响

无；此包既不会组装也不会发送提供方请求。

## 已知限制与暂缓事项

- **工具面限制而非操作系统沙箱** — 拒绝在工具注册表层面执行，而非进程隔离。
- **会话级等级** — 等级作用于加载该技能的会话；不跨会话延续。
