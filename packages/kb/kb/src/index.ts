/**
 * Service Definition for the knowledge base capability.
 *
 * A knowledge base is a named local document root (a vault) whose markdown is
 * split into heading-delimited chunks and full-text indexed for retrieval. The
 * registry owns the named set and its state; a provider implements index and
 * retrieve on the same ctx.knowledgeBases service.
 *
 * @module @deepseek-ai/dsh-kb
 */

import { Context, Service } from '@deepseek-ai/cordis'
import { KB_NAME_RE, KnowledgeBaseError, type Config } from './config.ts'
import type {
  KnowledgeBase,
  KnowledgeBaseState,
  RetrieveRequest,
  RetrieveResult,
} from './types.ts'

export type * from './types.ts'
export { KB_DEFAULT_LIMIT, KB_NAME_RE, KnowledgeBaseError } from './config.ts'
export type { Config, KnowledgeBaseConfig, KnowledgeBaseErrorCode } from './config.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    knowledgeBases: KnowledgeBaseRegistry
  }
}

interface KnowledgeBaseRecord {
  name: string
  root: string
  state: KnowledgeBaseState
}

/**
 * Knowledge base registry service. Backend-independent members own the named
 * set and its state; a provider implements indexing and retrieval.
 */
export abstract class KnowledgeBaseRegistry extends Service {
  static inject = []

  private readonly _bases = new Map<string, KnowledgeBaseRecord>()

  constructor(ctx: Context, config: Config = {}) {
    super(ctx, 'knowledgeBases')
    for (const entry of config.knowledgeBases ?? []) {
      this.register(entry.name, entry.root)
    }
  }

  /**
   * Register a named knowledge base and return its disposer.
   * @param name - kebab-case name.
   * @param root - absolute path to the document root.
   * @returns the disposer that unregisters the knowledge base.
   */
  register(name: string, root: string): () => void {
    if (!KB_NAME_RE.test(name)) {
      throw new KnowledgeBaseError(
        'knowledge base name "' + name + '" must be kebab-case',
        'KB_INVALID_NAME',
      )
    }
    if (typeof root !== 'string' || root.trim().length === 0 || !root.startsWith('/')) {
      throw new KnowledgeBaseError(
        'knowledge base "' + name + '" root must be a non-blank absolute path',
        'KB_INVALID_ROOT',
      )
    }
    if (this._bases.has(name)) {
      throw new KnowledgeBaseError(
        'knowledge base "' + name + '" is already registered',
        'KB_DUPLICATE',
      )
    }
    const record: KnowledgeBaseRecord = { name, root, state: 'ready' }
    this._bases.set(name, record)
    return () => {
      if (this._bases.get(name) === record) this._bases.delete(name)
    }
  }

  /**
   * List every registered knowledge base in registration order.
   * @returns immutable knowledge base snapshots.
   */
  list(): readonly KnowledgeBase[] {
    return [...this._bases.values()].map(record => ({ ...record }))
  }

  /**
   * Resolve one registered knowledge base.
   * @param name - kebab-case name.
   * @returns the knowledge base snapshot, or undefined when unregistered.
   */
  get(name: string): KnowledgeBase | undefined {
    const record = this._bases.get(name)
    return record === undefined ? undefined : { ...record }
  }

  /**
   * Rebuild one knowledge base's full-text index.
   * @param name - registered knowledge base name.
   * @param signal - optional cancellation.
   * @returns resolution once the index is rebuilt and the state is ready or error.
   */
  abstract index(name: string, signal?: AbortSignal): Promise<void>

  /**
   * Retrieve ranked hints for one query.
   * @param name - registered knowledge base name.
   * @param request - query text and optional limit.
   * @param signal - optional cancellation.
   * @returns ranked retrieval hints.
   */
  abstract retrieve(name: string, request: RetrieveRequest, signal?: AbortSignal): Promise<RetrieveResult>

  /**
   * Transition one knowledge base's observable state. Provider-owned; a stale
   * transition for an unregistered name is a no-op.
   * @param name - registered knowledge base name.
   * @param state - the new state.
   */
  protected setState(name: string, state: KnowledgeBaseState): void {
    const record = this._bases.get(name)
    if (record === undefined) return
    record.state = state
  }
}

export default KnowledgeBaseRegistry
