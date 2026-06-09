'use client'

import { UtensilsCrossed, LogOut, Clock, ChefHat, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/Top/shared/theme-toggle'

interface WaiterHeaderProps {
  pendingCount: number
  confirmedCount: number
  preparingCount: number
  readyCount: number
  onLogout: () => void
}

export function WaiterHeader({
  pendingCount,
  confirmedCount,
  preparingCount,
  readyCount,
  onLogout,
}: WaiterHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#D4AF37]/20 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#D4AF37]/10">
            <UtensilsCrossed className="h-5 w-5 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-[#D4AF37]">لوحة الويتر</h1>
            <p className="hidden sm:block text-xs text-muted-foreground">توب </p>
          </div>
        </div>
          <div className="flex items-center gap-1 sm:gap-3">
            {/* Active counts badges */}
            <div className="hidden sm:flex items-center gap-2">
            {pendingCount > 0 && (
              <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30 gap-1">
                <Clock className="h-3 w-3" />
                {pendingCount} جديد
              </Badge>
            )}
            {confirmedCount > 0 && (
              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 gap-1">
                <Check className="h-3 w-3" />
                {confirmedCount} مؤكد
              </Badge>
            )}
            {preparingCount > 0 && (
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 gap-1">
                <ChefHat className="h-3 w-3" />
                {preparingCount} يُحضّر
              </Badge>
            )}
            {readyCount > 0 && (
              <Badge className="bg-green-500/10 text-green-400 border-green-500/30 gap-1">
                <Check className="h-3 w-3" />
                {readyCount} جاهز للاستلام
              </Badge>
            )}
          </div>
          <ThemeToggle />
          <Button variant="ghost" onClick={onLogout} className="gap-1 sm:gap-2 text-muted-foreground hover:text-red-400 px-2 sm:px-4">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">خروج</span>
          </Button>
        </div>
      </div>
    </header>
  )
}

