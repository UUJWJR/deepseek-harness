/**
 * The gallery body: a tag sidebar + report list + selected-report preview.
 * Pure — data arrives as the controller's immutable view plus the bound
 * translator; selection and tag filtering are component-local state.
 * @module @deepseek-ai/dsh-client-ui-report/client/ReportGallery
 */

import { useMemo, useState } from 'react'
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'
import type { ReportKey } from './locales.ts'
import type { ReportGalleryView } from './controller.ts'
import { ReportList } from './ReportList.tsx'
import css from './ReportGallery.module.css'

interface ReportGalleryProps {
  view: ReportGalleryView
  t: Translate<ReportKey>
}

/**
 * Render the gallery for one immutable view.
 * @param props - the controller view and the bound translator.
 * @returns the status, empty, or gallery body.
 */
export function ReportGallery({ view, t }: ReportGalleryProps) {
  const [activeTag, setActiveTag] = useState<string | undefined>(undefined)
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)

  const reports = useMemo(
    () => (activeTag === undefined ? view.reports : view.reports.filter(report => report.tags.includes(activeTag))),
    [view.reports, activeTag],
  )
  const selected = view.reports.find(report => report.id === selectedId)

  if (view.status === 'loading') return <p data-testid="report-status">{t('gallery.loading')}</p>
  if (view.status === 'error') return <p data-testid="report-status">{t('gallery.error')}</p>
  if (view.status === 'ready' && view.reports.length === 0) {
    return <p data-testid="report-status">{t('gallery.empty')}</p>
  }

  return (
    <div className={css.gallery}>
      <div className={css.pane}>
        <ReportList
          reports={reports}
          onSelect={setSelectedId}
          onTagSelect={setActiveTag}
          {...selectedId === undefined ? {} : { selectedId }}
          {...activeTag === undefined ? {} : { activeTag }}
        />
      </div>
      <section className={css.preview} data-testid="report-preview" aria-live="polite">
        {selected === undefined ? null : (
          <>
            <h3 data-testid="preview-path">{selected.source.path}</h3>
            <p data-testid="preview-workspace">{selected.source.workspace}</p>
            <p data-testid="preview-time">{new Date(selected.publishedAt).toISOString()}</p>
          </>
        )}
      </section>
    </div>
  )
}
