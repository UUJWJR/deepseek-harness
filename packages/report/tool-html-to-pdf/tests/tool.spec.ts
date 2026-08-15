import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import { CallId } from '@deepseek-ai/dsh-llm'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { LocalFileSystem } from '@deepseek-ai/dsh-fs-local'
import { LocalSubprocessRuntime } from '@deepseek-ai/dsh-subprocess-local'
import * as ToolHtmlToPdf from '@deepseek-ai/dsh-tool-html-to-pdf'

const fixture = fileURLToPath(new URL('./fixtures/render.mjs', import.meta.url))
const signal = new AbortController().signal
let counter = 0

function call(ctx: Context, name: string, args: unknown) {
  return ctx.tools.execute({ signal, callId: CallId(`pdf-${++counter}`), name, arguments: args })
}

async function mount(renderScript: string) {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(LocalFileSystem, { cwd: dir })
  await ctx.plugin(LocalSubprocessRuntime)
  const fiber = await ctx.plugin(ToolHtmlToPdf, { renderScript, python: process.execPath })
  return { ctx, fiber }
}

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'dsh-html-to-pdf-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('tool-html-to-pdf', () => {
  it('renders an HTML file to a sibling PDF and returns its path', async () => {
    await writeFile(join(dir, 'note.html'), '<h1>hi</h1>')
    const { ctx, fiber } = await mount(fixture)

    const result = await call(ctx, 'html_to_pdf', { file_path: 'note.html' })
    expect(result.isError).toBe(false)
    if (result.isError) throw new Error('expected render success')
    expect(result.value).toEqual({ pdf_path: join(dir, 'note.pdf') })
    expect(await readFile(join(dir, 'note.pdf'), 'utf8')).toContain('note.html')

    await fiber.dispose()
  })

  it('rejects a failing render with the child stderr', async () => {
    await writeFile(join(dir, 'bad.html'), 'x')
    const boom = join(dir, 'boom.mjs')
    await writeFile(boom, "process.stderr.write('render exploded'); process.exit(2)\n")
    const { ctx, fiber } = await mount(boom)

    const result = await call(ctx, 'html_to_pdf', { file_path: 'bad.html' })
    expect(result.isError).toBe(true)
    if (!result.isError) throw new Error('expected render failure')
    expect(result.error.message).toContain('render exploded')

    await fiber.dispose()
  })
})
