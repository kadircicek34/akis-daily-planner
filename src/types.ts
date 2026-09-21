export type TaskColor = 'coral' | 'blue' | 'green' | 'purple' | 'amber'

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
}
