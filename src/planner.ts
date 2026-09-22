import type { Task } from './types'

const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export function createTaskSeries(task: Task): Task[] {
  if (!task.date || !task.repeat || task.repeat === 'none') return [task]
  const seriesId = task.seriesId || crypto.randomUUID()
  const first = new Date(`${task.date}T12:00:00`)
  const results: Task[] = []
  const cursor = new Date(first)
  const limit = new Date(first); limit.setFullYear(limit.getFullYear() + 1)
  while (cursor <= limit && results.length < 120) {
    results.push({ ...task, id: results.length ? crypto.randomUUID() : task.id, date: dateKey(cursor), seriesId })
    if (task.repeat === 'daily') cursor.setDate(cursor.getDate() + 1)
    if (task.repeat === 'weekly') cursor.setDate(cursor.getDate() + 7)
    if (task.repeat === 'monthly') {
      const wanted = first.getDate(); cursor.setDate(1); cursor.setMonth(cursor.getMonth() + 1)
      const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate(); cursor.setDate(Math.min(wanted, last))
    }
    if (task.repeat === 'yearly') cursor.setFullYear(cursor.getFullYear() + 1)
  }
  return results
}

function parseIcsDate(value: string) {
  const clean = value.trim()
  if (/^\d{8}$/.test(clean)) return { date: `${clean.slice(0,4)}-${clean.slice(4,6)}-${clean.slice(6,8)}`, time: null }
  const match = clean.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/)
  if (!match) return null
  return { date: `${match[1]}-${match[2]}-${match[3]}`, time: `${match[4]}:${match[5]}` }
}

export function importIcs(text: string): Task[] {
  const unfolded = text.replace(/\r?\n[ \t]/g, '')
  const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || []
  return blocks.flatMap(block => {
    const lines = block.split(/\r?\n/)
    const field = (name: string) => lines.find(line => line.startsWith(name))?.split(':').slice(1).join(':').replace(/\\n/g, '\n').replace(/\\,/g, ',')
    const start = field('DTSTART'); if (!start) return []
    const parsed = parseIcsDate(start); if (!parsed) return []
    const end = field('DTEND'); const parsedEnd = end ? parseIcsDate(end) : null
    let duration = 30
    if (parsed.time && parsedEnd?.time) {
      const [sh, sm] = parsed.time.split(':').map(Number); const [eh, em] = parsedEnd.time.split(':').map(Number)
      duration = Math.max(5, (eh * 60 + em) - (sh * 60 + sm))
    }
    return [{
      id: crypto.randomUUID(), title: field('SUMMARY') || 'Takvim etkinliği', date: parsed.date, start: parsed.time,
      allDay: !parsed.time, duration, color: 'blue' as const, icon: 'calendar', completed: false,
      notes: field('DESCRIPTION') || '', priority: 'normal' as const, tags: ['takvim'], source: 'calendar' as const,
      repeat: 'none' as const, reminderMinutes: null, notificationSound: 'soft' as const, energy: 0 as const,
      subtasks: [], updatedAt: new Date().toISOString(),
    }]
  })
}

export function energyPoints(task: Task) {
  const level = task.energy || 0
  if (!level) return 0
  return Math.round(level * Math.max(1, task.duration / 30))
}
