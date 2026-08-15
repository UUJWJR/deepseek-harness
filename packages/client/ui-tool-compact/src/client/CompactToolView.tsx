/**
 * Keyed Chat renderer for the compact tool capsule: one capsule naming the
 * tool, with a settled marker once the result lands.
 * @module @deepseek-ai/dsh-client-ui-tool-compact/client/CompactToolView
 */

import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'

/** Full props of one compact tool-call renderer. */
export type CompactToolViewProps = PropsRuntime<'conversation.chat.node', 'tool-call-compact'>

/**
 * Render one compact tool capsule.
 * @param props - the narrow Tool Chat node.
 * @returns the capsule element.
 */
export function CompactToolView(props: CompactToolViewProps) {
  const data = props.node.data
  return <span data-testid="compact-tool" data-settled={data.settled || undefined}>{data.name}</span>
}
