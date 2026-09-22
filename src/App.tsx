import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlarmClock, Archive, BookOpen, CalendarDays, Check, ChevronDown, ChevronLeft,
  ChevronRight, Circle, CloudCog, Coffee, Copy, Download, Focus, Inbox, LayoutGrid,
  ListChecks, Menu, Moon, Pause, Play, Plus, RefreshCw, Search, Settings, Shirt,
  ShoppingCart, Smartphone, Sparkles, Sun, Trash2, Upload, Utensils, Volume2, X,
} from 'lucide-react'
import { seedTasks, todayKey } from './data'
import { createTaskSeries, energyPoints, importIcs } from './planner'
import { playNotificationSound, reminderTimestamp, requestNotificationPermission, showTaskNotification } from './notifications'
import type { NotificationSound, Task, TaskColor } from './types'

const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const weekdays = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
const icons = { alarm: AlarmClock, list: ListChecks, coffee: Coffee, focus: Focus, utensils: Utensils, shirt: Shirt, book: BookOpen, cart: ShoppingCart }
const colors: TaskColor[] = ['coral', 'blue', 'green', 'purple', 'amber']

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function fromKey(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function addDays(key: string, amount: number) {
  const date = fromKey(key)
  date.setDate(date.getDate() + amount)
  return localDateKey(date)
}
function minuteValue(time: string | null) {
  if (!time) return 0
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}
function timeAfter(time: string, duration: number) {
  const total = minuteValue(time) + duration
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
function durationText(value: number) {
  if (value < 60) return `${value} dk`
  const hours = Math.floor(value / 60)
  const mins = value % 60
  return mins ? `${hours} sa ${mins} dk` : `${hours} sa`
}
function stamp<T extends Task>(task: T): T { return { ...task, updatedAt: new Date().toISOString() } }

const blankTask = (date: string): Omit<Task, 'id' | 'completed'> => ({
  title: '', date, start: '09:00', duration: 30, color: 'coral', icon: 'list', notes: '', priority: 'normal', tags: [], updatedAt: new Date().toISOString(),
  allDay: false, subtasks: [], reminderMinutes: null, notificationSound: 'soft', repeat: 'none', energy: 0, source: 'local',
})

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try { return JSON.parse(localStorage.getItem('akis-tasks') || 'null') || seedTasks() } catch { return seedTasks() }
  })
  const [selectedDate, setSelectedDate] = useState(todayKey())
  const [editing, setEditing] = useState<Task | null | 'new'>(null)
  const [draft, setDraft] = useState(blankTask(todayKey()))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileInbox, setMobileInbox] = useState(false)
  const [dark, setDark] = useState(() => localStorage.getItem('akis-theme') === 'dark')
  const [mondayFirst, setMondayFirst] = useState(() => localStorage.getItem('akis-week-start') === 'monday')
  const [inboxTitle, setInboxTitle] = useState('')
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [bridgeUrl, setBridgeUrl] = useState(() => localStorage.getItem('akis-bridge-url') || 'http://127.0.0.1:4318')
  const [bridgeKey, setBridgeKey] = useState(() => localStorage.getItem('akis-bridge-key') || '')
  const [bridgeStatus, setBridgeStatus] = useState<'idle' | 'syncing' | 'ok' | 'error' | 'permission'>('idle')
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>(() => (localStorage.getItem('akis-view') as 'day' | 'week' | 'month') || 'day')
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem('akis-notifications') === 'on')
  const [defaultSound, setDefaultSound] = useState<NotificationSound>(() => (localStorage.getItem('akis-sound') as NotificationSound) || 'soft')
  const [energyEnabled, setEnergyEnabled] = useState(() => localStorage.getItem('akis-energy') === 'on')
  const [energyLimit, setEnergyLimit] = useState(() => Number(localStorage.getItem('akis-energy-limit') || 25))
  const [aiEnabled, setAiEnabled] = useState(() => localStorage.getItem('akis-ai') === 'on')
  const [focusTask, setFocusTask] = useState<Task | null>(null)

  useEffect(() => { localStorage.setItem('akis-tasks', JSON.stringify(tasks)) }, [tasks])
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem('akis-theme', dark ? 'dark' : 'light')
  }, [dark])
  useEffect(() => { localStorage.setItem('akis-week-start', mondayFirst ? 'monday' : 'sunday') }, [mondayFirst])
  useEffect(() => { localStorage.setItem('akis-view', viewMode) }, [viewMode])
  useEffect(() => { localStorage.setItem('akis-notifications', notificationsEnabled ? 'on' : 'off') }, [notificationsEnabled])
  useEffect(() => { localStorage.setItem('akis-sound', defaultSound) }, [defaultSound])
  useEffect(() => { localStorage.setItem('akis-energy', energyEnabled ? 'on' : 'off'); localStorage.setItem('akis-energy-limit', String(energyLimit)) }, [energyEnabled, energyLimit])
  useEffect(() => { localStorage.setItem('akis-ai', aiEnabled ? 'on' : 'off') }, [aiEnabled])
  useEffect(() => {
    const capture = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent) }
    window.addEventListener('beforeinstallprompt', capture)
    return () => window.removeEventListener('beforeinstallprompt', capture)
  }, [])
  useEffect(() => {
    if (!notificationsEnabled || !('Notification' in window) || Notification.permission !== 'granted') return
    const timers: number[] = []
    const now = Date.now()
    for (const task of tasks) {
      if (task.completed) continue
      const due = reminderTimestamp(task); if (!due || due <= now || due - now > 86_400_000) continue
      const notifiedKey = `akis-notified-${task.id}-${due}`
      if (localStorage.getItem(notifiedKey)) continue
      timers.push(window.setTimeout(() => {
        localStorage.setItem(notifiedKey, '1'); void showTaskNotification(task)
      }, due - now))
    }
    return () => timers.forEach(clearTimeout)
  }, [tasks, notificationsEnabled])

  const selected = fromKey(selectedDate)
  const week = useMemo(() => {
    const start = fromKey(selectedDate)
    const offset = mondayFirst ? (start.getDay() + 6) % 7 : start.getDay()
    start.setDate(start.getDate() - offset)
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start); day.setDate(start.getDate() + index); return day
    })
  }, [selectedDate, mondayFirst])
  const dayTasks = tasks.filter(task => task.date === selectedDate && !task.allDay).sort((a, b) => minuteValue(a.start) - minuteValue(b.start))
  const allDayTasks = tasks.filter(task => task.date === selectedDate && task.allDay)
  const inboxTasks = tasks.filter(task => task.date === null)

  function openNew(inbox = false) {
    setDraft({ ...blankTask(selectedDate), date: inbox ? null : selectedDate, start: inbox ? null : '09:00' })
    setEditing('new')
  }
  function openEdit(task: Task) {
    setDraft({ title: task.title, date: task.date, start: task.start, duration: task.duration, color: task.color, icon: task.icon, notes: task.notes || '', priority: task.priority || 'normal', tags: task.tags || [], updatedAt: task.updatedAt, allDay: task.allDay || false, subtasks: task.subtasks || [], reminderMinutes: task.reminderMinutes ?? null, notificationSound: task.notificationSound || defaultSound, repeat: task.repeat || 'none', seriesId: task.seriesId, energy: task.energy || 0, source: task.source || 'local' })
    setEditing(task)
  }
  function saveTask(event: React.FormEvent) {
    event.preventDefault()
    if (!draft.title.trim()) return
    const updatedAt = new Date().toISOString()
    if (editing === 'new') {
      const base = { ...draft, id: crypto.randomUUID(), title: draft.title.trim(), completed: false, updatedAt } as Task
      setTasks(current => [...current, ...createTaskSeries(base)])
    }
    else if (editing) setTasks(current => current.map(task => task.id === editing.id ? { ...task, ...draft, title: draft.title.trim(), updatedAt } : task))
    setEditing(null)
  }
  function quickInbox(event: React.FormEvent) {
    event.preventDefault()
    if (!inboxTitle.trim()) return
    setTasks(current => [...current, { ...blankTask(selectedDate), id: crypto.randomUUID(), title: inboxTitle.trim(), date: null, start: null, completed: false }])
    setInboxTitle('')
  }
  function schedule(task: Task) {
    const last = dayTasks[dayTasks.length - 1]
    const next = last?.start ? timeAfter(last.start, last.duration) : '09:00'
    setTasks(current => current.map(item => item.id === task.id ? stamp({ ...item, date: selectedDate, start: next, allDay: false }) : item))
    setMobileInbox(false)
  }
  function toggleComplete(id: string) { setTasks(current => current.map(task => task.id === id ? stamp({ ...task, completed: !task.completed }) : task)) }
  function removeTask() {
    if (editing && editing !== 'new' && window.confirm(`“${editing.title}” silinsin mi?`)) setTasks(current => current.filter(task => task.id !== editing.id))
    setEditing(null)
  }
  function duplicateTask(task: Task) {
    setTasks(current => [...current, stamp({ ...task, id: crypto.randomUUID(), title: `${task.title} (Kopya)`, seriesId: undefined, repeat: 'none', completed: false })])
    setEditing(null)
  }
  function duplicateDay() {
    const tomorrow = addDays(selectedDate, 1)
    const copies = tasks.filter(task => task.date === selectedDate).map(task => stamp({ ...task, id: crypto.randomUUID(), date: tomorrow, completed: false, seriesId: undefined, repeat: 'none' as const, subtasks: (task.subtasks || []).map(subtask => ({ ...subtask, id: crypto.randomUUID(), completed: false })) }))
    setTasks(current => [...current, ...copies]); setSelectedDate(tomorrow)
  }
  function replanIncomplete() {
    const tomorrow = addDays(selectedDate, 1)
    setTasks(current => current.map(task => task.date === selectedDate && !task.completed ? stamp({ ...task, date: tomorrow }) : task))
    setSelectedDate(tomorrow)
  }
  async function importCalendar(file: File) {
    try {
      const imported = importIcs(await file.text())
      if (!imported.length) throw new Error('Takvim dosyasında etkinlik bulunamadı.')
      setTasks(current => [...current, ...imported]); window.alert(`${imported.length} takvim etkinliği içe aktarıldı.`)
    } catch (error) { window.alert(error instanceof Error ? error.message : 'Takvim içe aktarılamadı.') }
  }
  async function enableNotifications() {
    if (notificationsEnabled) { setNotificationsEnabled(false); return }
    const permission = await requestNotificationPermission()
    setNotificationsEnabled(permission === 'granted')
    if (permission === 'granted') playNotificationSound(defaultSound)
  }
  function moveTask(taskId: string, date: string | null) {
    setTasks(current => current.map(task => task.id === taskId ? stamp({ ...task, date, start: date ? (task.start || '09:00') : null, allDay: date ? task.allDay : false }) : task))
  }
  function exportData() {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), tasks }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob); const link = document.createElement('a')
    link.href = url; link.download = `akis-yedek-${todayKey()}.json`; link.click(); URL.revokeObjectURL(url)
  }
  async function importData(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as { tasks?: Task[] }
      if (!Array.isArray(parsed.tasks)) throw new Error('Geçerli bir Akış yedeği değil.')
      const valid = parsed.tasks.filter(task => task && typeof task.id === 'string' && typeof task.title === 'string')
      if (!valid.length && parsed.tasks.length) throw new Error('Yedekte geçerli görev bulunamadı.')
      setTasks(valid.map(task => stamp({ ...task, priority: task.priority || 'normal', tags: task.tags || [] })))
    } catch (error) { window.alert(error instanceof Error ? error.message : 'Yedek okunamadı.') }
  }
  async function installApp() {
    if (!installPrompt) return
    await installPrompt.prompt(); await installPrompt.userChoice; setInstallPrompt(null)
  }
  async function syncBridge() {
    setBridgeStatus('syncing')
    const base = bridgeUrl.replace(/\/$/, '')
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (bridgeKey) headers.authorization = `Bearer ${bridgeKey}`
    try {
      const response = await fetch(`${base}/v1/tasks`, { headers })
      if (!response.ok) throw new Error(`Köprü ${response.status} hatası verdi.`)
      const remote = (await response.json()).tasks as Task[]
      const merged = new Map<string, Task>()
      for (const task of [...tasks, ...remote]) {
        const previous = merged.get(task.id)
        if (!previous || (task.updatedAt || '') >= (previous.updatedAt || '')) merged.set(task.id, task)
      }
      const next = [...merged.values()]
      const saved = await fetch(`${base}/v1/tasks`, { method: 'PUT', headers, body: JSON.stringify({ tasks: next }) })
      if (!saved.ok) throw new Error(`Köprü ${saved.status} hatası verdi.`)
      setTasks(next); setBridgeStatus('ok')
      localStorage.setItem('akis-bridge-url', base); localStorage.setItem('akis-bridge-key', bridgeKey)
    } catch {
      const localFromWeb = location.protocol === 'https:' && /^http:\/\/(127\.0\.0\.1|localhost)/.test(base)
      setBridgeStatus(localFromWeb ? 'permission' : 'error')
    }
  }

  return <div className="app-shell">
    <aside className={`inbox-panel ${mobileInbox ? 'mobile-open' : ''}`}>
      <div className="inbox-top">
        <div className="section-title"><Inbox size={23} strokeWidth={2.4} /><h2>Gelen Kutusu</h2><span>{inboxTasks.length}</span></div>
        <button className="icon-btn mobile-close" aria-label="Kapat" onClick={() => setMobileInbox(false)}><X /></button>
        <form className="quick-add" onSubmit={quickInbox}><input value={inboxTitle} onChange={e => setInboxTitle(e.target.value)} placeholder="Yeni görev ekle..." aria-label="Gelen kutusuna görev ekle" /><button aria-label="Ekle"><Plus /></button></form>
      </div>
      <div className="inbox-list" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); moveTask(event.dataTransfer.getData('text/task-id'), null) }}>{inboxTasks.length === 0 ? <div className="empty-inbox"><Archive /><strong>Gelen kutun boş</strong><p>Aklına gelenleri buraya ekle.</p></div> : inboxTasks.map(task => <InboxCard key={task.id} task={task} onOpen={() => openEdit(task)} onSchedule={() => schedule(task)} />)}</div>
    </aside>

    <main className="planner">
      <header className="planner-header">
        <div className="month-group"><button className="mobile-menu" onClick={() => setMobileInbox(true)} aria-label="Gelen kutusunu aç"><Menu /></button><label className="month-title"><h1>{months[selected.getMonth()]} <em>{selected.getFullYear()}</em></h1><ChevronDown size={22} /><input className="header-date-input" type="date" value={selectedDate} onChange={e => e.target.value && setSelectedDate(e.target.value)} aria-label="Tarih seç" /></label></div>
        <div className="header-actions">
          <div className="view-switch"><button className={viewMode === 'day' ? 'active' : ''} onClick={() => setViewMode('day')}>Gün</button><button className={viewMode === 'week' ? 'active' : ''} onClick={() => setViewMode('week')}>Hafta</button><button className={viewMode === 'month' ? 'active' : ''} onClick={() => setViewMode('month')}>Ay</button></div>
          <button className="settings-btn" aria-label="Görevlerde ara" onClick={() => setSearchOpen(true)}><Search /></button>
          <div className="today-control"><button aria-label="Önceki gün" onClick={() => setSelectedDate(addDays(selectedDate, -1))}><ChevronLeft /></button><button onClick={() => setSelectedDate(todayKey())}>Bugün</button><button aria-label="Sonraki gün" onClick={() => setSelectedDate(addDays(selectedDate, 1))}><ChevronRight /></button></div>
          <button className="settings-btn" aria-label="Ayarlar" onClick={() => setSettingsOpen(true)}><Settings /></button>
        </div>
      </header>

      <nav className="week-strip" aria-label="Haftalık takvim">{week.map(day => {
        const key = localDateKey(day); const count = tasks.filter(task => task.date === key).length; const active = key === selectedDate
        return <button key={key} className={active ? 'active' : ''} onClick={() => setSelectedDate(key)} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); moveTask(event.dataTransfer.getData('text/task-id'), key) }}><span>{weekdays[day.getDay()]}</span><strong>{day.getDate()}</strong><i>{count ? Array.from({ length: Math.min(count, 3) }, (_, i) => <b key={i} />) : <b className="muted" />}</i></button>
      })}</nav>

      <section className="timeline-wrap">
        <div className="day-heading"><div><span>{weekdays[selected.getDay()]}</span><h2>{selected.getDate()} {months[selected.getMonth()]}</h2></div><div className="day-tools"><button onClick={duplicateDay}><Copy /> Günü kopyala</button><button onClick={replanIncomplete}><RefreshCw /> Yeniden planla</button><p>{dayTasks.filter(t => t.completed).length}/{dayTasks.length} tamamlandı</p></div></div>
        {energyEnabled && <EnergyBar tasks={[...allDayTasks, ...dayTasks]} limit={energyLimit} />}
        {viewMode === 'day' && <>{allDayTasks.length > 0 && <div className="all-day-section"><span>Tüm gün</span><div>{allDayTasks.map(task => <button key={task.id} className={task.color} onClick={() => openEdit(task)}>{task.title}</button>)}</div></div>}{dayTasks.length === 0 && allDayTasks.length === 0 ? <EmptyDay onAdd={() => openNew()} /> : <div className="timeline">{dayTasks.map((task, index) => <TimelineTask key={task.id} task={task} first={index === 0} last={index === dayTasks.length - 1} onOpen={() => openEdit(task)} onToggle={() => toggleComplete(task.id)} onFocus={() => setFocusTask(task)} />)}</div>}</>}
        {viewMode === 'week' && <WeeklyView week={week} tasks={tasks} onOpen={openEdit} onSelect={date => { setSelectedDate(date); setViewMode('day') }} onMove={moveTask} />}
        {viewMode === 'month' && <MonthlyView selected={selected} tasks={tasks} onSelect={date => { setSelectedDate(date); setViewMode('day') }} onMove={moveTask} />}
      </section>
      <button className="floating-add" onClick={() => openNew()} aria-label="Yeni görev"><Plus /></button>
    </main>

    <nav className="mobile-nav"><button onClick={() => setMobileInbox(true)}><Inbox /><span>Gelen kutusu</span></button><button className="nav-add" onClick={() => openNew()}><Plus /></button><button onClick={() => setSearchOpen(true)}><Search /><span>Ara</span></button><button onClick={() => setSettingsOpen(true)}><Settings /><span>Ayarlar</span></button></nav>

    {editing && <TaskModal draft={draft} setDraft={setDraft} editing={editing} aiEnabled={aiEnabled} bridgeUrl={bridgeUrl} bridgeKey={bridgeKey} onClose={() => setEditing(null)} onSave={saveTask} onDelete={removeTask} onDuplicate={() => editing !== 'new' && duplicateTask(editing)} onFocus={() => editing !== 'new' && setFocusTask(editing)} />}
    {searchOpen && <SearchModal tasks={tasks} onClose={() => setSearchOpen(false)} onOpen={task => { setSearchOpen(false); openEdit(task) }} />}
    {focusTask && <FocusModal task={focusTask} onClose={() => setFocusTask(null)} onComplete={() => { toggleComplete(focusTask.id); setFocusTask(null) }} />}
    {settingsOpen && <SettingsModal dark={dark} setDark={setDark} mondayFirst={mondayFirst} setMondayFirst={setMondayFirst} onClose={() => setSettingsOpen(false)} reset={() => setTasks(seedTasks())} exportData={exportData} importData={importData} importCalendar={importCalendar} canInstall={Boolean(installPrompt)} installApp={installApp} bridgeUrl={bridgeUrl} setBridgeUrl={setBridgeUrl} bridgeKey={bridgeKey} setBridgeKey={setBridgeKey} bridgeStatus={bridgeStatus} syncBridge={syncBridge} notificationsEnabled={notificationsEnabled} enableNotifications={enableNotifications} defaultSound={defaultSound} setDefaultSound={setDefaultSound} energyEnabled={energyEnabled} setEnergyEnabled={setEnergyEnabled} energyLimit={energyLimit} setEnergyLimit={setEnergyLimit} aiEnabled={aiEnabled} setAiEnabled={setAiEnabled} />}
  </div>
}

