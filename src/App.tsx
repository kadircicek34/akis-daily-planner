import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlarmClock, Archive, BookOpen, CalendarDays, Check, ChevronDown, ChevronLeft,
  ChevronRight, Circle, CloudCog, Coffee, Download, Focus, Inbox, ListChecks, Menu,
  Moon, Plus, RefreshCw, Search, Settings, Shirt, ShoppingCart, Smartphone, Sparkles,
  Sun, Trash2, Upload, Utensils, X,
} from 'lucide-react'
import { seedTasks, todayKey } from './data'
import type { Task, TaskColor } from './types'

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

  useEffect(() => { localStorage.setItem('akis-tasks', JSON.stringify(tasks)) }, [tasks])
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem('akis-theme', dark ? 'dark' : 'light')
  }, [dark])
  useEffect(() => { localStorage.setItem('akis-week-start', mondayFirst ? 'monday' : 'sunday') }, [mondayFirst])
  useEffect(() => {
    const capture = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent) }
    window.addEventListener('beforeinstallprompt', capture)
    return () => window.removeEventListener('beforeinstallprompt', capture)
  }, [])

  const selected = fromKey(selectedDate)
  const week = useMemo(() => {
    const start = fromKey(selectedDate)
    const offset = mondayFirst ? (start.getDay() + 6) % 7 : start.getDay()
    start.setDate(start.getDate() - offset)
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start); day.setDate(start.getDate() + index); return day
    })
  }, [selectedDate, mondayFirst])
  const dayTasks = tasks.filter(task => task.date === selectedDate).sort((a, b) => minuteValue(a.start) - minuteValue(b.start))
  const inboxTasks = tasks.filter(task => task.date === null)

  function openNew(inbox = false) {
    setDraft({ ...blankTask(selectedDate), date: inbox ? null : selectedDate, start: inbox ? null : '09:00' })
    setEditing('new')
  }
  function openEdit(task: Task) {
    setDraft({ title: task.title, date: task.date, start: task.start, duration: task.duration, color: task.color, icon: task.icon, notes: task.notes || '', priority: task.priority || 'normal', tags: task.tags || [], updatedAt: task.updatedAt })
    setEditing(task)
  }
  function saveTask(event: React.FormEvent) {
    event.preventDefault()
    if (!draft.title.trim()) return
    const updatedAt = new Date().toISOString()
    if (editing === 'new') setTasks(current => [...current, { ...draft, id: crypto.randomUUID(), title: draft.title.trim(), completed: false, updatedAt }])
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
    setTasks(current => current.map(item => item.id === task.id ? stamp({ ...item, date: selectedDate, start: next }) : item))
    setMobileInbox(false)
  }
  function toggleComplete(id: string) { setTasks(current => current.map(task => task.id === id ? stamp({ ...task, completed: !task.completed }) : task)) }
  function removeTask() {
    if (editing && editing !== 'new' && window.confirm(`“${editing.title}” silinsin mi?`)) setTasks(current => current.filter(task => task.id !== editing.id))
    setEditing(null)
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
      <div className="inbox-list">{inboxTasks.length === 0 ? <div className="empty-inbox"><Archive /><strong>Gelen kutun boş</strong><p>Aklına gelenleri buraya ekle.</p></div> : inboxTasks.map(task => <InboxCard key={task.id} task={task} onOpen={() => openEdit(task)} onSchedule={() => schedule(task)} />)}</div>
    </aside>

    <main className="planner">
      <header className="planner-header">
        <div className="month-group"><button className="mobile-menu" onClick={() => setMobileInbox(true)} aria-label="Gelen kutusunu aç"><Menu /></button><label className="month-title"><h1>{months[selected.getMonth()]} <em>{selected.getFullYear()}</em></h1><ChevronDown size={22} /><input className="header-date-input" type="date" value={selectedDate} onChange={e => e.target.value && setSelectedDate(e.target.value)} aria-label="Tarih seç" /></label></div>
        <div className="header-actions">
          <button className="settings-btn" aria-label="Görevlerde ara" onClick={() => setSearchOpen(true)}><Search /></button>
          <div className="today-control"><button aria-label="Önceki gün" onClick={() => setSelectedDate(addDays(selectedDate, -1))}><ChevronLeft /></button><button onClick={() => setSelectedDate(todayKey())}>Bugün</button><button aria-label="Sonraki gün" onClick={() => setSelectedDate(addDays(selectedDate, 1))}><ChevronRight /></button></div>
          <button className="settings-btn" aria-label="Ayarlar" onClick={() => setSettingsOpen(true)}><Settings /></button>
        </div>
      </header>

      <nav className="week-strip" aria-label="Haftalık takvim">{week.map(day => {
        const key = localDateKey(day); const count = tasks.filter(task => task.date === key).length; const active = key === selectedDate
        return <button key={key} className={active ? 'active' : ''} onClick={() => setSelectedDate(key)}><span>{weekdays[day.getDay()]}</span><strong>{day.getDate()}</strong><i>{count ? Array.from({ length: Math.min(count, 3) }, (_, i) => <b key={i} />) : <b className="muted" />}</i></button>
      })}</nav>

      <section className="timeline-wrap">
        <div className="day-heading"><div><span>{weekdays[selected.getDay()]}</span><h2>{selected.getDate()} {months[selected.getMonth()]}</h2></div><p>{dayTasks.filter(t => t.completed).length}/{dayTasks.length} tamamlandı</p></div>
        {dayTasks.length === 0 ? <EmptyDay onAdd={() => openNew()} /> : <div className="timeline">{dayTasks.map((task, index) => <TimelineTask key={task.id} task={task} first={index === 0} last={index === dayTasks.length - 1} onOpen={() => openEdit(task)} onToggle={() => toggleComplete(task.id)} />)}</div>}
      </section>
      <button className="floating-add" onClick={() => openNew()} aria-label="Yeni görev"><Plus /></button>
    </main>

    <nav className="mobile-nav"><button onClick={() => setMobileInbox(true)}><Inbox /><span>Gelen kutusu</span></button><button className="nav-add" onClick={() => openNew()}><Plus /></button><button onClick={() => setSearchOpen(true)}><Search /><span>Ara</span></button><button onClick={() => setSettingsOpen(true)}><Settings /><span>Ayarlar</span></button></nav>

    {editing && <TaskModal draft={draft} setDraft={setDraft} editing={editing} onClose={() => setEditing(null)} onSave={saveTask} onDelete={removeTask} />}
    {searchOpen && <SearchModal tasks={tasks} onClose={() => setSearchOpen(false)} onOpen={task => { setSearchOpen(false); openEdit(task) }} />}
    {settingsOpen && <SettingsModal dark={dark} setDark={setDark} mondayFirst={mondayFirst} setMondayFirst={setMondayFirst} onClose={() => setSettingsOpen(false)} reset={() => setTasks(seedTasks())} exportData={exportData} importData={importData} canInstall={Boolean(installPrompt)} installApp={installApp} bridgeUrl={bridgeUrl} setBridgeUrl={setBridgeUrl} bridgeKey={bridgeKey} setBridgeKey={setBridgeKey} bridgeStatus={bridgeStatus} syncBridge={syncBridge} />}
  </div>
}

