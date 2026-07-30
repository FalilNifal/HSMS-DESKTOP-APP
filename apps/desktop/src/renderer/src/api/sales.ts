import { apiFetch } from './client'

export interface CreateSaleItem {
  productId: number
  quantity: number
  actualSellingPrice: number
  /** Base units per sold unit (1 = base unit). */
  unitFactor?: number
  /** Unit label to record, e.g. "box". Defaults to the product's base unit. */
  unitLabel?: string
}

export interface CreateSaleRequest {
  paymentMethod: string
  customerId?: number | null
  items: CreateSaleItem[]
}

export interface SaleItem {
  id: number
  productId: number
  productNameAtSale: string
  skuAtSale: string
  quantity: number
  unitLabel: string
  actualSellingPrice: number
  lineTotal: number
  lineProfit: number | null
}

export interface Sale {
  id: number
  invoiceNumber: string
  soldByUserId: number
  soldByUserName: string
  totalAmount: number
  totalProfit: number | null
  paymentMethod: string
  createdAt: string
  items: SaleItem[]
}

export interface InvoiceItem {
  productName: string
  sku: string
  quantity: number
  unitLabel: string
  actualSellingPrice: number
  lineTotal: number
}

export interface Invoice {
  invoiceNumber: string
  shopName: string
  /** Shop's own uploaded logo (data URL) or null. NEVER the app default — invoices show no logo if unset. */
  logo: string | null
  address: string
  phoneNumber: string
  invoiceFooterMessage: string
  cashierName: string
  createdAt: string
  paymentMethod: string
  subTotal: number
  taxAmount: number
  taxLabel: string
  totalAmount: number
  items: InvoiceItem[]
}

export const createSale = (body: CreateSaleRequest): Promise<Sale> =>
  apiFetch<Sale>('/api/sales', { method: 'POST', body })

export const getInvoice = (saleId: number): Promise<Invoice> =>
  apiFetch<Invoice>(`/api/sales/${saleId}/invoice`)

export const listSales = (
  fromDate?: string,
  toDate?: string,
  invoiceNumber?: string
): Promise<Sale[]> => {
  const params = new URLSearchParams()
  if (fromDate) params.set('fromDate', fromDate)
  if (toDate) params.set('toDate', toDate)
  if (invoiceNumber) params.set('invoiceNumber', invoiceNumber)
  const qs = params.toString()
  return apiFetch<Sale[]>(`/api/sales${qs ? `?${qs}` : ''}`)
}
