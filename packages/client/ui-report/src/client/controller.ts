/**
 * Browser-local object layer over the host report (display-zone) Remote. It
 * reads the published reports and the distinct tags once and publishes an
 * immutable view; selection and tag filtering are presentation concerns that
 * stay in the gallery component.
 * @module @deepseek-ai/dsh-client-ui-report/client/controller
 */

import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots'
import type { Report } from '@deepseek-ai/dsh-report/types'
import type { ReportView } from './report-view.ts'

/** The Remote calls the gallery needs. */
export interface ReportRemote {
  list: () => Promise<RemoteResult<readonly Report[]>>
  tags: () => Promise<RemoteResult<readonly string[]>>
}

/** Load state of the one read that seeds the whole gallery. */
export type ReportGalleryStatus = 'cold' | 'loading' | 'ready' | 'error'

/** Immutable view published to the gallery. */
export interface ReportGalleryView {
  status: ReportGalleryStatus
  reports: readonly ReportView[]
  tags: readonly string[]
  error: string | null
}

const EMPTY_VIEW: ReportGalleryView = Object.freeze({
  status: 'cold',
  reports: Object.freeze([]),
  tags: Object.freeze([]),
  error: null,
})

/** Copy one host Report into the client-safe ReportView. */
function toView(report: Report): ReportView {
  return {
    id: report.id,
    source: { workspace: report.source.workspace, path: report.source.path },
    tags: [...report.tags],
    publishedAt: report.publishedAt,
  }
}

/**
 * Per-gallery object layer over the report Remote. One instance backs the
 * whole gallery: a single list + tags read seeds every row and tag.
 */
export class ReportController implements HostObservable<ReportGalleryView> {
  private view = EMPTY_VIEW
  private readonly listeners = new Set<() => void>()
  private loadPromise: Promise<void> | null = null
  private disposed = false

  /**
   * @param remote - the report Remote namespace (list + tags).
   */
  constructor(private readonly remote: ReportRemote) {}

  /** Return the cached immutable view. */
  getSnapshot = (): ReportGalleryView => this.view

  /** Subscribe to view replacement. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /** Load once; a failed load stays retryable. */
  ensure(): Promise<void> {
    if (this.view.status === 'ready') return Promise.resolve()
    return this.refresh()
  }

  /** Re-read the authoritative list, collapsing concurrent callers onto one in-flight read. */
  refresh(): Promise<void> {
    if (this.loadPromise !== null) return this.loadPromise
    this.publish({ status: 'loading', reports: this.view.reports, tags: this.view.tags, error: null })
    const pending = this.load()
    this.loadPromise = pending
    return pending.finally(() => { this.loadPromise = null })
  }

  /** Drop subscribers and refuse further work when the owning fiber unloads. */
  dispose(): void {
    this.disposed = true
    this.listeners.clear()
  }

  private async load(): Promise<void> {
    try {
      const [listResult, tagsResult] = await Promise.all([this.remote.list(), this.remote.tags()])
      if (this.disposed) return
      if (!listResult.ok) {
        this.publish({ status: 'error', reports: this.view.reports, tags: this.view.tags, error: listResult.error.message })
        return
      }
      if (!tagsResult.ok) {
        this.publish({ status: 'error', reports: this.view.reports, tags: this.view.tags, error: tagsResult.error.message })
        return
      }
      this.publish({
        status: 'ready',
        reports: Object.freeze(listResult.value.map(toView)),
        tags: Object.freeze([...tagsResult.value]),
        error: null,
      })
    } catch (error) {
      if (this.disposed) return
      const message = error instanceof Error ? error.message : 'report gallery failed'
      this.publish({ status: 'error', reports: this.view.reports, tags: this.view.tags, error: message })
    }
  }

  private publish(view: ReportGalleryView): void {
    this.view = Object.freeze(view)
    for (const listener of this.listeners) {
      try {
        listener()
      } catch (error) {
        console.error('[ui-report] subscriber threw:', error)
      }
    }
  }
}
