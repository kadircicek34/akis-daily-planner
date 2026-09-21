import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export type AgentTask = {
  id: string
  title: string
  date: string | null
  start: string | null
  duration: number
  color: 'coral' | 'blue' | 'green' | 'purple' | 'amber'
  icon: string
  completed: boolean
  notes?: string
  priority?: 'low' | 'normal' | 'high'
  tags?: string[]
  updatedAt?: string
}

type StoreFile = { version: 1; tasks: AgentTask[] }
const filePath = process.env.AKIS_DATA_FILE || join(homedir(), '.akis', 'tasks.json')
let writeQueue: Promise<void> = Promise.resolve()

function normalizeTask(input: Partial<AgentTask> & Pick<AgentTask, 'title'>): AgentTask {
  return {
    id: input.id || randomUUID(), title: input.title.trim(), date: input.date ?? null,
    start: input.date ? (input.start ?? '09:00') : null,
    duration: Math.max(5, Math.min(1440, Number(input.duration) || 30)),
    color: input.color || 'coral', icon: input.icon || 'list', completed: Boolean(input.completed),
    notes: input.notes || '', priority: input.priority || 'normal',
    tags: Array.isArray(input.tags) ? input.tags.map(String).filter(Boolean).slice(0, 10) : [],
    updatedAt: input.updatedAt || new Date().toISOString(),
  }
}

export async function readTasks(): Promise<AgentTask[]> {
  try {
    const parsed = JSON.parse(await readFile(filePath, 'utf8')) as StoreFile
    return Array.isArray(parsed.tasks) ? parsed.tasks.map(task => normalizeTask(task)) : []
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

export async function writeTasks(tasks: AgentTask[]): Promise<AgentTask[]> {
  const normalized = tasks.filter(task => task?.title?.trim()).map(task => normalizeTask(task))
  writeQueue = writeQueue.then(async () => {
    await mkdir(dirname(filePath), { recursive: true })
    const temporary = `${filePath}.${process.pid}.tmp`
    await writeFile(temporary, JSON.stringify({ version: 1, tasks: normalized }, null, 2), 'utf8')
    await rename(temporary, filePath)
  })
  await writeQueue
  return normalized
}

export async function createTask(input: Partial<AgentTask> & Pick<AgentTask, 'title'>) {
  const tasks = await readTasks()
  const task = normalizeTask(input)
  await writeTasks([...tasks, task])
  return task
}

export async function updateTask(id: string, patch: Partial<AgentTask>) {
  const tasks = await readTasks()
  const index = tasks.findIndex(task => task.id === id)
  if (index === -1) throw new Error(`Görev bulunamadı: ${id}`)
  tasks[index] = normalizeTask({ ...tasks[index], ...patch, id, title: patch.title ?? tasks[index].title, updatedAt: new Date().toISOString() })
  await writeTasks(tasks)
  return tasks[index]
}

export async function deleteTask(id: string) {
  const tasks = await readTasks()
  const next = tasks.filter(task => task.id !== id)
  if (next.length === tasks.length) throw new Error(`Görev bulunamadı: ${id}`)
  await writeTasks(next)
}
