import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import path from 'path'

dotenv.config()
// .env.local overrides .env (mirrors Vite precedence); Node/dotenv does not load it by default.
dotenv.config({ path: '.env.local', override: true })

import { initializeDatabase, initializeSchema } from '../src/db/database.js'
import userRepository from '../src/db/repositories/user.repository.js'
import projectRepository from '../src/db/repositories/project.repository.js'
import workspaceRepository from '../src/db/repositories/workspace.repository.js'
import taskRepository from '../src/db/repositories/task.repository.js'
import milestoneRepository from '../src/db/repositories/milestone.repository.js'
import bugRepository from '../src/db/repositories/bug.repository.js'

const PORT = process.env.PORT || 4000
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret'

// Initialize DB
initializeDatabase()

// Apply idempotent schema (CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
initializeSchema().catch((err) => console.error('Schema init failed:', err.message))

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
app.use(express.json())

app.get('/api/health', async (req, res) => {
  res.json({ status: 'ok' })
})

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password, full_name } = req.body
    if(!email || !password || !username) return res.status(400).json({ error: 'Missing fields' })

    const existing = await userRepository.findByEmail(email)
    if(existing) return res.status(409).json({ error: 'User already exists' })

    const hash = await bcrypt.hash(password, 10)
    const user = await userRepository.create({ username, email, password_hash: hash, full_name })

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
    if (!name || !name.trim()) return res.status(400).json({ error: 'Workspace name is required' })

    const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'workspace'
    let slug = base
    let created = null

    for (let attempt = 0; attempt < 5 && !created; attempt++) {
      try {
        created = await workspaceRepository.create({ name: name.trim(), slug })
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

    const rows = await projectRepository.findByWorkspace(workspace_id)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/projects', auth, async (req, res) => {
  try {
    const { workspace_id, name, description, slug, status, start_date, deadline } = req.body
    if (!workspace_id || !name) return res.status(400).json({ error: 'Missing fields' })

    const baseSlug = slug || `${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-${Date.now().toString(36)}`
    let currentSlug = baseSlug || `project-${Date.now().toString(36)}`
    let created = null

    for (let attempt = 0; attempt < 5 && !created; attempt++) {
      try {
        created = await projectRepository.create({
          workspace_id,
          name,
          slug: currentSlug,
          description: description || null,
          status: status || 'active',
          start_date: start_date || null,
          deadline: deadline || null,
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

app.get('/api/tasks', auth, async (req, res) => {
  try {
    const { workspace_id } = req.query
    if (!workspace_id) return res.status(400).json({ error: 'workspace_id is required' })
    const rows = await taskRepository.findByWorkspace(workspace_id)
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

    const data = {}
    for (const field of TASK_ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) data[field] = req.body[field]
    }

    const created = await taskRepository.create({
      project_id,
      title: title.trim(),
      status: 'todo',
      ...data,
    })
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

    // Merge meta instead of overwriting so comments/checklist/files persist independently
    let toUpdate = data
    if (data.meta) {
      const existing = await taskRepository.findById(req.params.id)
      if (!existing) return res.status(404).json({ error: 'Task not found' })
      toUpdate = {
        ...data,
        meta: { ...(existing.meta || {}), ...data.meta },
      }
    }

    const updated = await taskRepository.updateById(req.params.id, toUpdate)
    if (!updated) return res.status(404).json({ error: 'Task not found' })
    res.json(updated)
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

app.listen(PORT, () => console.log(`Server listening on ${PORT}`))
