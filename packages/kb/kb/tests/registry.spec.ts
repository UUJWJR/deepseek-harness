import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import KnowledgeBaseRegistry, { KnowledgeBaseError } from '@deepseek-ai/dsh-kb'

class StubRegistry extends KnowledgeBaseRegistry {
  override async index(_name: string): Promise<void> {}
  override async retrieve(): Promise<{ hints: readonly never[] }> {
    return { hints: [] }
  }
}

describe('dsh-kb KnowledgeBaseRegistry', () => {
  it('registers, lists, and resolves knowledge bases', async () => {
    const ctx = new Context()
    await ctx.plugin(StubRegistry, { knowledgeBases: [{ name: 'vault-a', root: '/tmp/a' }] })

    expect(ctx.knowledgeBases.get('vault-a')).toMatchObject({ name: 'vault-a', root: '/tmp/a', state: 'ready' })
    expect(ctx.knowledgeBases.list().map(kb => kb.name)).toEqual(['vault-a'])

    const dispose = ctx.knowledgeBases.register('vault-b', '/tmp/b')
    expect(ctx.knowledgeBases.get('vault-b')?.root).toBe('/tmp/b')
    dispose()
    expect(ctx.knowledgeBases.get('vault-b')).toBeUndefined()
  })

  it('rejects an invalid name, a non-absolute root, and a duplicate', async () => {
    const ctx = new Context()
    await ctx.plugin(StubRegistry)

    expect(() => ctx.knowledgeBases.register('Bad Name', '/tmp/a')).toThrowError(KnowledgeBaseError)
    expect(() => ctx.knowledgeBases.register('ok', 'relative/path')).toThrowError(KnowledgeBaseError)
    ctx.knowledgeBases.register('dup', '/tmp/a')
    expect(() => ctx.knowledgeBases.register('dup', '/tmp/b')).toThrowError(KnowledgeBaseError)
  })

  it('returns undefined for an unregistered name', async () => {
    const ctx = new Context()
    await ctx.plugin(StubRegistry)
    expect(ctx.knowledgeBases.get('missing')).toBeUndefined()
  })
})
