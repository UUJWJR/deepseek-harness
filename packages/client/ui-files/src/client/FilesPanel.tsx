/**
 * The file-tree body: breadcrumbs, a directory listing with per-row
 * selection, a show-hidden toggle, bulk delete, and drag-to-move. Navigation
 * and selection are component-local; entries arrive through the injected
 * list/deletePath/movePath verbs. Ancestor folding runs client-side before
 * delete, and drag uses a private MIME type to tell internal moves from OS
 * uploads.
 * @module @deepseek-ai/dsh-client-ui-files/client/FilesPanel
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DragEvent } from 'react'
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { FileEntry } from '@deepseek-ai/dsh-fs-remote/types'
import type { FilesKey } from './locales.ts'
import css from './FilesPanel.module.css'

/** The private MIME type a drag uses to mark an internal move. */
const MOVE_MIME = 'application/x-dsh-file'

/** Drop descendants so a bulk delete never removes a path twice. */
function foldPaths(paths: readonly string[]): string[] {
  const sorted = [...paths].sort((a, b) => a.length - b.length)
  const kept: string[] = []
  for (const path of sorted) {
    if (kept.some(ancestor => path === ancestor || path.startsWith(ancestor + '/'))) continue
    kept.push(path)
  }
  return kept
}

interface FilesPanelProps {
  /** Absolute directory to list first. */
  root: string
  list: (path: string) => Promise<readonly FileEntry[]>
  deletePath: (path: string) => Promise<void>
  movePath: (source: string, destination: string) => Promise<void>
  t: Translate<FilesKey>
}

/**
 * Render the file tree for one navigation session.
 * @param props - the starting directory, the list/delete/move verbs, and the translator.
 * @returns the breadcrumbs, toolbar, and entry list.
 */
export function FilesPanel({ root, list, deletePath, movePath, t }: FilesPanelProps) {
  const [path, setPath] = useState(root)
  const [entries, setEntries] = useState<readonly FileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showHidden, setShowHidden] = useState(false)
  const [selection, setSelection] = useState<ReadonlySet<string>>(new Set())
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    setSelection(new Set())
    list(path).then(
      (value) => { if (alive) { setEntries(value); setLoading(false) } },
      (reason: unknown) => {
        if (!alive) return
        setEntries([])
        setLoading(false)
        setError(reason instanceof Error ? reason.message : 'list failed')
      },
    )
    return () => { alive = false }
  }, [path, list])

  const visible = useMemo(
    () => showHidden ? entries : entries.filter(entry => !entry.hidden),
    [entries, showHidden],
  )
  const sorted = useMemo(() => {
    const copy = [...visible]
    copy.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'directory' ? -1 : 1))
    return copy
  }, [visible])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const value = await list(path)
      setEntries(value)
      setLoading(false)
    } catch (reason) {
      setEntries([])
      setLoading(false)
      setError(reason instanceof Error ? reason.message : 'list failed')
    }
  }, [list, path])

  const openPath = useCallback((next: string) => { setPath(next) }, [])
  const goUp = useCallback(() => {
    const parent = path.replace(/\/[^/]+$/, '')
    setPath(parent === '' ? '/' : parent)
  }, [path])

  const toggleSelect = useCallback((entryPath: string) => {
    setSelection((prev) => {
      const next = new Set(prev)
      if (next.has(entryPath)) next.delete(entryPath)
      else next.add(entryPath)
      return next
    })
  }, [])

  const performDelete = useCallback(async () => {
    const folded = foldPaths([...selection])
    for (const entryPath of folded) await deletePath(entryPath)
    setSelection(new Set())
    setConfirming(false)
    await reload()
  }, [selection, deletePath, reload])

  const onDragStart = useCallback((event: DragEvent<HTMLElement>, entryPath: string) => {
    event.dataTransfer.setData(MOVE_MIME, entryPath)
    event.dataTransfer.effectAllowed = 'move'
  }, [])

  const onDrop = useCallback((event: DragEvent<HTMLElement>, dirPath: string) => {
    event.preventDefault()
    // Only internal drags carry the move marker; OS uploads do not.
    if (!event.dataTransfer.types.includes(MOVE_MIME)) return
    const source = event.dataTransfer.getData(MOVE_MIME)
    if (source === '' || source === dirPath) return
    const basename = source.split('/').pop() ?? ''
    void movePath(source, dirPath + '/' + basename).then(reload)
  }, [movePath, reload])

  const crumbs = useMemo(() => {
    const segments = path.split('/').filter(segment => segment !== '')
    return ['/'].concat(segments.map((_segment, index) => segments.slice(0, index + 1).join('/')))
  }, [path])

  return (
    <div>
      <div className={css.toolbar}>
        <Button variant="ghost" size="sm" onClick={goUp} aria-label={t('panel.up')}>{t('panel.up')}</Button>
        <label>
          <input type="checkbox" checked={showHidden} onChange={(event) => { setShowHidden(event.target.checked) }} />
          {t('panel.showHidden')}
        </label>
        <Button
          variant="primary"
          size="sm"
          disabled={selection.size === 0}
          onClick={() => { setConfirming(true) }}
        >
          {t('panel.delete')}
        </Button>
      </div>

      <div className={css.crumbs} data-testid="files-crumbs">
        {crumbs.map(crumb => (
          <Button key={crumb} variant="ghost" size="sm" onClick={() => { openPath(crumb === '' ? '/' : crumb) }}>
            {crumb === '' ? '/' : crumb.split('/').pop()}
          </Button>
        ))}
      </div>

      {loading && <p data-testid="files-status">{t('panel.loading')}</p>}
      {error !== null && <p data-testid="files-status">{t('panel.error')}: {error}</p>}
      {!loading && error === null && sorted.length === 0 && <p data-testid="files-status">{t('panel.empty')}</p>}

      {!loading && error === null && (
        <ul className={css.list} data-testid="files-list">
          {sorted.map(entry => (
            <li key={entry.path} draggable onDragStart={(event) => { onDragStart(event, entry.path) }}>
              <div className={css.row}>
                <input
                  type="checkbox"
                  checked={selection.has(entry.path)}
                  onChange={() => { toggleSelect(entry.path) }}
                  aria-label={entry.name}
                />
                {entry.type === 'directory'
                  ? (
                    <button
                      type="button"
                      className={css.name}
                      data-testid="files-dir"
                      onClick={() => { openPath(entry.path) }}
                      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move' }}
                      onDrop={(event) => { onDrop(event, entry.path) }}
                    >
                      {entry.name}/
                    </button>
                  )
                  : <span className={css.name} data-testid="files-file">{entry.name}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={confirming}
        onClose={() => { setConfirming(false) }}
        title={t('panel.deleteConfirm', { count: foldPaths([...selection]).length })}
        closeLabel={t('panel.close')}
        footer={(
          <Button variant="primary" size="sm" onClick={() => { void performDelete() }}>
            {t('panel.delete')}
          </Button>
        )}
      />
    </div>
  )
}
