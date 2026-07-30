import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ShopMeta {
  currency: string
  shopName: string
  taxRatePercent: number
  taxLabel: string
  /** Shop-uploaded logo (data URL) or null for the default mark. */
  logo: string | null
}

interface SettingsState extends ShopMeta {
  /** Accent color (hex) derived from the shop logo, or null for the default. */
  accentColor: string | null
  setShopMeta: (meta: ShopMeta) => void
  setAccentColor: (hex: string | null) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      currency: '',
      shopName: '',
      taxRatePercent: 0,
      taxLabel: 'Tax',
      logo: null,
      accentColor: null,
      setShopMeta: (meta) => set(meta),
      setAccentColor: (hex) => set({ accentColor: hex })
    }),
    { name: 'hsms-settings' }
  )
)
