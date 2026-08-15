/**
 * Model-facing HTML-to-PDF tool: renders one HTML file through the html-to-pdf
 * skill's render.py (Playwright/WeasyPrint) in a child process and returns the
 * output PDF path. Progress is a two-step fake (started → done); the render
 * engine reports no intermediate percentage.
 * @module @deepseek-ai/dsh-tool-html-to-pdf
 */

import { resolve } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import z from '@deepseek-ai/schemastery'
import type Schema from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-fs'
import type {} from '@deepseek-ai/dsh-subprocess'

export const name = 'tool-html-to-pdf'
export const inject = ['tools', 'fs', 'subprocess']

/** Configuration for the html_to_pdf tool. */
export interface Config {
  /** Absolute path to the html-to-pdf render.py script. */
  renderScript: string
  /** Python interpreter that runs the script. Defaults to `python3`. */
  python?: string
}

export const Config: Schema<Config> = z.object({
  renderScript: z.string().required(),
  python: z.string().default('python3'),
})

/** The tool's validated arguments. */
interface HtmlToPdfArgs {
  file_path: string
  output_path?: string
}

/** Bytes each collected output stream may retain in memory. */
const COLLECT_MAX_BYTES = 64 * 1024

/** Grace period for the child render process. */
const RENDER_GRACE_MS = 120_000

/**
 * Register the html_to_pdf tool.
 * @param ctx - the plugin context.
 * @param config - render script path and interpreter.
 */
export function apply(ctx: Context, config: Config): void {
  const python = config.python ?? 'python3'
  ctx.tools.register(defineTool({
    name: 'html_to_pdf',
    description: 'Render an HTML file to PDF through the html-to-pdf renderer and return the output PDF path.',
    parameters: {
      file_path: { type: 'string', required: true, description: 'HTML file to render.' },
      output_path: { type: 'string', description: 'Output PDF path. Defaults to the input path with a .pdf extension.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          pdf_path: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: '已生成 PDF：' + value.pdf_path,
      }],
    },
    async execute(args: HtmlToPdfArgs, exec) {
      const input = await ctx.fs.resolve(args.file_path)
      const outputPath = args.output_path === undefined
        ? input.displayPath.replace(/\.html?$/i, '') + '.pdf'
        : resolve(process.cwd(), args.output_path)
      const handle = ctx.subprocess.spawn({
        argv: [python, config.renderScript, input.displayPath, '-o', outputPath],
        cwd: process.cwd(),
        stdio: {
          stdin: 'ignore',
          stdout: { maxBytes: COLLECT_MAX_BYTES },
          stderr: { maxBytes: COLLECT_MAX_BYTES },
        },
        graceMs: RENDER_GRACE_MS,
        signal: exec.signal,
      })
      const outcome = await handle.done
      if (outcome.exitCode !== 0) {
        const stderr = handle.collected.stderr?.readFrom(0).text.trim() ?? ''
        throw new Error(`html_to_pdf failed (exit ${String(outcome.exitCode)}): ${stderr === '' ? 'no stderr' : stderr}`)
      }
      return { pdf_path: outputPath }
    },
  }))
}
