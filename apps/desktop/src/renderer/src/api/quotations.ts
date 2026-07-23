import { apiFetch } from './client'

export type QuotationStatus = 'Open' | 'Converted' | 'Cancelled'

export interface QuotationItem {
  id: number
  productId: number
  productName: string
  sku: string
  quantity: number
  unitLabel: string
  unitFactor: number
  unitPrice: number
  lineTotal: number
}

export interface Quotation {
  id: number
  quotationNumber: string
  customerId: number | null
  customerName: string
  createdByUserId: number
  createdByUserName: string
  totalAmount: number
  notes: string
  validUntil: string | null
  status: QuotationStatus
  convertedSaleId: number | null
  convertedInvoiceNumber: string | null
  createdAt: string
  items: QuotationItem[]
}

export interface CreateQuotationItem {
  productId: number
  quantity: number
  unitPrice: number
  unitFactor?: number
  unitLabel?: string
}

export interface CreateQuotationRequest {
  customerId?: number | null
  customerName?: string | null
  notes?: string | null
  validUntil?: string | null
  items: CreateQuotationItem[]
}

export interface ConvertQuotationRequest {
  paymentMethod: string
  customerId?: number | null
}

export const listQuotations = (status?: string): Promise<Quotation[]> => {
  const qs = status ? `?status=${encodeURIComponent(status)}` : ''
  return apiFetch<Quotation[]>(`/api/quotations${qs}`)
}

export const getQuotation = (id: number): Promise<Quotation> =>
  apiFetch<Quotation>(`/api/quotations/${id}`)

export const createQuotation = (body: CreateQuotationRequest): Promise<Quotation> =>
  apiFetch<Quotation>('/api/quotations', { method: 'POST', body })

export const convertQuotation = (id: number, body: ConvertQuotationRequest): Promise<Quotation> =>
  apiFetch<Quotation>(`/api/quotations/${id}/convert`, { method: 'POST', body })

export const cancelQuotation = (id: number): Promise<void> =>
  apiFetch<void>(`/api/quotations/${id}/cancel`, { method: 'POST' })
