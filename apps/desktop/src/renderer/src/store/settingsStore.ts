import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ShopMeta {
  currency: string
  shopName: string
  taxRatePercent: number
  taxLabel: string
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
      setShopMeta: (meta) => set(meta)
    }),
    { name: 'hsms-settings' }
  )
)
