import { apiFetch } from './client'
import type { UserRole } from '../store/authStore'

export interface User {
  id: number
  fullName: string
  username: string
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string | null
}

export interface CreateUserRequest {
  fullName: string
  username: string
  password: string
  role: UserRole
}

export interface UpdateUserRequest {
  fullName: string
  role: UserRole
  isActive: boolean
}

export const listUsers = (): Promise<User[]> => apiFetch<User[]>('/api/users')

export const createUser = (body: CreateUserRequest): Promise<User> =>
  apiFetch<User>('/api/users', { method: 'POST', body })

export const updateUser = (id: number, body: UpdateUserRequest): Promise<void> =>
  apiFetch<void>(`/api/users/${id}`, { method: 'PUT', body })

export const resetUserPassword = (id: number, newPassword: string): Promise<{ message: string }> =>
  apiFetch<{ message: string }>(`/api/users/${id}/reset-password`, {
    method: 'POST',
    body: { newPassword }
  })

export const deactivateUser = (id: number): Promise<void> =>
  apiFetch<void>(`/api/users/${id}`, { method: 'DELETE' })
