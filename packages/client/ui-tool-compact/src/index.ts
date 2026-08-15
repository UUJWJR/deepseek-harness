/**
 * Web compact tool-call plugin, node half: registers the compact-mode settings
 * namespace so the browser half can bind its durable toggle.
 * @module @deepseek-ai/dsh-client-ui-tool-compact
 */

import type { Context } from '@deepseek-ai/cordis'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import { CompactSettingsSchema, COMPACT_SETTINGS_NAMESPACE } from './compact-settings.ts'

/**
 * Host plugin body: register the compact-mode settings namespace.
 * @param ctx - host root context.
 */
export function apply(ctx: Context): void {
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(settingsNamespace(COMPACT_SETTINGS_NAMESPACE), CompactSettingsSchema)
  })
}