function InboxCard({ task, onOpen, onSchedule }: { task: Task; onOpen: () => void; onSchedule: () => void }) {
  const Icon = icons[task.icon as keyof typeof icons] || ListChecks
  return <article className="inbox-card" onClick={onOpen}><div className={`mini-icon ${task.color}`}><Icon /></div><div><small>{durationText(task.duration)}{task.priority === 'high' ? ' · Öncelikli' : ''}</small><h3>{task.title}</h3></div><button aria-label="Bugüne planla" onClick={event => { event.stopPropagation(); onSchedule() }}><Plus /></button></article>
}

function TimelineTask({ task, first, last, onOpen, onToggle }: { task: Task; first: boolean; last: boolean; onOpen: () => void; onToggle: () => void }) {
  const Icon = icons[task.icon as keyof typeof icons] || ListChecks
  return <article className={`timeline-item ${task.completed ? 'completed' : ''}`}><div className="time-column"><time>{task.start}</time><time>{task.start ? timeAfter(task.start, task.duration) : ''}</time></div><div className={`track ${first ? 'first' : ''} ${last ? 'last' : ''}`}><button className={`task-bubble ${task.color}`} onClick={onOpen} aria-label={`${task.title} görevini düzenle`}><Icon /></button></div><button className="task-copy" onClick={onOpen}><small>{task.start} – {task.start && timeAfter(task.start, task.duration)} · {durationText(task.duration)}{task.priority === 'high' ? ' · Yüksek öncelik' : ''}</small><strong>{task.title}</strong>{task.notes && <span>{task.notes}</span>}{Boolean(task.tags?.length) && <span className="task-tags">{task.tags?.map(tag => `#${tag}`).join(' ')}</span>}</button><button className={`complete-btn ${task.color}`} onClick={onToggle} aria-label={task.completed ? 'Tamamlanmadı olarak işaretle' : 'Tamamla'}>{task.completed ? <Check /> : <Circle />}</button></article>
}

