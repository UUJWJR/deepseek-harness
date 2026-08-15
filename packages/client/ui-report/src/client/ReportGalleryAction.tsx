/**
 * The gallery footer-action entry: a Reports trigger in the sidebar foot that
 * opens the gallery modal. Open state is component-local; the gallery data
 * arrives through the injected `useGallery` hook and the bound translator.
 * @module @deepseek-ai/dsh-client-ui-report/client/ReportGalleryAction
 */

import { useCallback, useState } from 'react'
import { Button, IconDataOutline16, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ReportGalleryActionProps } from './report-gallery-slot.ts'
import { ReportGallery } from './ReportGallery.tsx'

/**
 * Render the footer trigger and the gallery modal it opens.
 * @param props - the footer-action owner state, the bound gallery hook, the
 * lazy loader, and the bound translator.
 * @returns the trigger button plus the modal (null when closed).
 */
export function ReportGalleryAction({ wide, useGallery, ensure, read, t }: ReportGalleryActionProps) {
  const [open, setOpen] = useState(false)
  const view = useGallery(value => value)

  const openGallery = useCallback(() => {
    setOpen(true)
    void ensure()
  }, [ensure])
  const closeGallery = useCallback(() => { setOpen(false) }, [])

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        icon={wide ? undefined : <IconDataOutline16 />}
        aria-label={t('action.reports')}
        onClick={openGallery}
      >
        {wide ? t('action.reports') : null}
      </Button>
      <Modal
        open={open}
        onClose={closeGallery}
        title={t('gallery.title')}
        closeLabel={t('gallery.close')}
      >
        <ReportGallery view={view} read={read} t={t} />
      </Modal>
    </>
  )
}
