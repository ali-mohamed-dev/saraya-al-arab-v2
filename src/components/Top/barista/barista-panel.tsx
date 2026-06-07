'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, XCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import type { Order, KitchenBaristaStatus } from '@/lib/saraya/types'
import { transformOrder, getRelativeTime, playNotificationSound, unlockAudio } from '@/lib/saraya/helpers'
import { useRelativeTimers, useSeenAtTracker } from '@/lib/saraya/hooks'
import { usePageVisibility } from '@/lib/saraya/use-page-visibility'
import { useBaristaOrders } from '@/lib/saraya/queries'
import { useQueryClient } from '@tanstack/react-query'

import { BaristaHeader } from './barista-header'
import { BaristaOrderCard } from './barista-order-card'
import { BaristaEmptyState } from './barista-empty-state'

const REFRESH_INTERVAL_SECONDS = 5

function isBaristaItem(item: any) {
  return item?.preparationArea === 'BARISTA' || item?.category === 'مشروبات'
}

interface BaristaUpdatePayload {
  baristaStatus: KitchenBaristaStatus
  baristaAccess?: boolean
  kitchenAccess?: boolean
  status?: string
  kitchenStatus?: KitchenBaristaStatus
}

export function BaristaPanel({ onLogout }: { onLogout: () => void }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [flashActive, setFlashActive] = useState(false)
  const [updatingOrderIds, setUpdatingOrderIds] = useState<Set<string>>(new Set())
  const [refreshCountdown, setRefreshCountdown] = useState(REFRESH_INTERVAL_SECONDS)
  const [shiftOpen, setShiftOpen] = useState<boolean | null>(null)
  const [shiftLoading, setShiftLoading] = useState(true)
  const [shiftError, setShiftError] = useState(false)
  const [currentShiftId, setCurrentShiftId] = useState<string>('')

  const prevOrderIdsRef = useRef<Set<string>>(new Set())
  const prevOrderUpdatedAtRef = useRef<Record<string, string>>({})
  const pageVisible = usePageVisibility()

  // React Query — auto polls every 5s, pauses when tab is hidden
  const { data: ordersData, isLoading, isError, refetch } = useBaristaOrders(currentShiftId, shiftOpen === true)
  const orders = (ordersData || []).filter((o) =>
    (o.items?.some(isBaristaItem) ?? false) &&
    o.baristaStatus !== 'READY' &&
    o.baristaStatus !== 'CANCELLED'
  )

  // Notifications when new/updated orders arrive
  useEffect(() => {
    if (!ordersData) return
    const timers: ReturnType<typeof setTimeout>[] = []

    const visibleOrders = ordersData.filter((o) =>
      (o.items?.some(isBaristaItem) ?? false) &&
      o.baristaStatus !== 'READY' &&
      o.baristaStatus !== 'CANCELLED'
    )

    const currentIds = new Set<string>(visibleOrders.map((o) => o.id))
    const newOrders = visibleOrders.filter((o) => !prevOrderIdsRef.current.has(o.id) && o.baristaStatus === 'CONFIRMED')

    const updatedOrders = visibleOrders.filter((order) => {
      const prevContent = prevOrderUpdatedAtRef.current[order.id]
      const currentContent = JSON.stringify(order.items.filter(isBaristaItem)) + (order.notes || '') + order.kitchenStatus
      return prevContent && prevContent !== currentContent
    })

    const kitchenReadyOrders = visibleOrders.filter(order => {
      const prevContent = prevOrderUpdatedAtRef.current[order.id]
      return prevContent && !prevContent.endsWith('READY') && order.kitchenStatus === 'READY'
    })

    const newDrinksOrders = updatedOrders.filter(o => !kitchenReadyOrders.find(kr => kr.id === o.id))

    if (newOrders.length > 0 && prevOrderIdsRef.current.size > 0) {
      setFlashActive(true)
      timers.push(setTimeout(() => setFlashActive(false), 2000))
      playNotificationSound()
      toast({
        title: 'طلب مشروبات جديد!',
        description: `وصل ${newOrders.length > 1 ? `${newOrders.length} طلبات جديدة` : 'طلب جديد'} لقسم الباريستا`,
      })
    }

    if (kitchenReadyOrders.length > 0) {
      playNotificationSound()
      toast({
        title: 'الطعام جاهز!',
        description: kitchenReadyOrders.length === 1
          ? `طعام الطلب #${kitchenReadyOrders[0].orderNumber} جاهز من المطبخ`
          : `${kitchenReadyOrders.length} طلبات أصبح طعامها جاهزاً`,
      })
    }

    if (newDrinksOrders.length > 0) {
      setFlashActive(true)
      timers.push(setTimeout(() => setFlashActive(false), 2000))
      playNotificationSound()
      toast({
        title: 'مشروبات إضافية',
        description: `تم إضافة مشروبات جديدة لطلبات قيد التحضير`,
      })
    }

    prevOrderIdsRef.current = currentIds
    prevOrderUpdatedAtRef.current = Object.fromEntries(
      visibleOrders.map((o) => [o.id, JSON.stringify(o.items.filter(isBaristaItem)) + (o.notes || '') + o.kitchenStatus])
    )

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

  const updateBaristaStatus = async (orderId: string, newStatus: KitchenBaristaStatus) => {
    if (!orderId) return;
    setUpdatingOrderIds(prev => new Set(prev).add(orderId))
    try {
      const order = orders.find(o => o.id === orderId)
      if (!order) return

      const payload: BaristaUpdatePayload = { baristaStatus: newStatus as KitchenBaristaStatus }

      if (newStatus === 'PREPARING') {
        payload.baristaAccess = true
        payload.kitchenAccess = true
        const hasKitchenItems = order.items.some(i => i.preparationArea === 'KITCHEN')

        if (order.status === 'PENDING') {
          payload.status = hasKitchenItems ? 'CONFIRMED' : 'PREPARING'
          payload.kitchenStatus = order.kitchenStatus === 'PENDING' ? 'CONFIRMED' as KitchenBaristaStatus : order.kitchenStatus
        } else if (order.status === 'CONFIRMED' && !hasKitchenItems) {
          payload.status = 'PREPARING'
        }
      }

      if (newStatus === 'READY') {
        const hasKitchen = order.items.some(i => i.preparationArea === 'KITCHEN')
        const kitchenDone = !hasKitchen || order.kitchenStatus === 'READY' || order.kitchenStatus === 'CANCELLED'

        if (kitchenDone) {
          payload.status = 'READY'
        }
      }

      if (newStatus === 'CANCELLED') {
        const hasKitchen = order.items.some(i => i.preparationArea === 'KITCHEN')
        if (!hasKitchen) {
          payload.status = 'CANCELLED'
        }
      }

      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        toast({ title: 'تحديث الباريستا', description: `تم تحديث الحالة بنجاح` })
        queryClient.invalidateQueries({ queryKey: ['barista-orders'] })
      } else {
        const data = await res.json().catch(() => ({}))
        console.error('[Barista] Update failed:', res.status, data)
        toast({ title: 'خطأ في التحديث', description: data.error || `فشل في تحديث الحالة (كود ${res.status})`, variant: 'destructive' })
      }
    } catch (err) {
      console.error('[Barista] Network error:', err)
      toast({ title: 'خطأ في الاتصال', variant: 'destructive' })
    } finally {
      setUpdatingOrderIds(prev => { const next = new Set(prev); next.delete(orderId); return next })
    }
  }

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }, [])

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
    if (!pageVisible) return
    setRefreshCountdown(prev => prev <= 1 ? REFRESH_INTERVAL_SECONDS : prev - 1)
    const tick = setInterval(() => {
      setRefreshCountdown(prev => prev <= 1 ? REFRESH_INTERVAL_SECONDS : prev - 1)
    }, 1000)
    return () => clearInterval(tick)
  }, [pageVisible])

  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFs)
    return () => document.removeEventListener('fullscreenchange', handleFs)
  }, [])

  const seenAtMap = useSeenAtTracker(orders)
  const relativeTimers = useRelativeTimers(orders, seenAtMap)

  if (shiftLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-8 text-center">
          <p className="text-lg font-bold text-blue-400">جاري التحقق من حالة الشيفت...</p>
        </div>
      </div>
    )
  }

  if (shiftError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8" dir="rtl">
        <Card className="border-amber-500/20 bg-amber-500/5 p-8 text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-amber-600 mb-2">خطأ في الاتصال</h2>
          <p className="text-muted-foreground mb-4">فشل في التحقق من حالة الشيفت. تأكد من اتصالك بالخادم.</p>
          <Button onClick={() => fetchShiftStatus()} variant="outline" className="gap-2 border-amber-500/30 text-amber-500 hover:bg-amber-500/10">
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
        </Card>
      </div>
    )
  }

  if (shiftOpen === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8" dir="rtl">
        <Card className="border-red-500/20 bg-red-500/5 p-8 text-center max-w-md">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-600 mb-2">قسم الباريستا مغلق</h2>
          <p className="text-muted-foreground">لا يوجد شيفت عمل مفتوح حالياً.</p>
          <Button onClick={() => { if (window.confirm('هل أنت متأكد من تسجيل الخروج?')) onLogout() }} variant="outline" className="mt-6">خروج</Button>
        </Card>
      </div>
    )
  }

  return (
    <div
      className={`min-h-screen bg-background transition-colors duration-300 ${flashActive ? 'bg-blue-500/5' : ''}`}
      dir="rtl"
    >
      <BaristaHeader
        refreshCountdown={refreshCountdown}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onLogout={onLogout}
      />

      <main className="p-4 md:p-6">
        {isLoading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-blue-400" />
          </div>
        )}

        {isError && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
            <p className="text-lg text-red-400 mb-4">فشل في تحميل الطلبات</p>
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="gap-2 border-blue-400/30 text-blue-400 hover:bg-blue-400/10"
            >
              <RefreshCw className="h-4 w-4" />
              إعادة المحاولة
            </Button>
          </div>
        )}

        {!isLoading && !isError && orders.length === 0 && (
          <BaristaEmptyState />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {orders.map((order) => (
              <BaristaOrderCard
                key={order.id}
                order={order}
                relativeTime={relativeTimers[order.id] || getRelativeTime(order.createdAt)}
                seenAt={seenAtMap[order.id]}
                isUpdating={updatingOrderIds.has(order.id)}
                onUpdateStatus={updateBaristaStatus}
              />
            ))}
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {flashActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 pointer-events-none border-[12px] border-blue-500/30"
          />
        )}
      </AnimatePresence>
    </div>
  )
}
