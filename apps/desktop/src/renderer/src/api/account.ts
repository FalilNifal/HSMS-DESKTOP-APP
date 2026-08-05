import { apiFetch } from './client'

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export const changePassword = (body: ChangePasswordRequest): Promise<{ message: string }> =>
  apiFetch<{ message: string }>('/api/account/change-password', { method: 'POST', body })

export interface RecoverAdminPasswordRequest {
  /** Optional — omit if you don't remember it; the primary admin is reset. */
  adminUsername?: string
  recoveryKey: string
  newPassword: string
}

// Anonymous: used from the login screen when the admin password is forgotten.
export const recoverAdminPassword = (
  body: RecoverAdminPasswordRequest
): Promise<{ message: string; username: string }> =>
  apiFetch<{ message: string; username: string }>('/api/account/recover-admin-password', {
    method: 'POST',
    body,
    auth: false
  })
