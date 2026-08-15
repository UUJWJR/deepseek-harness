/**
 * Model-facing delete over `ctx.fs`: remove one file or one empty directory.
 * @module @deepseek-ai/dsh-tool-fs/src/delete
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-system-prompt'
import { remediateFsError } from './error.ts'
import { sessionResolveOptions } from './session-cwd.ts'
import type { FsEscalationArgs, FsSandboxController } from './sandbox.ts'

/** The `delete` tool's validated arguments: the base path plus escalation fields. */
interface DeleteToolArgs extends FsEscalationArgs {
  file_path: string
}

/**
 * Register the `delete` tool.
 * @param ctx - the plugin context.
 * @param sandbox - the shared sandbox-escalation API.
 */
export function applyDeleteTool(ctx: Context, sandbox: FsSandboxController): void {
  ctx.tools.register(defineTool({
    name: 'delete',
    description: 'Delete a file or an empty directory. Fails if the directory is not empty.',
    parameters: {
      file_path: { type: 'string', required: true, description: 'Path to delete, resolved by the filesystem backend.' },
      ...sandbox.escalationModes.length > 0 ? sandbox.schemaFields() : {},
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          path: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: '<path>' + value.path + '</path>\n<type>deleted</type>' }],
    },
    async execute(args: DeleteToolArgs, exec) {
      if (args.file_path.trim().length === 0) throw new Error('file_path must be a non-empty string')
      const sandboxPolicy = await sandbox.resolvePolicy('delete', args, exec)
      const target = await ctx.fs.resolve(args.file_path, sessionResolveOptions(exec, args.file_path, sandboxPolicy?.workspaceRoot))
      try {
        await ctx.fs.delete(target, exec.signal)
      } catch (error: unknown) {
        throw remediateFsError(sandbox.mapError(error, sandboxPolicy))
      }
      ctx.emit('fs/observed', target, { kind: 'absent' }, exec)
      return { path: target.displayPath }
    },
    presentCall(args: DeleteToolArgs) {
      return {
        card: 'generic',
        title: 'Delete ' + args.file_path,
        rawInput: args.file_path,
        locations: [{ path: args.file_path }],
      }
    },
  }))
}
