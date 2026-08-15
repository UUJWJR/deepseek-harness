import { describe, expect, it } from 'vitest'
import { FsTargetKey, foldAncestors } from '@deepseek-ai/dsh-fs'
import type { FsTarget } from '@deepseek-ai/dsh-fs'

function target(path: string): FsTarget {
  return { targetKey: FsTargetKey(path), displayPath: path }
}

function contains(parent: FsTarget, child: FsTarget): boolean {
  const p = String(parent.targetKey)
  const c = String(child.targetKey)
  return c === p || c.startsWith(p + '/')
}

describe('foldAncestors', () => {
  it('drops descendants when an ancestor is also selected', () => {
    const folded = foldAncestors([target('/a'), target('/a/b'), target('/c')], contains)
    expect(folded.map(t => String(t.targetKey))).toEqual(['/a', '/c'])
  })

  it('keeps unrelated targets untouched', () => {
    const folded = foldAncestors([target('/x'), target('/y')], contains)
    expect(folded).toHaveLength(2)
  })

  it('returns an empty set for empty input', () => {
    expect(foldAncestors([], contains)).toEqual([])
  })
})
