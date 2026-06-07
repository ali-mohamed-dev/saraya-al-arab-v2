'use client'

import { useState, useEffect } from 'react'
import { UtensilsCrossed, LogOut, DoorOpen, DoorClosed, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ThemeToggle } from '@/components/Top/shared/theme-toggle'

interface AdminHeaderProps {
  onLogout: () => void
}

export function AdminHeader({ onLogout }: AdminHeaderProps) {
  const [takingOrders, setTakingOrders] = useState<boolean>(true)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setTakingOrders(data.takingOrders)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleToggleOrders = async () => {
    setToggling(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ takingOrders: !takingOrders }),
      })
      if (res.ok) {
        const data = await res.json()
        setTakingOrders(data.takingOrders)
      }
    } catch {
      // ignore
    } finally {
      setToggling(false)
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[#D4AF37]/20 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#D4AF37]/10">
            <UtensilsCrossed className="h-5 w-5 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#D4AF37]">لوحة التحكم</h1>
            <p className="hidden sm:block text-xs text-muted-foreground">توب  - إدارة المطعم</p>
          </div>
        </div>
          <div className="flex items-center gap-1 sm:gap-3">
            {/* زر فتح/إغلاق استلام الطلبات */}
            <div className="flex items-center gap-1 sm:gap-2 rounded-lg border border-border/50 px-2 sm:px-3 py-1.5 bg-muted/30">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <span className={`hidden sm:inline text-xs font-medium ${takingOrders ? 'text-green-400' : 'text-red-400'}`}>
                    {takingOrders ? 'مفتوح' : 'مغلق'}
                  </span>
                  <Switch
                    checked={takingOrders}
                    onCheckedChange={handleToggleOrders}
                    disabled={toggling}
                    className="scale-75"
                  />
                  {takingOrders ? (
                    <DoorOpen className="h-4 w-4 text-green-400" />
                  ) : (
                    <DoorClosed className="h-4 w-4 text-red-400" />
                  )}
                </>
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