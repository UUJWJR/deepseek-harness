/**
 * Trusted-skill permission window: while a deployment-trusted skill is running,
 * auto-approve its tool calls under TTL and hard-cap bounds. The window opens
 * on the explicit model gesture that loads the skill (the skill tool call) and
 * never on model-behavior probing, per ADR 0008.
 *
 * @module @deepseek-ai/dsh-trusted-skill-window
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { ToolDispatchExecution, ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import type { ApprovalOutcome, ApprovalRequest } from '@deepseek-ai/dsh-user-approval'
import type {} from '@deepseek-ai/dsh-user-approval'

export const name = 'trusted-skill-window'
export const inject = ['tools']

/** Default window lifetime in milliseconds. */
export const TRUSTED_SKILL_WINDOW_TTL_MS = 10 * 60 * 1000
/** Default hard cap on auto-approved tool calls per window. */
export const TRUSTED_SKILL_WINDOW_MAX_APPROVALS = 50

/** Configuration for the trusted-skill permission window. */
export interface Config {
  /** Skill names the deployment trusts; loading one opens the window. */
  trustedSkills?: string[]
  /** Window lifetime in milliseconds. Defaults to 10 minutes. */
  windowTtlMs?: number
  /** Maximum auto-approved tool calls per window. Defaults to 50. */
  maxAutoApprovals?: number
}

export const Config: z<Config> = z.object({
  trustedSkills: z.array(z.string()).default([]),
  windowTtlMs: z.number().step(1).min(1).default(TRUSTED_SKILL_WINDOW_TTL_MS),
  maxAutoApprovals: z.number().step(1).min(1).default(TRUSTED_SKILL_WINDOW_MAX_APPROVALS),
})

/** One open window's live state. */
interface WindowState {
  openedAt: number
  approvals: number
}

/**
 * Read the skill name from a skill tool call's arguments, or undefined when
 * the arguments are not the expected shape.
 * @param args - lossless-JSON tool arguments.
 * @returns the skill name, or undefined.
 */
function skillNameOf(args: unknown): string | undefined {
  if (typeof args !== 'object' || args === null || Array.isArray(args)) return undefined
  const value = (args as { name?: unknown }).name
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export function apply(ctx: Context, config: Config): void {
  const trusted = new Set(config.trustedSkills ?? [])
  const ttlMs = config.windowTtlMs ?? TRUSTED_SKILL_WINDOW_TTL_MS
  const maxApprovals = config.maxAutoApprovals ?? TRUSTED_SKILL_WINDOW_MAX_APPROVALS
  const windows = new Map<string, WindowState>()

  // Open the window on the explicit skill-load gesture. The skill tool call is
  // the deterministic signal (ADR 0008): the model asked for the skill by name.
  ctx.on('tools/execute', (exec: ToolDispatchExecution, next): Promise<ToolExecutionResult> => {
    if (exec.name === 'skill') {
      const skillName = skillNameOf(exec.arguments)
      const agent = exec.agent
      if (skillName !== undefined && trusted.has(skillName) && agent !== undefined) {
        windows.set(agent.session.id, { openedAt: Date.now(), approvals: 0 })
      }
    }
    return next()
  })

  // Auto-approve while the window is open. The approval service still appends
  // the approval/asked + approval/decided audit pair, so every grant is logged.
  ctx.on('approval/request', (req: ApprovalRequest, next): Promise<ApprovalOutcome> => {
    const sessionId = req.agent.session.id
    const state = windows.get(sessionId)
    if (state === undefined) return next()
    if (Date.now() - state.openedAt > ttlMs) {
      windows.delete(sessionId)
      return next()
    }
    if (state.approvals >= maxApprovals) {
      windows.delete(sessionId)
      return next()
    }
    state.approvals += 1
    return Promise.resolve('allowed-once')
  })
}
