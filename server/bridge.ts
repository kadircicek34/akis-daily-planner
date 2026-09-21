import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { createTask, deleteTask, readTasks, updateTask, writeTasks } from './store.js'

const host = '127.0.0.1'
const port = Number(process.env.AKIS_BRIDGE_PORT || 4318)
const apiKey = process.env.AKIS_API_KEY

function json(response: ServerResponse, status: number, payload: unknown, origin = 'null') {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': origin, 'vary': 'Origin', 'access-control-allow-private-network': 'true', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET,PUT,POST,PATCH,DELETE,OPTIONS' })
  response.end(status === 204 ? undefined : JSON.stringify(payload))
}

async function body(request: IncomingMessage) {
  let raw = ''
  for await (const chunk of request) {
    raw += chunk
    if (raw.length > 2_000_000) throw new Error('İstek gövdesi çok büyük.')
  }
  return raw ? JSON.parse(raw) : {}
}

const server = createServer(async (request, response) => {
  const origin = request.headers.origin
  const allowedOrigin = !origin || origin === 'https://takvim-app-chi.vercel.app' || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  if (!allowedOrigin) return json(response, 403, { error: 'Bu origin için erişim reddedildi.' })
  const corsOrigin = origin || 'null'
  if (request.method === 'OPTIONS') return json(response, 204, {}, corsOrigin)
  if (apiKey && request.headers.authorization !== `Bearer ${apiKey}`) return json(response, 401, { error: 'Yetkisiz istek.' }, corsOrigin)
  const url = new URL(request.url || '/', `http://${host}:${port}`)
  try {
    if (url.pathname === '/health' && request.method === 'GET') return json(response, 200, { ok: true, service: 'akis-agent-bridge', version: '1.1.0' }, corsOrigin)
    if (url.pathname === '/v1/tasks' && request.method === 'GET') return json(response, 200, { tasks: await readTasks() }, corsOrigin)
    if (url.pathname === '/v1/tasks' && request.method === 'PUT') return json(response, 200, { tasks: await writeTasks((await body(request)).tasks || []) }, corsOrigin)
    if (url.pathname === '/v1/tasks' && request.method === 'POST') return json(response, 201, { task: await createTask(await body(request)) }, corsOrigin)
    const match = url.pathname.match(/^\/v1\/tasks\/([^/]+)$/)
    if (match && request.method === 'PATCH') return json(response, 200, { task: await updateTask(decodeURIComponent(match[1]), await body(request)) }, corsOrigin)
    if (match && request.method === 'DELETE') { await deleteTask(decodeURIComponent(match[1])); return json(response, 200, { deleted: decodeURIComponent(match[1]) }, corsOrigin) }
    return json(response, 404, { error: 'Endpoint bulunamadı.' }, corsOrigin)
  } catch (error) {
    return json(response, 400, { error: error instanceof Error ? error.message : String(error) }, corsOrigin)
  }
})

server.listen(port, host, () => {
  console.error(`Akış Agent Bridge http://${host}:${port} üzerinde hazır.`)
  if (!apiKey) console.error('Yalnızca loopback erişimi açık; AKIS_API_KEY ayarlanmadı.')
})
