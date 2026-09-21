import type { Task } from './types'

export const todayKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const seedTasks = (): Task[] => {
  const today = todayKey()
  const updatedAt = new Date().toISOString()
  return [
    { id: '1', title: 'Güne başla', date: today, start: '07:00', duration: 15, color: 'coral', icon: 'alarm', completed: true, priority: 'normal', tags: ['rutin'], updatedAt },
    { id: '2', title: 'Sabah rutini', date: today, start: '07:15', duration: 45, color: 'blue', icon: 'list', completed: false, notes: 'Hazırlan ve güne sakin başla', priority: 'normal', tags: ['rutin'], updatedAt },
    { id: '3', title: 'Kahvaltı', date: today, start: '08:00', duration: 30, color: 'green', icon: 'coffee', completed: false, priority: 'normal', tags: [], updatedAt },
    { id: '4', title: 'Odaklanma zamanı', date: today, start: '09:00', duration: 90, color: 'purple', icon: 'focus', completed: false, priority: 'high', tags: ['odak'], updatedAt },
    { id: '5', title: 'Öğle yemeği', date: today, start: '12:30', duration: 45, color: 'amber', icon: 'utensils', completed: false, priority: 'normal', tags: [], updatedAt },
    { id: '6', title: 'Çamaşırları yıka', date: null, start: null, duration: 30, color: 'blue', icon: 'shirt', completed: false, priority: 'low', tags: ['ev'], updatedAt },
    { id: '7', title: 'Kitap oku', date: null, start: null, duration: 45, color: 'green', icon: 'book', completed: false, priority: 'normal', tags: ['kişisel'], updatedAt },
    { id: '8', title: 'Market alışverişi', date: null, start: null, duration: 30, color: 'coral', icon: 'cart', completed: false, priority: 'high', tags: ['alışveriş'], updatedAt },
  ]
}
