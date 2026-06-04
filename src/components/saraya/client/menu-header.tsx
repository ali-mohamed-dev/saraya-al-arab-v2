'use client'

import { Settings, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/saraya/shared/theme-toggle'

interface MenuHeaderProps {
  onAdminClick: () => void
  onTrackClick: () => void
}

export function MenuHeader({ onAdminClick, onTrackClick }: MenuHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#D4AF37]/20 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden">
            <img src="/logo.svg" alt="سرايا العرب" className="h-10 w-10 object-contain" />
          </div>
          <div>
            <h1 className="text-gold-gradient text-xl font-bold">سرايا العرب</h1>
            <p className="text-xs text-muted-foreground">Saraya Al-Arab</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onTrackClick}
            data-track-button
            className="flex items-center gap-2 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
          >
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">تتبع طلبي</span>
          </Button>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={onAdminClick}
            className="text-muted-foreground hover:text-[#D4AF37]"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
