import { env } from './env.js'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import path from 'path'

import { initializeDatabase, initializeSchema, getMany, getOne, query, closeDatabase } from '../src/db/database.js'
import userRepository from '../src/db/repositories/user.repository.js'
import projectRepository from '../src/db/repositories/project.repository.js'
import workspaceRepository from '../src/db/repositories/workspace.repository.js'
import taskRepository from '../src/db/repositories/task.repository.js'
import milestoneRepository from '../src/db/repositories/milestone.repository.js'
import bugRepository from '../src/db/repositories/bug.repository.js'
import { ActivityRepository } from '../src/db/repositories/activity.repository.js'
import { BaseRepository } from '../src/db/repositories/base.repository.js'
import notificationRepository from '../src/db/repositories/notification.repository.js'

const taskStageRepository = new BaseRepository('task_stages')
const bugStageRepository = new BaseRepository('bug_stages')
const activityRepository = new ActivityRepository()

// Non-fatal activity logging
function logActivity(workspaceId, entityType, action, entityId, actorId, changes, projectId) {
  activityRepository
    .log(workspaceId, entityType, action, entityId, actorId, changes, projectId)
    .catch((err) => console.error('activity log failed:', err.message))
}

// Notify a user (non-fatal)
function notifyUser({ userId, workspaceId, entityType, entityId, title, body }) {
  if (!userId) return
  notificationRepository
    .createForUser({ userId, workspaceId, entityType, entityId, title, body })
    .catch((err) => console.error('notification send failed:', err.message))
}

async function getWorkspaceRequester(workspaceId, userId) {
  const members = await workspaceRepository.getMembers(workspaceId)
  return members.find((m) => String(m.id) === String(userId)) || null
}

async function userCanAccessProject(project, userId) {
  if (!project || !userId) return false
  const requester = await getWorkspaceRequester(project.workspace_id, userId)
  if (!requester) return false
  if (requester.role === 'owner') return true
  const row = await getOne(
    `SELECT 1 AS ok FROM project_members WHERE project_id = $1 AND user_id = $2 LIMIT 1`,
    [project.id, userId]
  )
  return !!row
}

async function purgeExpiredDeletedProjects() {
  try {
    const res = await query(
      `DELETE FROM projects
       WHERE deleted_at IS NOT NULL
         AND deleted_at < NOW() - INTERVAL '30 days'
       RETURNING id`
    )
    const count = res?.rowCount || 0
    if (count > 0) console.log(`[purge] Permanently deleted ${count} expired project(s)`)
  } catch (err) {
    console.error('[purge] Failed to purge expired deleted projects:', err.message)
  }
}

const { PORT, JWT_SECRET } = env

// Initialize DB
initializeDatabase(env.db)

// Apply idempotent schema (CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
initializeSchema()
  .then(() => purgeExpiredDeletedProjects())
  .catch((err) => console.error('Schema init failed:', err.message))

setInterval(() => {
  purgeExpiredDeletedProjects().catch((err) => console.error('[purge] interval failed:', err.message))
}, 60 * 60 * 1000)

function auth(req, res, next) {
  const header = req.headers.authorization
  if (!header) return res.status(401).json({ error: 'Missing auth' })
  const parts = header.split(' ')
  if (parts.length !== 2) return res.status(401).json({ error: 'Invalid auth' })
  try {
    req.user = jwt.verify(parts[1], JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.get('/api/health', async (req, res) => {
  res.json({ status: 'ok' })
})

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password, full_name, account_hint } = req.body
    if(!email || !password || !username) return res.status(400).json({ error: 'Missing fields' })

    const strongPassword = typeof password === 'string'
      && password.length >= 8
      && /[A-Za-z]/.test(password)
      && /\d/.test(password)
    if (!strongPassword) {
      return res.status(400).json({ error: 'Password must be at least 8 characters and include letters and numbers' })
    }

    const existing = await userRepository.findByEmail(email)
    if(existing) return res.status(409).json({ error: 'User already exists' })

    const hint = typeof account_hint === 'string' && account_hint.trim() ? account_hint.trim().slice(0, 255) : null
    const hash = await bcrypt.hash(password, 10)
    const user = await userRepository.create({ username, email, password_hash: hash, full_name, account_hint: hint })

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if(!email || !password) return res.status(400).json({ error: 'Missing fields' })

    const user = await userRepository.findByEmail(email)
    if(!user) return res.status(401).json({ error: 'Invalid credentials' })

    const ok = await bcrypt.compare(password, user.password_hash || '')
    if(!ok) return res.status(401).json({ error: 'Invalid credentials' })

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/auth/password-hint', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase()
    if (!email) return res.status(400).json({ error: 'Email is required' })

    const user = await userRepository.findByEmail(email)
    if (!user) return res.status(404).json({ error: 'No account found' })

    res.json({ hint: user.account_hint || null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/me', async (req, res) => {
  const auth = req.headers.authorization
  if(!auth) return res.status(401).json({ error: 'Missing auth' })
  const parts = auth.split(' ')
  if(parts.length !== 2) return res.status(401).json({ error: 'Invalid auth' })
  const token = parts[1]
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = await userRepository.findById(payload.id)
    if(!user) return res.status(404).json({ error: 'User not found' })
    res.json({ user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name } })
  } catch (err) {
    console.error(err)
    res.status(401).json({ error: 'Invalid token' })
  }
})

