// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { FilesPanel } from '../src/client/FilesPanel.tsx'
import type { FilesKey } from '../src/client/locales.ts'

afterEach(cleanup)

const t = (key: FilesKey) => key

const ROOT = '/root'
const A = ROOT + '/a.md'
const SUB = ROOT + '/sub'
const ENTRIES = [
  { name: 'a.md', path: A, type: 'file', hidden: false },
  { name: 'sub', path: SUB, type: 'directory', hidden: false },
  { name: '.hidden', path: ROOT + '/.hidden', type: 'file', hidden: true },
] as const

describe('FilesPanel', () => {
  it('lists visible entries and reveals hidden ones on toggle', async () => {
    const list = vi.fn(async () => ENTRIES)
    render(<FilesPanel root={ROOT} list={list} deletePath={async () => {}} t={t} />)
    await waitFor(() => { expect(screen.getAllByTestId('files-file').map(el => el.textContent)).toEqual(['a.md']) })
    expect(screen.getAllByTestId('files-dir').map(el => el.textContent)).toEqual(['sub/'])

    fireEvent.click(screen.getByRole('checkbox', { name: 'panel.showHidden' }))
    await waitFor(() => { expect(screen.getAllByTestId('files-file').map(el => el.textContent)).toEqual(['.hidden', 'a.md']) })
  })

  it('navigates into a directory through a row click', async () => {
    const list = vi.fn(async () => ENTRIES)
    render(<FilesPanel root={ROOT} list={list} deletePath={async () => {}} t={t} />)
    await waitFor(() => { expect(list).toHaveBeenCalledWith(ROOT) })

    fireEvent.click(screen.getByTestId('files-dir'))
    await waitFor(() => { expect(list).toHaveBeenCalledWith(SUB) })
  })

  it('bulk-deletes the folded selection after confirming', async () => {
    const list = vi.fn(async () => ENTRIES)
    const deletePath = vi.fn(async () => {})
    render(<FilesPanel root={ROOT} list={list} deletePath={deletePath} t={t} />)
    await waitFor(() => { expect(screen.getAllByTestId('files-file')).toHaveLength(1) })

    fireEvent.click(screen.getAllByRole('checkbox')[1] as Element)
    fireEvent.click(screen.getAllByRole('checkbox')[2] as Element)
    fireEvent.click(screen.getByText('panel.delete'))
    fireEvent.click(screen.getAllByText('panel.delete')[1] as Element)

    await waitFor(() => { expect(deletePath).toHaveBeenCalledWith(A) })
    expect(deletePath).toHaveBeenCalledWith(SUB)
    expect(deletePath).toHaveBeenCalledTimes(2)
  })
})
