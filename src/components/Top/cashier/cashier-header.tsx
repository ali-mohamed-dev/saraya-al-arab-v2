'use client'

import { useState } from 'react'
import { LogOut, RefreshCw, Bell, DollarSign, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/Top/shared/theme-toggle'

interface CashierHeaderProps {
  username: string
  readyCount: number
  onRefresh: () => void
  onLogout: () => void
  onNewOrder?: () => void
}

export function CashierHeader({ username, readyCount, onRefresh, onLogout, onNewOrder }: CashierHeaderProps) {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await onRefresh()
    setTimeout(() => setRefreshing(false), 800)
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[#D4AF37]/20 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#D4AF37]/10">
            <DollarSign className="h-5 w-5 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-[#D4AF37]">لوحة الكاشير</h1>
            <p className="hidden sm:block text-xs text-muted-foreground">توب  — {username}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {readyCount > 0 && (
            <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 rounded-lg px-2 sm:px-3 py-1.5 animate-pulse">
              <Bell className="h-4 w-4 text-green-400" />
              <span className="text-xs sm:text-sm font-bold text-green-400">{readyCount}</span>
            </div>
          )}
          <button onClick={handleRefresh} disabled={refreshing}
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-border/40 text-muted-foreground hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all disabled:opacity-50">
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </button>
          {onNewOrder && (
            <Button onClick={onNewOrder} className="gap-1.5 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 px-3 h-9 text-xs sm:text-sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">طلب جديد</span>
            </Button>
          )}
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
