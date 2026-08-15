/** Durable settings vocabulary for the compact tool-call toggle. */

import z from '@deepseek-ai/schemastery'
import type Schema from '@deepseek-ai/schemastery'

/** Settings namespace registered by the host half and bound by the browser half. */
export const COMPACT_SETTINGS_NAMESPACE = 'ui-tool-compact'

/** The scalar field carrying the compact-mode switch. */
export const COMPACT_MODE_FIELD = 'compactMode'

/** Durable compact-mode section. */
export interface CompactSettings {
  compactMode: boolean
}

/** Wire schema for the compact-mode section. */
export const CompactSettingsSchema: Schema<CompactSettings> = z.object({
  compactMode: z.boolean().default(false),
})