function InboxCard({ task, onOpen, onSchedule }: { task: Task; onOpen: () => void; onSchedule: () => void }) {
  const Icon = icons[task.icon as keyof typeof icons] || ListChecks
  return <article className="inbox-card" draggable onDragStart={event => event.dataTransfer.setData('text/task-id', task.id)} onClick={onOpen}><div className={`mini-icon ${task.color}`}><Icon /></div><div><small>{durationText(task.duration)}{task.priority === 'high' ? ' · Öncelikli' : ''}</small><h3>{task.title}</h3></div><button aria-label="Bugüne planla" onClick={event => { event.stopPropagation(); onSchedule() }}><Plus /></button></article>
}

function TimelineTask({ task, first, last, onOpen, onToggle, onFocus }: { task: Task; first: boolean; last: boolean; onOpen: () => void; onToggle: () => void; onFocus: () => void }) {
  const Icon = icons[task.icon as keyof typeof icons] || ListChecks
  const completedSubs = task.subtasks?.filter(item => item.completed).length || 0
  return <article draggable onDragStart={event => event.dataTransfer.setData('text/task-id', task.id)} className={`timeline-item ${task.completed ? 'completed' : ''}`}><div className="time-column"><time>{task.start}</time><time>{task.start ? timeAfter(task.start, task.duration) : ''}</time></div><div className={`track ${first ? 'first' : ''} ${last ? 'last' : ''}`}><button className={`task-bubble ${task.color}`} onClick={onFocus} aria-label={`${task.title} odak modunu başlat`}><Icon /></button></div><button className="task-copy" onClick={onOpen}><small>{task.start} – {task.start && timeAfter(task.start, task.duration)} · {durationText(task.duration)}{task.priority === 'high' ? ' · Yüksek öncelik' : ''}{task.subtasks?.length ? ` · ${completedSubs}/${task.subtasks.length} alt görev` : ''}</small><strong>{task.title}</strong>{task.notes && <span>{task.notes}</span>}{Boolean(task.tags?.length) && <span className="task-tags">{task.tags?.map(tag => `#${tag}`).join(' ')}</span>}</button><button className={`complete-btn ${task.color}`} onClick={onToggle} aria-label={task.completed ? 'Tamamlanmadı olarak işaretle' : 'Tamamla'}>{task.completed ? <Check /> : <Circle />}</button></article>
}

