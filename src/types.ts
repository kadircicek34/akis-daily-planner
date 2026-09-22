export type TaskColor = 'coral' | 'blue' | 'green' | 'purple' | 'amber'
export type NotificationSound = 'soft' | 'bell' | 'bright' | 'none'
export type RepeatFrequency = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface Subtask {
  id: string
  title: string
  completed: boolean
}

export interface Task {
  id: string
  title: string
  date: string | null
  start: string | null
  duration: number
  color: TaskColor
  icon: string
  completed: boolean
  notes?: string
  priority?: 'low' | 'normal' | 'high'
  tags?: string[]
  updatedAt?: string
  allDay?: boolean
  subtasks?: Subtask[]
  reminderMinutes?: number | null
  notificationSound?: NotificationSound
  repeat?: RepeatFrequency
  seriesId?: string
  energy?: -2 | -1 | 0 | 1 | 2 | 3
  source?: 'local' | 'calendar'
}
