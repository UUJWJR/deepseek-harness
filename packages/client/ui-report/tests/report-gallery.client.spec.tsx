// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ReportGallery } from '../src/client/ReportGallery.tsx'
import type { ReportGalleryView } from '../src/client/controller.ts'
import type { ReportKey } from '../src/client/locales.ts'

afterEach(cleanup)

const t = (key: ReportKey) => key

const view = (partial: Partial<ReportGalleryView>): ReportGalleryView => ({
  status: 'ready',
  reports: [
    { id: 'r1', source: { workspace: 'w', path: 'a.md' }, tags: ['分析'], publishedAt: 1 },
    { id: 'r2', source: { workspace: 'w', path: 'b.md' }, tags: ['分析', '通报'], publishedAt: 2 },
  ],
  tags: ['分析', '通报'],
  error: null,
  ...partial,
})

describe('ReportGallery', () => {
  it('renders an empty state when there are no reports', () => {
    render(<ReportGallery view={view({ reports: [], tags: [] })} t={t} />)
    expect(screen.getByTestId('report-status').textContent).toBe('gallery.empty')
  })

  it('renders rows and tags, and reveals a preview on selection', () => {
    render(<ReportGallery view={view({})} t={t} />)
    expect(screen.getAllByTestId('report-row')).toHaveLength(2)
    expect(screen.getAllByTestId('report-tag').map(el => el.textContent)).toEqual(['分析', '通报'])
    expect(screen.queryByTestId('preview-path')).toBeNull()

    fireEvent.click(screen.getAllByTestId('report-select')[0] as Element)
    expect(screen.getByTestId('preview-path').textContent).toBe('a.md')
  })

  it('filters rows when a tag is selected', () => {
    render(<ReportGallery view={view({})} t={t} />)
    fireEvent.click(screen.getAllByTestId('report-tag')[1] as Element)
    expect(screen.getAllByTestId('report-row')).toHaveLength(1)
    expect(screen.getByTestId('report-path').textContent).toBe('b.md')
  })
})