function WeeklyView({ week, tasks, onOpen, onSelect, onMove }: { week: Date[]; tasks: Task[]; onOpen: (task: Task) => void; onSelect: (date: string) => void; onMove: (id: string, date: string) => void }) {
  return <div className="weekly-grid">{week.map(day => {
    const key = localDateKey(day); const items = tasks.filter(task => task.date === key).sort((a,b) => minuteValue(a.start) - minuteValue(b.start))
    return <section key={key} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); onMove(event.dataTransfer.getData('text/task-id'), key) }}><button className="weekly-date" onClick={() => onSelect(key)}><span>{weekdays[day.getDay()]}</span><strong>{day.getDate()}</strong></button><div>{items.map(task => <button draggable onDragStart={event => event.dataTransfer.setData('text/task-id', task.id)} key={task.id} className={`week-task ${task.color}`} onClick={() => onOpen(task)}><small>{task.allDay ? 'Tüm gün' : task.start}</small><strong>{task.title}</strong></button>)}</div></section>
  })}</div>
}

function MonthlyView({ selected, tasks, onSelect, onMove }: { selected: Date; tasks: Task[]; onSelect: (date: string) => void; onMove: (id: string, date: string) => void }) {
  const first = new Date(selected.getFullYear(), selected.getMonth(), 1); first.setDate(first.getDate() - first.getDay())
  const days = Array.from({ length: 42 }, (_, index) => { const day = new Date(first); day.setDate(first.getDate() + index); return day })
  return <div className="month-view"><div className="month-weekdays">{weekdays.map(day => <span key={day}>{day}</span>)}</div><div className="month-grid">{days.map(day => {
    const key = localDateKey(day); const items = tasks.filter(task => task.date === key); const outside = day.getMonth() !== selected.getMonth()
    return <button key={key} className={`${outside ? 'outside' : ''} ${key === todayKey() ? 'today' : ''}`} onClick={() => onSelect(key)} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); onMove(event.dataTransfer.getData('text/task-id'), key) }}><strong>{day.getDate()}</strong><div>{items.slice(0,3).map(task => <i key={task.id} className={task.color}>{task.title}</i>)}{items.length > 3 && <small>+{items.length - 3}</small>}</div></button>
  })}</div></div>
}

