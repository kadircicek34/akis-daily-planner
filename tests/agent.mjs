import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'

function assert(condition, message) {
  if (!condition) throw new Error(message)
  process.stdout.write(`✓ ${message}\n`)
}

async function waitForBridge() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { if ((await fetch('http://127.0.0.1:4318/health')).ok) return } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error('Agent Bridge başlatılamadı.')
}

const directory = await mkdtemp(join(tmpdir(), 'akis-agent-test-'))
const dataFile = join(directory, 'tasks.json')
const env = { ...process.env, AKIS_DATA_FILE: dataFile }
let bridge
let client

try {
  const transport = new StdioClientTransport({ command: process.execPath, args: ['--import', 'tsx', 'server/mcp.ts'], cwd: process.cwd(), env, stderr: 'pipe' })
  client = new Client({ name: 'akis-test-client', version: '1.0.0' })
  await client.connect(transport)
  const tools = await client.listTools()
  assert(tools.tools.length === 6, 'MCP altı görev aracını yayımlıyor')
  const created = await client.callTool({ name: 'create_task', arguments: { title: 'Agent görevi', date: '2026-09-22', start: '10:00', duration: 45, priority: 'high' } })
  assert(!created.isError, 'MCP görevi oluşturuyor')
  const listed = await client.callTool({ name: 'list_tasks', arguments: { date: '2026-09-22' } })
  assert(JSON.stringify(listed).includes('Agent görevi'), 'MCP günlük görevleri okuyabiliyor')

  bridge = spawn(process.execPath, ['--import', 'tsx', 'server/bridge.ts'], { cwd: process.cwd(), env, stdio: 'ignore' })
  await waitForBridge()
  const response = await fetch('http://127.0.0.1:4318/v1/tasks')
  const payload = await response.json()
  assert(response.ok && payload.tasks.length === 1, 'REST köprüsü MCP veri dosyasını okuyor')
  const added = await fetch('http://127.0.0.1:4318/v1/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'REST görevi' }) })
  assert(added.status === 201, 'REST köprüsü görev oluşturuyor')
  const denied = await fetch('http://127.0.0.1:4318/v1/tasks', { headers: { origin: 'https://example.com' } })
  assert(denied.status === 403, 'REST köprüsü izinsiz web originlerini reddediyor')
} finally {
  if (client) await client.close()
  if (bridge) bridge.kill('SIGTERM')
  await rm(directory, { recursive: true, force: true })
}
