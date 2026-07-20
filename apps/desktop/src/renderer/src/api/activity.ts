import { apiFetch } from './client'

export interface ActivityEvent {
  id: number
  userId: number
  username: string
  fullName: string
  role: string
  event: string
  createdAt: string
}

export const getActivity = (fromDate?: string, toDate?: string): Promise<ActivityEvent[]> => {
  const params = new URLSearchParams()
  if (fromDate) params.set('fromDate', fromDate)
  if (toDate) params.set('toDate', toDate)
  const qs = params.toString()
  return apiFetch<ActivityEvent[]>(`/api/activity${qs ? `?${qs}` : ''}`)
}

/** Best-effort logout event (records a "Logout" row server-side). */
export const logoutActivity = (): Promise<{ message: string }> =>
  apiFetch<{ message: string }>('/api/auth/logout', { method: 'POST' })
