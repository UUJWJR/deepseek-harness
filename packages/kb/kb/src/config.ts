/** Configuration and error vocabulary for the knowledge base registry. */

/** Default number of retrieval hints when a request omits a limit. */
export const KB_DEFAULT_LIMIT = 8

/** Accepted knowledge base name grammar: kebab-case. */
export const KB_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * One statically declared knowledge base.
 */
export interface KnowledgeBaseConfig {
  /** Unique kebab-case name. */
  name: string
  /** Absolute path to the document root. */
  root: string
}

/**
 * Knowledge base registry configuration.
 */
export interface Config {
  /** Statically declared knowledge bases registered at construction. */
  knowledgeBases?: KnowledgeBaseConfig[]
}

/**
 * Error codes carried by KnowledgeBaseError.
 */
export type KnowledgeBaseErrorCode =
  | 'KB_INVALID_NAME'
  | 'KB_INVALID_ROOT'
  | 'KB_DUPLICATE'
  | 'KB_NOT_FOUND'
  | 'KB_INDEX_FAILED'

/**
 * Knowledge base registry error.
 */
export class KnowledgeBaseError extends Error {
  /** Machine-readable error code. */
  readonly code: KnowledgeBaseErrorCode

  constructor(message: string, code: KnowledgeBaseErrorCode, options?: ErrorOptions) {
    super(message, options)
    this.name = 'KnowledgeBaseError'
    this.code = code
  }
}