app.post('/api/auth/change-password', auth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body
    if (!current_password || !new_password) return res.status(400).json({ error: 'Missing fields' })
    if (new_password.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' })

    const user = await userRepository.findById(req.user.id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    const ok = await bcrypt.compare(current_password, user.password_hash || '')
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' })

    const hash = await bcrypt.hash(new_password, 10)
    await userRepository.updatePassword(user.id, hash)
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.delete('/api/auth/account', auth, async (req, res) => {
  try {
    const deleted = await userRepository.deleteById(req.user.id)
    if (!deleted) return res.status(404).json({ error: 'Account not found' })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/workspaces', auth, async (req, res) => {
  try {
    const rows = await workspaceRepository.findByUserId(req.user.id)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/workspaces', auth, async (req, res) => {
  try {
    const { name } = req.body
    const trimmedName = String(name || '').trim()
    if (!trimmedName) return res.status(400).json({ error: 'Workspace name is required' })
    if (trimmedName.length > 16) return res.status(400).json({ error: 'Workspace name must be 16 characters or less' })

    const base = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'workspace'
    let slug = base
    let created = null

    for (let attempt = 0; attempt < 5 && !created; attempt++) {
      try {
        created = await workspaceRepository.create({ name: trimmedName, slug })
      } catch (err) {
        if (err.code === '23505') {
          slug = `${base}-${Date.now().toString(36)}`
        } else {
          throw err
        }
      }
    }

    if (!created) return res.status(500).json({ error: 'Could not generate a unique slug' })

    await workspaceRepository.addMember(created.id, req.user.id, 'owner')
    res.json(created)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/projects', auth, async (req, res) => {
  try {
    const { workspace_id } = req.query
    if (!workspace_id) return res.status(400).json({ error: 'workspace_id is required' })

    const wsMembers = await workspaceRepository.getMembers(workspace_id)
    const requester = wsMembers.find((m) => String(m.id) === String(req.user?.id))
    if (!requester) return res.status(403).json({ error: 'Not a workspace member' })

    let rows = await projectRepository.findByWorkspace(workspace_id)
    if (requester.role !== 'owner') {
      const assigned = await getMany(
        `SELECT pm.project_id
         FROM project_members pm
         JOIN projects p ON p.id = pm.project_id
         WHERE p.workspace_id = $1 AND pm.user_id = $2 AND p.deleted_at IS NULL`,
        [workspace_id, req.user.id]
      )
      const allowed = new Set((assigned || []).map((r) => String(r.project_id)))
      rows = (rows || []).filter((p) => allowed.has(String(p.id)))
    }

    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/projects', auth, async (req, res) => {
  try {
    const { workspace_id, name, description, slug, status, priority, start_date, deadline } = req.body
    const trimmedName = String(name || '').trim()
    if (!workspace_id || !trimmedName) return res.status(400).json({ error: 'Missing fields' })
    if (trimmedName.length > 16) return res.status(400).json({ error: 'Project name must be 16 characters or less' })

    const baseSlug = slug || `${trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-${Date.now().toString(36)}`
    let currentSlug = baseSlug || `project-${Date.now().toString(36)}`
    let created = null

    for (let attempt = 0; attempt < 5 && !created; attempt++) {
      try {
        created = await projectRepository.create({
          workspace_id,
          name: trimmedName,
          slug: currentSlug,
          description: description || null,
          status: status || 'active',
          priority: priority || 'medium',
          start_date: start_date || null,
          deadline: deadline || null,
          created_by: req.user?.id || null,
        })
      } catch (err) {
        if (err.code === '23505') {
          currentSlug = `${baseSlug}-${Date.now().toString(36)}`
        } else if (err.code === '23503') {
          return res.status(400).json({ error: 'Invalid workspace_id' })
        } else {
          throw err
        }
      }
    }

    if (!created) return res.status(500).json({ error: 'Could not generate a unique slug' })
    logActivity(created.workspace_id, 'project', 'created', created.id, req.user.id, { title: created.name }, created.id)
    res.json(created)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/workspaces/:id/members', auth, async (req, res) => {
  try {
    const rows = await workspaceRepository.getMembers(req.params.id)
    res.json(rows.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      full_name: u.full_name,
      avatar_url: u.avatar_url,
      role: u.role,
      joined_at: u.joined_at,
    })))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.patch('/api/workspaces/:id', auth, async (req, res) => {
  try {
    const { name, settings } = req.body
    if ((name == null || !String(name).trim()) && settings == null) {
      return res.status(400).json({ error: 'Nothing to update' })
    }

    let updated = await workspaceRepository.findById(req.params.id)
    if (!updated) return res.status(404).json({ error: 'Workspace not found' })

    if (name != null) {
      const trimmedName = String(name).trim()
      if (!trimmedName) return res.status(400).json({ error: 'Workspace name is required' })
      if (trimmedName.length > 16) return res.status(400).json({ error: 'Workspace name must be 16 characters or less' })
      updated = await workspaceRepository.updateById(req.params.id, { name: trimmedName })
    }

    if (settings != null && typeof settings === 'object' && !Array.isArray(settings)) {
      updated = await workspaceRepository.updateSettings(req.params.id, settings)
    }

    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.delete('/api/workspaces/:id', auth, async (req, res) => {
  try {
    const deleted = await workspaceRepository.deleteById(req.params.id)
    if (!deleted) return res.status(404).json({ error: 'Workspace not found' })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/workspaces/:id/members', auth, async (req, res) => {
  try {
    const { email, role } = req.body
    if (!email || !email.trim()) return res.status(400).json({ error: 'Email is required' })

    const workspace = await workspaceRepository.findById(req.params.id)
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' })

    const user = await userRepository.findByEmail(email.trim().toLowerCase())
    if (!user) return res.status(404).json({ error: 'No user found with that email' })

    try {
      const added = await workspaceRepository.addMember(req.params.id, user.id, role || 'member')
      if (!added) {
        return res.status(409).json({ error: 'User is already a member of this workspace' })
      }
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'User is already a member of this workspace' })
      }
      throw err
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      role: role || 'member',
      joined_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.patch('/api/workspaces/:id/members/:userId', auth, async (req, res) => {
  try {
    const { role } = req.body
    if (!role) return res.status(400).json({ error: 'Role is required' })

    const row = await workspaceRepository.updateMemberRole(req.params.id, req.params.userId, role)
    if (!row) return res.status(404).json({ error: 'Member not found' })

    const user = await userRepository.findById(req.params.userId)
    res.json({
      id: req.params.userId,
      username: user?.username,
      email: user?.email,
      full_name: user?.full_name,
      avatar_url: user?.avatar_url,
      role,
      joined_at: row.joined_at,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.delete('/api/workspaces/:id/members/:userId', auth, async (req, res) => {
  try {
    const memberCount = await workspaceRepository.countMembers(req.params.id)
    if (memberCount <= 1) {
      return res.status(400).json({ error: 'Cannot remove the last member — delete the workspace instead' })
    }

    const removed = await workspaceRepository.removeMember(req.params.id, req.params.userId)
    if (!removed) return res.status(404).json({ error: 'Member not found' })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/milestones', auth, async (req, res) => {
  try {
    const { project_id } = req.query
    if (!project_id) return res.status(400).json({ error: 'project_id is required' })
    const rows = await milestoneRepository.findByCondition('project_id = $1', [project_id])
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/milestones', auth, async (req, res) => {
  try {
    const { project_id, name, description, start_date, due_date, meta } = req.body
    if (!project_id || !name || !name.trim()) {
      return res.status(400).json({ error: 'project_id and name are required' })
    }

    const project = await projectRepository.findById(project_id)
    if (!project) return res.status(404).json({ error: 'Project not found' })

    const created = await milestoneRepository.create({
      project_id,
      name: name.trim(),
      description: description || null,
      start_date: start_date || null,
      due_date: due_date || null,
      status: 'planned',
      progress: 0,
      ...(meta && typeof meta === 'object' ? { meta } : {}),
    })

    logActivity(project.workspace_id, 'milestone', 'created', created.id, req.user.id, { title: created.name }, project_id)
    res.json(created)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

const MILESTONE_ALLOWED_FIELDS = ['name', 'description', 'start_date', 'due_date', 'status', 'progress', 'meta']

app.patch('/api/milestones/:id', auth, async (req, res) => {
  try {
    const data = {}
    for (const field of MILESTONE_ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) data[field] = req.body[field]
    }
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }

    const existing = await milestoneRepository.findById(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Milestone not found' })

    const updated = await milestoneRepository.updateById(req.params.id, data)
    if (!updated) return res.status(404).json({ error: 'Milestone not found' })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.delete('/api/milestones/:id', auth, async (req, res) => {
  try {
    const deleted = await milestoneRepository.deleteById(req.params.id)
    if (!deleted) return res.status(404).json({ error: 'Milestone not found' })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// ---- Markdown pages (Logseq-style journal + pages) ----

app.get('/api/md-pages', auth, async (req, res) => {
  try {
    const { workspace_id, type, page_date } = req.query
    if (!workspace_id) return res.status(400).json({ error: 'workspace_id is required' })
    let sql = 'SELECT * FROM md_pages WHERE workspace_id = $1'
    const params = [workspace_id]
    if (type) {
      params.push(type)
      sql += ` AND page_type = $${params.length}`
    }
    if (page_date) {
      params.push(page_date)
      sql += ` AND page_date = $${params.length}`
    }
    sql += ' ORDER BY updated_at DESC'
    const rows = await getMany(sql, params)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/md-pages', auth, async (req, res) => {
  try {
    const { workspace_id, title, content, page_type, page_date, attachments } = req.body
    if (!workspace_id) return res.status(400).json({ error: 'workspace_id is required' })
    const created = await getOne(
      `INSERT INTO md_pages (workspace_id, title, content, page_type, page_date, attachments, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        workspace_id,
        title?.trim() || 'Untitled',
        content || '',
        page_type || 'page',
        page_date || null,
        attachments ? JSON.stringify(attachments) : '[]',
        req.user.id,
      ]
    )
    res.status(201).json(created)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

const MD_PAGE_FIELDS = {
  title: 'text', content: 'text', reactions: 'jsonb', comments: 'jsonb',
  attachments: 'jsonb', pinned: 'bool', archived: 'bool',
}

app.patch('/api/md-pages/:id', auth, async (req, res) => {
  try {
    const sets = []
    const vals = []
    for (const [field, kind] of Object.entries(MD_PAGE_FIELDS)) {
      if (req.body[field] === undefined) continue
      vals.push(kind === 'jsonb' ? JSON.stringify(req.body[field]) : req.body[field])
      sets.push(`${field} = $${vals.length}`)
    }
    if (sets.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }
    sets.push('updated_at = CURRENT_TIMESTAMP')
    vals.push(req.params.id)
    const updated = await getOne(
      `UPDATE md_pages SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`,
      vals
    )
    if (!updated) return res.status(404).json({ error: 'Page not found' })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.delete('/api/md-pages/:id', auth, async (req, res) => {
  try {
    const result = await query('DELETE FROM md_pages WHERE id = $1', [req.params.id])
    if (result.rowCount === 0) return res.status(404).json({ error: 'Page not found' })
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/activity', auth, async (req, res) => {
  try {
    const { project_id, workspace_id } = req.query
    if (project_id) {
      return res.json(await activityRepository.getProjectActivity(project_id))
    }
    if (workspace_id) {
      return res.json(await activityRepository.getWorkspaceActivity(workspace_id))
    }
    return res.status(400).json({ error: 'project_id or workspace_id is required' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/notifications', auth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100)
    const rows = await notificationRepository.getForUser(req.user.id, limit)
    const unread = await notificationRepository.getUnreadCount(req.user.id)
    res.json({ notifications: rows, unread })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/notifications/:id/read', auth, async (req, res) => {
  try {
    const updated = await notificationRepository.markRead(req.params.id, req.user.id)
    if (!updated) return res.status(404).json({ error: 'Notification not found' })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/notifications/read-all', auth, async (req, res) => {
  try {
    await notificationRepository.markAllRead(req.user.id)
    const unread = await notificationRepository.getUnreadCount(req.user.id)
    res.json({ success: true, unread })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/tasks', auth, async (req, res) => {
  try {
    const { workspace_id } = req.query
    if (!workspace_id) return res.status(400).json({ error: 'workspace_id is required' })
    const requester = await getWorkspaceRequester(workspace_id, req.user.id)
    if (!requester) return res.status(403).json({ error: 'Not a workspace member' })

    let rows = await taskRepository.findByWorkspace(workspace_id)
    if (requester.role !== 'owner') {
      const assigned = await getMany(
        `SELECT pm.project_id
         FROM project_members pm
         JOIN projects p ON p.id = pm.project_id
         WHERE p.workspace_id = $1 AND pm.user_id = $2`,
        [workspace_id, req.user.id]
      )
      const allowed = new Set((assigned || []).map((r) => String(r.project_id)))
      rows = (rows || []).filter((t) => allowed.has(String(t.project_id)))
    }
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

const TASK_ALLOWED_FIELDS = [
  'title', 'description', 'status', 'priority', 'assigned_to',
  'start_date', 'due_date', 'progress', 'milestone_id', 'meta',
]

app.post('/api/tasks', auth, async (req, res) => {
  try {
    const { project_id, title } = req.body
    if (!project_id || !title || !title.trim()) {
      return res.status(400).json({ error: 'project_id and title are required' })
    }

    const project = await projectRepository.findById(project_id)
    if (!project) return res.status(404).json({ error: 'Project not found' })
    if (!(await userCanAccessProject(project, req.user.id))) {
      return res.status(403).json({ error: 'You do not have access to this project' })
    }

    const data = {}
    for (const field of TASK_ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) data[field] = req.body[field]
    }

    // Human-readable code scoped to the project: Task-01, Task-02, ...
    const taskCount = Number(await taskRepository.countByCondition('project_id = $1', [project_id])) + 1
    const task_code = `Task-${String(taskCount).padStart(2, '0')}`

    const created = await taskRepository.create({
      project_id,
      title: title.trim(),
      status: 'todo',
      task_code,
      ...data,
    })

    logActivity(project?.workspace_id, 'task', 'created', created.id, req.user.id, { task_code: created.task_code, title: created.title }, project_id)
    if (created.assigned_to) {
      notifyUser({
        userId: created.assigned_to,
        workspaceId: project?.workspace_id,
        entityType: 'task',
        entityId: created.id,
        title: 'New task assigned to you',
        body: `${created.task_code || ''} ${created.title}`.trim(),
      })
    }
    res.json(created)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.patch('/api/tasks/:id', auth, async (req, res) => {
  try {
    const data = {}
    for (const field of TASK_ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) data[field] = req.body[field]
    }
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }

    if (data.meta && typeof data.meta !== 'object') {
      return res.status(400).json({ error: 'meta must be an object' })
    }

    const existing = await taskRepository.findById(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Task not found' })
    const project = await projectRepository.findById(existing.project_id)
    if (!project) return res.status(404).json({ error: 'Project not found' })
    if (!(await userCanAccessProject(project, req.user.id))) {
      return res.status(403).json({ error: 'You do not have access to this project' })
    }

    // Merge meta instead of overwriting so comments/checklist/files persist independently
    let toUpdate = data
    if (data.meta) {
      toUpdate = {
        ...data,
        meta: { ...(existing.meta || {}), ...data.meta },
      }
    }

    const updated = await taskRepository.updateById(req.params.id, toUpdate)
    if (!updated) return res.status(404).json({ error: 'Task not found' })

    // Track stage moves as explicit activity entries
    if (data.status && data.status !== existing.status) {
      const project = await projectRepository.findById(existing.project_id)
      logActivity(
        project?.workspace_id,
        'task',
        'status_changed',
        updated.id,
        req.user.id,
        { task_code: existing.task_code, title: existing.title, from: existing.status, to: data.status },
        existing.project_id
      )
    }

    // Notify the new assignee when a task gets (re)assigned
    if (data.assigned_to !== undefined && data.assigned_to !== existing.assigned_to && data.assigned_to) {
      const project = await projectRepository.findById(existing.project_id)
      notifyUser({
        userId: data.assigned_to,
        workspaceId: project?.workspace_id,
        entityType: 'task',
        entityId: updated.id,
        title: 'Task assigned to you',
        body: `${existing.task_code || ''} ${updated.title || existing.title}`.trim(),
      })
    }
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.delete('/api/tasks/:id', auth, async (req, res) => {
  try {
    const existing = await taskRepository.findById(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Task not found' })
    const project = await projectRepository.findById(existing.project_id)
    if (!project) return res.status(404).json({ error: 'Project not found' })
    if (!(await userCanAccessProject(project, req.user.id))) {
      return res.status(403).json({ error: 'You do not have access to this project' })
    }
    const deleted = await taskRepository.softDeleteById(req.params.id)
    if (!deleted) return res.status(404).json({ error: 'Task not found' })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/projects/:id', auth, async (req, res) => {
  try {
    const project = await projectRepository.findById(req.params.id)
    if (!project || project.deleted_at) return res.status(404).json({ error: 'Project not found' })

    if (!(await userCanAccessProject(project, req.user.id))) {
      return res.status(403).json({ error: 'You do not have access to this project' })
    }

    const stats = await projectRepository.getStats(project.id)
    const members = await workspaceRepository.getMembers(project.workspace_id)
    res.json({
      ...project,
      stats,
      members_count: members.length,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

const PROJECT_ALLOWED_FIELDS = [
  'name', 'description', 'status', 'priority', 'start_date', 'deadline', 'color', 'archived', 'meta',
]

app.patch('/api/projects/:id', auth, async (req, res) => {
  try {
    const data = {}
    for (const field of PROJECT_ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) data[field] = req.body[field]
    }
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }

    const existing = await projectRepository.findById(req.params.id)
    if (!existing || existing.deleted_at) return res.status(404).json({ error: 'Project not found' })

    if (!(await userCanAccessProject(existing, req.user.id))) {
      return res.status(403).json({ error: 'You do not have access to this project' })
    }

    // Merge meta instead of overwriting so attachments persist independently
    let toUpdate = data
    if (data.meta) {
      toUpdate = {
        ...data,
        meta: { ...(existing.meta || {}), ...data.meta },
      }
    }
    if (toUpdate.name !== undefined) {
      const trimmedName = String(toUpdate.name || '').trim()
      if (!trimmedName) return res.status(400).json({ error: 'Project name is required' })
      if (trimmedName.length > 16) return res.status(400).json({ error: 'Project name must be 16 characters or less' })
      toUpdate.name = trimmedName
    }

    const updated = await projectRepository.updateById(req.params.id, toUpdate)
    if (!updated) return res.status(404).json({ error: 'Project not found' })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.delete('/api/projects/:id', auth, async (req, res) => {
  try {
    const project = await projectRepository.findById(req.params.id)
    if (!project) return res.status(404).json({ error: 'Project not found' })

    if (!(await userCanAccessProject(project, req.user.id))) {
      return res.status(403).json({ error: 'You do not have access to this project' })
    }

    const requesterId = String(req.user?.id || '')
    const members = await workspaceRepository.getMembers(project.workspace_id)
    const requester = members.find((m) => String(m.id) === requesterId)
    const requesterRole = requester?.role || null

    // Workspace owner can delete all projects in the workspace (including legacy)
    if (requesterRole === 'owner') {
      const deleted = await projectRepository.softDeleteById(req.params.id)
      if (!deleted) return res.status(404).json({ error: 'Project not found' })
      return res.json({ ok: true })
    }

    // Determine if this is an owner's project
    let isOwnersProject = false
    if (project.created_by) {
      const creator = members.find((m) => String(m.id) === String(project.created_by))
      isOwnersProject = creator?.role === 'owner'
    } else {
      // Legacy projects without creator: treat as owner-managed projects by default
      isOwnersProject = true
    }

    // Admin can create/delete projects, but cannot delete owner's projects
    if (requesterRole === 'admin' && !isOwnersProject) {
      const deleted = await projectRepository.softDeleteById(req.params.id)
      if (!deleted) return res.status(404).json({ error: 'Project not found' })
      return res.json({ ok: true })
    }

    // Members (or others): allow deleting only projects they created, but never owner's projects
    if (project.created_by && String(project.created_by) === requesterId && !isOwnersProject) {
      const deleted = await projectRepository.softDeleteById(req.params.id)
      if (!deleted) return res.status(404).json({ error: 'Project not found' })
      return res.json({ ok: true })
    }

    return res.status(403).json({ error: "You don't have permission to delete this project" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/projects/:id/members', auth, async (req, res) => {
  try {
    const project = await projectRepository.findById(req.params.id)
    if (!project) return res.status(404).json({ error: 'Project not found' })
    if (!(await userCanAccessProject(project, req.user.id))) {
      return res.status(403).json({ error: 'You do not have access to this project' })
    }
    const rows = await projectRepository.getMembers(req.params.id)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.put('/api/projects/:id/members', auth, async (req, res) => {
  try {
    const project = await projectRepository.findById(req.params.id)
    if (!project) return res.status(404).json({ error: 'Project not found' })
    if (!(await userCanAccessProject(project, req.user.id))) {
      return res.status(403).json({ error: 'You do not have access to this project' })
    }
    const { member_ids, members } = req.body
    // Backward compatible: member_ids = [userId,...]; new: members = [{user_id, role}, ...]
    const entries = Array.isArray(members) ? members : (Array.isArray(member_ids) ? member_ids.filter(Boolean) : [])
    const rows = await projectRepository.setMembers(req.params.id, entries)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/workspaces/:id/project-memberships', auth, async (req, res) => {
  try {
    const workspace = await workspaceRepository.findById(req.params.id)
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' })
    const requester = (await workspaceRepository.getMembers(req.params.id)).find(m => String(m.id) === String(req.user?.id))
    if (!requester || requester.role !== 'owner') {
      return res.status(403).json({ error: 'Only workspace owner can manage project access' })
    }
    const rows = await projectRepository.getMemberProjectsForWorkspace(req.params.id)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.put('/api/workspaces/:id/members/:userId/project-memberships', auth, async (req, res) => {
  try {
    const workspace = await workspaceRepository.findById(req.params.id)
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' })
    const wsMembers = await workspaceRepository.getMembers(req.params.id)
    const requester = wsMembers.find(m => String(m.id) === String(req.user?.id))
    if (!requester || requester.role !== 'owner') {
      return res.status(403).json({ error: 'Only workspace owner can manage project access' })
    }
    const target = wsMembers.find(m => String(m.id) === String(req.params.userId))
    if (!target) return res.status(404).json({ error: 'Member not found in workspace' })

    const assignments = Array.isArray(req.body?.assignments) ? req.body.assignments : []
    // Optional: prevent stripping owner's own access? not required, but keep simple
    const rows = await projectRepository.setUserProjectMemberships(req.params.id, req.params.userId, assignments)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/workspaces/:id/my-project-memberships', auth, async (req, res) => {
  try {
    const workspace = await workspaceRepository.findById(req.params.id)
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' })
    const wsMembers = await workspaceRepository.getMembers(req.params.id)
    const requester = wsMembers.find(m => String(m.id) === String(req.user?.id))
    if (!requester) return res.status(403).json({ error: 'Not a workspace member' })

    if (requester.role === 'owner') {
      const projects = await projectRepository.findByWorkspace(req.params.id)
      return res.json((projects || []).map(p => ({ project_id: p.id, user_id: req.user.id, project_role: 'owner' })))
    }

    const rows = await getMany(
      `SELECT pm.project_id, pm.user_id, pm.role AS project_role
       FROM project_members pm
       JOIN projects p ON p.id = pm.project_id
       WHERE p.workspace_id = $1 AND pm.user_id = $2`,
      [req.params.id, req.user.id]
    )
    res.json(rows || [])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/bugs', auth, async (req, res) => {
  try {
    const {
      project_id, title, description, priority, kanban_column,
      assigned_to, milestone_id, start_date, due_date,
      steps_to_reproduce, expected_behavior, actual_behavior,
      attachments, meta,
    } = req.body
    if (!project_id || !title || !title.trim()) {
      return res.status(400).json({ error: 'project_id and title are required' })
    }
    const project = await projectRepository.findById(project_id)
    if (!project) return res.status(404).json({ error: 'Project not found' })
    if (!(await userCanAccessProject(project, req.user.id))) {
      return res.status(403).json({ error: 'You do not have access to this project' })
    }

    // Client may send files under `meta.attachments` (task-style) or `attachments`
    const fileAttachments = Array.isArray(attachments)
      ? attachments
      : (meta && Array.isArray(meta.attachments) ? meta.attachments : null)

    const stage = kanban_column || 'New'
    let bugId = null
    try {
      bugId = await bugRepository.generateBugId(project_id)
    } catch { /* non-fatal */ }

    const created = await bugRepository.create({
      project_id,
      title: title.trim(),
      description: description || null,
      priority: priority || 'medium',
      kanban_column: stage,
      status: stage,
      assigned_to: assigned_to || null,
      milestone_id: milestone_id || null,
      start_date: start_date || null,
      due_date: due_date || null,
      steps_to_reproduce: steps_to_reproduce || null,
      expected_behavior: expected_behavior || null,
      actual_behavior: actual_behavior || null,
      ...(fileAttachments ? { attachments: JSON.stringify(fileAttachments) } : {}),
      bug_id: bugId,
    })

    logActivity(project.workspace_id, 'bug', 'created', created.id, req.user.id, { bug_id: created.bug_id, title: created.title }, project_id)
    if (created.assigned_to) {
      notifyUser({
        userId: created.assigned_to,
        workspaceId: project.workspace_id,
        entityType: 'bug',
        entityId: created.id,
        title: `New bug assigned to you`,
        body: `${created.bug_id || ''} ${created.title}`.trim(),
      })
    }
    res.json(created)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/bugs', auth, async (req, res) => {
  try {
    const { project_id, workspace_id } = req.query
    if (project_id) {
      const project = await projectRepository.findById(project_id)
      if (!project || project.deleted_at) return res.status(404).json({ error: 'Project not found' })
      if (!(await userCanAccessProject(project, req.user.id))) {
        return res.status(403).json({ error: 'You do not have access to this project' })
      }
      const rows = await bugRepository.findByCondition('project_id = $1 AND deleted_at IS NULL', [project_id])
      return res.json(rows)
    }
    if (workspace_id) {
      const requester = await getWorkspaceRequester(workspace_id, req.user.id)
      if (!requester) return res.status(403).json({ error: 'Not a workspace member' })
      let projects = await projectRepository.findByCondition('workspace_id = $1 AND deleted_at IS NULL', [workspace_id])
      if (requester.role !== 'owner') {
        const assigned = await getMany(
          `SELECT pm.project_id
           FROM project_members pm
           JOIN projects p ON p.id = pm.project_id
           WHERE p.workspace_id = $1 AND pm.user_id = $2 AND p.deleted_at IS NULL`,
          [workspace_id, req.user.id]
        )
        const allowed = new Set((assigned || []).map((r) => String(r.project_id)))
        projects = (projects || []).filter((p) => allowed.has(String(p.id)))
      }
      if (projects.length === 0) return res.json([])
      const rows = await bugRepository.findByCondition(
        'project_id = ANY($1::uuid[]) AND deleted_at IS NULL',
        [projects.map((p) => p.id)]
      )
      return res.json(rows)
    }
    return res.status(400).json({ error: 'project_id or workspace_id is required' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

const BUG_ALLOWED_FIELDS = [
  'title', 'description', 'priority', 'kanban_column', 'status',
  'assigned_to', 'steps_to_reproduce', 'expected_behavior', 'actual_behavior',
  'milestone_id', 'start_date', 'due_date',
]

app.patch('/api/bugs/:id', auth, async (req, res) => {
  try {
    const data = {}
    for (const field of BUG_ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) data[field] = req.body[field]
    }

    // The bugs table stores files in `attachments`, not a `meta` column —
    // translate task-style meta.attachments patches before persisting
    if (req.body.meta && Array.isArray(req.body.meta.attachments)) {
      data.attachments = JSON.stringify(req.body.meta.attachments)
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }
    // Keep status in sync with the kanban column, like on create
    if (data.kanban_column && data.status === undefined) {
      data.status = data.kanban_column
    }

    const existing = await bugRepository.findById(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Bug not found' })
    const project = await projectRepository.findById(existing.project_id)
    if (!project) return res.status(404).json({ error: 'Project not found' })
    if (!(await userCanAccessProject(project, req.user.id))) {
      return res.status(403).json({ error: 'You do not have access to this project' })
    }

    const updated = await bugRepository.updateById(req.params.id, data)
    if (!updated) return res.status(404).json({ error: 'Bug not found' })

    // Track kanban moves as explicit activity entries
    if (data.kanban_column && data.kanban_column !== existing.kanban_column) {
      const project = await projectRepository.findById(existing.project_id)
      logActivity(
        project?.workspace_id,
        'bug',
        'status_changed',
        updated.id,
        req.user.id,
        { bug_id: existing.bug_id, title: existing.title, from: existing.kanban_column, to: data.kanban_column },
        existing.project_id
      )
    }

    // Notify the new assignee when a bug gets (re)assigned
    if (data.assigned_to !== undefined && data.assigned_to !== existing.assigned_to && data.assigned_to) {
      const project = await projectRepository.findById(existing.project_id)
      notifyUser({
        userId: data.assigned_to,
        workspaceId: project?.workspace_id,
        entityType: 'bug',
        entityId: updated.id,
        title: 'Bug assigned to you',
        body: `${existing.bug_id || ''} ${updated.title || existing.title}`.trim(),
      })
    }
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.delete('/api/bugs/:id', auth, async (req, res) => {
  try {
    const existing = await bugRepository.findById(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Bug not found' })
    const project = await projectRepository.findById(existing.project_id)
    if (!project) return res.status(404).json({ error: 'Project not found' })
    if (!(await userCanAccessProject(project, req.user.id))) {
      return res.status(403).json({ error: 'You do not have access to this project' })
    }
    const deleted = await bugRepository.softDeleteById(req.params.id)
    if (!deleted) return res.status(404).json({ error: 'Bug not found' })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/bugs/:id/comments', auth, async (req, res) => {
  try {
    const bug = await bugRepository.findById(req.params.id)
    if (!bug) return res.status(404).json({ error: 'Bug not found' })
    const project = await projectRepository.findById(bug.project_id)
    if (!project) return res.status(404).json({ error: 'Project not found' })
    if (!(await userCanAccessProject(project, req.user.id))) {
      return res.status(403).json({ error: 'You do not have access to this project' })
    }
    const rows = await getMany(
      `SELECT c.*, u.username AS author_name, u.full_name AS author_full_name
       FROM bug_comments c
       LEFT JOIN users u ON c.author_id = u.id
       WHERE c.bug_id = $1
       ORDER BY c.created_at ASC`,
      [req.params.id]
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/bugs/:id/comments', auth, async (req, res) => {
  try {
    const { content, parent_comment_id, parentCommentId } = req.body
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'content is required' })
    }
    const bug = await bugRepository.findById(req.params.id)
    if (!bug) return res.status(404).json({ error: 'Bug not found' })
    const project = await projectRepository.findById(bug.project_id)
    if (!project) return res.status(404).json({ error: 'Project not found' })
    if (!(await userCanAccessProject(project, req.user.id))) {
      return res.status(403).json({ error: 'You do not have access to this project' })
    }

    const parentId = parent_comment_id || parentCommentId || null
    const created = await bugRepository.addComment(bug.id, req.user.id, content.trim(), [], parentId)
    const withAuthor = await getOne(
      `SELECT c.*, u.username AS author_name, u.full_name AS author_full_name
       FROM bug_comments c
       LEFT JOIN users u ON c.author_id = u.id
       WHERE c.id = $1`,
      [created.id]
    )
    res.json(withAuthor)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// ---------- Stage management (tasks + bugs) ----------

const DEFAULT_TASK_STAGES = [
  { name: 'To Do', color: '#6e61ff' },
  { name: 'In Progress', color: '#ff7918' },
  { name: 'Review', color: '#a14cff' },
  { name: 'Done', color: '#20d969' },
]

const DEFAULT_BUG_STAGES = [
  { name: 'New', color: '#5f74ff' },
  { name: 'In Progress', color: '#ff7818' },
  { name: 'Fixed', color: '#20d96b' },
  { name: 'Closed', color: '#777777' },
]

async function ensureStages(repo, workspaceId, defaults) {
  let rows = await repo.findByCondition('workspace_id = $1', [workspaceId], 'position ASC, created_at ASC')
  if (rows.length === 0) {
    let pos = 0
    for (const s of defaults) {
      await repo.create({ workspace_id: workspaceId, name: s.name, color: s.color, position: pos++ })
    }
    rows = await repo.findByCondition('workspace_id = $1', [workspaceId], 'position ASC, created_at ASC')
  }
  return rows
}

function stageRoutes(basePath, repo, defaults) {
  app.get(basePath, auth, async (req, res) => {
    try {
      const { workspace_id } = req.query
      if (!workspace_id) return res.status(400).json({ error: 'workspace_id is required' })
      const rows = await ensureStages(repo, workspace_id, defaults)
      res.json(rows)
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Server error' })
    }
  })

  app.post(basePath, auth, async (req, res) => {
    try {
      const { workspace_id, name, color } = req.body
      if (!workspace_id || !name || !name.trim()) {
        return res.status(400).json({ error: 'workspace_id and name are required' })
      }
      const existing = await repo.findByCondition('workspace_id = $1', [workspace_id], 'position ASC')
      const maxPos = existing.reduce((m, r) => Math.max(m, Number(r.position) || 0), -1)
      const created = await repo.create({
        workspace_id,
        name: name.trim(),
        color: color || '#6e61ff',
        position: maxPos + 1,
      })
      res.json(created)
    } catch (err) {
      if (err && err.code === '23505') {
        return res.status(409).json({ error: 'A stage with this name already exists' })
      }
      console.error(err)
      res.status(500).json({ error: 'Server error' })
    }
  })

  app.patch(`${basePath}/reorder`, auth, async (req, res) => {
    try {
      const { order } = req.body
      if (!Array.isArray(order)) return res.status(400).json({ error: 'order array is required' })
      for (let i = 0; i < order.length; i++) {
        await repo.updateById(order[i], { position: i })
      }
      res.json({ ok: true })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Server error' })
    }
  })

  app.patch(`${basePath}/:id`, auth, async (req, res) => {
    try {
      const data = {}
      if (req.body.name !== undefined) data.name = String(req.body.name).trim()
      if (req.body.color !== undefined) data.color = req.body.color
      if (req.body.position !== undefined) data.position = req.body.position
      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' })
      }
      const updated = await repo.updateById(req.params.id, data)
      if (!updated) return res.status(404).json({ error: 'Stage not found' })
      res.json(updated)
    } catch (err) {
      if (err && err.code === '23505') {
        return res.status(409).json({ error: 'A stage with this name already exists' })
      }
      console.error(err)
      res.status(500).json({ error: 'Server error' })
    }
  })
}

stageRoutes('/api/task-stages', taskStageRepository, DEFAULT_TASK_STAGES)
stageRoutes('/api/bug-stages', bugStageRepository, DEFAULT_BUG_STAGES)

async function ensureArchivedStage(repo, workspaceId) {
  let archived = (await repo.findByCondition('workspace_id = $1 AND name = $2', [workspaceId, 'Archived']))[0]
  if (!archived) {
    const all = await repo.findByCondition('workspace_id = $1', [workspaceId], 'position ASC')
    const maxPos = all.reduce((m, r) => Math.max(m, Number(r.position) || 0), -1)
    archived = await repo.create({
      workspace_id: workspaceId,
      name: 'Archived',
      color: '#555555',
      position: maxPos + 1,
    })
  }
  return archived
}

app.delete('/api/task-stages/:id', auth, async (req, res) => {
  try {
    const stage = await taskStageRepository.findById(req.params.id)
    if (!stage) return res.status(404).json({ error: 'Stage not found' })
    if (stage.name === 'Archived') {
      return res.status(400).json({ error: 'The Archived stage cannot be deleted' })
    }

    await ensureArchivedStage(taskStageRepository, stage.workspace_id)

    // Tasks are scoped by project, so scope through the workspace's projects
    const projects = await projectRepository.findByCondition('workspace_id = $1', [stage.workspace_id])
    if (projects.length > 0) {
      await taskRepository.updateByCondition(
        'project_id = ANY($1::uuid[]) AND status = $2',
        [projects.map((p) => p.id), stage.name],
        { status: 'Archived' }
      )
    }

    await taskStageRepository.deleteById(stage.id)
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.delete('/api/bug-stages/:id', auth, async (req, res) => {
  try {
    const stage = await bugStageRepository.findById(req.params.id)
    if (!stage) return res.status(404).json({ error: 'Stage not found' })
    if (stage.name === 'Archived') {
      return res.status(400).json({ error: 'The Archived stage cannot be deleted' })
    }

    await ensureArchivedStage(bugStageRepository, stage.workspace_id)

    // Bugs are scoped by project, so scope through the workspace's projects
    const projects = await projectRepository.findByCondition('workspace_id = $1', [stage.workspace_id])
    if (projects.length > 0) {
      await bugRepository.updateByCondition(
        'project_id = ANY($1::uuid[]) AND kanban_column = $2',
        [projects.map((p) => p.id), stage.name],
        { kanban_column: 'Archived', status: 'Archived' }
      )
    }

    await bugStageRepository.deleteById(stage.id)
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// --- Archive (soft-deleted items) ---
app.get('/api/archive/projects', auth, async (req, res) => {
  try {
    const { workspace_id } = req.query
    if (!workspace_id) return res.status(400).json({ error: 'workspace_id is required' })
    const requester = await getWorkspaceRequester(workspace_id, req.user.id)
    if (!requester) return res.status(403).json({ error: 'Not a workspace member' })
    let rows = await projectRepository.findDeletedByWorkspace(workspace_id)
    if (requester.role !== 'owner') {
      const assigned = await getMany(
        `SELECT pm.project_id FROM project_members pm JOIN projects p ON p.id = pm.project_id WHERE p.workspace_id = $1 AND pm.user_id = $2`,
        [workspace_id, req.user.id]
      )
      const allowed = new Set((assigned || []).map(r => String(r.project_id)))
      rows = (rows || []).filter(p => allowed.has(String(p.id)))
    }
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/archive/projects/:id/details', auth, async (req, res) => {
  try {
    const { workspace_id } = req.query
    const projectId = req.params.id
    if (!workspace_id) return res.status(400).json({ error: 'workspace_id is required' })
    const requester = await getWorkspaceRequester(workspace_id, req.user.id)
    if (!requester) return res.status(403).json({ error: 'Not a workspace member' })

    const project = await projectRepository.findById(projectId)
    if (!project || String(project.workspace_id) !== String(workspace_id)) {
      return res.status(404).json({ error: 'Project not found' })
    }
    if (requester.role !== 'owner') {
      const row = await getOne(
        `SELECT 1 AS ok FROM project_members WHERE project_id = $1 AND user_id = $2 LIMIT 1`,
        [projectId, req.user.id]
      )
      if (!row) return res.status(403).json({ error: 'You do not have access to this project' })
    }

    const tasks = await getMany(
      `SELECT t.*, u.username AS assignee_name
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assigned_to
       WHERE t.project_id = $1
       ORDER BY t.created_at DESC`,
      [projectId]
    )
    const bugs = await getMany(
      `SELECT b.*, u.username AS assignee_name
       FROM bugs b
       LEFT JOIN users u ON u.id = b.assigned_to
       WHERE b.project_id = $1
       ORDER BY b.created_at DESC`,
      [projectId]
    )
    const pages = await getMany(
      `SELECT id, title, page_type, page_date, content, attachments, created_at, updated_at
       FROM md_pages
       WHERE workspace_id = $1
       ORDER BY updated_at DESC`,
      [workspace_id]
    )

    const normalizeAtts = (raw) => {
      if (Array.isArray(raw)) return raw
      if (typeof raw === 'string') { try { const v = JSON.parse(raw); return Array.isArray(v) ? v : [] } catch { return [] } }
      return []
    }
    const collectAttachments = []
    for (const t of (tasks || [])) {
      const atts = [...normalizeAtts(t.meta?.attachments), ...normalizeAtts(t.attachments), ...normalizeAtts(t.meta?.files)]
      for (const a of atts) {
        const obj = (a && typeof a === 'object') ? a : { name: String(a) }
        collectAttachments.push({ ...obj, source_type: 'Task', source_id: t.task_code || t.id, source_title: t.title || '' })
      }
    }
    for (const b of (bugs || [])) {
      const atts = [...normalizeAtts(b.attachments), ...normalizeAtts(b.meta?.attachments), ...normalizeAtts(b.meta?.files)]
      for (const a of atts) {
        const obj = (a && typeof a === 'object') ? a : { name: String(a) }
        collectAttachments.push({ ...obj, source_type: 'Bug', source_id: b.bug_id || b.id, source_title: b.title || '' })
      }
    }

    res.json({ project, tasks: tasks || [], bugs: bugs || [], pages: pages || [], attachments: collectAttachments })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/archive/projects/:id/recover', auth, async (req, res) => {
  try {
    const { workspace_id } = req.body || {}
    const projectId = req.params.id
    if (!workspace_id) return res.status(400).json({ error: 'workspace_id is required' })
    const requester = await getWorkspaceRequester(workspace_id, req.user.id)
    if (!requester) return res.status(403).json({ error: 'Not a workspace member' })
    if (requester.role !== 'owner') return res.status(403).json({ error: 'Only workspace owner can recover projects' })

    const project = await projectRepository.findById(projectId)
    if (!project || String(project.workspace_id) !== String(workspace_id)) {
      return res.status(404).json({ error: 'Project not found' })
    }
    if (!project.deleted_at) return res.status(400).json({ error: 'Project is not deleted' })

    await query(`UPDATE projects SET deleted_at = NULL, updated_at = NOW() WHERE id = $1`, [projectId])
    await query(`UPDATE tasks SET deleted_at = NULL, updated_at = NOW() WHERE project_id = $1 AND deleted_at IS NOT NULL`, [projectId])
    await query(`UPDATE bugs SET deleted_at = NULL, updated_at = NOW() WHERE project_id = $1 AND deleted_at IS NOT NULL`, [projectId])

    const restored = await projectRepository.findById(projectId)
    res.json({ ok: true, project: restored })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/archive/tasks', auth, async (req, res) => {
  try {
    const { workspace_id, project_id } = req.query
    if (!workspace_id) return res.status(400).json({ error: 'workspace_id is required' })
    const requester = await getWorkspaceRequester(workspace_id, req.user.id)
    if (!requester) return res.status(403).json({ error: 'Not a workspace member' })
    let rows = await taskRepository.findDeletedByWorkspace(workspace_id)
    if (project_id) rows = (rows || []).filter(t => String(t.project_id) === String(project_id))
    if (requester.role !== 'owner') {
      const assigned = await getMany(
        `SELECT pm.project_id FROM project_members pm JOIN projects p ON p.id = pm.project_id WHERE p.workspace_id = $1 AND pm.user_id = $2`,
        [workspace_id, req.user.id]
      )
      const allowed = new Set((assigned || []).map(r => String(r.project_id)))
      rows = (rows || []).filter(t => allowed.has(String(t.project_id)))
    }
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/archive/bugs', auth, async (req, res) => {
  try {
    const { workspace_id, project_id } = req.query
    if (!workspace_id) return res.status(400).json({ error: 'workspace_id is required' })
    const requester = await getWorkspaceRequester(workspace_id, req.user.id)
    if (!requester) return res.status(403).json({ error: 'Not a workspace member' })
    let rows = await bugRepository.findDeletedByWorkspace(workspace_id)
    if (project_id) rows = (rows || []).filter(b => String(b.project_id) === String(project_id))
    if (requester.role !== 'owner') {
      const assigned = await getMany(
        `SELECT pm.project_id FROM project_members pm JOIN projects p ON p.id = pm.project_id WHERE p.workspace_id = $1 AND pm.user_id = $2`,
        [workspace_id, req.user.id]
      )
      const allowed = new Set((assigned || []).map(r => String(r.project_id)))
      rows = (rows || []).filter(b => allowed.has(String(b.project_id)))
    }
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})


// Serve static built frontend in production
app.use(express.static(path.join(process.cwd(), 'dist')))
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist', 'index.html'))
})

const server = app.listen(PORT, '0.0.0.0', () => console.log(`Server listening on ${PORT}`))

// Graceful shutdown for Docker/systemd: stop accepting requests, then close the pool.
async function shutdown(signal) {
  console.log(`\n${signal} received — shutting down`)
  server.close(async () => {
    try {
      await closeDatabase()
      process.exit(0)
    } catch (err) {
      console.error('Shutdown error:', err)
      process.exit(1)
    }
  })
  // Force exit if open connections keep the process alive.
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
