/**
 * Web display-zone gallery plugin, browser half: a Reports trigger in the
 * sidebar foot that opens a modal gallery (tag sidebar + report list +
 * selected-report preview). The gallery reads `ctx.remote.reports` through a
 * single ReportController; selection and tag filtering are presentation-local.
 * @module @deepseek-ai/dsh-client-ui-report/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the generated Remote API and ctx.remote merge through the Client assembly boundary.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
// Type-only: pulls the 'sidebar.footer.action' SlotMap declaration.
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { ReportController } from './controller.ts'
import type { ReportGalleryInjected } from './report-gallery-slot.ts'
import { ReportGalleryAction } from './ReportGalleryAction.tsx'
import { en, zh } from './locales.ts'

export { ReportController } from './controller.ts'
export type { ReportGalleryStatus, ReportGalleryView, ReportRemote } from './controller.ts'
export type { ReportGalleryActionProps, ReportGalleryInjected } from './report-gallery-slot.ts'
export type { ReportView } from './report-view.ts'

/** Dictionary namespace owned by this plugin. */
const NS = 'report'

/** Required services: the slot registry, the Remote namespace, and the copy. */
export const inject = ['slots', 'remote', 'remote.reports', 'locale']

/**
 * Client plugin body: register the gallery footer action. The controller is
 * one gallery-wide object layer shared by every render of the entry; the
 * registration rides the slot service's effect wrapper, so plugin unload
 * disposes the controller.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-report: dictionaries')

  const controller = new ReportController(ctx.remote.reports)

  ctx.slots.inject('sidebar.footer.action', () => {
    const dispose = ctx.slots.register({
      name: 'sidebar.footer.action',
      id: 'report-gallery',
      order: 20,
      locale: NS,
      inject: (): ReportGalleryInjected => ({
        hooks: { gallery: controller },
        ensure: () => controller.ensure(),
      }),
    }, ReportGalleryAction)
    return () => {
      dispose()
      controller.dispose()
    }
  })
}
