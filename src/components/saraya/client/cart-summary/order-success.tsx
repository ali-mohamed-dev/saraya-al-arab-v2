'use client'

import { CheckCircle2 } from 'lucide-react'

interface OrderSuccessProps {
  onGoHome: () => void
}

export function OrderSuccess({ onGoHome }: OrderSuccessProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
        <CheckCircle2 className="h-10 w-10" />
      </div>
      <h2 className="text-2xl font-bold">تم إرسال طلبك بنجاح!</h2>
      <p className="text-muted-foreground max-w-sm">
        تم استلام طلبك وسيتم تحضيره قريباً. يمكنك متابعة حالة الطلب من لوحة الويتر.
      </p>
      <button
        onClick={onGoHome}
        className="mt-4 rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        العودة للقائمة
      </button>
    </div>
  )
}