/**
 * The file-tree footer-action injected face and composed props. The
 * 'sidebar.footer.action' slot is declared by ui-sidebar; this package only
 * contributes the entry, so no SlotMap merge lives here. Live entries arrive
 * through the injected list/deletePath verbs; navigation and selection stay
 * component-local.
 * @module @deepseek-ai/dsh-client-ui-files/client/files-slot
 */

import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { FileEntry } from '@deepseek-ai/dsh-fs-remote/types'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
// Type-only: pulls this package's LocaleNamespaceMap merge (the 'files' seat).
import type {} from './locales.ts'

/** Injected business face of the file-tree footer action. */
export interface FilesInjected {
  /** List one directory level. */
  list: (path: string) => Promise<readonly FileEntry[]>
  /** Delete one file or one empty directory. */
  deletePath: (path: string) => Promise<void>
}

/** Full props of the file-tree footer-action entry. */
export type FilesActionProps =
  PropsRuntime<'sidebar.footer.action'>
  & InjectFace<FilesInjected>
  & PropsLocale<'files'>
