/**
 * Model-facing kb-ask tool: answer a question from one knowledge base through a
 * read-only subagent that explores the knowledge base root with read/grep/glob.
 *
 * @module @deepseek-ai/dsh-kb-agent
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { KnowledgeBaseError } from '@deepseek-ai/dsh-kb'
import type { RetrievalHint } from '@deepseek-ai/dsh-kb'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import type { SubagentRun, SubagentResult } from '@deepseek-ai/dsh-subagent'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

export const name = 'kb-agent'
export const inject = ['tools', 'knowledgeBases', 'subagents']

/** Configuration for the kb-ask tool. */
export interface Config {
  /** The ctx.subagents provider name to start the read-only child on. */
  provider: string
  /** Model-facing tool name. Defaults to kb-ask. */
  toolName?: string
}

export const Config: z<Config> = z.object({
  provider: z.string().required(),
  toolName: z.string().default('kb-ask'),
})

/** Tool names the read-only child keeps; everything else is removed. */
const READ_ONLY_TOOLS = ['read', 'grep', 'glob'] as const

/** Maximum directory depth rendered into the injected vault map. */
const VAULT_MAP_DEPTH = 2

interface VaultMap {
  tree: string
  fileCount: number
}

/**
 * Build a shallow vault map: a depth-limited directory tree plus a total
 * markdown file count.
 * @param root - knowledge base root.
 * @returns the rendered tree and file count.
 */
async function buildVaultMap(root: string): Promise<VaultMap> {
  let fileCount = 0
  const lines: string[] = []
  async function walk(dir: string, depth: number, prefix: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true })
    const visible = entries.filter(entry => !entry.name.startsWith('.'))
    for (const entry of visible) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) {
        lines.push(prefix + entry.name + '/')
        if (depth < VAULT_MAP_DEPTH) await walk(path, depth + 1, prefix + '  ')
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        fileCount += 1
        if (depth < VAULT_MAP_DEPTH) lines.push(prefix + entry.name)
      }
    }
  }
  await walk(root, 0, '')
  return { tree: lines.join('\n'), fileCount }
}

/**
 * Render one retrieval hint as a prompt line.
 * @param hint - the hint.
 * @returns a compact candidate line.
 */
function renderHint(hint: RetrievalHint): string {
  return '- ' + hint.path + ' :: ' + hint.snippet.replace(/\s+/g, ' ')
}

/**
 * Build the read-only child's prompt.
 * @param question - the user question.
 * @param root - knowledge base root absolute path.
 * @param map - the vault map.
 * @param hints - retrieval hints.
 * @returns the complete prompt text.
 */
function buildPrompt(question: string, root: string, map: VaultMap, hints: readonly RetrievalHint[]): string {
  const hintLines = hints.length === 0
    ? '(no full-text candidates)'
    : hints.map(renderHint).join('\n')
  return [
    'Answer a question from a local knowledge base (a vault of markdown documents).',
    '',
    'Knowledge base root (absolute path): ' + root,
    'Operate inside this directory only. Explore it with read, grep, and glob. ',
    'You have no write, edit, bash, or delegation tools.',
    '',
    'Directory map (first ' + String(VAULT_MAP_DEPTH) + ' levels, ' + String(map.fileCount) + ' markdown files):',
    map.tree.length === 0 ? '(empty)' : map.tree,
    '',
    'Full-text candidates (imprecise starting hints — verify by reading the files before relying on them):',
    hintLines,
    '',
    'Question: ' + question,
    '',
    'Answer from the documents. Cite the source file paths you relied on.',
  ].join('\n')
}

/** Extract the text of a subagent's output content blocks. */
function outputText(output: readonly ContentBlock[]): string {
  return output
    .filter((block): block is Extract<ContentBlock, { type: 'text' }> => block.type === 'text')
    .map(block => block.text)
    .join('')
}

/** Human-readable stop reason for a failed child. */
function stopReasonError(result: SubagentResult): string | undefined {
  switch (result.stopReason) {
    case 'completed':
      return undefined
    case 'aborted':
      return 'knowledge base subagent was cancelled'
    case 'error':
      return 'knowledge base subagent failed'
    case 'max-tokens':
      return 'knowledge base subagent hit its token limit'
    case 'refusal':
      return 'knowledge base subagent declined the task'
    default:
      return 'knowledge base subagent ended abnormally (' + String(result.stopReason) + ')'
  }
}

/** Settle one foreground read-only child run and release it. */
async function settleRun(run: SubagentRun): Promise<string> {
  try {
    const result = await run.result
    const error = stopReasonError(result)
    if (error !== undefined) throw new Error(error)
    return outputText(result.output)
  } finally {
    await run.dispose()
  }
}

export function apply(ctx: Context, config: Config): void {
  const toolName = config.toolName ?? 'kb-ask'
  ctx.tools.register(defineTool({
    name: toolName,
    description:
      'Ask a question against a registered knowledge base. Spawns a read-only subagent that explores '
      + 'the knowledge base root (read/grep/glob only) and answers with cited source files.',
    parameters: {
      kb: {
        type: 'string',
        required: true,
        description: 'The registered knowledge base name to query.',
      },
      question: {
        type: 'string',
        required: true,
        description: 'The question to answer from the knowledge base documents.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          answer: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: value.answer }],
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const parent = exec.agent
      if (parent === undefined) {
        throw new Error('kb-ask tool requires a calling agent (exec.agent was undefined)')
      }
      const kb = ctx.knowledgeBases.get(args.kb)
      if (kb === undefined) {
        throw new KnowledgeBaseError('knowledge base "' + args.kb + '" is not registered', 'KB_NOT_FOUND')
      }
      if (kb.state !== 'ready') {
        await ctx.knowledgeBases.index(args.kb)
      }
      const retrieval = await ctx.knowledgeBases.retrieve(args.kb, { query: args.question })
      const map = await buildVaultMap(kb.root)
      const prompt = buildPrompt(args.question, kb.root, map, retrieval.hints)
      const run = await ctx.subagents.start(config.provider, {
        label: 'kb-ask:' + args.kb,
        prompt: [{ type: 'text', text: prompt }] as ContentBlock[],
        parent,
        toolFilter: { allow: [...READ_ONLY_TOOLS] },
        signal: exec.signal,
      })
      const answer = await settleRun(run)
      return { answer }
    },
  }))
}
