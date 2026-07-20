import { apiFetch, ApiError } from './client'
import { useAuthStore } from '../store/authStore'

const API_BASE = import.meta.env.DEV ? '' : 'http://localhost:5146'

export interface BackupFile {
  fileName: string
  createdAt: string
  sizeBytes: number
}

export interface CreateBackupResponse {
  message: string
  fileName: string
  createdAt: string
  sizeBytes: number
}

export interface RestoreBackupResponse {
  message: string
  emergencyBackupFileName: string
}

export const listBackups = (): Promise<BackupFile[]> => apiFetch<BackupFile[]>('/api/backup/list')

export const createBackup = (): Promise<CreateBackupResponse> =>
  apiFetch<CreateBackupResponse>('/api/backup/create', { method: 'POST' })

export const restoreBackup = (fileName: string): Promise<RestoreBackupResponse> =>
  apiFetch<RestoreBackupResponse>('/api/backup/restore', { method: 'POST', body: { fileName } })

/** Uploads a backup .zip (e.g. from a USB drive) and restores from it. */
export async function restoreFromFile(file: File): Promise<RestoreBackupResponse> {
  const token = useAuthStore.getState().token
  const form = new FormData()
  form.append('file', file)

  const response = await fetch(`${API_BASE}/api/backup/restore-upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form
  })

  if (!response.ok) {
    let message = 'Restore failed.'
    try {
      const data = await response.json()
      if (data && typeof data.message === 'string') message = data.message
    } catch {
      // keep default message
    }
    throw new ApiError(message, response.status)
  }

  return (await response.json()) as RestoreBackupResponse
}

/** Downloads a backup zip through the browser (auth header + blob save). */
export async function downloadBackup(fileName: string): Promise<void> {
  const token = useAuthStore.getState().token
  const response = await fetch(`${API_BASE}/api/backup/download/${encodeURIComponent(fileName)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
  if (!response.ok) {
    throw new ApiError('Download failed.', response.status)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
