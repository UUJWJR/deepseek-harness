/**
 * Client-local JSON view of one published report: what the gallery renders
 * once the host report service is exposed to the browser. Kept client-safe —
 * no host service types cross into the browser half.
 */

/** One published report as seen by the browser. */
export interface ReportView {
  /** Opaque published-report id. */
  id: string
  /** The source the report was published from. */
  source: { workspace: string; path: string }
  /** Tags attached at publish time. */
  tags: string[]
  /** Epoch milliseconds of publication. */
  publishedAt: number
}
