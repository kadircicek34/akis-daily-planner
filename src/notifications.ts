import type { NotificationSound, Task } from './types'

let audioContext: AudioContext | null = null

const patterns: Record<Exclude<NotificationSound, 'none'>, Array<[number, number, number]>> = {
  soft: [[523, 0, .14], [659, .17, .18]],
  bell: [[784, 0, .12], [1047, .13, .28]],
  bright: [[659, 0, .1], [880, .11, .1], [1175, .23, .2]],
}

export function playNotificationSound(sound: NotificationSound = 'soft') {
  if (sound === 'none') return
  audioContext ||= new AudioContext()
  void audioContext.resume()
  const start = audioContext.currentTime
  for (const [frequency, offset, duration] of patterns[sound]) {
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    oscillator.type = 'sine'; oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, start + offset)
    gain.gain.exponentialRampToValueAtTime(0.16, start + offset + .015)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + duration)
    oscillator.connect(gain).connect(audioContext.destination)
    oscillator.start(start + offset); oscillator.stop(start + offset + duration + .02)
  }
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported' as const
  return Notification.requestPermission()
}

export async function showTaskNotification(task: Task) {
  playNotificationSound(task.notificationSound || 'soft')
  const options: NotificationOptions = {
    body: task.notes || `${task.start || 'Tüm gün'} · ${task.duration} dakika`,
    icon: '/pwa-192x192.png', badge: '/pwa-64x64.png', tag: `akis-task-${task.id}`,
    data: { taskId: task.id, date: task.date },
  }
  const registration = await navigator.serviceWorker?.ready
  if (registration) await registration.showNotification(task.title, options)
  else new Notification(task.title, options)
}

export function reminderTimestamp(task: Task) {
  if (!task.date || !task.start || task.reminderMinutes == null) return null
  const date = new Date(`${task.date}T${task.start}:00`)
  return date.getTime() - task.reminderMinutes * 60_000
}
