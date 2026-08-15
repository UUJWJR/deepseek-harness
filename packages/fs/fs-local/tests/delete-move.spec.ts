import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { LocalFileSystem } from '@deepseek-ai/dsh-fs-local'
import type { FileSystem } from '@deepseek-ai/dsh-fs'

let dir: string
let ctx: Context
let fs: FileSystem
let fiber: Awaited<ReturnType<Context['plugin']>>

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'dsh-fs-del-'))
  ctx = new Context()
  fiber = await ctx.plugin(LocalFileSystem, { cwd: dir })
  fs = ctx.fs
})
afterEach(async () => {
  await fiber.dispose()
  await rm(dir, { recursive: true, force: true })
})

describe('FileSystem delete/move', () => {
  it('deletes a file', async () => {
    await writeFile(join(dir, 'a.txt'), 'x')
    const target = await fs.resolve('a.txt')
    await fs.delete(target)
    await expect(fs.stat(target)).resolves.toBeUndefined()
  })

  it('deletes an empty directory', async () => {
    await mkdir(join(dir, 'emptydir'))
    const target = await fs.resolve('emptydir')
    await fs.delete(target)
    await expect(fs.stat(target)).resolves.toBeUndefined()
  })

  it('rejects deleting a non-empty directory', async () => {
    await mkdir(join(dir, 'sub'))
    await writeFile(join(dir, 'sub', 'b.txt'), 'x')
    const target = await fs.resolve('sub')
    await expect(fs.delete(target)).rejects.toMatchObject({ code: 'FS_NOT_EMPTY' })
  })

  it('moves a file', async () => {
    await writeFile(join(dir, 'a.txt'), 'x')
    const source = await fs.resolve('a.txt')
    const destination = await fs.resolve('b.txt')
    await fs.move(source, destination)
    await expect(fs.stat(source)).resolves.toBeUndefined()
    await expect(fs.stat(destination)).resolves.toMatchObject({ type: 'file' })
  })

  it('rejects moving a directory into its own descendant', async () => {
    await mkdir(join(dir, 'sub'))
    await mkdir(join(dir, 'sub', 'inner'))
    const source = await fs.resolve('sub')
    const destination = await fs.resolve(join('sub', 'inner'))
    await expect(fs.move(source, destination)).rejects.toMatchObject({ code: 'FS_LOOP' })
  })
})
