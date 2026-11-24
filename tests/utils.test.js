import test from 'node:test'
import assert from 'node:assert/strict'
import { isUuid, validateAttachments } from '../server/utils.js'

test('isUuid accepts valid uuid', () => {
  assert.equal(isUuid('123e4567-e89b-12d3-a456-426614174000'), true)
})

test('isUuid rejects invalid', () => {
  assert.equal(isUuid('not-a-uuid'), false)
  assert.equal(isUuid(''), false)
  assert.equal(isUuid(null), false)
})

test('validateAttachments rejects too many', () => {
  const err = validateAttachments(new Array(21).fill({ dataUrl: 'data:text/plain;base64,QQ==' }))
  assert.match(err, /Too many attachments/)
})

test('validateAttachments rejects oversized dataUrl', () => {
  const big = 'A'.repeat(7 * 1024 * 1024) // >5MB base64 payload
  const err = validateAttachments([{ dataUrl: `data:application/octet-stream;base64,${big}` }])
  assert.match(err, /exceeds/)
})

test('validateAttachments accepts small attachment', () => {
  const err = validateAttachments([{ dataUrl: 'data:text/plain;base64,SGVsbG8=' }])
  assert.equal(err, null)
})
