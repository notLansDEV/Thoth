/**
 * Starts both the Vite dev server and the Express API server
 * with one command (`npm run dev`). Zero dependencies.
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')

const LABEL_WIDTH = 7

function pipe(child, label) {
  const tag = `\x1b[36m[${label}]\x1b[0m`.padEnd(LABEL_WIDTH + 10)
  const forward = (chunk) => {
    for (const line of chunk.toString().split('\n')) {
      if (line.trim().length > 0) console.log(`${tag} ${line}`)
    }
  }
  child.stdout.on('data', forward)
  child.stderr.on('data', forward)
}

let children = []
let shuttingDown = false

function shutdown(code) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    if (!child.killed) child.kill()
  }
  setTimeout(() => process.exit(code), 200)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

const client = spawn(process.execPath, [viteBin], { cwd: root, env: process.env })
const server = spawn(
  process.execPath,
  [path.join(root, 'server', 'index.js')],
  { cwd: root, env: process.env }
)
children = [client, server]

pipe(client, 'client')
pipe(server, 'server')

for (const child of children) {
  child.on('exit', (code) => {
    const name = child === client ? 'Vite client' : 'API server'
    if (!shuttingDown) {
      console.log(`\n${name} exited (code ${code}). Shutting down.`)
    }
    shutdown(code ?? 0)
  })
}

console.log('\nThoth dev environment:')
console.log('  Frontend : http://localhost:5173')
console.log('  API      : http://localhost:4000/api/health')
console.log('  Press Ctrl+C to stop both.\n')
