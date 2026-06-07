'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, AlertTriangle, RefreshCw, XCircle, ChefHat, LogOut } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import type { Order, KitchenBaristaStatus } from '@/lib/saraya/types'
import { transformOrder, getRelativeTime, getElapsedMinutes, playNotificationSound, unlockAudio } from '@/lib/saraya/helpers'
import { useRelativeTimers, useSeenAtTracker } from '@/lib/saraya/hooks'
import { useKitchenOrders } from '@/lib/saraya/queries'
import { useQueryClient } from '@tanstack/react-query'

import { KitchenHeader } from './kitchen-header'
import { KitchenOrderCard } from './kitchen-order-card'
import { KitchenEmptyState } from './kitchen-empty-state'

function isKitchenItem(item: { preparationArea: string }) {
  return item.preparationArea === 'KITCHEN'
}

interface KitchenUpdatePayload {
  kitchenStatus: KitchenBaristaStatus
  kitchenAccess?: boolean
  baristaAccess?: boolean
  status?: string
  baristaStatus?: KitchenBaristaStatus
}

export function KitchenPanel({ onLogout }: { onLogout: () => void }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [flashActive, setFlashActive] = useState(false)
  const [updatingOrderIds, setUpdatingOrderIds] = useState<Set<string>>(new Set())
  const [shiftOpen, setShiftOpen] = useState<boolean | null>(null)
  const [shiftLoading, setShiftLoading] = useState(true)
  const [shiftError, setShiftError] = useState(false)
  const [currentShiftId, setCurrentShiftId] = useState<string>('')
  const [refreshCountdown, setRefreshCountdown] = useState(5)

  const prevOrderIdsRef = useRef<Set<string>>(new Set())
  const prevOrderUpdatedAtRef = useRef<Record<string, string>>({})

  // React Query — auto polls every 5s, pauses when tab is hidden
  const { data: ordersData, isLoading, isError, refetch } = useKitchenOrders(currentShiftId, shiftOpen === true)
  const orders = (ordersData || []).filter((order) =>
    order.items.some((item) => isKitchenItem(item)) &&
    order.kitchenStatus !== 'READY' &&
    order.kitchenStatus !== 'CANCELLED'
  )

  // Notifications when new/updated orders arrive
  useEffect(() => {
    if (!ordersData) return
    const timers: ReturnType<typeof setTimeout>[] = []

    const visibleOrders = ordersData.filter((order) =>
      order.items.some((item) => isKitchenItem(item)) &&
      order.kitchenStatus !== 'READY' &&
      order.kitchenStatus !== 'CANCELLED'
    )

    const currentIds = new Set<string>(visibleOrders.map((o) => o.id))
    const newOrders = visibleOrders.filter((o) => !prevOrderIdsRef.current.has(o.id) && o.kitchenStatus === 'CONFIRMED')

    const updatedOrders = visibleOrders.filter((order) => {
      const prevContent = prevOrderUpdatedAtRef.current[order.id]
      const currentContent = JSON.stringify(order.items.filter(isKitchenItem)) + (order.notes || '') + order.baristaStatus
      return prevContent && prevContent !== currentContent
    })

    if (newOrders.length > 0 && prevOrderIdsRef.current.size > 0) {
      setFlashActive(true)
      timers.push(setTimeout(() => setFlashActive(false), 2000))
      playNotificationSound()
      toast({
        title: 'طلب جديد!',
        description: newOrders.length === 1
          ? `طلب رقم #${newOrders[0].orderNumber}`
          : `وصل ${newOrders.length} طلبات جديدة للمطبخ`
      })
    }

    if (updatedOrders.length > 0) {
      setFlashActive(true)
      timers.push(setTimeout(() => setFlashActive(false), 2000))
      playNotificationSound()
      toast({
        title: 'تحديث في الطلبات',
        description: updatedOrders.length === 1
          ? `تم إضافة عناصر جديدة في الطلب #${updatedOrders[0].orderNumber}`
          : `تم تحديث ${updatedOrders.length} طلبات في المطبخ`,
      })
    }

    prevOrderIdsRef.current = currentIds
    prevOrderUpdatedAtRef.current = Object.fromEntries(visibleOrders.map((o) => [
      o.id,
      JSON.stringify(o.items.filter(isKitchenItem)) + (o.notes || '') + o.baristaStatus
    ]))

    return () => timers.forEach(clearTimeout)
  }, [ordersData, toast])

  const fetchShiftStatus = useCallback(async () => {
    setShiftError(false)
    try {
      const res = await fetch('/api/shifts?current=true')
      if (res.ok) {
        const shift = await res.json()
        setShiftOpen(!!shift)
        setCurrentShiftId(shift?.id || '')
      } else {
        setShiftOpen(false)
        setCurrentShiftId('')
      }
    } catch (err) {
      console.error('Failed to fetch shift status:', err)
      setShiftError(true)
    } finally {
      setShiftLoading(false)
    }
  }, [])

  const updateKitchenStatus = useCallback(async (orderId: string, newStatus: KitchenBaristaStatus) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return

    setUpdatingOrderIds(prev => new Set(prev).add(orderId))
    try {
      const payload: KitchenUpdatePayload = { kitchenStatus: newStatus as KitchenBaristaStatus }

      if (newStatus === 'PREPARING') {
        payload.kitchenAccess = true
        const hasBaristaItems = order.items.some(i => i.preparationArea === 'BARISTA')

        if (order.status === 'PENDING') {
          payload.status = hasBaristaItems ? 'CONFIRMED' : 'PREPARING'
          payload.baristaStatus = order.baristaStatus === 'PENDING' ? 'CONFIRMED' as KitchenBaristaStatus : order.baristaStatus
          payload.baristaAccess = true
        } else if (order.status === 'CONFIRMED' && !hasBaristaItems) {
          payload.status = 'PREPARING'
        }
      }

      if (newStatus === 'READY') {
        const hasBarista = order.items.some(i => i.preparationArea === 'BARISTA')
        const baristaDone = !hasBarista || order.baristaStatus === 'READY' || order.baristaStatus === 'CANCELLED'

        if (baristaDone) {
          payload.status = 'READY'
        }
      }

      if (newStatus === 'CANCELLED') {
        const hasBarista = order.items.some(i => i.preparationArea === 'BARISTA')
        if (!hasBarista) {
          payload.status = 'CANCELLED'
        }
      }

      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        toast({ title: 'تحديث المطبخ', description: `أصبح طلب المطبخ: ${newStatus === 'READY' ? 'جاهزاً' : 'قيد التحضير'}` })
        queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] })
      } else {
        const data = await res.json().catch(() => ({}))
        console.error('[Kitchen] Update failed:', res.status, data)
        toast({ title: 'خطأ في التحديث', description: data.error || `فشل في تحديث الحالة (كود ${res.status})`, variant: 'destructive' })
      }
    } catch (err) {
      console.error('[Kitchen] Network error:', err)
      toast({ title: 'خطأ', description: 'فشل في الاتصال بالخادم', variant: 'destructive' })
    } finally {
      setUpdatingOrderIds(prev => { const next = new Set(prev); next.delete(orderId); return next })
    }
  }, [orders, queryClient, toast])

  // فتح الـ AudioContext عند أول تفاعل مع الصفحة
  useEffect(() => {
    const unlock = () => unlockAudio()
    document.addEventListener('click', unlock, { once: true })
    document.addEventListener('touchstart', unlock, { once: true })
    return () => { document.removeEventListener('click', unlock); document.removeEventListener('touchstart', unlock) }
  }, [])

  useEffect(() => {
    fetchShiftStatus()
    const shiftInterval = setInterval(fetchShiftStatus, 10000)
    return () => clearInterval(shiftInterval)
  }, [fetchShiftStatus])

  useEffect(() => {
    const tick = setInterval(() => {
      setRefreshCountdown(prev => prev <= 1 ? 5 : prev - 1)
    }, 1000)
    return () => clearInterval(tick)
  }, [])

  const seenAtMap = useSeenAtTracker(orders)
  const relativeTimers = useRelativeTimers(orders, seenAtMap)

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  if (shiftLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-8 text-center">
          <p className="text-lg font-bold text-[#D4AF37]">جاري التحقق من حالة الشيفت...</p>
        </div>
      </div>
    )
  }

  if (shiftError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-8 text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="mb-2 text-2xl font-bold text-amber-500">خطأ في الاتصال</h2>
          <p className="text-muted-foreground mb-4">فشل في التحقق من حالة الشيفت. تأكد من اتصالك بالخادم.</p>
          <Button onClick={() => fetchShiftStatus()} variant="outline" className="gap-2 border-amber-500/30 text-amber-500 hover:bg-amber-500/10">
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      </div>
    )
  }

  if (shiftOpen === false) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <header className="sticky top-0 z-30 border-b border-[#D4AF37]/20 bg-background/95 backdrop-blur-md">
          <div className="mx-auto flex h-14 md:h-16 items-center justify-between px-3 md:px-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-[#D4AF37]/10">
                <ChefHat className="h-5 w-5 text-[#D4AF37]" />
              </div>
              <div>
                <h1 className="text-base md:text-lg font-bold text-[#D4AF37]">شاشة المطبخ</h1>
                <p className="text-[10px] md:text-xs text-muted-foreground">توب  - المطبخ</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <Button variant="ghost" onClick={onLogout} className="gap-2 text-muted-foreground hover:text-red-400">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 md:p-6">
          <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center">
            <h2 className="mb-2 text-2xl font-bold text-red-600">المطبخ مغلق</h2>
            <p className="text-muted-foreground">المطبخ مغلق حتى يقوم المسؤول ببدء شيفت جديد.</p>
          </div>
        </main>
      </div>
    )
  }

  const confirmedCount = orders.filter(o => o.status === 'CONFIRMED').length
  const preparingCount = orders.filter(o => o.status === 'PREPARING').length
  const totalCount = orders.length

  return (
    <div
      className={`min-h-screen bg-background transition-colors duration-300 ${flashActive ? 'bg-yellow-500/5' : ''}`}
      dir="rtl"
    >
      <KitchenHeader
        refreshCountdown={refreshCountdown}
        confirmedCount={confirmedCount}
        preparingCount={preparingCount}
        totalCount={totalCount}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onLogout={onLogout}
      />

      <main className="mx-auto p-2 md:p-4 lg:p-6">
        {isLoading && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-[#D4AF37] mb-4" />
            <p className="text-lg text-muted-foreground">جاري تحميل الطلبات...</p>
          </div>
        )}

        {isError && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
            <p className="text-lg text-red-400 mb-4">فشل في تحميل الطلبات</p>
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="gap-2 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
            >
              <RefreshCw className="h-4 w-4" />
              إعادة المحاولة
            </Button>
          </div>
        )}

        {!isLoading && !isError && orders.length === 0 && (
          <KitchenEmptyState />
        )}

        <AnimatePresence mode="popLayout">
          <div className={`grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`}>
            {orders.map((order) => (
              <KitchenOrderCard
                key={order.id}
                order={order}
                relativeTime={relativeTimers[order.id] || getRelativeTime(order.createdAt)}
                seenAt={seenAtMap[order.id]}
                isUpdating={updatingOrderIds.has(order.id)}
                onUpdateStatus={updateKitchenStatus}
              />
            ))}
          </div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {flashActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 pointer-events-none border-4 border-yellow-400/50"
          />
        )}
      </AnimatePresence>
    </div>
  )
}