function EnergyBar({ tasks, limit }: { tasks: Task[]; limit: number }) {
  const used = tasks.reduce((sum, task) => sum + energyPoints(task), 0); const percentage = Math.min(100, Math.max(0, (used / limit) * 100))
  return <div className={`energy-bar ${used > limit ? 'over' : ''}`}><div><span>Günlük enerji</span><strong>{used} / {limit}</strong></div><i><b style={{ width: `${percentage}%` }} /></i></div>
}

function FocusModal({ task, onClose, onComplete }: { task: Task; onClose: () => void; onComplete: () => void }) {
  const [seconds, setSeconds] = useState(task.duration * 60)
  const [running, setRunning] = useState(true)
  useEffect(() => {
    if (!running || seconds <= 0) return
    const timer = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000)
    return () => clearInterval(timer)
  }, [running, seconds])
  useEffect(() => { if (seconds === 0) { setRunning(false); playNotificationSound(task.notificationSound || 'bright') } }, [seconds, task.notificationSound])
  const progress = 1 - seconds / (task.duration * 60)
  return <div className="modal-backdrop focus-backdrop"><section className={`modal focus-modal ${task.color}`}><button className="focus-close" onClick={onClose}><X /></button><span>Odak modu</span><h2>{task.title}</h2><div className="focus-ring" style={{ '--progress': `${progress * 360}deg` } as React.CSSProperties}><div><strong>{String(Math.floor(seconds / 60)).padStart(2,'0')}:{String(seconds % 60).padStart(2,'0')}</strong><small>{running ? 'Odaklan' : seconds === 0 ? 'Tamamlandı' : 'Duraklatıldı'}</small></div></div><div className="focus-actions"><button onClick={() => setRunning(!running)}>{running ? <Pause /> : <Play />}{running ? 'Duraklat' : 'Devam et'}</button><button onClick={onComplete}><Check /> Tamamla</button></div></section></div>
}

