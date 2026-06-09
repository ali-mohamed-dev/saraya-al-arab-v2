'use client'

export function ShiftLoadingScreen() {
  return (
    <div className="min-h-dvh bg-background flex items-center justify-center" dir="rtl">
      <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-8 text-center">
        <p className="text-lg font-bold text-[#D4AF37]">جاري التحقق من حالة الشيفت...</p>
      </div>
    </div>
  )
}

