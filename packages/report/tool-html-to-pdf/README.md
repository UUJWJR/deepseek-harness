# @deepseek-ai/dsh-tool-html-to-pdf

English | [中文](README.zh.md)

The **model-facing HTML-to-PDF tool** — `html_to_pdf` — over the filesystem and subprocess seams. This is the consumer layer: it owns the tool name, JSON schema, argument validation, and result formatting. It renders one HTML file through the html-to-pdf skill's `render.py` in a child process and returns the output PDF path.

## Config

| Key | Meaning |
|---|---|
| `renderScript` | Absolute path to the html-to-pdf `render.py` script. |
| `python` | Python interpreter running the script. Defaults to `python3`. |

## Tools

| Tool | Arguments | Behavior |
|---|---|---|
| `html_to_pdf` | `file_path`, `output_path?` | Renders `file_path` through `render.py` and returns `{ pdf_path }`. `output_path` defaults to the input path with a `.pdf` extension. |

## Model Experience

### Tool schema

#### What the model sees

The model sees the generated [`html_to_pdf` schema](../../../docs/tool-catalog.md#deepseek-aidsh-tool-html-to-pdf), with snake_case arguments. Scoped tool restrictions can remove the definition for one agent.

#### Token effect

Fixed schema cost on every request in that tool view.

#### KV Cache effect

Prefix-stable while the visible tool definition is unchanged. Registration lifecycle or scoped restrictions may invalidate reuse.

### Render result

#### What the model sees

A successful `html_to_pdf` returns `{ pdf_path }`. The text rendering is `已生成 PDF：<path>`. A failing render surfaces the child process stderr as the tool error.

#### Token effect

Small success text; the PDF path is small, and the result is resent until compaction.

#### KV Cache effect

Append-only; newly visible content follows the reusable request prefix and does not invalidate existing KV-cache entries.

## Known Limitations and Deferred Work

- **Renderer dependency** — the deployment must install the html-to-pdf script's Playwright or WeasyPrint runtime; the tool does not bundle one.
- **No intermediate progress** — the render engine reports no percentage, so progress is a two-step fake rather than a live meter.
