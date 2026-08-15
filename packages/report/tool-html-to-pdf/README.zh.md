# @deepseek-ai/dsh-tool-html-to-pdf

[English](README.md) | 中文

文件系统与 subprocess seam 之上的**面向模型 HTML 转 PDF 工具** —— `html_to_pdf`。这是消费层：它拥有工具名、JSON schema、参数校验与结果格式化。它在子进程中通过 html-to-pdf 技能的 `render.py` 渲染一个 HTML 文件并返回输出 PDF 路径。

## 配置

| 键 | 含义 |
|---|---|
| `renderScript` | html-to-pdf `render.py` 脚本的绝对路径。 |
| `python` | 运行脚本的 Python 解释器。默认 `python3`。 |

## 工具

| 工具 | 参数 | 行为 |
|---|---|---|
| `html_to_pdf` | `file_path`、`output_path?` | 通过 `render.py` 渲染 `file_path` 并返回 `{ pdf_path }`。`output_path` 默认取输入路径的 `.pdf` 扩展名。 |

## 模型体验

### 工具 schema

#### 模型看到什么

模型看到生成的 [`html_to_pdf` schema](../../../docs/tool-catalog.md#deepseek-aidsh-tool-html-to-pdf)，参数为 snake_case。作用域化工具限制可为单个 agent 移除该定义。

#### Token 影响

每个请求固定 schema 开销，仅在该工具视图中计费。

#### KV Cache 影响

在可见工具定义不变时前缀稳定。注册生命周期或作用域限制可能使复用失效。

### 渲染结果

#### 模型看到什么

成功的 `html_to_pdf` 返回 `{ pdf_path }`。文本渲染为 `已生成 PDF：<path>`。渲染失败会把子进程 stderr 作为工具错误呈现。

#### Token 影响

成功文本很小；PDF 路径很小，结果保留到压缩前。

#### KV Cache 影响

只追加；新可见内容位于可复用请求前缀之后，不会使既有 KV Cache 条目失效。

## 已知限制与暂缓事项

- **渲染器依赖** — 部署需安装 html-to-pdf 脚本的 Playwright 或 WeasyPrint 运行时；本工具不内置。
- **无中间进度** — 渲染引擎不报告百分比，因此进度是两步假进度而非实时进度条。
