import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
}

interface CartStore {
  items: CartItemType[]
  addItem: (item: Omit<CartItemType, 'quantity'> & { quantity?: number }) => void
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

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const addOnKey = getAddOnKey(item.addOns)
          const quantityToAdd = item.quantity ?? 1
          const existing = state.items.find(
            (i) => i.mealId === item.mealId && getAddOnKey(i.addOns) === addOnKey
          )
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.mealId === item.mealId && getAddOnKey(i.addOns) === addOnKey
                  ? { ...i, quantity: i.quantity + quantityToAdd }
                  : i
              ),
            }
          }
          return { items: [...state.items, { ...item, quantity: quantityToAdd }] }
        }),
      removeItem: (mealId, addOnKey) =>
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.mealId === mealId && getAddOnKey(i.addOns) === addOnKey)
          ),
        })),
      updateQuantity: (mealId, addOnKey, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter(
                  (i) => !(i.mealId === mealId && getAddOnKey(i.addOns) === addOnKey)
                )
              : state.items.map((i) =>
                  i.mealId === mealId && getAddOnKey(i.addOns) === addOnKey
                    ? { ...i, quantity }
                    : i
                ),
        })),
      clearCart: () => set({ items: [] }),
      getTotalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
      getTotalPrice: () => {
          const subtotal = get().items.reduce((sum, item) => {
            const addOnTotal = item.addOns?.reduce((s, a) => s + a.price, 0) || 0
            return sum + (item.price + addOnTotal) * item.quantity
          }, 0)
          return subtotal * 1.12 // 12% خدمة
        },
    }),
    {
      name: 'saraya-cart',
    }
  )
)
