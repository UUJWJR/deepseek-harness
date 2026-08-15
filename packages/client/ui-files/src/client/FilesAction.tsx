/**
 * The file-tree footer-action entry: a Files trigger in the sidebar foot that
 * opens the file-tree modal. Open state is component-local; entries arrive
 * through the injected list/deletePath verbs.
 * @module @deepseek-ai/dsh-client-ui-files/client/FilesAction
 */

import { useState } from 'react'
import { Button, IconFolderOpenOutline16, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { FilesActionProps } from './files-slot.ts'
import { FilesPanel } from './FilesPanel.tsx'

/**
 * Render the footer trigger and the file-tree modal it opens.
 * @param props - the footer-action owner state, the injected list/delete
 * verbs, and the bound translator.
 * @returns the trigger button plus the modal (null when closed).
 */
export function FilesAction({ wide, list, deletePath, movePath, t }: FilesActionProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        icon={wide ? undefined : <IconFolderOpenOutline16 />}
        aria-label={t('action.files')}
        onClick={() => { setOpen(true) }}
      >
        {wide ? t('action.files') : null}
      </Button>
      <Modal open={open} onClose={() => { setOpen(false) }} title={t('panel.title')} closeLabel={t('panel.close')}>
        <FilesPanel root="/" list={list} deletePath={deletePath} movePath={movePath} t={t} />
      </Modal>
    </>
  )
}
