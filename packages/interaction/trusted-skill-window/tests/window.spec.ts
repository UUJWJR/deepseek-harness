import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { ToolDispatchExecution, ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import ApprovalService from '@deepseek-ai/dsh-user-approval'
import type { ApprovalRequest } from '@deepseek-ai/dsh-user-approval'
import { apply as trustedSkillWindow } from '@deepseek-ai/dsh-trusted-skill-window'
import type { Config } from '@deepseek-ai/dsh-trusted-skill-window'

function fakeAgent(): Agent {
  return {
    session: {
      id: 'session-1',
      events: [{ type: 'turn/start' }, { type: 'user/message' }],
      append: (type: string, data: Record<string, unknown>) => ({ type, data }),
    },
  } as unknown as Agent
}

describe('trusted-skill-window', () => {
  it('auto-approves only inside a trusted skill window', async () => {
    const ctx = new Context()
    await ctx.plugin(ApprovalService)
    trustedSkillWindow(ctx, { trustedSkills: ['report-publish'] } as Config)

    const agent = fakeAgent()
    const ask = (toolName: string) => ctx.approval.request({ agent, toolName } as ApprovalRequest)

    // No window yet: fail closed.
    await expect(ask('bash')).resolves.toBe('unavailable')

    // Open the window through the explicit skill-load gesture.
    const exec = {
      name: 'skill',
      arguments: { name: 'report-publish' },
      agent,
      signal: new AbortController().signal,
    } as unknown as ToolDispatchExecution
    await ctx.waterfall('tools/execute', exec, () => Promise.resolve({} as ToolExecutionResult))

    // Window open: auto-approve.
    await expect(ask('bash')).resolves.toBe('allowed-once')
    await expect(ask('write')).resolves.toBe('allowed-once')
  })

  it('does not open for an untrusted skill', async () => {
    const ctx = new Context()
    await ctx.plugin(ApprovalService)
    trustedSkillWindow(ctx, { trustedSkills: ['report-publish'] } as Config)

    const agent = fakeAgent()
    const exec = {
      name: 'skill',
      arguments: { name: 'other-skill' },
      agent,
      signal: new AbortController().signal,
    } as unknown as ToolDispatchExecution
    await ctx.waterfall('tools/execute', exec, () => Promise.resolve({} as ToolExecutionResult))

    await expect(ctx.approval.request({ agent, toolName: 'bash' } as ApprovalRequest)).resolves.toBe('unavailable')
  })
})
