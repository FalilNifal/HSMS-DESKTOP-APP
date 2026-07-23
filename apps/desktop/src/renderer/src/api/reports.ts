import { apiFetch } from './client'

export interface DailySalesReport {
  date: string
  totalSales: number
  totalOrders: number
}

export interface ProfitReport {
  periodStart: string
  periodEnd: string
  totalSales: number
  totalProfit: number
  totalOrders: number
  totalRefunds: number
  netSales: number
  netProfit: number
}

export interface ReorderItem {
  productId: number
  name: string
  sku: string
  supplierId: number | null
  supplierName: string
  stockQuantity: number
  lowStockLevel: number
  suggestedQuantity: number
}

export interface ReorderReport {
  items: ReorderItem[]
}

export interface DeadStockItem {
  productId: number
  name: string
  sku: string
  stockQuantity: number
  stockValueAtCost: number
  lastSoldDate: string | null
}

export interface DeadStockReport {
  days: number
  items: DeadStockItem[]
}

export interface ProductSalesItem {
  productId: number
  productName: string
  sku: string
  quantitySold: number
  totalSales: number
  totalProfit: number
}

export interface ProductSalesReport {
  fromDate: string
  toDate: string
  items: ProductSalesItem[]
}

export interface CashierSalesItem {
  cashierUserId: number
  cashierName: string
  totalSales: number
  totalProfit: number
  orderCount: number
}

export interface CashierSalesReport {
  fromDate: string
  toDate: string
  items: CashierSalesItem[]
}

export interface LowStockItem {
  productId: number
  name: string
  sku: string
  stockQuantity: number
  lowStockLevel: number
}

export interface LowStockReport {
  items: LowStockItem[]
}

export interface SalesTrendItem {
  date: string
  totalSales: number
  totalProfit: number
  orderCount: number
}

export interface SalesTrendReport {
  fromDate: string
  toDate: string
  items: SalesTrendItem[]
}

export const getDailySales = (date: string): Promise<DailySalesReport> =>
  apiFetch<DailySalesReport>(`/api/reports/daily-sales?date=${date}`)

export const getDailyProfit = (date: string): Promise<ProfitReport> =>
  apiFetch<ProfitReport>(`/api/reports/daily-profit?date=${date}`)

export const getDateRangeSales = (fromDate: string, toDate: string): Promise<ProfitReport> =>
  apiFetch<ProfitReport>(`/api/reports/date-range-sales?fromDate=${fromDate}&toDate=${toDate}`)

export const getProductSales = (
  fromDate: string,
  toDate: string,
  categoryId?: number | null
): Promise<ProductSalesReport> => {
  const categoryParam = categoryId ? `&categoryId=${categoryId}` : ''
  return apiFetch<ProductSalesReport>(
    `/api/reports/product-sales?fromDate=${fromDate}&toDate=${toDate}${categoryParam}`
  )
}

export const getSalesTrend = (fromDate: string, toDate: string): Promise<SalesTrendReport> =>
  apiFetch<SalesTrendReport>(`/api/reports/sales-trend?fromDate=${fromDate}&toDate=${toDate}`)

export const getCashierSales = (fromDate: string, toDate: string): Promise<CashierSalesReport> =>
  apiFetch<CashierSalesReport>(`/api/reports/cashier-sales?fromDate=${fromDate}&toDate=${toDate}`)

export const getLowStock = (): Promise<LowStockReport> =>
  apiFetch<LowStockReport>('/api/reports/low-stock')

export interface InventoryValueReport {
  totalCostValue: number
  totalRetailValue: number
  productCount: number
  totalUnits: number
}

export const getInventoryValue = (): Promise<InventoryValueReport> =>
  apiFetch<InventoryValueReport>('/api/reports/inventory-value')

export const getReorder = (): Promise<ReorderReport> =>
  apiFetch<ReorderReport>('/api/reports/reorder')

export const getDeadStock = (days: number): Promise<DeadStockReport> =>
  apiFetch<DeadStockReport>(`/api/reports/dead-stock?days=${days}`)

export interface PaymentMethodTotal {
  method: string
  count: number
  total: number
}

export interface ZReport {
  date: string
  salesByMethod: PaymentMethodTotal[]
  salesCount: number
  grossSales: number
  taxCollected: number
  cashSales: number
  refundsTotal: number
  refundsCount: number
  expensesTotal: number
  expensesCash: number
  customerPaymentsTotal: number
  customerPaymentsCash: number
  supplierPaymentsTotal: number
  supplierPaymentsCash: number
  expectedCashInDrawer: number
}

export const getZReport = (date: string): Promise<ZReport> =>
  apiFetch<ZReport>(`/api/reports/z-report?date=${date}`)
