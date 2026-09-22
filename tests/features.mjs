import { createTaskSeries, energyPoints, importIcs } from '../src/planner.ts'

function assert(condition, message) {
  if (!condition) throw new Error(message)
  process.stdout.write(`✓ ${message}\n`)
}

const base = { id: 'repeat-1', title: 'Aylık rapor', date: '2026-01-31', start: '09:00', duration: 60, color: 'blue', icon: 'list', completed: false, repeat: 'monthly', energy: 2 }
const monthly = createTaskSeries(base)
assert(monthly[1].date === '2026-02-28' && monthly[2].date === '2026-03-31', 'aylık tekrar kısa ayları doğru hesaplıyor')

const weekly = createTaskSeries({ ...base, repeat: 'weekly', date: '2026-09-22' })
assert(weekly.length === 53 && weekly[1].date === '2026-09-29', 'haftalık tekrar bir yıllık seri oluşturuyor')

const calendar = importIcs('BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:20260922T143000\nDTEND:20260922T153000\nSUMMARY:Müşteri görüşmesi\nDESCRIPTION:Sunum hazırla\nEND:VEVENT\nEND:VCALENDAR')
assert(calendar.length === 1 && calendar[0].start === '14:30' && calendar[0].duration === 60 && calendar[0].source === 'calendar', 'ICS etkinliği tarih, saat ve süreyle içe aktarılıyor')
assert(energyPoints({ ...base, duration: 90, energy: 2 }) === 6, 'enerji yükü süreye göre hesaplanıyor')
