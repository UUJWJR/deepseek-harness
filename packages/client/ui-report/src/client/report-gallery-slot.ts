/**
 * The gallery footer-action injected face and composed props. The
 * 'sidebar.footer.action' slot is declared by ui-sidebar; this package only
 * contributes the entry, so no SlotMap merge lives here. Live gallery state
 * arrives through the `gallery` hook (the framework binds it into
 * `useGallery`); inject carries the lazy loader.
 * @module @deepseek-ai/dsh-client-ui-report/client/report-gallery-slot
 */

import type { HostObservable, InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
// Type-only: pulls this package's LocaleNamespaceMap merge (the 'report' seat).
import type {} from './locales.ts'
import type { ReportGalleryView } from './controller.ts'

/** Injected business face of the gallery footer action. */
export interface ReportGalleryInjected {
  hooks: {
    /** The whole gallery's report view, shared by the trigger and the panel. */
    gallery: HostObservable<ReportGalleryView>
  }
  /** Load the gallery once, on first open. */
  ensure: () => Promise<void>
  /**
   * Read one report's copied body through the Remote.
   * @param id - the published-report id to read.
   */
  read: (id: string) => Promise<string>
}

/** Full props of the gallery footer-action entry. */
export type ReportGalleryActionProps =
  PropsRuntime<'sidebar.footer.action'>
  & InjectFace<ReportGalleryInjected>
  & PropsLocale<'report'>
