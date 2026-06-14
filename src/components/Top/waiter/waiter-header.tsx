'use client'

import { useState } from 'react'
import { UtensilsCrossed, LogOut, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/Top/shared/theme-toggle'

interface WaiterHeaderProps {
  pendingCount: number
  confirmedCount: number
  preparingCount: number
  readyCount: number
  onLogout: () => void
  onRefresh?: () => void
}

export function WaiterHeader({
  pendingCount,
  confirmedCount,
  preparingCount,
  readyCount,
  onLogout,
  onRefresh,
}: WaiterHeaderProps) {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    if (!onRefresh) return
    setRefreshing(true)
    await onRefresh()
    setTimeout(() => setRefreshing(false), 800)
  }

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
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Count badges */}
          <div className="flex items-center gap-1">
            {pendingCount > 0 && (
              <span className="flex items-center gap-1 rounded-md bg-yellow-500/10 border border-yellow-500/30 px-1.5 py-1 text-[10px] font-bold text-yellow-400">
                {pendingCount}
                <span className="hidden sm:inline">جديد</span>
              </span>
            )}
            {confirmedCount > 0 && (
              <span className="flex items-center gap-1 rounded-md bg-blue-500/10 border border-blue-500/30 px-1.5 py-1 text-[10px] font-bold text-blue-400">
                {confirmedCount}
                <span className="hidden sm:inline">مؤكد</span>
              </span>
            )}
            {preparingCount > 0 && (
              <span className="flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/30 px-1.5 py-1 text-[10px] font-bold text-amber-400">
                {preparingCount}
                <span className="hidden sm:inline">يحضر</span>
              </span>
            )}
            {readyCount > 0 && (
              <span className="flex items-center gap-1 rounded-md bg-green-500/10 border border-green-500/30 px-1.5 py-1 text-[10px] font-bold text-green-400 animate-pulse">
                {readyCount}
                <span className="hidden sm:inline">جاهز</span>
              </span>
            )}
          </div>
          <button onClick={handleRefresh} disabled={refreshing}
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-border/40 text-muted-foreground hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all disabled:opacity-50">
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </button>
          <ThemeToggle />
          <Button variant="ghost" onClick={onLogout} className="gap-1 sm:gap-2 text-muted-foreground hover:text-red-400 px-2 sm:px-3 h-9">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">خروج</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
