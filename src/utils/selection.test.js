import { describe, expect, it } from 'vitest'
import { getRangeOffsets } from './selection'

function findTextNode(container, text) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    const node = walker.currentNode
    if (node.textContent.includes(text)) return node
  }
  return null
}

describe('getRangeOffsets', () => {
  it('returns offsets for a mid-table selection', () => {
    document.body.innerHTML = `
      <div id="container">
        <p>Timeline</p>
        <table>
          <thead>
            <tr><th>Phase</th><th>Description</th><th>Duration</th></tr>
          </thead>
          <tbody>
            <tr><td>Design</td><td>Architecture and API design</td><td>2 weeks</td></tr>
            <tr><td>Implementation</td><td>Core authentication logic</td><td>4 weeks</td></tr>
          </tbody>
        </table>
      </div>
    `

    const container = document.getElementById('container')
    const node = findTextNode(container, '4 weeks')
    expect(node).not.toBeNull()

    const range = document.createRange()
    range.setStart(node, 0)
    range.setEnd(node, 3) // "4 w"

    const offsets = getRangeOffsets(range, container)
    const text = container.textContent
    const expectedStart = text.indexOf('4 weeks')

    expect(offsets).not.toBeNull()
    expect(offsets.start).toBe(expectedStart)
    expect(offsets.end).toBe(expectedStart + 3)
  })
})
