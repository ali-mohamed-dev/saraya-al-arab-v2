'use client'

import { ChefHat } from 'lucide-react'

export function KitchenEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <ChefHat className="h-16 w-16 text-[#D4AF37]/20 mb-4" />
      <p className="text-xl text-muted-foreground mb-1">لا توجد طلبات حالياً</p>
      <p className="text-sm text-muted-foreground/60">ستظهر الطلبات الجديدة تلقائياً</p>
    </div>
  )
}
