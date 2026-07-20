import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartLine } from '../pages/PosPage'

export interface HeldSale {
  id: string
  label: string
  createdAt: string
  cart: CartLine[]
  customerId: string | null
  paymentMethod: string
}

interface HeldSalesState {
  held: HeldSale[]
  hold: (sale: Omit<HeldSale, 'id' | 'createdAt'>) => void
  remove: (id: string) => void
}

export const useHeldSalesStore = create<HeldSalesState>()(
  persist(
    (set) => ({
      held: [],
      hold: (sale) =>
        set((state) => ({
          held: [
            {
              ...sale,
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              createdAt: new Date().toISOString()
            },
            ...state.held
          ]
        })),
      remove: (id) => set((state) => ({ held: state.held.filter((h) => h.id !== id) }))
    }),
    { name: 'hsms-held-sales' }
  )
)
