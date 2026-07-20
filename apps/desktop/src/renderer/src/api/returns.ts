import { apiFetch } from './client'

export interface ReturnableItem {
  productId: number
  productName: string
  sku: string
  soldQuantity: number
  alreadyReturned: number
  returnableQuantity: number
  unitPrice: number
}

export interface ReturnableSale {
  saleId: number
  invoiceNumber: string
  soldByUserName: string
  createdAt: string
  items: ReturnableItem[]
}

export interface ReturnItemResult {
  productId: number
  productNameAtSale: string
  skuAtSale: string
  quantity: number
  unitPrice: number
  lineRefund: number
}

export interface ReturnRecord {
  id: number
  returnNumber: string
  saleId: number
  invoiceNumber: string
  processedByUserName: string
  totalRefund: number
  reason: string
  createdAt: string
  items: ReturnItemResult[]
}

export interface CreateReturnRequest {
  invoiceNumber: string
  reason: string
  items: Array<{ productId: number; quantity: number }>
}

export const getReturnable = (invoiceNumber: string): Promise<ReturnableSale> =>
  apiFetch<ReturnableSale>(`/api/returns/returnable?invoiceNumber=${encodeURIComponent(invoiceNumber)}`)

export const listReturns = (fromDate?: string, toDate?: string): Promise<ReturnRecord[]> => {
  const params = new URLSearchParams()
  if (fromDate) params.set('fromDate', fromDate)
  if (toDate) params.set('toDate', toDate)
  const qs = params.toString()
  return apiFetch<ReturnRecord[]>(`/api/returns${qs ? `?${qs}` : ''}`)
}

export const createReturn = (body: CreateReturnRequest): Promise<ReturnRecord> =>
  apiFetch<ReturnRecord>('/api/returns', { method: 'POST', body })
