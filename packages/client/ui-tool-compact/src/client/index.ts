/**
 * Compact tool-call plugin, browser half: binds the durable compactMode
 * setting and registers the compact tool ConversationNodeDefinition + its
 * keyed capsule renderer when the setting is on, plus the feature-owned
 * compact-mode preference row in the settings General section.
 * @module @deepseek-ai/dsh-client-ui-tool-compact/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the 'conversation.chat.node' + 'settings.general.item' SlotMap and ChatNodeDataMap merge.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots'
import { COMPACT_MODE_FIELD, COMPACT_SETTINGS_NAMESPACE, type CompactSettings } from '../compact-settings.ts'
import { compactToolDefinition } from './compact-definition.ts'
import { CompactModeRow, type CompactModeRowInjected } from './CompactModeRow.tsx'
import { CompactToolView } from './CompactToolView.tsx'
import { createCompactModeStore } from './settings-store.ts'
import { en, zh } from './locales.ts'

export type { CompactModeRowInjected, CompactModeRowProps } from './CompactModeRow.tsx'
export type { CompactToolChatData } from './compact-definition.ts'

/** Dictionary namespace owned by this plugin. */
const NS = 'tool-compact'

/** Required services: registries, the settings scope, the locale, and the settings transport. */
export const inject = ['slots', 'conversationEvents', 'locale', 'connection', 'remote', 'settingsScope']

/**
 * Client plugin body: mirror the durable compactMode setting into the
 * Definition registration, and register the preference row + capsule renderer.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-tool-compact: dictionaries')

  const host = ctx.settingsScope.bind<CompactSettings>({ namespace: COMPACT_SETTINGS_NAMESPACE })

  // The renderer is always registered; it only renders while the Definition emits nodes.
  ctx.slots.inject('conversation.chat.node', () => ctx.slots.register({
    name: 'conversation.chat.node',
    key: 'tool-call-compact',
  }, CompactToolView))

  let disposeCompact: (() => void) | undefined
  const syncDefinition = (): void => {
    const enabled = host.getSnapshot().value?.compactMode ?? false
    if (enabled && disposeCompact === undefined) {
      disposeCompact = ctx.conversationEvents.register(compactToolDefinition)
    } else if (!enabled && disposeCompact !== undefined) {
      disposeCompact()
      disposeCompact = undefined
    }
  }
  ctx.effect(() => host.subscribe(syncDefinition), 'ui-tool-compact: definition sync')
  syncDefinition()

  const store = createCompactModeStore()
  let bound: BoundActions<typeof store> | undefined
  const syncRow = (): void => { bound?.sync(host.getSnapshot().value?.compactMode ?? false) }
  ctx.effect(() => host.subscribe(syncRow), 'ui-tool-compact: row sync')
  const injected = (actions: BoundActions<typeof store>): CompactModeRowInjected => {
    bound = actions
    syncRow()
    return { setCompactMode: (enabled) => { void host.set(COMPACT_MODE_FIELD, enabled) } }
  }
  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'compact-mode',
    order: 40,
    store,
    locale: NS,
    inject: injected,
  }, CompactModeRow))
}
