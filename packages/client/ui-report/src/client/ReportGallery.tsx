/**
 * The gallery body: a tag sidebar + report list + selected-report preview.
 * The report list and tags arrive as the controller's immutable view; the
 * selected report's copied body is fetched on selection through the injected
 * read verb. Selection, tag filtering, and the read state are component-local.
 * @module @deepseek-ai/dsh-client-ui-report/client/ReportGallery
 */

import { useEffect, useMemo, useState } from 'react'
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'
import type { ReportKey } from './locales.ts'
import type { ReportGalleryView } from './controller.ts'
import { ReportList } from './ReportList.tsx'
import css from './ReportGallery.module.css'

interface ReportGalleryProps {
  view: ReportGalleryView
  read: (id: string) => Promise<string>
  t: Translate<ReportKey>
}

/**
 * Render the gallery for one immutable view.
 * @param props - the controller view, the body-read verb, and the translator.
 * @returns the status, empty, or gallery body.
 */
export function ReportGallery({ view, read, t }: ReportGalleryProps) {
  const [activeTag, setActiveTag] = useState<string | undefined>(undefined)
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const [content, setContent] = useState<string | undefined>(undefined)
  const [contentError, setContentError] = useState<string | null>(null)

  const reports = useMemo(
    () => (activeTag === undefined ? view.reports : view.reports.filter(report => report.tags.includes(activeTag))),
    [view.reports, activeTag],
  )
  const selected = view.reports.find(report => report.id === selectedId)

  useEffect(() => {
    if (selectedId === undefined) {
      setContent(undefined)
      setContentError(null)
      return
    }
    let alive = true
    setContent(undefined)
    setContentError(null)
    read(selectedId).then(
      (text) => { if (alive) setContent(text) },
      (error: unknown) => { if (alive) setContentError(error instanceof Error ? error.message : 'read failed') },
    )
    return () => { alive = false }
  }, [selectedId, read])

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
            {contentError !== null && <p data-testid="preview-error">{contentError}</p>}
            {contentError === null && content === undefined && <p data-testid="preview-loading">{t('gallery.loading')}</p>}
            {content !== undefined && <pre data-testid="preview-content">{content}</pre>}
          </>
        )}
      </section>
    </div>
  )
}
