/**
 * Turn-level compact tool-call ConversationNodeDefinition: aggregates every
 * tool call in one turn into a single capsule strip. The turn/start event is
 * the unique start; each tool/call appends a basename and the turn/end marks
 * the strip settled.
 * @module @deepseek-ai/dsh-client-ui-tool-compact/client/compact-definition
 */

import type {
  ChatConversationViewNode, ConversationLocation, ConversationNodeContext, ConversationNodeDefinition,
} from '@deepseek-ai/dsh-client-runtime/client'
import type { ToolCapsule } from './ToolCapsuleStrip.tsx'

declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
  interface ChatNodeDataMap {
    'tool-call-compact': CompactToolChatData
  }
}

/** Payload of one turn's compact tool strip. */
export interface CompactToolChatData {
  /** Tool capsules in first-seen order. */
  readonly capsules: readonly ToolCapsule[]
  /** True once the turn's end has settled every capsule. */
  readonly settled: boolean
}

interface TurnToolsState {
  turn: number
  capsules: readonly ToolCapsule[]
  settled: boolean
}

/** Best currently loaded event Location for one Context. */
function contextLocation(context: ConversationNodeContext): ConversationLocation {
  return context.start?.location ?? context.matches[0]?.location ?? { kind: 'unresolved' }
}

/** Per-turn compact tool strip lifecycle. */
export const compactToolDefinition: ConversationNodeDefinition<TurnToolsState> = {
  kind: 'tool-call-compact',
  target: 'chat',
  match: (event) => {
    if (event.type === 'turn/start') return { id: `turn-${String(event.data.turn)}`, role: 'start' }
    if (event.type === 'tool/call') return { id: `turn-${String(event.data.turn)}`, role: 'update' }
    if (event.type === 'turn/end') return { id: `turn-${String(event.data.turn)}`, role: 'update' }
    return null
  },
  start: (_context, match) => {
    if (match.event.type !== 'turn/start') throw new Error('tool-call-compact start requires turn/start')
    return { turn: match.event.data.turn, capsules: [], settled: false }
  },
  update: (context, match) => {
    if (match.event.type === 'tool/call') {
      const name = match.event.data.name
      if (context.state.capsules.some(capsule => capsule.name === name)) return context.state
      return { ...context.state, capsules: [...context.state.capsules, { name, settled: false }] }
    }
    if (match.event.type === 'turn/end') {
      return {
        ...context.state,
        settled: true,
        capsules: context.state.capsules.map(capsule => ({ ...capsule, settled: true })),
      }
    }
    return context.state
  },
  buildViewNode: (context) => {
    if (context.state === undefined) return null
    const node: ChatConversationViewNode = {
      key: context.key,
      kind: 'tool-call-compact',
      id: context.id,
      target: 'chat',
      anchorSeq: context.start?.event.seq ?? 0,
      location: contextLocation(context),
      visibility: 'visible',
      data: { capsules: context.state.capsules, settled: context.state.settled } satisfies CompactToolChatData,
    }
    return node
  },
}
