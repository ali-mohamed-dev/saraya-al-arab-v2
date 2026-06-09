'use client'

import { CartItemType } from '@/store/cart-store'
import { OrderSummaryType } from './types'

function getAddOnKey(addOns: CartItemType['addOns']): string {
  if (!addOns || addOns.length === 0) return ''
  return addOns.map((a) => a.id).sort().join(',')
}

interface OrderSummaryProps {
  items: CartItemType[]
  summary: OrderSummaryType
}

export function OrderSummary({ items, summary }: OrderSummaryProps) {
  const getItemTotal = (item: CartItemType) => {
    const addOnsTotal = item.addOns?.reduce((sum, a) => sum + a.price, 0) || 0
    return (item.price + addOnsTotal) * item.quantity
  }

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-base">ملخص الطلب</h3>
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={`${item.mealId}-${getAddOnKey(item.addOns) || 'default'}`}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex-1 min-w-0">
                <span className="font-medium">{item.titleAr}</span>
                {item.addOns && item.addOns.length > 0 && (
                  <span className="text-muted-foreground mr-1 text-xs">
                    ({item.addOns.map((a) => a.titleAr).join('، ')})
                  </span>
                )}
                {item.quantity > 1 && (
                  <span className="text-muted-foreground mr-1">× {item.quantity}</span>
                )}
              </div>
              <span className="font-semibold">
                {getItemTotal(item).toFixed(2)} ج.م
              </span>
            </div>
          ))}
        </div>
        <div className="border-t pt-2 space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">المجموع الفرعي</span>
            <span>{summary.subtotal.toFixed(2)} ج.م</span>
          </div>
          {summary.serviceCharge > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">رسوم الخدمة (12%)</span>
              <span>{summary.serviceCharge.toFixed(2)} ج.م</span>
            </div>
          )}
          {summary.deliveryFee > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">رسوم التوصيل</span>
              <span>{summary.deliveryFee.toFixed(2)} ج.م</span>
            </div>
          )}
          {summary.discount > 0 && (
            <div className="flex items-center justify-between text-sm text-green-600">
              <span>الخصم</span>
              <span>-{summary.discount.toFixed(2)} ج.م</span>
            </div>
          )}
          <div className="flex items-center justify-between font-bold text-base border-t pt-2 mt-2">
            <span>الإجمالي</span>
            <span className="text-primary">{summary.total.toFixed(2)} ج.م</span>
          </div>
        </div>
      </div>
    </div>
  )
}

