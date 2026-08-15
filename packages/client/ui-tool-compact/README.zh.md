# @deepseek-ai/dsh-client-ui-tool-compact

[English](README.md) | 中文

紧凑工具调用胶囊。当 `compactMode` 开启时，它注册一个逐调用的紧凑工具 `ConversationNodeDefinition` 及其 keyed 胶囊渲染器，使每个工具调用在完整调用树旁也渲染为一行胶囊（名称 + 完成标记）。它不注册任何面向模型的界面。

## 配置

| 键 | 默认 | 含义 |
|---|---|---|
| `compactMode` | `false` | 注册紧凑工具胶囊。 |

## 模型体验

无，紧凑渲染器仅投影已记录的工具调用而不改变模型上下文；面向模型的工具界面位于宿主工具包中。

#### KV Cache 影响

无；此包既不会组装也不会发送提供方请求。

## 已知限制与暂缓事项

- **追加而非替换** — 胶囊渲染在完整调用树旁；替换树渲染器暂缓。
- **仅配置开关** — `compactMode` 是加载时配置，而非运行时设置项。
- **逐调用胶囊** — 每个胶囊对应一次工具调用；回合级「5 列 + +N」条（`ToolCapsuleStrip`）尚未接上回合聚合 Definition。
