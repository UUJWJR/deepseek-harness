/**
 * Web file-tree plugin, browser half: a Files trigger in the sidebar foot that
 * opens a modal file tree (breadcrumbs, directory listing, show-hidden toggle,
 * multi-select bulk delete). Entries flow from `ctx.remote.files` through
 * the injected list/deletePath verbs; navigation and selection are
 * component-local.
 * @module @deepseek-ai/dsh-client-ui-files/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the generated Remote API and ctx.remote merge through the Client assembly boundary.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
// Type-only: pulls the 'sidebar.footer.action' SlotMap declaration.
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { FilesInjected } from './files-slot.ts'
import { FilesAction } from './FilesAction.tsx'
import { en, zh } from './locales.ts'

export type { FilesActionProps, FilesInjected } from './files-slot.ts'

/** Dictionary namespace owned by this plugin. */
const NS = 'files'

/** Required services: the slot registry, the Remote namespace, and the copy. */
export const inject = ['slots', 'remote', 'remote.files', 'locale']

/**
 * Client plugin body: register the file-tree footer action. The list/delete
 * verbs unwrap the generated Remote carrier so the panel reads plain values.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-files: dictionaries')

  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'files',
    order: 30,
    locale: NS,
    inject: (): FilesInjected => ({
      list: async (path) => {
        const result = await ctx.remote.files.list({ path })
        if (!result.ok) throw new Error(result.error.message)
        return result.value
      },
      deletePath: async (path) => {
        const result = await ctx.remote.files.delete({ path })
        if (!result.ok) throw new Error(result.error.message)
      },
    }),
  }, FilesAction))
}
