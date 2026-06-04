'use client'

import { CartItemType, useCartStore } from '@/store/cart-store'
import { Minus, Plus, Trash2 } from 'lucide-react'

function getAddOnKey(addOns: CartItemType['addOns']): string {
  if (!addOns || addOns.length === 0) return ''
  return addOns.map((a) => a.id).sort().join(',')
}

interface CartItemsListProps {
  items: CartItemType[]
  onUpdateQuantity: (mealId: string, addOnKey: string, quantity: number) => void
  onRemoveItem: (mealId: string, addOnKey: string) => void
}

export function CartItemsList({ items, onUpdateQuantity, onRemoveItem }: CartItemsListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-lg">السلة فارغة</p>
        <p className="text-sm mt-1">أضف أطباقاً لبدء الطلب</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const addOnKey = getAddOnKey(item.addOns)
        return (
          <div
            key={`${item.mealId}-${addOnKey || 'default'}`}
            className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm"
          >
            {item.imageUrl && (
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt={item.titleAr}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate">{item.titleAr}</h4>
              {item.addOns && item.addOns.length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {item.addOns.map((a) => a.titleAr).join('، ')}
                </p>
              )}
              <p className="text-sm font-bold text-primary mt-1">
                {((item.price + (item.addOns?.reduce((s, a) => s + a.price, 0) || 0)) * item.quantity).toFixed(2)} ج.م
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (item.quantity <= 1) {
                    onRemoveItem(item.mealId, addOnKey)
                  } else {
                    onUpdateQuantity(item.mealId, addOnKey, item.quantity - 1)
                  }
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted transition-colors"
              >
                {item.quantity <= 1 ? (
                  <Trash2 className="h-4 w-4" />
                ) : (
                  <Minus className="h-4 w-4" />
                )}
              </button>
              <span className="min-w-[24px] text-center font-bold text-sm">
                {item.quantity}
              </span>
              <button
                onClick={() => onUpdateQuantity(item.mealId, addOnKey, item.quantity + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}