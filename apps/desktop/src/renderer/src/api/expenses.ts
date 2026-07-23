import { apiFetch } from './client'

export interface Expense {
  id: number
  category: string
  description: string
  amount: number
  paymentMethod: string
  expenseDate: string
  createdByUserName: string
  createdAt: string
}

export interface CreateExpenseRequest {
  category: string
  description?: string | null
  amount: number
  paymentMethod: string
  expenseDate?: string | null
}

export interface ExpenseCategoryTotal {
  category: string
  total: number
}

export interface ExpenseSummary {
  total: number
  byCategory: ExpenseCategoryTotal[]
}

export const EXPENSE_CATEGORIES = [
  'Rent',
  'Salaries',
  'Utilities',
  'Transport',
  'Stock purchase',
  'Maintenance',
  'Marketing',
  'Bank / fees',
  'Taxes',
  'Other'
]

export const EXPENSE_PAYMENT_METHODS = ['Cash', 'Card', 'Bank transfer', 'Cheque', 'Other']

function rangeQuery(fromDate?: string, toDate?: string, category?: string): string {
  const params = new URLSearchParams()
  if (fromDate) params.set('fromDate', fromDate)
  if (toDate) params.set('toDate', toDate)
  if (category) params.set('category', category)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export const listExpenses = (fromDate?: string, toDate?: string, category?: string): Promise<Expense[]> =>
  apiFetch<Expense[]>(`/api/expenses${rangeQuery(fromDate, toDate, category)}`)

export const getExpenseSummary = (fromDate?: string, toDate?: string): Promise<ExpenseSummary> =>
  apiFetch<ExpenseSummary>(`/api/expenses/summary${rangeQuery(fromDate, toDate)}`)

export const createExpense = (body: CreateExpenseRequest): Promise<Expense> =>
  apiFetch<Expense>('/api/expenses', { method: 'POST', body })

export const updateExpense = (id: number, body: CreateExpenseRequest): Promise<void> =>
  apiFetch<void>(`/api/expenses/${id}`, { method: 'PUT', body })

export const deleteExpense = (id: number): Promise<void> =>
  apiFetch<void>(`/api/expenses/${id}`, { method: 'DELETE' })
