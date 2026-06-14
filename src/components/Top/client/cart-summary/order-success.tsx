'use client'

import { CheckCircle2, Package } from 'lucide-react'

interface OrderSuccessProps {
  onGoHome: () => void
}

export function OrderSuccess({ onGoHome }: OrderSuccessProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-5 text-center">
      <div className="relative">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-green-500/20 animate-ping" style={{ animationDuration: '2s' }} />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold">تم إرسال طلبك بنجاح!</h2>
        <p className="text-muted-foreground max-w-xs mx-auto leading-relaxed">
          تم استلام طلبك وسيتم تحضيره قريباً. يمكنك متابعة حالته من زر تتبع الطلب.
        </p>
      </div>

      {/* رسالة تأكيد */}
      <div className="flex items-center gap-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-4 py-2">
        <Package className="h-4 w-4 text-[#D4AF37]" />
        <span className="text-xs font-medium text-[#D4AF37]">طلبك قيد المعالجة الآن</span>
      </div>

      <button
        onClick={onGoHome}
        className="mt-2 rounded-xl bg-primary px-10 py-3.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-lg active:scale-95"
      >
        العودة للقائمة
      </button>
    </div>
  )
}