function EmptyDay({ onAdd }: { onAdd: () => void }) { return <div className="empty-day"><div><Sparkles /></div><h3>Bugün tertemiz</h3><p>Gününü şekillendirmek için ilk görevini ekle.</p><button onClick={onAdd}><Plus /> Görev ekle</button></div> }

type Draft = Omit<Task, 'id' | 'completed'>
function TaskModal({ draft, setDraft, editing, aiEnabled, bridgeUrl, bridgeKey, onClose, onSave, onDelete, onDuplicate, onFocus }: { draft: Draft; setDraft: React.Dispatch<React.SetStateAction<Draft>>; editing: Task | 'new'; aiEnabled: boolean; bridgeUrl: string; bridgeKey: string; onClose: () => void; onSave: (e: React.FormEvent) => void; onDelete: () => void; onDuplicate: () => void; onFocus: () => void }) {
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  function addSubtask() { if (!subtaskTitle.trim()) return; setDraft({ ...draft, subtasks: [...(draft.subtasks || []), { id: crypto.randomUUID(), title: subtaskTitle.trim(), completed: false }] }); setSubtaskTitle('') }
  async function suggestSubtasks() {
    setAiLoading(true)
    try {
      const headers: Record<string,string> = { 'content-type':'application/json' }; if (bridgeKey) headers.authorization = `Bearer ${bridgeKey}`
      const response = await fetch(`${bridgeUrl.replace(/\/$/,'')}/v1/ai/subtasks`, { method:'POST', headers, body:JSON.stringify({ title:draft.title, notes:draft.notes }) })
      if (!response.ok) throw new Error()
      const payload = await response.json() as { subtasks: string[] }
      setDraft({ ...draft, subtasks: [...(draft.subtasks || []), ...payload.subtasks.map(title => ({ id:crypto.randomUUID(), title, completed:false }))] })
    } catch { window.alert('AI önerisi alınamadı. Agent Bridge AI ayarlarını kontrol et.') } finally { setAiLoading(false) }
  }
  return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><form className="modal task-modal" onSubmit={onSave}>
    <div className="modal-head"><h2>{editing === 'new' ? 'Yeni görev' : 'Görevi düzenle'}</h2><button type="button" aria-label="Kapat" className="icon-btn" onClick={onClose}><X /></button></div>
    <label className="field"><span>Başlık</span><input autoFocus value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="Ne yapacaksın?" /></label>
    <div className="form-row"><label className="field"><span>Tarih</span><input type="date" value={draft.date || ''} onChange={e => setDraft({ ...draft, date: e.target.value || null, start: e.target.value ? (draft.start || '09:00') : null })} /></label><label className="field"><span>Başlangıç</span><input type="time" disabled={!draft.date || draft.allDay} value={draft.start || ''} onChange={e => setDraft({ ...draft, start: e.target.value })} /></label></div>
    <label className="check-field"><input type="checkbox" checked={Boolean(draft.allDay)} onChange={e => setDraft({ ...draft, allDay:e.target.checked, start:e.target.checked ? null : (draft.start || '09:00') })} /><span>Tüm gün görevi</span></label>
    <div className="form-row"><label className="field"><span>Süre</span><select value={draft.duration} onChange={e => setDraft({ ...draft, duration: Number(e.target.value) })}>{[5,10,15,30,45,60,90,120,180,240].map(value => <option key={value} value={value}>{durationText(value)}</option>)}</select></label><label className="field"><span>Öncelik</span><select value={draft.priority || 'normal'} onChange={e => setDraft({ ...draft, priority: e.target.value as Task['priority'] })}><option value="low">Düşük</option><option value="normal">Normal</option><option value="high">Yüksek</option></select></label></div>
    <label className="field"><span>Etiketler</span><input value={(draft.tags || []).join(', ')} onChange={e => setDraft({ ...draft, tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean).slice(0, 10) })} placeholder="iş, kişisel, odak" /></label>
    <label className="field"><span>Not</span><textarea rows={2} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="İstersen kısa bir not ekle" /></label>
    <div className="form-row"><label className="field"><span>Tekrar</span><select value={draft.repeat || 'none'} onChange={e => setDraft({ ...draft, repeat:e.target.value as Task['repeat'] })}><option value="none">Tek sefer</option><option value="daily">Her gün</option><option value="weekly">Her hafta</option><option value="monthly">Her ay</option><option value="yearly">Her yıl</option></select></label><label className="field"><span>Enerji</span><select value={draft.energy || 0} onChange={e => setDraft({ ...draft, energy:Number(e.target.value) as Task['energy'] })}><option value="-2">Yenileyici</option><option value="-1">Rahatlatıcı</option><option value="0">Nötr</option><option value="1">Hafif</option><option value="2">Orta</option><option value="3">Yoğun</option></select></label></div>
    <div className="form-row"><label className="field"><span>Bildirim</span><select value={draft.reminderMinutes == null ? 'none' : draft.reminderMinutes} onChange={e => setDraft({ ...draft, reminderMinutes:e.target.value === 'none' ? null : Number(e.target.value) })}><option value="none">Kapalı</option><option value="0">Tam zamanında</option><option value="5">5 dk önce</option><option value="15">15 dk önce</option><option value="30">30 dk önce</option><option value="60">1 saat önce</option></select></label><label className="field"><span>Ses</span><select value={draft.notificationSound || 'soft'} onChange={e => { const sound=e.target.value as NotificationSound; setDraft({ ...draft, notificationSound:sound }); playNotificationSound(sound) }}><option value="soft">Yumuşak</option><option value="bell">Çan</option><option value="bright">Parlak</option><option value="none">Sessiz</option></select></label></div>
    <div className="subtasks"><div className="subtasks-head"><span>Alt görevler</span>{aiEnabled && <button type="button" onClick={suggestSubtasks} disabled={aiLoading}><Sparkles /> {aiLoading ? 'Hazırlanıyor' : 'AI ile öner'}</button>}</div>{draft.subtasks?.map(subtask => <div className="subtask-row" key={subtask.id}><input type="checkbox" checked={subtask.completed} onChange={e => setDraft({ ...draft, subtasks:draft.subtasks?.map(item => item.id === subtask.id ? {...item,completed:e.target.checked}:item) })} /><input value={subtask.title} onChange={e => setDraft({ ...draft, subtasks:draft.subtasks?.map(item => item.id === subtask.id ? {...item,title:e.target.value}:item) })} /><button type="button" onClick={() => setDraft({ ...draft, subtasks:draft.subtasks?.filter(item => item.id !== subtask.id) })}><X /></button></div>)}<div className="subtask-add"><input value={subtaskTitle} onChange={e => setSubtaskTitle(e.target.value)} onKeyDown={e => { if(e.key==='Enter'){e.preventDefault();addSubtask()} }} placeholder="Alt görev ekle..."/><button type="button" onClick={addSubtask}><Plus /></button></div></div>
    <div className="picker-label">Simge</div><div className="icon-picker">{Object.entries(icons).map(([name, Icon]) => <button type="button" aria-label={name} key={name} className={draft.icon === name ? 'selected' : ''} onClick={() => setDraft({ ...draft, icon: name })}><Icon /></button>)}</div>
    <div className="picker-label">Renk</div><div className="color-picker">{colors.map(color => <button type="button" aria-label={`${color} renk`} key={color} className={`${color} ${draft.color === color ? 'selected' : ''}`} onClick={() => setDraft({ ...draft, color })}><Check /></button>)}</div>
    {editing !== 'new' && <div className="task-extra-actions"><button type="button" onClick={onFocus}><Focus /> Odak</button><button type="button" onClick={onDuplicate}><Copy /> Kopyala</button></div>}
    <div className="modal-actions">{editing !== 'new' && <button type="button" className="delete-button" onClick={onDelete}><Trash2 /> Sil</button>}<span /><button type="button" className="secondary" onClick={onClose}>Vazgeç</button><button className="primary">Kaydet</button></div>
  </form></div>
}

