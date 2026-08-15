/**
 * Unattended permission model (ADR 0011): while a skill with a declared
 * unattended level runs, deny any tool call outside that level's whitelist
 * rather than asking a human. Scheduled headless runs mount this plugin so an
 * unattended run fails on escalation instead of prompting nobody.
 *
 * @module @deepseek-ai/dsh-unattended-permission
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { PreToolDecision, ToolDispatchExecution, ToolExecutionInput, ToolExecutionResult } from '@deepseek-ai/dsh-tools'

export const name = 'unattended-permission'
export const inject = ['tools']

/** Unattended level: sandbox, networked, or full. */
export type UnattendedLevel = 'sandbox' | 'networked' | 'full'

/** Tool names allowed per restricted level; full is unrestricted. */
const LEVEL_TOOLS: Record<string, readonly string[]> = {
  sandbox: ['read', 'grep', 'glob', 'write', 'edit', 'bash', 'skill', 'todo_write'],
  networked: ['read', 'grep', 'glob', 'write', 'edit', 'bash', 'skill', 'todo_write', 'web_search', 'web_fetch'],
}

/** Configuration for the unattended permission model. */
export interface Config {
  /** Skill name to unattended level; skills absent from the map are unrestricted. */
  unattendedLevels?: Record<string, UnattendedLevel>
}

export const Config: z<Config> = z.object({
  unattendedLevels: z.dict(z.union(['sandbox', 'networked', 'full'] as const)).default({}),
})

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
  const levels = config.unattendedLevels ?? {}
  const active = new Map<string, UnattendedLevel>()

  ctx.on('tools/execute', (exec: ToolDispatchExecution, next): Promise<ToolExecutionResult> => {
    if (exec.name === 'skill') {
      const skillName = skillNameOf(exec.arguments)
      const agent = exec.agent
      if (skillName !== undefined && agent !== undefined && levels[skillName] !== undefined) {
        active.set(agent.session.id, levels[skillName])
      }
    }
    return next()
  })

  ctx.on('tools/pre-execute', (exec: ToolExecutionInput, next): Promise<PreToolDecision> => {
    const agent = exec.agent
    if (agent === undefined) return next()
    const level = active.get(agent.session.id)
    if (level === undefined || level === 'full') return next()
    const allowed = LEVEL_TOOLS[level]
    if (allowed !== undefined && allowed.includes(exec.name)) return next()
    return Promise.resolve({
      kind: 'deny',
      reason: 'unattended level "' + level + '" does not allow the "' + exec.name + '" tool',
    })
  })
}
