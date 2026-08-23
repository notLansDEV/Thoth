import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import path from 'path'

dotenv.config()
// .env.local overrides .env (mirrors Vite precedence); Node/dotenv does not load it by default.
dotenv.config({ path: '.env.local', override: true })

import { initializeDatabase } from '../src/db/database.js'
import userRepository from '../src/db/repositories/user.repository.js'
import projectRepository from '../src/db/repositories/project.repository.js'

const PORT = process.env.PORT || 4000
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret'

// Initialize DB
initializeDatabase()

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
    const { workspace_id, name, description, slug } = req.body
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
          status: 'active',
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

// Serve static built frontend in production
app.use(express.static(path.join(process.cwd(), 'dist')))
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist', 'index.html'))
})

app.listen(PORT, () => console.log(`Server listening on ${PORT}`))
