import { McpServer } from '@modelcontextprotocol/server'
import { serveStdio } from '@modelcontextprotocol/server/stdio'
import * as z from 'zod/v4'
import { createTask, deleteTask, readTasks, updateTask } from './store.js'

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional()
const taskFields = {
  date, start: time,
  duration: z.number().int().min(5).max(1440).optional(), notes: z.string().max(4000).optional(),
  completed: z.boolean().optional(), priority: z.enum(['low', 'normal', 'high']).optional(),
  tags: z.array(z.string().min(1).max(40)).max(10).optional(),
}
const taskPatch = { title: z.string().min(1).max(160).optional(), ...taskFields }

function result(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }], structuredContent: { result: value } }
}

export function createAkisServer() {
  const server = new McpServer(
    { name: 'akis-daily-planner', version: '1.1.0', websiteUrl: 'https://takvim-app-chi.vercel.app' },
    { instructions: 'Akış kullanıcısının görevlerini yönet. Tarihleri YYYY-MM-DD, saatleri HH:mm biçiminde kullan. Silme işleminden önce kullanıcıdan onay al.' },
  )

  server.registerTool('list_tasks', {
    description: 'Görevleri tarih, durum veya metin sorgusuna göre listeler.',
    inputSchema: z.object({ date, completed: z.boolean().optional(), query: z.string().optional() }),
    annotations: { readOnlyHint: true },
  }, async ({ date: selectedDate, completed, query }) => {
    const needle = query?.toLocaleLowerCase('tr')
    return result((await readTasks()).filter(task =>
      (selectedDate === undefined || task.date === selectedDate) &&
      (completed === undefined || task.completed === completed) &&
      (!needle || `${task.title} ${task.notes || ''} ${(task.tags || []).join(' ')}`.toLocaleLowerCase('tr').includes(needle)),
    ))
  })

  server.registerTool('get_daily_plan', {
    description: 'Belirli bir günün görevlerini başlangıç saatine göre sıralı döndürür.',
    inputSchema: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
    annotations: { readOnlyHint: true },
  }, async ({ date: selectedDate }) => result((await readTasks()).filter(task => task.date === selectedDate).sort((a, b) => (a.start || '').localeCompare(b.start || ''))))

  server.registerTool('create_task', {
    description: 'Yeni bir görev oluşturur. Tarih verilmezse gelen kutusuna ekler.',
    inputSchema: z.object({ title: z.string().min(1).max(160), ...taskFields }),
    annotations: { destructiveHint: false, idempotentHint: false },
  }, async input => result(await createTask(input)))

  server.registerTool('update_task', {
    description: 'Kimliği verilen görevin alanlarını günceller.',
    inputSchema: z.object({ id: z.string().min(1), ...taskPatch }),
    annotations: { destructiveHint: false, idempotentHint: true },
  }, async ({ id, ...patch }) => result(await updateTask(id, patch)))

  server.registerTool('complete_task', {
    description: 'Görevi tamamlandı veya tamamlanmadı olarak işaretler.',
    inputSchema: z.object({ id: z.string().min(1), completed: z.boolean().default(true) }),
    annotations: { destructiveHint: false, idempotentHint: true },
  }, async ({ id, completed }) => result(await updateTask(id, { completed })))

  server.registerTool('delete_task', {
    description: 'Kimliği verilen görevi kalıcı olarak siler.',
    inputSchema: z.object({ id: z.string().min(1) }),
    annotations: { destructiveHint: true, idempotentHint: true },
  }, async ({ id }) => { await deleteTask(id); return result({ deleted: id }) })

  return server
}

if (import.meta.url === `file://${process.argv[1]}`) {
  serveStdio(createAkisServer, { onerror: error => console.error(error) })
  console.error('Akış MCP sunucusu stdio üzerinde hazır.')
}
