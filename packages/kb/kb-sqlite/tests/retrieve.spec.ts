import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import SqliteKnowledgeBaseRegistry from '@deepseek-ai/dsh-kb-sqlite'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

describe('dsh-kb-sqlite', () => {
  it('indexes markdown and retrieves ranked hints', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-kb-root-'))
    const indexDir = await mkdtemp(join(tmpdir(), 'dsh-kb-index-'))
    try {
      const body = ['# Notes', '', '## 经营分析', '', '营收同比持续增长。', '', '## 短板', '', 'B区营收负增长。', ''].join('\n')
      await writeFile(join(root, 'notes.md'), body)

      const ctx = new Context()
      await ctx.plugin(SqliteKnowledgeBaseRegistry, {
        knowledgeBases: [{ name: 'kb1', root }],
        indexDir,
      })

      await ctx.knowledgeBases.index('kb1')
      expect(ctx.knowledgeBases.get('kb1')?.state).toBe('ready')

      const result = await ctx.knowledgeBases.retrieve('kb1', { query: '营收负增长' })
      expect(result.hints.length).toBeGreaterThan(0)
      expect(result.hints[0]?.path).toBe('notes.md')
    } finally {
      await rm(root, { recursive: true, force: true })
      await rm(indexDir, { recursive: true, force: true })
    }
  })
})
