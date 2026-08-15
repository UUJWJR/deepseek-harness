/**
 * Service Definition for the report (display-zone) capability: published
 * reports are copies of source files recorded with tags, deduplicated by
 * source. A provider implements publish/list on the same ctx.reports service;
 * the markdown-lite renderer is a shared pure prose-to-HTML function.
 *
 * @module @deepseek-ai/dsh-report
 */

import { Context, Service } from '@deepseek-ai/cordis'
import type { PublishRequest, PublishResult, Report } from './types.ts'

export type * from './types.ts'
export { ReportError, ReportId } from './types.ts'
export { renderMarkdownLite } from './markdown-lite.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    reports: ReportRegistry
  }
}

/**
 * Report registry service. Owns the published-report vocabulary and the
 * dedup key; a provider implements publish and list.
 */
export abstract class ReportRegistry extends Service {
  constructor(ctx: Context) {
    super(ctx, 'reports')
  }

  /**
   * Publish one source file: copy it into the report storage and record it,
   * returning the existing report when the source was already published.
   * @param request - source file and optional tags.
   * @param signal - optional cancellation.
   * @returns the published report and whether it deduplicated to an existing one.
   */
  abstract publish(request: PublishRequest, signal?: AbortSignal): Promise<PublishResult>

  /**
   * List published reports, optionally narrowed to one tag.
   * @param tag - optional tag to filter by.
   * @param signal - optional cancellation.
   * @returns the matching reports in publication order.
   */
  abstract list(tag?: string, signal?: AbortSignal): Promise<readonly Report[]>

  /**
   * List every distinct tag across published reports.
   * @param signal - optional cancellation.
   * @returns the tags in first-seen order.
   */
  abstract tags(signal?: AbortSignal): Promise<readonly string[]>
}

export default ReportRegistry
