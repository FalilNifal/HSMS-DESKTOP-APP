import { apiFetch } from './client'

export interface Product {
  id: number
  name: string
  sku: string
  categoryId: number
  categoryName: string
  supplierId: number | null
  supplierName: string | null
  /** Null for Cashier role (server hides cost). Present for Admin/Manager. */
  purchasePrice: number | null
  minimumSellingPrice: number
  stockQuantity: number
  lowStockLevel: number
  /** Base unit label, e.g. "pcs", "kg", "m". */
  unit: string
  /** Optional bulk unit label, e.g. "box". Null = sold only in the base unit. */
  secondaryUnit: string | null
  /** Base units per secondary unit (e.g. 12 pcs per box). 0 when no secondary unit. */
  secondaryUnitFactor: number
  /** Default selling price for one secondary unit. */
  secondaryUnitPrice: number
  isActive: boolean
  createdAt: string
  updatedAt: string | null
}

export interface ProductWriteRequest {
  name: string
  sku: string
  categoryId: number
  supplierId: number | null
  purchasePrice: number
  minimumSellingPrice: number
  stockQuantity: number
  lowStockLevel: number
  unit: string
  secondaryUnit: string | null
  secondaryUnitFactor: number
  secondaryUnitPrice: number
}

export interface UpdateStockRequest {
  newQuantity: number
  reason: string
}

export const listProducts = (): Promise<Product[]> => apiFetch<Product[]>('/api/products')

export const createProduct = (body: ProductWriteRequest): Promise<Product> =>
  apiFetch<Product>('/api/products', { method: 'POST', body })

export const updateProduct = (id: number, body: ProductWriteRequest): Promise<void> =>
  apiFetch<void>(`/api/products/${id}`, { method: 'PUT', body })

export const updateStock = (id: number, body: UpdateStockRequest): Promise<void> =>
  apiFetch<void>(`/api/products/${id}/stock`, { method: 'PATCH', body })

export const deactivateProduct = (id: number): Promise<void> =>
  apiFetch<void>(`/api/products/${id}`, { method: 'DELETE' })

export const reactivateProduct = (id: number): Promise<void> =>
  apiFetch<void>(`/api/products/${id}/reactivate`, { method: 'POST' })

export interface ImportProductRow {
  name: string
  sku: string
  categoryName: string
  supplierName?: string | null
  purchasePrice: number
  minimumSellingPrice: number
  stockQuantity: number
  lowStockLevel: number
}

export interface ImportProductError {
  rowNumber: number
  sku: string
  message: string
}

export interface ImportResult {
  createdCount: number
  skippedCount: number
  errors: ImportProductError[]
}

export const importProducts = (rows: ImportProductRow[]): Promise<ImportResult> =>
  apiFetch<ImportResult>('/api/products/import', { method: 'POST', body: { rows } })

export interface StockTakeItem {
  productId: number
  countedQuantity: number
}

export interface StockTakeVariance {
  productId: number
  name: string
  sku: string
  systemQuantity: number
  countedQuantity: number
  variance: number
}

export interface StockTakeResult {
  adjustedCount: number
  variances: StockTakeVariance[]
}

export const applyStockTake = (items: StockTakeItem[]): Promise<StockTakeResult> =>
  apiFetch<StockTakeResult>('/api/products/stock-take', { method: 'POST', body: { items } })
