# @deepseek-ai/dsh-kb-agent

English | [中文](README.zh.md)

Model-facing `kb-ask` tool. Each call resolves a registered knowledge base, ensures it is indexed, retrieves ranked hints, then spawns a read-only subagent that explores the knowledge base root with `read`/`grep`/`glob` and answers with cited sources.

## Tool

`kb-ask` takes a knowledge base name and a question. The child is scoped with a tool filter that keeps only `read`, `grep`, and `glob`; write, edit, bash, and delegation tools vanish from its prompt and refuse to execute. The child's prompt carries the knowledge base root as an absolute path, a shallow directory map, and the retrieval hints framed as imprecise starting cues.

## Model Experience

### kb-ask tool

#### What the model sees

A tool with a required `kb` name and a required `question`. The tool description and parameter schema are fixed; the returned answer is the read-only child's final text.

#### Token effect

Fixed, always-present schema and description cost; the per-call answer text is the only data-dependent content.

#### KV Cache effect

The tool schema is prefix-stable; the answer is an independent child request that does not share the parent's cache prefix.

### Read-only child prompt

#### What the model sees

A prompt naming the knowledge base root, a depth-limited directory map, and the retrieval hints, instructing the child to explore only that directory with read/grep/glob and cite source files.

#### Token effect

Per-call; grows with the directory map size and the configured hint count.

#### KV Cache effect

Independent request per call; its prefix depends on the prompt layout, not on prior turns.

## Known Limitations and Deferred Work

- **Prompt-carried root, not a process cwd** — the subagent seam derives the child's cwd from its parent and offers no per-child override, so the knowledge base root is communicated in the prompt rather than set as the child's working directory.
- **Read-only by tool filter, not filesystem policy** — the child cannot write or execute, but the guarantee is a tool-surface restriction, not an OS-level sandbox.
