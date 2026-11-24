import test from 'node:test'
import assert from 'node:assert/strict'
import { getWorkspaceModulePerms } from '../server/rbac.js'

test('owner gets full perms by default', () => {
  const perms = getWorkspaceModulePerms({ settings: {} }, 'owner', 'projects')
  assert.deepEqual(perms, { read: true, write: true, delete: true })
})

test('unknown custom role denied when granular config exists', () => {
  const ws = { settings: { rolePermissions: { owner: { Projects: { show: true, features: { a: { view: true, edit: true, delete: true } } } } } } }
  const perms = getWorkspaceModulePerms(ws, 'custom-x', 'projects')
  assert.deepEqual(perms, { read: false, write: false, delete: false })
})

test('granular role permissions are respected', () => {
  const ws = { settings: { rolePermissions: { member: { Projects: { show: true, features: { a: { view: true, edit: false, delete: false } } } } } } }
  const perms = getWorkspaceModulePerms(ws, 'member', 'projects')
  assert.deepEqual(perms, { read: true, write: false, delete: false })
})
