// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ToolCapsuleStrip } from '../src/client/ToolCapsuleStrip.tsx'

afterEach(cleanup)

describe('ToolCapsuleStrip', () => {
  it('renders up to the cap and folds the rest into a +N tail', () => {
    render(<ToolCapsuleStrip items={[
      { name: 'bash', settled: true },
      { name: 'read', settled: true },
      { name: 'edit', settled: false },
      { name: 'grep', settled: true },
      { name: 'glob', settled: true },
      { name: 'workflow', settled: true },
    ]} />)
    expect(screen.getAllByTestId('tool-capsule').map(el => el.textContent)).toEqual(['bash', 'read', 'edit', 'grep', 'glob'])
    expect(screen.getByTestId('tool-capsule-overflow').textContent).toBe('+1')
  })

  it('renders no overflow tail when under the cap', () => {
    render(<ToolCapsuleStrip items={[{ name: 'bash', settled: true }]} />)
    expect(screen.getAllByTestId('tool-capsule')).toHaveLength(1)
    expect(screen.queryByTestId('tool-capsule-overflow')).toBeNull()
  })
})
