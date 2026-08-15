import { describe, expect, it } from 'vitest'
import { renderMarkdownLite } from '@deepseek-ai/dsh-report'

describe('renderMarkdownLite', () => {
  it('escapes HTML before rendering', () => {
    expect(renderMarkdownLite('<script>alert(1)</script>')).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>')
  })

  it('renders paragraphs split on blank lines', () => {
    expect(renderMarkdownLite('第一段\n\n第二段')).toBe('<p>第一段</p>\n<p>第二段</p>')
  })

  it('renders inline strong and em', () => {
    expect(renderMarkdownLite('**加粗** 和 *斜体*')).toBe('<p><strong>加粗</strong> 和 <em>斜体</em></p>')
  })

  it('renders a bullet list', () => {
    expect(renderMarkdownLite('- 甲\n- 乙')).toBe('<ul><li>甲</li><li>乙</li></ul>')
  })

  it('renders a pipe table', () => {
    expect(renderMarkdownLite('| A | B |\n| --- | --- |\n| 1 | 2 |')).toBe('<table><tr><td>A</td><td>B</td></tr><tr><th>---</th><th>---</th></tr><tr><td>1</td><td>2</td></tr></table>')
  })
})
