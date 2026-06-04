'use client'

import { Coffee } from 'lucide-react'

export function BaristaEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 opacity-30">
      <Coffee className="h-20 w-20 text-blue-400 mb-4" />
      <p className="text-xl">لا توجد طلبات مشروبات حالياً</p>
    </div>
  )
}
