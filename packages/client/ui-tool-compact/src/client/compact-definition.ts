/**
 * Compact tool-call ConversationNodeDefinition: mirrors the ui-tool
 * tool-call lifecycle but publishes a bare basename + settled flag instead of
 * the recursive call tree, so a compact renderer can show a one-line capsule.
 * @module @deepseek-ai/dsh-client-ui-tool-compact/client/compact-definition
 */

import type {
  ChatConversationViewNode, ConversationLocation, ConversationNodeContext, ConversationNodeDefinition,
} from '@deepseek-ai/dsh-client-runtime/client'
import { isAppendSurfaceEvent } from '@deepseek-ai/dsh-client-runtime/client'

declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
  interface ChatNodeDataMap {
    'tool-call-compact': CompactToolChatData
  }
}

/** Payload of one compact tool capsule. */
export interface CompactToolChatData {
  readonly name: string
  readonly settled: boolean
}

interface CompactState {
  name: string
  settled: boolean
}

/** Best currently loaded event Location for one Context. */
function contextLocation(context: ConversationNodeContext): ConversationLocation {
  return context.start?.location ?? context.matches[0]?.location ?? { kind: 'unresolved' }
}

/** Per-call compact tool lifecycle. */
export const compactToolDefinition: ConversationNodeDefinition<CompactState> = {
  kind: 'tool-call-compact',
  target: 'chat',
  match: (event) => {
    if (event.type === 'tool/call') return { id: String(event.data.callId), role: 'start' }
    if (event.type === 'tool/result' && isAppendSurfaceEvent(event)) {
      return { id: String(event.data.message.source.callId), role: 'update' }
    }
    return null
  },
  start: (_context, match) => {
    if (match.event.type !== 'tool/call') throw new Error('tool-call-compact start requires tool/call')
    return { name: match.event.data.name, settled: false }
  },
  update: context => ({ name: context.state.name, settled: true }),
  buildViewNode: (context) => {
    if (context.state === undefined) return null
    const node: ChatConversationViewNode = {
      key: context.key,
      kind: 'tool-call-compact',
      id: context.id,
      target: 'chat',
      anchorSeq: context.start?.event.seq ?? context.matches[0]?.event.seq ?? 0,
      location: contextLocation(context),
      visibility: 'visible',
      data: { name: context.state.name, settled: context.state.settled } satisfies CompactToolChatData,
    }
    return node
  },
}
