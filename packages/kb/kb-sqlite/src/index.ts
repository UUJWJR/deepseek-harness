/**
 * Concrete knowledge base registry with SQLite FTS5 trigram indexing and retrieval.
 *
 * @module @deepseek-ai/dsh-kb-sqlite
 */

import type { DatabaseSync } from 'node:sqlite'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type Schema from '@deepseek-ai/schemastery'
import KnowledgeBaseRegistry, {
  KB_DEFAULT_LIMIT,
  KnowledgeBaseError,
  type Config as KnowledgeBaseConfig,
  type KnowledgeBase,
  type RetrieveRequest,
  type RetrieveResult,
} from '@deepseek-ai/dsh-kb'
import { openKbDatabase } from './schema.ts'
import { scanChunks } from './scan.ts'

/** Default number of tokens in a retrieval snippet. */
export const KB_SQLITE_SNIPPET_TOKENS = 40

/** SQLite-backed knowledge base registry configuration. */
export interface Config extends KnowledgeBaseConfig {
  /** Absolute directory holding one per-knowledge-base index file. */
  indexDir: string
  /** Default hint count when a request omits a limit. Defaults to 8. */
  defaultLimit?: number
  /** Snippet length in FTS5 tokens. Defaults to 40. */
  snippetTokens?: number
}

interface RetrieveRow {
  path: string
  seq: number
  title: string
  snippet: string
  rank: number
}

/** Concrete SQLite owner of the combined ctx.knowledgeBases service. */
export class SqliteKnowledgeBaseRegistry extends KnowledgeBaseRegistry {
  static Config: Schema<Config> = z.object({
    knowledgeBases: z.array(z.object({ name: z.string(), root: z.string() })).default([]),
    indexDir: z.string().required(),
    defaultLimit: z.number().step(1).min(1).default(KB_DEFAULT_LIMIT),
    snippetTokens: z.number().step(1).min(1).default(KB_SQLITE_SNIPPET_TOKENS),
  })

  private readonly _indexDir: string
  private readonly _defaultLimit: number
  private readonly _snippetTokens: number
  private readonly _dbs = new Map<string, DatabaseSync>()
  private _disposed = false

  constructor(ctx: Context, config: Config) {
    super(ctx, config.knowledgeBases === undefined ? {} : { knowledgeBases: config.knowledgeBases })
    if (typeof config.indexDir !== 'string' || config.indexDir.trim().length === 0 || !config.indexDir.startsWith('/')) {
      throw new KnowledgeBaseError(
        'knowledge base indexDir must be a non-blank absolute path',
        'KB_INDEX_FAILED',
      )
    }
    this._indexDir = config.indexDir
    this._defaultLimit = config.defaultLimit ?? KB_DEFAULT_LIMIT
    this._snippetTokens = config.snippetTokens ?? KB_SQLITE_SNIPPET_TOKENS
    ctx.effect(() => () => {
      this._disposed = true
      for (const db of this._dbs.values()) db.close()
      this._dbs.clear()
    }, 'kb-sqlite.close')
  }

  override async index(name: string, signal?: AbortSignal): Promise<void> {
    const kb = this._require(name)
    this.setState(name, 'indexing')
    try {
      const db = await this._open(name)
      const chunks = await scanChunks(kb.root, signal)
      signal?.throwIfAborted()
      db.exec('BEGIN IMMEDIATE')
      try {
        db.prepare('DELETE FROM kb_chunks').run()
        const insert = db.prepare('INSERT INTO kb_chunks (text, path, seq, title) VALUES (?, ?, ?, ?)')
        for (const chunk of chunks) insert.run(chunk.text, chunk.path, chunk.seq, chunk.title)
        db.exec('COMMIT')
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
      this.setState(name, 'ready')
    } catch (error) {
      this.setState(name, 'error')
      if (isAbort(error)) throw error
      throw new KnowledgeBaseError(
        'knowledge base "' + name + '" index failed: ' + messageOf(error),
        'KB_INDEX_FAILED',
        { cause: error },
      )
    }
  }

  override async retrieve(name: string, request: RetrieveRequest, signal?: AbortSignal): Promise<RetrieveResult> {
    this._require(name)
    const query = request.query.trim()
    if (query.length === 0) return { hints: [] }
    const db = await this._open(name)
    signal?.throwIfAborted()
    const limit = request.limit ?? this._defaultLimit
    const rows = db.prepare(
      `SELECT path, seq, title, snippet(kb_chunks, 0, '', '', '…', ?) AS snippet, bm25(kb_chunks) AS rank
       FROM kb_chunks
       WHERE kb_chunks MATCH ?
       ORDER BY rank
       LIMIT ?`,
    ).all(this._snippetTokens, quoteFtsData(query), limit) as unknown as RetrieveRow[]
    return {
      hints: rows.map(row => ({ path: row.path, snippet: row.snippet, rank: row.rank })),
    }
  }

  private _require(name: string): KnowledgeBase {
    const kb = this.get(name)
    if (kb === undefined) {
      throw new KnowledgeBaseError('knowledge base "' + name + '" is not registered', 'KB_NOT_FOUND')
    }
    return kb
  }

  private async _open(name: string): Promise<DatabaseSync> {
    const existing = this._dbs.get(name)
    if (existing !== undefined) return existing
    if (this._disposed) {
      throw new KnowledgeBaseError('knowledge base index is closed', 'KB_INDEX_FAILED')
    }
    const db = await openKbDatabase(join(this._indexDir, name + '.sqlite'))
    this._dbs.set(name, db)
    return db
  }
}

/**
 * Quote caller text as one FTS5 phrase so query syntax remains inert data.
 * @param query - caller query.
 * @returns FTS5 expression containing one escaped literal phrase.
 */
function quoteFtsData(query: string): string {
  return '"' + query.replaceAll('"', '""') + '"'
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error'
}

export default SqliteKnowledgeBaseRegistry
