'use client'

import { useMemo } from 'react'
import { CartItemType, useCartStore } from '@/store/cart-store'
import { Minus, Plus, Trash2, ShoppingCart, Clock } from 'lucide-react'

const CART_EXPIRY_WARNING_MS = 90 * 60 * 1000 // 90 دقيقة
const CART_EXPIRY_MS = 2 * 60 * 60 * 1000 // ساعتين

function getAddOnKey(addOns: CartItemType['addOns']): string {
  if (!addOns || addOns.length === 0) return ''
  return addOns.map((a) => a.id).sort().join(',')
}

function getRemainingTime(addedAt: number | undefined): string | null {
  if (!addedAt) return null
  const elapsed = Date.now() - addedAt
  const remaining = CART_EXPIRY_MS - elapsed
  if (remaining <= 0) return 'منتهية'
  if (remaining > CART_EXPIRY_WARNING_MS) return null
  const mins = Math.ceil(remaining / 60000)
  return `${mins} دقيقة`
}

interface CartItemsListProps {
  items: CartItemType[]
  onUpdateQuantity: (mealId: string, addOnKey: string, quantity: number) => void
  onRemoveItem: (mealId: string, addOnKey: string) => void
}

export function CartItemsList({ items, onUpdateQuantity, onRemoveItem }: CartItemsListProps) {
  const now = Date.now()

  const expiredCount = useMemo(() =>
    items.filter((i) => i.addedAt && (now - i.addedAt) >= CART_EXPIRY_MS).length,
    [items, now]
  )

  const nearExpiryCount = useMemo(() =>
    items.filter((i) => {
      if (!i.addedAt) return false
      const elapsed = now - i.addedAt
      return elapsed >= CART_EXPIRY_WARNING_MS && elapsed < CART_EXPIRY_MS
    }).length,
    [items, now]
  )

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4">
        <div className="relative mb-5">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/5 border-2 border-dashed border-[#D4AF37]/30">
            <ShoppingCart className="h-10 w-10 text-[#D4AF37]/60" />
          </div>
          <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-transparent border border-[#D4AF37]/20" />
          <div className="absolute -bottom-1 -left-1 h-3 w-3 rounded-full bg-gradient-to-br from-[#D4AF37]/15 to-transparent" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-1.5">سلتك فارغة</h3>
        <p className="text-sm text-muted-foreground text-center max-w-[220px] leading-relaxed">
          تصفح القائمة واختر أطباقك المفضلة لإضافتها هنا
        </p>
        <div className="flex items-center gap-2 mt-5">
          <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#D4AF37]/30" />
          <div className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]/40" />
          <div className="h-px w-8 bg-gradient-to-l from-transparent to-[#D4AF37]/30" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {nearExpiryCount > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex items-center gap-2">
          <Clock className="h-4 w-4 flex-shrink-0" />
          <span>
            {nearExpiryCount === 1
              ? 'عنصر واحد في سلة التسوق على وشك الانتهاء. أرسل الطلب قريباً.'
              : `${nearExpiryCount} عناصر في سلة التسوق على وشك الانتهاء. أرسل الطلب قريباً.`}
          </span>
        </div>
      )}
      {items.map((item) => {
        const addOnKey = getAddOnKey(item.addOns)
        const remaining = getRemainingTime(item.addedAt)
        return (
          <div
            key={`${item.mealId}-${addOnKey || 'default'}`}
            className={`rounded-xl border bg-card p-3 shadow-sm ${
              remaining === 'منتهية' ? 'opacity-50 border-red-500/30' : ''
            }`}
          >
            <div className="flex gap-3">
              {item.imageUrl && (
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
                  <img
                    src={item.imageUrl}
                    alt={item.titleAr}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm leading-snug">{item.titleAr}</h4>
                {item.addOns && item.addOns.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                    {item.addOns.map((a) => a.titleAr).join('، ')}
                  </p>
                )}
                {remaining && remaining !== 'منتهية' && (
                  <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    تنتهي بعد {remaining}
                  </p>
                )}
                {remaining === 'منتهية' && (
                  <p className="text-[10px] text-red-400 mt-1">انتهت صلاحية هذا العنصر</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-2">
              <p className="text-sm font-bold text-primary">
                {((item.price + (item.addOns?.reduce((s, a) => s + a.price, 0) || 0)) * item.quantity).toFixed(2)} ج.م
              </p>

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
          </div>
        )
      })}
    </div>
  )
}
