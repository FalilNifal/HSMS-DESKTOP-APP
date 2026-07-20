import { apiFetch } from './client'

export interface ShopSettings {
  id: number
  shopName: string
  address: string
  phoneNumber: string
  logoPath: string | null
  currency: string
  invoiceFooterMessage: string
  taxRatePercent: number
  taxLabel: string
  createdAt: string
  updatedAt: string | null
}

export interface UpdateShopSettingsRequest {
  shopName: string
  address: string
  phoneNumber: string
  currency: string
  invoiceFooterMessage: string
  taxRatePercent: number
  taxLabel: string
}

export const getShopSettings = (): Promise<ShopSettings> =>
  apiFetch<ShopSettings>('/api/shopsettings')

export const updateShopSettings = (body: UpdateShopSettingsRequest): Promise<ShopSettings> =>
  apiFetch<ShopSettings>('/api/shopsettings', { method: 'PUT', body })
