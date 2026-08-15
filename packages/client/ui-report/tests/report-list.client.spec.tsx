// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReportList } from '../src/client/ReportList.tsx'
import type { ReportView } from '../src/client/report-view.ts'

const reports: ReportView[] = [
  { id: 'r1', source: { workspace: 'w', path: 'a.md' }, tags: ['分析'], publishedAt: 1 },
  { id: 'r2', source: { workspace: 'w', path: 'b.md' }, tags: ['分析', '通报'], publishedAt: 2 },
]

describe('ReportList', () => {
  it('renders distinct tags and one row per report', () => {
    render(<ReportList reports={reports} />)
    expect(screen.getByTestId('report-gallery')).toBeTruthy()
    expect(screen.getAllByTestId('report-tag').map(t => t.textContent)).toEqual(['分析', '通报'])
    expect(screen.getAllByTestId('report-row')).toHaveLength(2)
    expect(screen.getAllByTestId('report-path').map(t => t.textContent)).toEqual(['a.md', 'b.md'])
  })
})
