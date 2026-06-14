'use client'

import { useState, useEffect } from 'react'
import { ClipboardList, User, CircleDot } from 'lucide-react'
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
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:h-16 sm:px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-[#D4AF37]/25 bg-card">
            <img src="/logo.svg" alt="Top" className="h-9 w-9 object-contain" />
          </div>
          <div className="leading-none">
            <h1 className="text-gold-gradient text-lg font-black sm:text-xl">Top</h1>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-500">
              <CircleDot className="h-2.5 w-2.5 fill-current" />
              <span>متاح للطلب</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onTrackClick}
            data-track-button
            aria-label="تتبع طلبي"
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
              aria-label={loggedIn ? 'حسابي' : 'تسجيل الدخول'}
              className={`flex items-center gap-1.5 border ${
                loggedIn
                  ? 'border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10'
                  : 'border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10'
              }`}
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{loggedIn ? 'حسابي' : 'تسجيل'}</span>
            </Button>
          )}

          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
