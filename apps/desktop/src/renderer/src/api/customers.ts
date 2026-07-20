import { apiFetch } from './client'

export interface Customer {
  id: number
  name: string
  phoneNumber: string | null
  address: string | null
  creditLimit: number
  outstandingBalance: number
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string | null
}

export interface CustomerRequest {
  name: string
  phoneNumber?: string | null
  address?: string | null
  creditLimit: number
  notes?: string | null
}

export interface LedgerEntry {
  date: string
  type: string
  reference: string
  charge: number
  payment: number
}

export interface CustomerLedger {
  customerId: number
  name: string
  outstandingBalance: number
  entries: LedgerEntry[]
}

export interface RecordPaymentRequest {
  amount: number
  method: string
  note?: string | null
}

export const listCustomers = (): Promise<Customer[]> => apiFetch<Customer[]>('/api/customers')

export const getCustomerLedger = (id: number): Promise<CustomerLedger> =>
  apiFetch<CustomerLedger>(`/api/customers/${id}/ledger`)

export const createCustomer = (body: CustomerRequest): Promise<Customer> =>
  apiFetch<Customer>('/api/customers', { method: 'POST', body })

export const updateCustomer = (id: number, body: CustomerRequest): Promise<void> =>
  apiFetch<void>(`/api/customers/${id}`, { method: 'PUT', body })

export const deactivateCustomer = (id: number): Promise<void> =>
  apiFetch<void>(`/api/customers/${id}`, { method: 'DELETE' })

export const reactivateCustomer = (id: number): Promise<void> =>
  apiFetch<void>(`/api/customers/${id}/reactivate`, { method: 'POST' })

export const recordPayment = (id: number, body: RecordPaymentRequest): Promise<Customer> =>
  apiFetch<Customer>(`/api/customers/${id}/payments`, { method: 'POST', body })
