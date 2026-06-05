'use client'

import { UtensilsCrossed, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ShiftClosedScreenProps {
  onLogout: () => void
}

export function ShiftClosedScreen({ onLogout }: ShiftClosedScreenProps) {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-30 border-b border-[#D4AF37]/20 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#D4AF37]/10">
              <UtensilsCrossed className="h-5 w-5 text-[#D4AF37]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#D4AF37]">لوحة الويتر</h1>
              <p className="text-xs text-muted-foreground">توب </p>
            </div>
          </div>
          <div>
            <Button variant="ghost" onClick={onLogout} className="gap-2 text-muted-foreground hover:text-red-400">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">خروج</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 md:p-6">
        <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <h2 className="mb-2 text-2xl font-bold text-red-600">الويتر مغلق</h2>
          <p className="text-muted-foreground">صفحه الويتر مغلقه حتى يقوم المسؤول ببدء شيفت جديد.</p>
        </div>
      </main>
    </div>
  )
}
