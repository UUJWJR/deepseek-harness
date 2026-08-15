/** Domain vocabulary for the knowledge base capability. */

/** Knowledge base index lifecycle state. */
export type KnowledgeBaseState = 'ready' | 'indexing' | 'error'

/**
 * A registered knowledge base: a named document root plus its current index state.
 */
export interface KnowledgeBase {
  /** Unique kebab-case name. */
  readonly name: string
  /** Absolute path to the document root (the vault). */
  readonly root: string
  /** Current index state. */
  readonly state: KnowledgeBaseState
}

/**
 * One heading-delimited section of a markdown document.
 */
export interface KnowledgeChunk {
  /** Source file path relative to the knowledge base root. */
  readonly path: string
  /** Zero-based order of the chunk within its file. */
  readonly seq: number
  /** The heading that opened the chunk, or the file basename for the preamble. */
  readonly title: string
  /** Chunk body text, heading excluded. */
  readonly text: string
}

/**
 * A retrieval hint: a candidate file path plus a short match excerpt. Hints are
 * starting-point cues for an agent to verify by reading, never answer material.
 */
export interface RetrievalHint {
  /** Source file path relative to the knowledge base root. */
  readonly path: string
  /** Short excerpt around the strongest match. */
  readonly snippet: string
  /** BM25 rank; a lower rank is a stronger match. */
  readonly rank: number
}

/**
 * A retrieval request against one knowledge base.
 */
export interface RetrieveRequest {
  /** Free-text query. */
  readonly query: string
  /** Maximum hints to return; defaults to the registry's configured limit. */
  readonly limit?: number
}

/**
 * A retrieval result.
 */
export interface RetrieveResult {
  /** Ranked candidate hints. */
  readonly hints: readonly RetrievalHint[]
}
