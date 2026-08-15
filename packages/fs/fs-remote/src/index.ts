/**
 * Browser-facing filesystem Remote: exposes path-based list/delete/move over
 * the fs seam so the web GUI can render a file tree and apply bulk mutations.
 * Absolute paths cross the wire; the browser never joins path segments.
 * @module @deepseek-ai/dsh-fs-remote
 */

import { Context, Service } from '@deepseek-ai/cordis'
import { bindTypertRemote, Remote } from '@deepseek-ai/dsh-typert-protocol'
import type {} from '@deepseek-ai/dsh-fs'
import type { FileDeleteRequest, FileEntry, FileListRequest, FileMoveRequest } from './types.ts'

export type * from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    files: FilesRemote
  }
}

/** Browser-facing filesystem Remote service. */
export class FilesRemote extends Service {
  static inject = ['fs']

  /** Gateway binding exposing list/delete/move as browser Remotes. */
  readonly typertRemote = bindTypertRemote(this, 'files')

  constructor(ctx: Context) {
    super(ctx, 'files')
  }

  /**
   * List one directory level.
   * @param request - absolute directory path to list.
   * @returns the children, name-sorted, with absolute paths for follow-ups.
   */
  @Remote('list')
  async list(request: FileListRequest): Promise<readonly FileEntry[]> {
    const target = await this.ctx.fs.resolve(request.path)
    const entries = await this.ctx.fs.listDir(target)
    return entries.map(entry => ({
      name: entry.name,
      path: this.ctx.fs.processPath(entry.target),
      type: entry.type,
      hidden: entry.name.startsWith('.'),
    }))
  }

  /**
   * Delete one file or one empty directory.
   * @param request - absolute path to delete.
   */
  @Remote('delete')
  async delete(request: FileDeleteRequest): Promise<void> {
    const target = await this.ctx.fs.resolve(request.path)
    await this.ctx.fs.delete(target)
  }

  /**
   * Move one path to another; moving a directory into its own descendant
   * fails with the backend's loop protection.
   * @param request - absolute source and destination paths.
   */
  @Remote('move')
  async move(request: FileMoveRequest): Promise<void> {
    const source = await this.ctx.fs.resolve(request.source)
    const destination = await this.ctx.fs.resolve(request.destination)
    await this.ctx.fs.move(source, destination)
  }
}

export default FilesRemote
