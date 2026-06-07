import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SERVICE_CHARGE_RATE } from '@/lib/saraya/constants'

export interface SelectedAddOn {
  id: string
  title: string
  titleAr: string
  price: number
}

export interface CartItemType {
  mealId: string
  title: string
  titleAr: string
  price: number
  quantity: number
  imageUrl: string
  addOns: SelectedAddOn[]
  preparationArea: string
  category: string
  addedAt?: number  // timestamp when item was added
}

interface CartStore {
  items: CartItemType[]
  addItem: (item: CartItemType) => void
  removeItem: (mealId: string, addOnKey: string) => void
  updateQuantity: (mealId: string, addOnKey: string, quantity: number) => void
  clearCart: () => void
  getTotalItems: () => number
  getTotalPrice: () => number
}

// Generate a unique key for a cart item based on meal + selected add-ons
function getAddOnKey(addOns: SelectedAddOn[]): string {
  if (!addOns || addOns.length === 0) return ''
  return addOns
    .map((a) => a.id)
    .sort()
    .join(',')
}

// Auto-expire cart items older than 2 hours
const CART_EXPIRY_MS = 2 * 60 * 60 * 1000

function cleanExpiredItems(items: CartItemType[]): CartItemType[] {
  const now = Date.now()
  return items.filter((item) => {
    if (!item.addedAt) return true
    return now - item.addedAt < CART_EXPIRY_MS
  })
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const cleanItems = cleanExpiredItems(state.items)
          const addOnKey = getAddOnKey(item.addOns)
          const existing = cleanItems.find(
            (i) => i.mealId === item.mealId && getAddOnKey(i.addOns) === addOnKey
          )
          if (existing) {
            return {
              items: cleanItems.map((i) =>
                i.mealId === item.mealId && getAddOnKey(i.addOns) === addOnKey
                  ? { ...i, quantity: i.quantity + (item.quantity || 1) }
                  : i
              ),
            }
          }
          return { items: [...cleanItems, { ...item, quantity: item.quantity || 1, addedAt: Date.now() }] }
        }),
      removeItem: (mealId, addOnKey) =>
        set((state) => ({
          items: cleanExpiredItems(state.items).filter(
            (i) => !(i.mealId === mealId && getAddOnKey(i.addOns) === addOnKey)
          ),
        })),
      updateQuantity: (mealId, addOnKey, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? cleanExpiredItems(state.items).filter(
                  (i) => !(i.mealId === mealId && getAddOnKey(i.addOns) === addOnKey)
                )
              : cleanExpiredItems(state.items).map((i) =>
                  i.mealId === mealId && getAddOnKey(i.addOns) === addOnKey
                    ? { ...i, quantity }
                    : i
                ),
        })),
      clearCart: () => set({ items: [] }),
      getTotalItems: () => cleanExpiredItems(get().items).reduce((sum, item) => sum + item.quantity, 0),
      getTotalPrice: () => {
          const cleanItems = cleanExpiredItems(get().items)
          const subtotal = cleanItems.reduce((sum, item) => {
            const addOnTotal = item.addOns?.reduce((s, a) => s + a.price, 0) || 0
            return sum + (item.price + addOnTotal) * item.quantity
          }, 0)
          return subtotal
        },
    }),
    {
      name: 'saraya-cart',
      version: 1,
      partialize: (state) => ({ items: state.items }),
      merge: (persisted, current) => ({ ...current, items: (persisted as any)?.items ?? current.items }),
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          return { items: [] }
        }
        return persistedState
      },
    }
  )
)