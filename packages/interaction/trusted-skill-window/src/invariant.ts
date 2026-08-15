/**
 * Package-owned invariant companion for @deepseek-ai/dsh-trusted-skill-window.
 * @module @deepseek-ai/dsh-trusted-skill-window/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-trusted-skill-window'

/** Cordis companion plugin name. */
export const name = 'trusted-skill-window-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: window state is per-session process memory cleared on
 * TTL, hard cap, or teardown, and every grant is logged through the approval
 * service's audit pair.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