function SearchModal({ tasks, onClose, onOpen }: { tasks: Task[]; onClose: () => void; onOpen: (task: Task) => void }) {
  const [query, setQuery] = useState('')
  const needle = query.toLocaleLowerCase('tr')
  const results = tasks.filter(task => !needle || `${task.title} ${task.notes || ''} ${(task.tags || []).join(' ')}`.toLocaleLowerCase('tr').includes(needle)).slice(0, 30)
  return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><section className="modal search-modal"><div className="modal-head"><h2>Görevlerde ara</h2><button aria-label="Kapat" className="icon-btn" onClick={onClose}><X /></button></div><div className="search-box"><Search /><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Başlık, not veya etiket..." /></div><div className="search-results">{results.length ? results.map(task => <button key={task.id} onClick={() => onOpen(task)}><span className={`search-dot ${task.color}`} /><div><strong>{task.title}</strong><small>{task.date ? `${task.date} · ${task.start || ''}` : 'Gelen kutusu'}{task.completed ? ' · Tamamlandı' : ''}</small></div><ChevronRight /></button>) : <p>Sonuç bulunamadı.</p>}</div></section></div>
}

type SettingsProps = {
  dark: boolean; setDark: (v: boolean) => void; mondayFirst: boolean; setMondayFirst: (v: boolean) => void; onClose: () => void; reset: () => void
  exportData: () => void; importData: (file: File) => void; importCalendar: (file: File) => void; canInstall: boolean; installApp: () => void
  bridgeUrl: string; setBridgeUrl: (v: string) => void; bridgeKey: string; setBridgeKey: (v: string) => void
  bridgeStatus: 'idle' | 'syncing' | 'ok' | 'error' | 'permission'; syncBridge: () => void
  notificationsEnabled: boolean; enableNotifications: () => void; defaultSound: NotificationSound; setDefaultSound: (v: NotificationSound) => void
  energyEnabled: boolean; setEnergyEnabled: (v: boolean) => void; energyLimit: number; setEnergyLimit: (v: number) => void
  aiEnabled: boolean; setAiEnabled: (v: boolean) => void
}
function SettingsModal(props: SettingsProps) {
  const { dark, setDark, mondayFirst, setMondayFirst, onClose, reset, exportData, importData, importCalendar, canInstall, installApp, bridgeUrl, setBridgeUrl, bridgeKey, setBridgeKey, bridgeStatus, syncBridge, notificationsEnabled, enableNotifications, defaultSound, setDefaultSound, energyEnabled, setEnergyEnabled, energyLimit, setEnergyLimit, aiEnabled, setAiEnabled } = props
  return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><section className="modal settings-modal">
    <div className="modal-head"><h2>Ayarlar</h2><button aria-label="Kapat" className="icon-btn" onClick={onClose}><X /></button></div>
    <div className="setting-row"><div className="setting-icon">{dark ? <Moon /> : <Sun />}</div><div><strong>Görünüm</strong><span>Rahat ettiğin temayı seç.</span></div><button className="theme-toggle" onClick={() => setDark(!dark)}>{dark ? 'Koyu' : 'Açık'}</button></div>
    <div className="setting-row"><div className="setting-icon"><CalendarDays /></div><div><strong>Haftanın başlangıcı</strong><span>{mondayFirst ? 'Pazartesi' : 'Pazar'}</span></div><button className="theme-toggle" onClick={() => setMondayFirst(!mondayFirst)}>Değiştir</button></div>
    <div className="setting-row"><div className="setting-icon"><Smartphone /></div><div><strong>Uygulamayı yükle</strong><span>{canInstall ? 'Bu cihaza kurulmaya hazır.' : 'Tarayıcı menüsünden Ana Ekrana Ekle.'}</span></div><button className="theme-toggle" disabled={!canInstall} onClick={installApp}>Yükle</button></div>
    <div className="setting-row"><div className="setting-icon"><Volume2 /></div><div><strong>Bildirimler</strong><span>{notificationsEnabled ? 'Hatırlatmalar bu cihazda açık.' : 'Görev zamanı geldiğinde haber al.'}</span></div><button className="theme-toggle" onClick={enableNotifications}>{notificationsEnabled ? 'Açık' : 'Etkinleştir'}</button></div>
    <div className="compact-setting"><label><span>Varsayılan ses</span><select value={defaultSound} onChange={e => { const value=e.target.value as NotificationSound; setDefaultSound(value); playNotificationSound(value) }}><option value="soft">Yumuşak</option><option value="bell">Çan</option><option value="bright">Parlak</option><option value="none">Sessiz</option></select></label></div>
    <div className="setting-row"><div className="setting-icon"><LayoutGrid /></div><div><strong>Enerji monitörü</strong><span>Günlük yükünü görünür kıl.</span></div><button className="theme-toggle" onClick={() => setEnergyEnabled(!energyEnabled)}>{energyEnabled ? 'Açık' : 'Kapalı'}</button></div>
    {energyEnabled && <div className="compact-setting"><label><span>Günlük enerji sınırı</span><input type="number" min="5" max="100" value={energyLimit} onChange={e => setEnergyLimit(Math.max(5, Math.min(100, Number(e.target.value) || 25)))} /></label></div>}
    <div className="setting-row"><div className="setting-icon"><Sparkles /></div><div><strong>İsteğe bağlı AI</strong><span>Alt görev önerileri; kapalıyken hiçbir AI isteği gönderilmez.</span></div><button className="theme-toggle" onClick={() => setAiEnabled(!aiEnabled)}>{aiEnabled ? 'Açık' : 'Kapalı'}</button></div>
    <div className="settings-section"><h3>Veri ve takvim</h3><div className="settings-buttons three"><button onClick={exportData}><Download /> Dışa aktar</button><label><Upload /> Yedek al<input type="file" accept="application/json" onChange={e => e.target.files?.[0] && importData(e.target.files[0])} /></label><label><CalendarDays /> ICS al<input type="file" accept="text/calendar,.ics" onChange={e => e.target.files?.[0] && importCalendar(e.target.files[0])} /></label></div></div>
    <div className="settings-section bridge-section"><h3><CloudCog /> Agent Bridge</h3><p>Yerel MCP sunucusu ve PWA görevlerini aynı dosyada eşitler.</p><label className="field"><span>Köprü adresi</span><input value={bridgeUrl} onChange={e => setBridgeUrl(e.target.value)} /></label><label className="field"><span>API anahtarı (isteğe bağlı)</span><input type="password" value={bridgeKey} onChange={e => setBridgeKey(e.target.value)} placeholder="AKIS_API_KEY" /></label><button className={`sync-button ${bridgeStatus}`} disabled={bridgeStatus === 'syncing'} onClick={syncBridge}><RefreshCw /> {bridgeStatus === 'syncing' ? 'Eşitleniyor...' : bridgeStatus === 'ok' ? 'Eşitlendi' : bridgeStatus === 'permission' ? 'Yerel ağ izni gerekli' : bridgeStatus === 'error' ? 'Bağlantı başarısız' : 'Şimdi eşitle'}</button>{bridgeStatus === 'permission' && <p className="bridge-help">Tarayıcı adres çubuğundaki site izinlerinden “Yerel ağ erişimi”ni açıp yeniden dene.</p>}</div>
    <button className="reset-button" onClick={() => { if (window.confirm('Tüm yerel görevler örnek verilerle değiştirilsin mi?')) { reset(); onClose() } }}>Örnek verileri geri yükle</button>
    <p className="settings-foot">Akış · Yerel, çevrimdışı, isteğe bağlı AI ve agent uyumlu.</p>
  </section></div>
}
