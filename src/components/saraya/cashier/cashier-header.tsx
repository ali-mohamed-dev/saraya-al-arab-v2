'use client'

import { LogOut, RefreshCw, Bell, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/saraya/shared/theme-toggle'

interface CashierHeaderProps {
  username: string
  readyCount: number
  onRefresh: () => void
  onLogout: () => void
}

export function CashierHeader({ username, readyCount, onRefresh, onLogout }: CashierHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#D4AF37]/20 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#D4AF37]/10">
            <DollarSign className="h-5 w-5 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#D4AF37]">لوحة الكاشير</h1>
            <p className="text-xs text-muted-foreground">سرايا العرب — {username}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {readyCount > 0 && (
            <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-1.5 animate-pulse">
              <Bell className="h-4 w-4 text-green-400" />
              <span className="text-sm font-bold text-green-400">{readyCount} جاهز للدفع</span>
            </div>
          )}
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={onRefresh} className="gap-2 text-muted-foreground hover:text-[#D4AF37]">
            <RefreshCw className="h-4 w-4" />تحديث
          </Button>
          <Button variant="ghost" onClick={onLogout} className="gap-2 text-muted-foreground hover:text-red-400">
            <LogOut className="h-4 w-4" />خروج
          </Button>
        </div>
      </div>
    </header>
  )
}
