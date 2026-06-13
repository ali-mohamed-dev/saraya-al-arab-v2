'use client'

import { UtensilsCrossed, LogOut, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/Top/shared/theme-toggle'

interface AdminHeaderProps {
  onLogout: () => void
  activeTabLabel?: string
  onDrawerToggle?: () => void
}

export function AdminHeader({ onLogout, activeTabLabel, onDrawerToggle }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#D4AF37]/20 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col">
        <div className="flex h-14 items-center justify-between px-4">
          {/* Mobile: hamburger menu button */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9 text-muted-foreground hover:text-[#D4AF37]"
              onClick={onDrawerToggle}
              aria-label="فتح القائمة"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D4AF37]/10">
                <UtensilsCrossed className="h-4 w-4 text-[#D4AF37]" />
              </div>
              <div>
                {/* Mobile: show current page name; Desktop: show "لوحة التحكم" */}
                <h1 className="text-sm font-bold text-[#D4AF37]">
                  <span className="md:hidden">{activeTabLabel || 'لوحة التحكم'}</span>
                  <span className="hidden md:inline">لوحة التحكم</span>
                </h1>
                <p className="hidden sm:block text-[10px] text-muted-foreground leading-tight">توب - إدارة المطعم</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Button variant="ghost" onClick={onLogout} className="gap-1 sm:gap-2 text-muted-foreground hover:text-red-400 px-2 sm:px-3 h-9">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">خروج</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
