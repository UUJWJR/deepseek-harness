/**
 * Shadowing renderer for the tool-call tree: registered at a lower keyed-slot
 * priority than ui-tool's tree renderer, so while the compact mode is on the
 * full call tree is hidden and only the compact strip renders.
 * @module @deepseek-ai/dsh-client-ui-tool-compact/client/HideToolTree
 */

import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'

/** Full props of the shadowing tool-call renderer. */
export type HideToolTreeProps = PropsRuntime<'conversation.chat.node', 'tool-call'>

/**
 * Render nothing — the shadowing registration hides ui-tool's tree.
 * @returns null.
 */
export function HideToolTree(_props: HideToolTreeProps) {
  return null
}
