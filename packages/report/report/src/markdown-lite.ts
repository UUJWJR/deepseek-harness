/**
 * Markdown-lite renderer (ADR 0022): a bounded prose renderer that turns
 * report prose fields into safe HTML. It supports paragraphs, bullet lists,
 * pipe tables, and inline strong/em/code, and escapes HTML first so source
 * prose can never open or close markup.
 *
 * @module @deepseek-ai/dsh-report/src/markdown-lite
 */

/** Escape HTML-significant characters so prose stays inert text. */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

/** Render inline strong/em/code over already-escaped text. */
function renderInline(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\`([^`]+)\`/g, '<code>$1</code>')
}

/** Render one block line's inline content. */
function inline(text: string): string {
  return renderInline(escapeHtml(text))
}

/** Whether a block is a pipe table (two or more rows, each starting with |). */
function isTable(lines: readonly string[]): boolean {
  return lines.length >= 2 && lines.every(line => line.trimStart().startsWith('|'))
}

/** Render one pipe-table row's cells as HTML. */
function renderTableRow(line: string, tag: 'th' | 'td'): string {
  const cells = line.trim().split('|').slice(1, -1)
  return '<tr>' + cells.map(cell => '<' + tag + '>' + inline(cell.trim()) + '</' + tag + '>').join('') + '</tr>'
}

/**
 * Render prose as safe HTML: blocks split on blank lines become paragraphs,
 * bullet lists, or pipe tables; inline strong/em/code apply inside.
 * @param prose - the raw prose text.
 * @returns the rendered HTML.
 */
export function renderMarkdownLite(prose: string): string {
  const blocks = prose.split(/\n\s*\n/)
  const parts: string[] = []
  for (const block of blocks) {
    const lines = block.split('\n').map(line => line.trimEnd())
    if (lines.length === 1 && lines[0]?.trim().length === 0) continue
    if (isTable(lines)) {
      parts.push('<table>' + lines.map((line, index) => renderTableRow(line, index === 1 ? 'th' : 'td')).join('') + '</table>')
    } else if (lines.every(line => line.trimStart().startsWith('- '))) {
      const items = lines.map(line => '<li>' + inline(line.trimStart().slice(2)) + '</li>')
      parts.push('<ul>' + items.join('') + '</ul>')
    } else {
      parts.push('<p>' + lines.map(inline).join('<br>') + '</p>')
    }
  }
  return parts.join('\n')
}
