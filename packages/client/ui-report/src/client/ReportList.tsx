/**
 * Pure presentational report list: renders a tag sidebar and a report list
 * from plain JSON views. No RPC or store — data arrives through props, so the
 * host API can be wired later without changing this component.
 */

import type { ReportView } from './report-view.ts'

interface ReportListProps {
  reports: readonly ReportView[]
}

/** Distinct tags across the reports, in first-seen order. */
function distinctTags(reports: readonly ReportView[]): string[] {
  return [...new Set(reports.flatMap(report => report.tags))]
}

/**
 * Render the gallery: a tag sidebar plus one row per published report.
 * @param props - the report views to render.
 */
export function ReportList({ reports }: ReportListProps) {
  const tags = distinctTags(reports)
  return (
    <div data-testid="report-gallery">
      <aside data-testid="report-tags">
        {tags.map(tag => <span key={tag} data-testid="report-tag">{tag}</span>)}
      </aside>
      <ul data-testid="report-list">
        {reports.map(report => (
          <li key={report.id} data-testid="report-row">
            <span data-testid="report-path">{report.source.path}</span>
            <span data-testid="report-workspace">{report.source.workspace}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
