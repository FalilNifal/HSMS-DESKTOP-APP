import { useSettingsStore } from '../store/settingsStore'

const moneyFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

const integerFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0
})

/**
 * Formats a monetary amount to 2 decimals, prefixed with the shop currency
 * (e.g. "LKR 1,250.00"). Returns an em dash for null.
 */
export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  const amount = moneyFormatter.format(value)
  const currency = useSettingsStore.getState().currency
  return currency ? `${currency} ${amount}` : amount
}

export function formatInteger(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return integerFormatter.format(value)
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
