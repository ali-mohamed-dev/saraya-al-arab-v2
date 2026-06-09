'use client'

import { ChefHat, LogOut, RefreshCw, Maximize, Minimize, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/Top/shared/theme-toggle'

interface KitchenHeaderProps {
  confirmedCount: number
  preparingCount: number
  totalCount: number
  refreshCountdown?: number
  isFullscreen: boolean
  onToggleFullscreen: () => void
  onLogout: () => void
}

const REFRESH_INTERVAL_SECONDS = 5

export function KitchenHeader({
  confirmedCount,
  preparingCount,
  totalCount,
  refreshCountdown = REFRESH_INTERVAL_SECONDS,
  isFullscreen,
  onToggleFullscreen,
  onLogout,
}: KitchenHeaderProps) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[#D4AF37]/20 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 md:h-16 items-center justify-between px-3 md:px-6">
          {/* Right side: Logo + Title */}
          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-[#D4AF37]/10 overflow-hidden">
              <img src="/logo.svg" alt="Logo" className="h-full w-full object-cover" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-[#D4AF37]">شاشة المطبخ</h1>
              <p className="text-[10px] md:text-xs text-muted-foreground">توب  - المطبخ</p>
            </div>
          </div>

          {/* Left side: Controls */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Refresh Countdown Indicator */}
            <div className="flex items-center gap-1.5 rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/5 px-2 py-1">
              <RefreshCw className={`h-3.5 w-3.5 text-[#D4AF37] ${refreshCountdown <= 3 ? 'animate-spin' : ''}`} />
              <span className="text-xs font-mono text-[#D4AF37]">{refreshCountdown}s</span>
            </div>

            {/* Fullscreen Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleFullscreen}
              className="gap-1.5 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 h-8 px-2 md:px-3"
            >
              {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
              <span className="hidden md:inline">{isFullscreen ? 'إنهاء' : 'ملء الشاشة'}</span>
            </Button>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Logout */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { if (window.confirm('هل أنت متأكد من تسجيل الخروج?')) onLogout() }}
              className="gap-1.5 text-muted-foreground hover:text-red-400 h-8 px-2 md:px-3"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden md:inline">خروج</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="border-b border-border/30 bg-muted/30">
        <div className="mx-auto flex items-center justify-center gap-3 md:gap-6 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            <span className="text-xs md:text-sm font-medium text-blue-400">مؤكد: {confirmedCount}</span>
          </div>
          <Separator orientation="vertical" className="h-5 bg-border/30" />
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="text-xs md:text-sm font-medium text-amber-400">قيد التحضير: {preparingCount}</span>
          </div>
          <Separator orientation="vertical" className="h-5 bg-border/30" />
          <div className="flex items-center gap-2">
            <Timer className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs md:text-sm font-medium text-muted-foreground">الإجمالي: {totalCount}</span>
          </div>
        </div>
      </div>
    </>
  )
}

