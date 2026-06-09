'use client'

import { LogOut, RefreshCw, Maximize, Minimize } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/Top/shared/theme-toggle'

interface BaristaHeaderProps {
  refreshCountdown: number
  isFullscreen: boolean
  onToggleFullscreen: () => void
  onLogout: () => void
}

export function BaristaHeader({
  refreshCountdown,
  isFullscreen,
  onToggleFullscreen,
  onLogout,
}: BaristaHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-blue-500/20 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 overflow-hidden">
            <img src="/logo.svg" alt="Logo" className="h-full w-full object-cover" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-blue-400">شاشة الباريستا</h1>
            <p className="text-xs text-muted-foreground">توب - المشروبات</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/5 px-2 py-1">
            <RefreshCw className={`h-3.5 w-3.5 text-blue-400 ${refreshCountdown <= 2 ? 'animate-spin' : ''}`} />
            <span className="text-xs font-mono text-blue-400">{refreshCountdown}s</span>
          </div>
          <Button
            variant="outline" size="sm"
            onClick={onToggleFullscreen}
            className="border-blue-500/30 text-blue-400"
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
          <ThemeToggle />
          <Button
            variant="ghost" size="sm"
            onClick={() => { if (window.confirm('هل أنت متأكد من تسجيل الخروج?')) onLogout() }}
            className="text-muted-foreground hover:text-red-400"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}

