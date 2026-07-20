import { apiFetch } from './client'
import type { UserRole } from '../store/authStore'

export interface SetupStatus {
  isSetupCompleted: boolean
}

export interface InitializeSetupRequest {
  shopName: string
  address: string
  phoneNumber: string
  currency: string
  invoiceFooterMessage: string
  adminFullName: string
  adminUsername: string
  adminPassword: string
}

export interface InitializeSetupResponse {
  message: string
  recoveryKey: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  userId: number
  fullName: string
  username: string
  role: UserRole
}

export const getSetupStatus = (): Promise<SetupStatus> =>
  apiFetch<SetupStatus>('/api/setup/status', { auth: false })

export const initializeSetup = (
  body: InitializeSetupRequest
): Promise<InitializeSetupResponse> =>
  apiFetch<InitializeSetupResponse>('/api/setup/initialize', {
    method: 'POST',
    body,
    auth: false
  })

export const login = (body: LoginRequest): Promise<LoginResponse> =>
  apiFetch<LoginResponse>('/api/auth/login', { method: 'POST', body, auth: false })