function EmptyDay({ onAdd }: { onAdd: () => void }) { return <div className="empty-day"><div><Sparkles /></div><h3>Bugün tertemiz</h3><p>Gününü şekillendirmek için ilk görevini ekle.</p><button onClick={onAdd}><Plus /> Görev ekle</button></div> }

type Draft = Omit<Task, 'id' | 'completed'>
function TaskModal({ draft, setDraft, editing, onClose, onSave, onDelete }: { draft: Draft; setDraft: React.Dispatch<React.SetStateAction<Draft>>; editing: Task | 'new'; onClose: () => void; onSave: (e: React.FormEvent) => void; onDelete: () => void }) {
  return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><form className="modal task-modal" onSubmit={onSave}>
    <div className="modal-head"><h2>{editing === 'new' ? 'Yeni görev' : 'Görevi düzenle'}</h2><button type="button" aria-label="Kapat" className="icon-btn" onClick={onClose}><X /></button></div>
    <label className="field"><span>Başlık</span><input autoFocus value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="Ne yapacaksın?" /></label>
    <div className="form-row"><label className="field"><span>Tarih</span><input type="date" value={draft.date || ''} onChange={e => setDraft({ ...draft, date: e.target.value || null, start: e.target.value ? (draft.start || '09:00') : null })} /></label><label className="field"><span>Başlangıç</span><input type="time" disabled={!draft.date} value={draft.start || ''} onChange={e => setDraft({ ...draft, start: e.target.value })} /></label></div>
    <div className="form-row"><label className="field"><span>Süre</span><select value={draft.duration} onChange={e => setDraft({ ...draft, duration: Number(e.target.value) })}>{[5,10,15,30,45,60,90,120,180,240].map(value => <option key={value} value={value}>{durationText(value)}</option>)}</select></label><label className="field"><span>Öncelik</span><select value={draft.priority || 'normal'} onChange={e => setDraft({ ...draft, priority: e.target.value as Task['priority'] })}><option value="low">Düşük</option><option value="normal">Normal</option><option value="high">Yüksek</option></select></label></div>
    <label className="field"><span>Etiketler</span><input value={(draft.tags || []).join(', ')} onChange={e => setDraft({ ...draft, tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean).slice(0, 10) })} placeholder="iş, kişisel, odak" /></label>
    <label className="field"><span>Not</span><textarea rows={2} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="İstersen kısa bir not ekle" /></label>
    <div className="picker-label">Simge</div><div className="icon-picker">{Object.entries(icons).map(([name, Icon]) => <button type="button" aria-label={name} key={name} className={draft.icon === name ? 'selected' : ''} onClick={() => setDraft({ ...draft, icon: name })}><Icon /></button>)}</div>
    <div className="picker-label">Renk</div><div className="color-picker">{colors.map(color => <button type="button" aria-label={`${color} renk`} key={color} className={`${color} ${draft.color === color ? 'selected' : ''}`} onClick={() => setDraft({ ...draft, color })}><Check /></button>)}</div>
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
  exportData: () => void; importData: (file: File) => void; canInstall: boolean; installApp: () => void
  bridgeUrl: string; setBridgeUrl: (v: string) => void; bridgeKey: string; setBridgeKey: (v: string) => void
  bridgeStatus: 'idle' | 'syncing' | 'ok' | 'error' | 'permission'; syncBridge: () => void
}
function SettingsModal(props: SettingsProps) {
  const { dark, setDark, mondayFirst, setMondayFirst, onClose, reset, exportData, importData, canInstall, installApp, bridgeUrl, setBridgeUrl, bridgeKey, setBridgeKey, bridgeStatus, syncBridge } = props
  return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><section className="modal settings-modal">
    <div className="modal-head"><h2>Ayarlar</h2><button aria-label="Kapat" className="icon-btn" onClick={onClose}><X /></button></div>
    <div className="setting-row"><div className="setting-icon">{dark ? <Moon /> : <Sun />}</div><div><strong>Görünüm</strong><span>Rahat ettiğin temayı seç.</span></div><button className="theme-toggle" onClick={() => setDark(!dark)}>{dark ? 'Koyu' : 'Açık'}</button></div>
    <div className="setting-row"><div className="setting-icon"><CalendarDays /></div><div><strong>Haftanın başlangıcı</strong><span>{mondayFirst ? 'Pazartesi' : 'Pazar'}</span></div><button className="theme-toggle" onClick={() => setMondayFirst(!mondayFirst)}>Değiştir</button></div>
    <div className="setting-row"><div className="setting-icon"><Smartphone /></div><div><strong>Uygulamayı yükle</strong><span>{canInstall ? 'Bu cihaza kurulmaya hazır.' : 'Tarayıcı menüsünden Ana Ekrana Ekle.'}</span></div><button className="theme-toggle" disabled={!canInstall} onClick={installApp}>Yükle</button></div>
    <div className="settings-section"><h3>Veri yönetimi</h3><div className="settings-buttons"><button onClick={exportData}><Download /> Dışa aktar</button><label><Upload /> İçe aktar<input type="file" accept="application/json" onChange={e => e.target.files?.[0] && importData(e.target.files[0])} /></label></div></div>
    <div className="settings-section bridge-section"><h3><CloudCog /> Agent Bridge</h3><p>Yerel MCP sunucusu ve PWA görevlerini aynı dosyada eşitler.</p><label className="field"><span>Köprü adresi</span><input value={bridgeUrl} onChange={e => setBridgeUrl(e.target.value)} /></label><label className="field"><span>API anahtarı (isteğe bağlı)</span><input type="password" value={bridgeKey} onChange={e => setBridgeKey(e.target.value)} placeholder="AKIS_API_KEY" /></label><button className={`sync-button ${bridgeStatus}`} disabled={bridgeStatus === 'syncing'} onClick={syncBridge}><RefreshCw /> {bridgeStatus === 'syncing' ? 'Eşitleniyor...' : bridgeStatus === 'ok' ? 'Eşitlendi' : bridgeStatus === 'permission' ? 'Yerel ağ izni gerekli' : bridgeStatus === 'error' ? 'Bağlantı başarısız' : 'Şimdi eşitle'}</button>{bridgeStatus === 'permission' && <p className="bridge-help">Tarayıcı adres çubuğundaki site izinlerinden “Yerel ağ erişimi”ni açıp yeniden dene.</p>}</div>
    <button className="reset-button" onClick={() => { if (window.confirm('Tüm yerel görevler örnek verilerle değiştirilsin mi?')) { reset(); onClose() } }}>Örnek verileri geri yükle</button>
    <p className="settings-foot">Akış · Yerel, çevrimdışı ve agent uyumlu.</p>
  </section></div>
}
