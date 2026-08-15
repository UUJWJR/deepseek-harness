/**
 * Compact tool-call plugin, browser half: when the compactMode config is on,
 * registers a per-call compact tool ConversationNodeDefinition and its keyed
 * capsule renderer. Each tool call then also renders as a one-line capsule
 * (name + settled marker) beside the full call tree.
 * @module @deepseek-ai/dsh-client-ui-tool-compact/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the 'conversation.chat.node' SlotMap and the ChatNodeDataMap merge.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import z from '@deepseek-ai/schemastery'
import type Schema from '@deepseek-ai/schemastery'
import { compactToolDefinition } from './compact-definition.ts'
import { CompactToolView } from './CompactToolView.tsx'

/** Configuration for the compact tool-call plugin. */
export interface Config {
  /** Register the compact tool capsules; defaults to off. */
  compactMode?: boolean
}

export const Config: Schema<Config> = z.object({
  compactMode: z.boolean().default(false),
})

/** Required services: the conversation-node registry and the slot registry. */
export const inject = ['slots', 'conversationEvents']

/**
 * Client plugin body: when compactMode is on, register the compact tool
 * lifecycle and its keyed renderer.
 * @param ctx - client root context.
 * @param config - validated compact-mode switch.
 */
export function apply(ctx: ClientContext, config: Config): void {
  if (config.compactMode !== true) return
  ctx.conversationEvents.register(compactToolDefinition)
  ctx.slots.inject('conversation.chat.node', () => ctx.slots.register({
    name: 'conversation.chat.node',
    key: 'tool-call-compact',
  }, CompactToolView))
}
