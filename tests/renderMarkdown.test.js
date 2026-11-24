import test from 'node:test'
import assert from 'node:assert/strict'
import { renderMarkdown } from '../src/utils/renderMarkdown.js'

test('escapes raw html', () => {
  const html = renderMarkdown('<script>alert(1)</script>')
  assert(!html.includes('<script>'))
  assert(html.includes('&lt;script&gt;'))
})

test('blocks javascript links', () => {
  const html = renderMarkdown('[x](javascript:alert(1))')
  assert(!/href\s*=\s*["']javascript:/i.test(html))
})

test('allows https links', () => {
  const html = renderMarkdown('[ok](https://example.com)')
  assert(html.includes('href="https://example.com"'))
})

test('renders basic markdown', () => {
  const html = renderMarkdown('# Hi\n\n- one\n\n**bold**')
  assert(html.includes('<h2>Hi</h2>'))
  assert(html.includes('<li>'))
  assert(html.includes('<strong>bold</strong>'))
})
