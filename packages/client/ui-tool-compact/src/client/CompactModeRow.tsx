/**
 * Compact-mode preference row in the settings General section: a checkbox
 * toggling the durable compactMode field through the injected verb.
 * @module @deepseek-ai/dsh-client-ui-tool-compact/client/CompactModeRow
 */

import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from './locales.ts'
import type { createCompactModeStore } from './settings-store.ts'

/** Injected business face: the compact-mode write. */
export interface CompactModeRowInjected {
  /** Write the compact-mode switch. */
  setCompactMode: (enabled: boolean) => void
}

/** Full props of the compact-mode row. */
export type CompactModeRowProps =
  PropsRuntime<'settings.general.item'>
  & PropsStore<ReturnType<typeof createCompactModeStore>>
  & PropsLocale<'tool-compact'>
  & CompactModeRowInjected

/**
 * Render the compact-mode checkbox row.
 * @param props - the store hook, the write verb, and the translator.
 * @returns the checkbox row.
 */
export function CompactModeRow({ useStore, setCompactMode, t }: CompactModeRowProps) {
  const compactMode = useStore(s => s.compactMode)
  return (
    <label>
      <input
        type="checkbox"
        checked={compactMode}
        onChange={(event) => { setCompactMode(event.target.checked) }}
      />
      {t('compact.title')}
    </label>
  )
}
