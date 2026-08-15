/**
 * Local filesystem report registry: publish copies a source file into the
 * report root and records it, deduplicating by (workspace, path).
 *
 * @module @deepseek-ai/dsh-report-local
 */

import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type Schema from '@deepseek-ai/schemastery'
import { ReportError, ReportId, ReportRegistry } from '@deepseek-ai/dsh-report'
import type { PublishRequest, PublishResult, Report, ReportListRequest } from '@deepseek-ai/dsh-report'
import { bindTypertRemote, Remote } from '@deepseek-ai/dsh-typert-protocol'
import type {} from '@deepseek-ai/dsh-fs'

/** Maximum source bytes one publish copies. */
const MAX_SOURCE_BYTES = 50 * 1024 * 1024

/** Configuration for the local report registry. */
export interface Config {
  /** Absolute report-root directory holding published copies and the metadata file. */
  root: string
}

export const Config: Schema<Config> = z.object({
  root: z.string().required(),
})

/** The on-disk metadata shape. */
interface Metadata {
  reports: Report[]
}

/** Concrete filesystem-backed ctx.reports service. */
export class LocalReportRegistry extends ReportRegistry {
  static Config: Schema<Config> = Config
  static inject = ['fs']

  private readonly _root: string

  /** Gateway binding exposing publish/list/tags as browser Remotes. */
  readonly typertRemote = bindTypertRemote(this, 'reports')

  constructor(ctx: Context, config: Config) {
    super(ctx)
    if (typeof config.root !== 'string' || config.root.trim().length === 0 || !config.root.startsWith('/')) {
      throw new ReportError('report root must be a non-blank absolute path', 'REPORT_PUBLISH_FAILED')
    }
    this._root = config.root
  }

  @Remote('publish')
  override async publish(request: PublishRequest): Promise<PublishResult> {
    const existing = (await this.list()).find(report =>
      report.source.workspace === request.source.workspace && report.source.path === request.source.path)
    if (existing !== undefined) return { report: existing, deduplicated: true }

    const fs = this.ctx.fs
    const sourceTarget = await fs.resolve(request.source.path)
    const content = await fs.readBytes(sourceTarget, undefined, MAX_SOURCE_BYTES)

    const id = ReportId(randomUUID())
    const dir = join(this._root, String(id))
    await mkdir(dir, { recursive: true, mode: 0o700 })
    await writeFile(join(dir, basename(request.source.path)), content)

    const report: Report = {
      id,
      source: request.source,
      tags: request.tags ?? [],
      publishedAt: Date.now(),
    }
    const metadata = await this._readMetadata()
    metadata.reports.push(report)
    await this._writeMetadata(metadata)
    return { report, deduplicated: false }
  }

  @Remote('list')
  override async list(request?: ReportListRequest): Promise<readonly Report[]> {
    const metadata = await this._readMetadata()
    return request?.tag === undefined
      ? metadata.reports
      : metadata.reports.filter(report => report.tags.includes(request.tag as string))
  }

  @Remote('tags')
  override async tags(): Promise<readonly string[]> {
    const metadata = await this._readMetadata()
    return [...new Set(metadata.reports.flatMap(report => report.tags))]
  }

  private _metadataPath(): string {
    return join(this._root, 'reports.json')
  }

  private async _readMetadata(): Promise<Metadata> {
    try {
      const raw = await readFile(this._metadataPath(), 'utf8')
      const parsed = JSON.parse(raw) as Metadata
      return { reports: Array.isArray(parsed.reports) ? parsed.reports : [] }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { reports: [] }
      throw error
    }
  }

  private async _writeMetadata(metadata: Metadata): Promise<void> {
    const path = this._metadataPath()
    const temp = path + '.tmp-' + randomUUID()
    await writeFile(temp, JSON.stringify(metadata, null, 2) + '\n')
    await rename(temp, path)
  }
}

export default LocalReportRegistry
