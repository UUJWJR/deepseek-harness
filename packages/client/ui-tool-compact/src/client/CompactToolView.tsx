/**
 * Keyed Chat renderer for the compact tool strip: renders the turn's tool
 * capsules as a horizontal strip (5-column cap + "+N" overflow).
 * @module @deepseek-ai/dsh-client-ui-tool-compact/client/CompactToolView
 */

import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { ToolCapsuleStrip } from './ToolCapsuleStrip.tsx'

/** Full props of one compact tool-strip renderer. */
export type CompactToolViewProps = PropsRuntime<'conversation.chat.node', 'tool-call-compact'>

/**
 * Render one turn's compact tool strip.
 * @param props - the narrow compact Tool Chat node.
 * @returns the capsule strip.
 */
export function CompactToolView(props: CompactToolViewProps) {
  return <ToolCapsuleStrip items={props.node.data.capsules} />
}
