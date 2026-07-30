import { apiFetch } from './client'

export interface StockLog {
  id: number
  productId: number
  productName: string
  sku: string
  oldQuantity: number
  newQuantity: number
  changeAmount: number
  reason: string
  changedByUserId: number
  changedByUserName: string
  createdAt: string
}

export const listStockLogs = (fromDate?: string, toDate?: string): Promise<StockLog[]> => {
  const params = new URLSearchParams()
  if (fromDate) params.set('fromDate', fromDate)
  if (toDate) params.set('toDate', toDate)
  const qs = params.toString()
  return apiFetch<StockLog[]>(`/api/stocklogs${qs ? `?${qs}` : ''}`)
}

export const listProductStockLogs = (productId: number): Promise<StockLog[]> =>
  apiFetch<StockLog[]>(`/api/stocklogs/product/${productId}`)
