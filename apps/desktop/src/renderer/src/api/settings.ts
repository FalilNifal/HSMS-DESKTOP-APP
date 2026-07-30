import { apiFetch } from './client'

export interface ShopSettings {
  id: number
  shopName: string
  address: string
  phoneNumber: string
  /** Shop-uploaded logo as a data URL, or null to use the default. */
  logo: string | null
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
  logo: string | null
  currency: string
  invoiceFooterMessage: string
  taxRatePercent: number
  taxLabel: string
}

export const getShopSettings = (): Promise<ShopSettings> =>
  apiFetch<ShopSettings>('/api/shopsettings')

export const updateShopSettings = (body: UpdateShopSettingsRequest): Promise<ShopSettings> =>
  apiFetch<ShopSettings>('/api/shopsettings', { method: 'PUT', body })
