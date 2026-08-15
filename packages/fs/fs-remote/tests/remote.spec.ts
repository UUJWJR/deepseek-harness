import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { LocalFileSystem } from '@deepseek-ai/dsh-fs-local'
import FilesRemote from '@deepseek-ai/dsh-fs-remote'

let dir: string
let ctx: Context

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'dsh-fs-remote-'))
  ctx = new Context()
  await ctx.plugin(LocalFileSystem, { cwd: dir })
  await ctx.plugin(FilesRemote)
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('FilesRemote', () => {
  it('lists children with type and hidden flags', async () => {
    await writeFile(join(dir, 'note.md'), 'x')
    await mkdir(join(dir, 'sub'))
    await writeFile(join(dir, '.hidden'), 'y')

    const entries = await ctx.files.list({ path: dir })
    const byName = new Map(entries.map(entry => [entry.name, entry]))
    expect(byName.get('note.md')).toMatchObject({ type: 'file', hidden: false })
    expect(byName.get('note.md')?.path.endsWith('note.md')).toBe(true)
    expect(byName.get('sub')).toMatchObject({ type: 'directory', hidden: false })
    expect(byName.get('.hidden')).toMatchObject({ type: 'file', hidden: true })
  })

  it('deletes a file and an empty directory, refusing a non-empty directory', async () => {
    await writeFile(join(dir, 'a.md'), 'x')
    await ctx.files.delete({ path: join(dir, 'a.md') })
    await expect(readFile(join(dir, 'a.md'))).rejects.toThrow()

    await mkdir(join(dir, 'emptydir'))
    await ctx.files.delete({ path: join(dir, 'emptydir') })

    await mkdir(join(dir, 'full'))
    await writeFile(join(dir, 'full', 'child.md'), 'x')
    await expect(ctx.files.delete({ path: join(dir, 'full') })).rejects.toMatchObject({ code: 'FS_NOT_EMPTY' })
  })

  it('moves a file to a new path and refuses moving a directory into itself', async () => {
    await writeFile(join(dir, 'src.md'), 'body')
    await ctx.files.move({ source: join(dir, 'src.md'), destination: join(dir, 'dst.md') })
    expect(await readFile(join(dir, 'dst.md'), 'utf8')).toBe('body')

    await mkdir(join(dir, 'tree'))
    await expect(ctx.files.move({ source: join(dir, 'tree'), destination: join(dir, 'tree', 'inner') })).rejects.toMatchObject({ code: 'FS_LOOP' })
  })
})
