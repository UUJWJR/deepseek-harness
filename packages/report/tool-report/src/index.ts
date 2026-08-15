/**
 * Model-facing report tools over `ctx.reports`: publish a file into the
 * display-zone gallery and list published reports.
 *
 * @module @deepseek-ai/dsh-tool-report
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-report'

export const name = 'tool-report'
export const inject = ['tools', 'reports']

interface PublishArgs {
  file_path: string
  workspace: string
  tags?: string[]
}

interface ListArgs {
  tag?: string
}

export function apply(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'report_publish',
    description: 'Publish a file into the display-zone gallery, copying it and recording it with tags. Re-publishing the same source returns the existing report.',
    parameters: {
      file_path: { type: 'string', required: true, description: 'Source file path to publish.' },
      workspace: { type: 'string', required: true, description: 'Workspace the source file belongs to, used as part of the dedup key.' },
      tags: { type: 'array', items: { type: 'string' }, description: 'Tags to attach to the report.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          report: {
            type: 'object',
            required: true,
            additionalProperties: false,
            properties: {
              id: { type: 'string', required: true },
              source: {
                type: 'object',
                required: true,
                additionalProperties: false,
                properties: {
                  workspace: { type: 'string', required: true },
                  path: { type: 'string', required: true },
                },
              },
              tags: { type: 'array', required: true, items: { type: 'string' } },
              publishedAt: { type: 'number', required: true },
            },
          },
          deduplicated: { type: 'boolean', required: true },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: value.deduplicated
          ? '已发布过：' + value.report.source.path
          : '已发布报告：' + value.report.source.path,
      }],
    },
    async execute(args: PublishArgs, exec) {
      void exec
      const result = await ctx.reports.publish({
        source: { workspace: args.workspace, path: args.file_path },
        ...args.tags !== undefined ? { tags: args.tags } : {},
      })
      return { report: { ...result.report, tags: [...result.report.tags] }, deduplicated: result.deduplicated }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'report_list',
    description: 'List published reports, optionally narrowed to one tag.',
    parameters: {
      tag: { type: 'string', description: 'Optional tag to filter by.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          reports: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                id: { type: 'string', required: true },
                source: {
                  type: 'object',
                  required: true,
                  additionalProperties: false,
                  properties: {
                    workspace: { type: 'string', required: true },
                    path: { type: 'string', required: true },
                  },
                },
                tags: { type: 'array', required: true, items: { type: 'string' } },
                publishedAt: { type: 'number', required: true },
              },
            },
          },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: value.reports.length === 0
          ? '无报告'
          : value.reports.map(report => report.source.path).join('\n'),
      }],
    },
    async execute(args: ListArgs, exec) {
      void exec
      const reports = await ctx.reports.list(args.tag)
      return { reports: reports.map(report => ({ ...report, tags: [...report.tags] })) }
    },
  }))
}
