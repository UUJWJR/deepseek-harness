import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { LocalFileSystem } from '@deepseek-ai/dsh-fs-local'
import LocalReportRegistry from '@deepseek-ai/dsh-report-local'

let sourceDir: string
let reportDir: string
let ctx: Context
let fiber: Awaited<ReturnType<Context['plugin']>>

beforeEach(async () => {
  sourceDir = await mkdtemp(join(tmpdir(), 'dsh-report-src-'))
  reportDir = await mkdtemp(join(tmpdir(), 'dsh-report-dst-'))
  ctx = new Context()
  await ctx.plugin(LocalFileSystem, { cwd: sourceDir })
  fiber = await ctx.plugin(LocalReportRegistry, { root: reportDir })
})
afterEach(async () => {
  await fiber.dispose()
  await rm(sourceDir, { recursive: true, force: true })
  await rm(reportDir, { recursive: true, force: true })
})

describe('LocalReportRegistry', () => {
  it('publishes a source file, copies it, and deduplicates by source', async () => {
    await writeFile(join(sourceDir, 'note.md'), '报告内容')
    const request = { source: { workspace: 'ws-1', path: 'note.md' }, tags: ['分析'] }

    const first = await ctx.reports.publish(request)
    expect(first.deduplicated).toBe(false)
    expect(first.report.tags).toEqual(['分析'])
    // The copy exists under the report root.
    const copies = await readFile(join(reportDir, String(first.report.id), 'note.md'), 'utf8')
    expect(copies).toBe('报告内容')

    const second = await ctx.reports.publish(request)
    expect(second.deduplicated).toBe(true)
    expect(second.report.id).toBe(first.report.id)
  })

  it('lists reports and distinct tags', async () => {
    await writeFile(join(sourceDir, 'a.md'), 'a')
    await writeFile(join(sourceDir, 'b.md'), 'b')
    await ctx.reports.publish({ source: { workspace: 'w', path: 'a.md' }, tags: ['x', 'y'] })
    await ctx.reports.publish({ source: { workspace: 'w', path: 'b.md' }, tags: ['y'] })

    expect(await ctx.reports.list()).toHaveLength(2)
    expect(await ctx.reports.list({ tag: 'x' })).toHaveLength(1)
    expect(await ctx.reports.tags()).toEqual(['x', 'y'])
  })
})
