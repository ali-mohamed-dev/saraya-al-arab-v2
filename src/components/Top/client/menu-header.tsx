'use client'

import { useState, useEffect } from 'react'
import { Settings, ClipboardList, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/Top/shared/theme-toggle'

interface MenuHeaderProps {
  onAdminClick: () => void
  onUserClick?: () => void
  onTrackClick: () => void
}

export function MenuHeader({ onAdminClick, onUserClick, onTrackClick }: MenuHeaderProps) {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    setLoggedIn(sessionStorage.getItem('web-user-auth') === 'true')
  }, [])

  return (
    <header className="sticky top-0 z-30 border-b border-[#D4AF37]/20 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden">
            <img src="/logo.svg" alt="توب " className="h-10 w-10 object-contain" />
          </div>
          <div>
            <h1 className="text-gold-gradient text-xl font-bold">توب </h1>
            <p className="text-xs text-muted-foreground">Top</p>
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
          {onUserClick && (
            <Button
              variant="outline"
              size="sm"
              onClick={onUserClick}
              className={`flex items-center gap-1.5 border ${loggedIn ? 'border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10' : 'border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10'}`}
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{loggedIn ? 'حسابي' : 'تسجيل'}</span>
            </Button>
          )}
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
