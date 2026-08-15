/**
 * Compact-mode row store: mirrors the durable settings value. The apply-world
 * scope listener is the only writer; the row reads via props.useStore.
 * @module @deepseek-ai/dsh-client-ui-tool-compact/client/settings-store
 */

import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client'

/** Store state mirrored from the settings scope. */
export interface CompactModeState {
  compactMode: boolean
}

/** Declared action shape giving the factory a stable return type. */
type CompactModeActions = {
  sync: (d: CompactModeState, compactMode: boolean) => void
}

/**
 * Declare the compact-mode row state and write surface.
 * @returns the store handle.
 */
export function createCompactModeStore(): EngineStoreHandle<CompactModeState, CompactModeActions> {
  return defineStore({
    init: (): CompactModeState => ({ compactMode: false }),
    actions: {
      sync: (d, compactMode) => { d.compactMode = compactMode },
    },
  })
}
