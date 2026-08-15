/**
 * Pure horizontal capsule strip: renders tool basenames as compact capsules,
 * capped at a fixed visible count with a soft "+N" overflow tail.
 * @module @deepseek-ai/dsh-client-ui-tool-compact/client/ToolCapsuleStrip
 */

export interface ToolCapsule {
  /** Tool name shown in the capsule. */
  name: string
  /** Whether the tool's result has settled. */
  settled: boolean
}

interface ToolCapsuleStripProps {
  items: readonly ToolCapsule[]
  /** Visible capsule cap; the rest fold into a "+N" tail. */
  maxVisible?: number
}

/**
 * Render the capsule strip.
 * @param props - the tool capsules and the visible cap.
 * @returns a horizontal strip of capsules plus an overflow tail.
 */
export function ToolCapsuleStrip({ items, maxVisible = 5 }: ToolCapsuleStripProps) {
  const visible = items.slice(0, maxVisible)
  const overflow = items.length - visible.length
  return (
    <div data-testid="tool-capsule-strip" role="list">
      {visible.map(item => (
        <span
          key={item.name}
          role="listitem"
          data-testid="tool-capsule"
          data-settled={item.settled || undefined}
        >
          {item.name}
        </span>
      ))}
      {overflow > 0 && <span data-testid="tool-capsule-overflow">+{overflow}</span>}
    </div>
  )
}
