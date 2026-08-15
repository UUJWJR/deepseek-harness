/** Domain vocabulary for the report (display-zone) capability. */

import type { Branded } from '@deepseek-ai/dsh-brand'

/** Opaque published-report id. */
export type ReportId = Branded<'ReportId'>

/**
 * Brand a string as a {@link ReportId}.
 * @param id - the raw id string to brand.
 * @returns the same string carrying the brand.
 */
export function ReportId(id: string): ReportId {
  return id as ReportId
}

/** The dedup key of a published report: the source file it was copied from. */
export interface ReportSource {
  /** The workspace the source file belongs to. */
  workspace: string
  /** The source file path, relative to the workspace root. */
  path: string
}

/** One published report. */
export interface Report {
  /** Opaque published-report id. */
  id: ReportId
  /** The source the report was published from. */
  source: ReportSource
  /** Tags attached at publish time. */
  tags: readonly string[]
  /** Epoch milliseconds of publication. */
  publishedAt: number
}

/** A list request narrowed to an optional tag. */
export interface ReportListRequest {
  /** Optional tag to filter by. */
  tag?: string
}

/** A publish request against one source file. */
export interface PublishRequest {
  /** The source file to copy and record. */
  source: ReportSource
  /** Tags to attach; defaults to none. */
  tags?: readonly string[]
}

/** A publish result. */
export interface PublishResult {
  /** The published report (new, or the existing one when deduplicated). */
  report: Report
  /** True when an existing report for the same source was returned instead of a new copy. */
  deduplicated: boolean
}

/** Error codes carried by {@link ReportError}. */
export type ReportErrorCode =
  | 'REPORT_SOURCE_NOT_FOUND'
  | 'REPORT_PUBLISH_FAILED'

/** Report registry error. */
export class ReportError extends Error {
  /** Machine-readable error code. */
  readonly code: ReportErrorCode

  constructor(message: string, code: ReportErrorCode, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ReportError'
    this.code = code
  }
}
