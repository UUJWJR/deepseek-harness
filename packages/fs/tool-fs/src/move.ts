/**
 * Model-facing move over `ctx.fs`: rename one target to a destination path.
 * @module @deepseek-ai/dsh-tool-fs/src/move
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-system-prompt'
import { remediateFsError } from './error.ts'
import { sessionResolveOptions } from './session-cwd.ts'
import type { FsEscalationArgs, FsSandboxController } from './sandbox.ts'

/** The `move` tool's validated arguments. */
interface MoveToolArgs extends FsEscalationArgs {
  file_path: string
  destination: string
}

/**
 * Register the `move` tool.
 * @param ctx - the plugin context.
 * @param sandbox - the shared sandbox-escalation API.
 */
export function applyMoveTool(ctx: Context, sandbox: FsSandboxController): void {
  ctx.tools.register(defineTool({
    name: 'move',
    description: 'Move a file or directory to a destination path. Moving a directory into its own descendant fails.',
    parameters: {
      file_path: { type: 'string', required: true, description: 'Source path to move.' },
      destination: { type: 'string', required: true, description: 'Destination path.' },
      ...sandbox.escalationModes.length > 0 ? sandbox.schemaFields() : {},
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          path: { type: 'string', required: true },
          destination: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: '<path>' + value.path + '</path>\n<type>moved</type>\n<destination>' + value.destination + '</destination>',
      }],
    },
    async execute(args: MoveToolArgs, exec) {
      if (args.file_path.trim().length === 0) throw new Error('file_path must be a non-empty string')
      if (args.destination.trim().length === 0) throw new Error('destination must be a non-empty string')
      const sandboxPolicy = await sandbox.resolvePolicy('move', args, exec)
      const source = await ctx.fs.resolve(
        args.file_path,
        sessionResolveOptions(exec, args.file_path, sandboxPolicy?.workspaceRoot),
      )
      const destination = await ctx.fs.resolve(
        args.destination,
        sessionResolveOptions(exec, args.destination, sandboxPolicy?.workspaceRoot),
      )
      try {
        await ctx.fs.move(source, destination, exec.signal)
      } catch (error: unknown) {
        throw remediateFsError(sandbox.mapError(error, sandboxPolicy))
      }
      ctx.emit('fs/observed', source, { kind: 'absent' }, exec)
      return { path: source.displayPath, destination: destination.displayPath }
    },
    presentCall(args: MoveToolArgs) {
      return {
        card: 'generic',
        title: 'Move ' + args.file_path + ' → ' + args.destination,
        rawInput: args.file_path,
        locations: [{ path: args.file_path }, { path: args.destination }],
      }
    },
  }))
}
