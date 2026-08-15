/** SQLite schema for one knowledge base's derived full-text index. */

import type { DatabaseSync } from 'node:sqlite'
import { mkdir, open } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

/** Current derived-index schema version. Incompatible versions reset in place. */
export const KB_SQLITE_SCHEMA_VERSION = 1

/** SQLite application id protecting unrelated databases from derived resets. */
export const KB_SQLITE_APPLICATION_ID = 0x4453484b

/**
 * Exclusively create a missing database file with owner-only permissions.
 * Existing files retain their modes; errors other than EEXIST propagate.
 * @param path - database file path.
 */
async function createDatabaseFile(path: string): Promise<void> {
  try {
    const handle = await open(path, 'wx', 0o600)
    await handle.close()
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
  }
}

/**
 * Open, validate, and initialize one knowledge base's derived index.
 * @param path - per-knowledge-base index file path.
 * @returns the initialized database handle owned by the provider.
 */
export async function openKbDatabase(path: string): Promise<DatabaseSync> {
  const actual = resolve(path)
  await mkdir(dirname(actual), { recursive: true, mode: 0o700 })
  await createDatabaseFile(actual)
  const { DatabaseSync } = await import('node:sqlite')
  const db = new DatabaseSync(actual)
  try {
    const { application_id: applicationId } = db.prepare('PRAGMA application_id').get() as { application_id: number }
    const { user_version: version } = db.prepare('PRAGMA user_version').get() as { user_version: number }
    if (applicationId !== 0 && applicationId !== KB_SQLITE_APPLICATION_ID) {
      throw new Error('knowledge base index at "' + actual + '" belongs to another application')
    }
    if (applicationId === KB_SQLITE_APPLICATION_ID && version !== KB_SQLITE_SCHEMA_VERSION) {
      resetSchema(db)
    }
    db.exec('PRAGMA application_id = ' + KB_SQLITE_APPLICATION_ID)
    ensureSchema(db)
    return db
  } catch (error) {
    db.close()
    throw error
  }
}

/**
 * Drop the derived tables so an incompatible version is rebuilt in place.
 * @param db - the database handle.
 */
function resetSchema(db: DatabaseSync): void {
  db.exec('DROP TABLE IF EXISTS kb_chunks')
  db.exec('PRAGMA user_version = 0')
}

/**
 * Create the chunk full-text table when absent.
 * @param db - the database handle.
 */
function ensureSchema(db: DatabaseSync): void {
  db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS kb_chunks USING fts5(
  text,
  path UNINDEXED,
  seq UNINDEXED,
  title UNINDEXED,
  tokenize = 'trigram'
)`)
  db.exec('PRAGMA user_version = ' + KB_SQLITE_SCHEMA_VERSION)
}
