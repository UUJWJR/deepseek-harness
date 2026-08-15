/**
 * Pure presentational report list: renders a tag sidebar and a report list
 * from plain JSON views. No RPC or store — data arrives through props, so the
 * host API can be wired without changing this component.
 * @module @deepseek-ai/dsh-client-ui-report/client/ReportList
 */

import type { ReportView } from './report-view.ts'

interface ReportListProps {
  reports: readonly ReportView[]
  /** Selected report id (row highlight). */
  selectedId?: string
  /** Callback when a row is selected. */
  onSelect?: (id: string) => void
  /** Active tag (sidebar highlight); undefined = all reports. */
  activeTag?: string
  /** Callback when a tag is clicked; undefined clears the filter. */
  onTagSelect?: (tag: string | undefined) => void
}

/** Distinct tags across the reports, in first-seen order. */
function distinctTags(reports: readonly ReportView[]): string[] {
  return [...new Set(reports.flatMap(report => report.tags))]
}

/**
 * Render the gallery: a tag sidebar plus one row per published report.
 * @param props - the report views to render, plus optional selection state.
 */
export function ReportList({ reports, selectedId, onSelect, activeTag, onTagSelect }: ReportListProps) {
  const tags = distinctTags(reports)
  return (
    <div data-testid="report-gallery">
      <aside data-testid="report-tags">
        {tags.map(tag => (
          <button
            key={tag}
            type="button"
            data-testid="report-tag"
            data-active={tag === activeTag || undefined}
            onClick={() => { onTagSelect?.(tag === activeTag ? undefined : tag) }}
          >
            {tag}
          </button>
        ))}
      </aside>
      <ul data-testid="report-list">
        {reports.map(report => (
          <li key={report.id} data-testid="report-row">
            <button
              type="button"
              data-testid="report-select"
              data-active={report.id === selectedId || undefined}
              onClick={() => { onSelect?.(report.id) }}
            >
              <span data-testid="report-path">{report.source.path}</span>
              <span data-testid="report-workspace">{report.source.workspace}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
