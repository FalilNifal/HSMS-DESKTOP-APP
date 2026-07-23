import { apiFetch } from './client'

export interface Category {
  id: number
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string | null
}

export interface Supplier {
  id: number
  name: string
  contactPerson: string | null
  phoneNumber: string | null
  address: string | null
  outstandingBalance: number
  isActive: boolean
  createdAt: string
  updatedAt: string | null
}

export interface SupplierLedgerEntry {
  type: 'Bill' | 'Payment'
  date: string
  reference: string
  amount: number
  notes: string
}

export interface SupplierLedger {
  supplierId: number
  supplierName: string
  outstandingBalance: number
  entries: SupplierLedgerEntry[]
}

export interface CreateSupplierBillRequest {
  amount: number
  billNumber?: string | null
  billDate?: string | null
  notes?: string | null
}

export interface CreateSupplierPaymentRequest {
  amount: number
  paymentMethod: string
  paymentDate?: string | null
  notes?: string | null
}

export interface CategoryRequest {
  name: string
  description?: string | null
}

export interface SupplierRequest {
  name: string
  contactPerson?: string | null
  phoneNumber?: string | null
  address?: string | null
}

export const listCategories = (): Promise<Category[]> => apiFetch<Category[]>('/api/categories')

export const createCategory = (body: CategoryRequest): Promise<Category> =>
  apiFetch<Category>('/api/categories', { method: 'POST', body })

export const updateCategory = (id: number, body: CategoryRequest): Promise<void> =>
  apiFetch<void>(`/api/categories/${id}`, { method: 'PUT', body })

export const deactivateCategory = (id: number): Promise<void> =>
  apiFetch<void>(`/api/categories/${id}`, { method: 'DELETE' })

export const reactivateCategory = (id: number): Promise<void> =>
  apiFetch<void>(`/api/categories/${id}/reactivate`, { method: 'POST' })

export const listSuppliers = (): Promise<Supplier[]> => apiFetch<Supplier[]>('/api/suppliers')

export const createSupplier = (body: SupplierRequest): Promise<Supplier> =>
  apiFetch<Supplier>('/api/suppliers', { method: 'POST', body })

export const updateSupplier = (id: number, body: SupplierRequest): Promise<void> =>
  apiFetch<void>(`/api/suppliers/${id}`, { method: 'PUT', body })

export const deactivateSupplier = (id: number): Promise<void> =>
  apiFetch<void>(`/api/suppliers/${id}`, { method: 'DELETE' })

export const reactivateSupplier = (id: number): Promise<void> =>
  apiFetch<void>(`/api/suppliers/${id}/reactivate`, { method: 'POST' })

export const listPayables = (): Promise<Supplier[]> =>
  apiFetch<Supplier[]>('/api/suppliers/payables')

export const getSupplierLedger = (id: number): Promise<SupplierLedger> =>
  apiFetch<SupplierLedger>(`/api/suppliers/${id}/ledger`)

export const addSupplierBill = (id: number, body: CreateSupplierBillRequest): Promise<Supplier> =>
  apiFetch<Supplier>(`/api/suppliers/${id}/bills`, { method: 'POST', body })

export const addSupplierPayment = (
  id: number,
  body: CreateSupplierPaymentRequest
): Promise<Supplier> =>
  apiFetch<Supplier>(`/api/suppliers/${id}/payments`, { method: 'POST', body })
