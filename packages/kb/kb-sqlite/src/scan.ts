/** Markdown scanning and heading-delimited chunk splitting for a knowledge base root. */

import { readdir, readFile } from 'node:fs/promises'
import { basename, join, relative, sep } from 'node:path'
import type { KnowledgeChunk } from '@deepseek-ai/dsh-kb'

/** A level-2 heading line, which opens a new chunk. */
const HEADING_RE = /^##\s+/

/**
 * Recursively scan a knowledge base root and split each markdown file into
 * heading-delimited chunks.
 * @param root - absolute knowledge base root path.
 * @param signal - optional cancellation.
 * @returns chunks with paths relative to the root.
 */
export async function scanChunks(root: string, signal?: AbortSignal): Promise<KnowledgeChunk[]> {
  const files = await listMarkdown(root, signal)
  const chunks: KnowledgeChunk[] = []
  for (const file of files) {
    signal?.throwIfAborted()
    const text = await readFile(file, 'utf8')
    chunks.push(...splitMarkdown(root, file, text))
  }
  return chunks
}

/**
 * List markdown files under a root, skipping dot-directories.
 * @param root - directory to walk.
 * @param signal - optional cancellation.
 * @returns absolute file paths.
 */
async function listMarkdown(root: string, signal?: AbortSignal): Promise<string[]> {
  const result: string[] = []
  async function walk(dir: string): Promise<void> {
    signal?.throwIfAborted()
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const path = join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(path)
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        result.push(path)
      }
    }
  }
  await walk(root)
  return result
}

/**
 * Split one markdown document into heading-delimited chunks.
 * @param root - knowledge base root for relative-path derivation.
 * @param file - absolute source file path.
 * @param text - complete file text.
 * @returns chunks; empty sections are dropped.
 */
function splitMarkdown(root: string, file: string, text: string): KnowledgeChunk[] {
  const relPath = relative(root, file).split(sep).join('/')
  const lines = text.split('\n')
  const chunks: KnowledgeChunk[] = []
  let title = basename(file)
  let body: string[] = []
  let seq = 0
  const flush = (): void => {
    const value = body.join('\n').trim()
    if (value.length > 0) {
      chunks.push({ path: relPath, seq, title, text: value })
      seq += 1
    }
    body = []
  }
  for (const line of lines) {
    if (HEADING_RE.test(line)) {
      flush()
      title = line.replace(HEADING_RE, '').trim()
    } else {
      body.push(line)
    }
  }
  flush()
  return chunks
}
