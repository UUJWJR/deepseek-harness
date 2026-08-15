import { describe, expect, it } from 'vitest'
import { ReportId } from '@deepseek-ai/dsh-report'
import type { Report } from '@deepseek-ai/dsh-report/types'
import { ReportController } from '../src/client/controller.ts'
import type { ReportRemote } from '../src/client/controller.ts'

function ok<T>(value: T) {
  return { ok: true as const, value }
}

function fail(code: string, message: string) {
  return { ok: false as const, error: { code, message, details: {} } }
}

const reports: Report[] = [
  { id: ReportId('r1'), source: { workspace: 'w', path: 'a.md' }, tags: ['分析'], publishedAt: 1 },
  { id: ReportId('r2'), source: { workspace: 'w', path: 'b.md' }, tags: ['分析', '通报'], publishedAt: 2 },
]

describe('ReportController', () => {
  it('loads reports and tags into a ready view', async () => {
    const remote: ReportRemote = {
      list: async () => ok(reports),
      tags: async () => ok(['分析', '通报']),
    }
    const controller = new ReportController(remote)
    const statuses: string[] = []
    controller.subscribe(() => { statuses.push(controller.getSnapshot().status) })

    await controller.ensure()

    const view = controller.getSnapshot()
    expect(view.status).toBe('ready')
    expect(view.reports.map(report => report.source.path)).toEqual(['a.md', 'b.md'])
    expect(view.reports[0]?.tags).toEqual(['分析'])
    expect(view.tags).toEqual(['分析', '通报'])
    expect(view.error).toBeNull()
    expect(statuses).toEqual(['loading', 'ready'])
  })

  it('collapses a failed list read into an error view and stays retryable', async () => {
    let calls = 0
    const remote: ReportRemote = {
      list: async () => { calls += 1; return fail('carrier', 'down') },
      tags: async () => ok([]),
    }
    const controller = new ReportController(remote)

    await controller.ensure()
    expect(controller.getSnapshot().status).toBe('error')
    expect(controller.getSnapshot().error).toBe('down')

    await controller.ensure()
    expect(calls).toBe(2)
  })

  it('deduplicates concurrent ensure calls onto one read', async () => {
    let calls = 0
    const remote: ReportRemote = {
      list: async () => { calls += 1; return ok(reports) },
      tags: async () => ok([]),
    }
    const controller = new ReportController(remote)

    await Promise.all([controller.ensure(), controller.ensure()])
    expect(calls).toBe(1)
    expect(controller.getSnapshot().status).toBe('ready')
  })
})
