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
  setShopMeta: (meta: ShopMeta) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      currency: '',
      shopName: '',
      taxRatePercent: 0,
      taxLabel: 'Tax',
      logo: null,
      setShopMeta: (meta) => set(meta)
    }),
    { name: 'hsms-settings' }
  )
)
