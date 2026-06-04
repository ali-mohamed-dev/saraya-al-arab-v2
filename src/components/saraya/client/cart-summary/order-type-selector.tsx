'use client'

import { OrderType } from './types'
import { UtensilsCrossed, ShoppingBag, Truck } from 'lucide-react'

interface OrderTypeSelectorProps {
  selectedType: OrderType
  onSelectType: (type: OrderType) => void
}

export function OrderTypeSelector({ selectedType, onSelectType }: OrderTypeSelectorProps) {
  const orderTypes: { type: OrderType; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      type: 'dine-in',
      label: 'تناول في المطعم',
      icon: <UtensilsCrossed className="h-6 w-6" />,
      desc: 'اختر طاولتك واطلب',
    },
    {
      type: 'takeaway',
      label: 'أخذ بعيداً',
      icon: <ShoppingBag className="h-6 w-6" />,
      desc: 'خذ طلبك معك',
    },
    {
      type: 'delivery',
      label: 'توصيل للمنزل',
      icon: <Truck className="h-6 w-6" />,
      desc: 'نوصل طلبك لعنوانك',
    },
  ]

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-base">نوع الطلب</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {orderTypes.map(({ type, label, icon, desc }) => (
          <button
            key={type}
            onClick={() => onSelectType(type)}
            className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
              selectedType === type
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:border-primary/50'
            }`}
          >
            {icon}
            <span className="font-semibold text-sm">{label}</span>
            <span className="text-xs">{desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}