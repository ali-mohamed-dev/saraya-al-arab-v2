'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, AlertTriangle, RefreshCw, XCircle, ChefHat, LogOut } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import type { Order, KitchenBaristaStatus } from '@/lib/saraya/types'
import { transformOrder, getRelativeTime, getElapsedMinutes, playNotificationSound } from '@/lib/saraya/helpers'
import { useRelativeTimers } from '@/lib/saraya/hooks'

import { KitchenHeader } from './kitchen-header'
import { KitchenOrderCard } from './kitchen-order-card'
import { KitchenEmptyState } from './kitchen-empty-state'

const REFRESH_INTERVAL_SECONDS = 5

function isKitchenItem(item: { preparationArea: string }) {
  return item.preparationArea === 'KITCHEN'
}

// BUG FIX: Proper typed payload instead of `any`
interface KitchenUpdatePayload {
  kitchenStatus: KitchenBaristaStatus
  kitchenAccess?: boolean
  status?: string
  baristaStatus?: KitchenBaristaStatus
}

export function KitchenPanel({ onLogout }: { onLogout: () => void }) {
  const { toast } = useToast()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [flashActive, setFlashActive] = useState(false)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [refreshCountdown, setRefreshCountdown] = useState(REFRESH_INTERVAL_SECONDS)
  const [shiftOpen, setShiftOpen] = useState<boolean | null>(null)
  const [shiftLoading, setShiftLoading] = useState(true) // BUG FIX: Add shiftLoading state
  const [currentShiftId, setCurrentShiftId] = useState<string>('') // BUG FIX: Track shiftId

  const prevOrderIdsRef = useRef<Set<string>>(new Set())
  const prevOrderUpdatedAtRef = useRef<Record<string, string>>({})
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchShiftStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/shifts?current=true')
      if (res.ok) {
        const shift = await res.json()
        setShiftOpen(!!shift)
        // BUG FIX: Store shiftId
        setCurrentShiftId(shift?.id || '')
      } else {
        setShiftOpen(false)
        setCurrentShiftId('')
      }
    } catch (err) {
      console.error('Failed to fetch shift status:', err)
      setShiftOpen(false)
      setCurrentShiftId('')
    } finally {
      setShiftLoading(false)
    }
  }, [])

  // BUG FIX: Add shiftId parameter to API calls
  const fetchOrders = useCallback(async (showLoading = false) => {
    if (shiftOpen !== true) {
      setOrders([])
      setLoading(false)
      return
    }

    try {
      if (showLoading) setLoading(true)
      setError(null)

      const shiftParam = currentShiftId ? `&shiftId=${currentShiftId}` : ''

      const [pendingRes, confirmedRes, preparingRes, readyRes] = await Promise.all([
        fetch(`/api/orders?status=PENDING${shiftParam}`),
        fetch(`/api/orders?status=CONFIRMED${shiftParam}`),
        fetch(`/api/orders?status=PREPARING${shiftParam}`),
        fetch(`/api/orders?status=READY${shiftParam}`),
      ])

      const pending: Order[] = pendingRes.ok ? (await pendingRes.json()).map(transformOrder) : []
      const confirmed: Order[] = confirmedRes.ok ? (await confirmedRes.json()).map(transformOrder) : []
      const preparing: Order[] = preparingRes.ok ? (await preparingRes.json()).map(transformOrder) : []
      const ready: Order[] = readyRes.ok ? (await readyRes.json()).map(transformOrder) : []

      const allOrders = [...pending, ...confirmed, ...preparing, ...ready].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )

      const visibleOrders = allOrders.filter((order) =>
        order.items.some((item) => isKitchenItem(item)) &&
        order.kitchenStatus !== 'READY' &&
        order.kitchenStatus !== 'CANCELLED'
      )

      const updatedOrders = visibleOrders.filter((order) => {
        const prevContent = prevOrderUpdatedAtRef.current[order.id]
        // تتبع حالة الباريستا أيضاً لتنبيه المطبخ عند تغيرها
        const currentContent = JSON.stringify(order.items.filter(isKitchenItem)) + 
                              (order.notes || '') + order.baristaStatus
        return prevContent && prevContent !== currentContent
      })

      const currentIds = new Set(visibleOrders.map((o) => o.id))
      const newOrders = visibleOrders.filter((o) => !prevOrderIdsRef.current.has(o.id))

      if (newOrders.length > 0 && prevOrderIdsRef.current.size > 0) {
        setFlashActive(true)
        setTimeout(() => setFlashActive(false), 2000)
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
        setTimeout(() => setFlashActive(false), 2000)
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

      setOrders(visibleOrders)
    } catch (err) {
      console.error('Failed to fetch orders:', err)
      setError('فشل في تحميل الطلبات')
    } finally {
      setLoading(false)
    }
  }, [toast, shiftOpen, currentShiftId])

  // BUG FIX: Proper typed payload, fix double status assignment, remove setTimeout, remove console.log
  const updateKitchenStatus = async (orderId: string, newStatus: KitchenBaristaStatus) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return

    setUpdatingOrderId(orderId)
    try {
      const payload: KitchenUpdatePayload = { kitchenStatus: newStatus as KitchenBaristaStatus }

      if (newStatus === 'PREPARING') {
        payload.kitchenAccess = true
        const hasBaristaItems = order.items.some(i => i.preparationArea === 'BARISTA')

        if (order.status === 'PENDING') {
          // إذا كان هناك باريستا، نكتفي بـ CONFIRMED للحالة العامة لكي لا يرتبك الباريستا
          payload.status = hasBaristaItems ? 'CONFIRMED' : 'PREPARING'
          payload.baristaStatus = order.baristaStatus === 'PENDING' ? 'CONFIRMED' as KitchenBaristaStatus : order.baristaStatus
        } else if (order.status === 'CONFIRMED' && !hasBaristaItems) {
          // إذا كان طلب طعام فقط، نغير الحالة العامة لـ PREPARING فوراً
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
        const updatedOrderRaw = await res.json().catch(() => null)
        const updatedOrder = updatedOrderRaw ? transformOrder(updatedOrderRaw) : null
        
        toast({ title: 'تحديث المطبخ', description: `أصبح طلب المطبخ: ${newStatus === 'READY' ? 'جاهزاً' : 'قيد التحضير'}` })

        // إصلاح الخطأ: إضافة Casting صريح للمصفوفة لتتوافق مع النوع Order[]
        const nextOrders = (orders.map(o => 
          o.id === orderId ? (updatedOrder || { ...o, kitchenStatus: newStatus }) : o
        ) as Order[]).filter(o => 
          o.kitchenStatus !== 'READY' && o.kitchenStatus !== 'CANCELLED'
        )

        prevOrderIdsRef.current = new Set(nextOrders.map(o => o.id))
        if (updatedOrder) {
          prevOrderUpdatedAtRef.current[orderId] = JSON.stringify(updatedOrder.items.filter(isKitchenItem)) + (updatedOrder.notes || '')
        }

        setOrders(nextOrders)

        // BUG FIX: Remove setTimeout - use direct fetch instead
        fetchOrders()
      } else {
        const data = await res.json().catch(() => ({}))
        console.error('[Kitchen] Update failed:', res.status, data)
        toast({ title: 'خطأ في التحديث', description: data.error || `فشل في تحديث الحالة (كود ${res.status})`, variant: 'destructive' })
        fetchOrders()
      }
    } catch (err) {
      console.error('[Kitchen] Network error:', err)
      toast({ title: 'خطأ', description: 'فشل في الاتصال بالخادم', variant: 'destructive' })
    } finally {
      setUpdatingOrderId(null)
    }
  }

  // Effects
  useEffect(() => {
    fetchShiftStatus()
    const shiftInterval = setInterval(fetchShiftStatus, 10000)
    return () => clearInterval(shiftInterval)
  }, [fetchShiftStatus])

  useEffect(() => {
    if (shiftOpen !== true) {
      if (shiftOpen === false) setLoading(false)
      return
    }

    fetchOrders(true)

    countdownRef.current = setInterval(() => {
      setRefreshCountdown(prev => {
        if (prev <= 1) {
          return REFRESH_INTERVAL_SECONDS
        }
        return prev - 1
      })
    }, 1000)

    refreshRef.current = setInterval(() => {
      fetchOrders()
      setRefreshCountdown(REFRESH_INTERVAL_SECONDS)
    }, REFRESH_INTERVAL_SECONDS * 1000)

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
      if (refreshRef.current) clearInterval(refreshRef.current)
    }
  }, [fetchOrders, shiftOpen])

  const relativeTimers = useRelativeTimers(orders)

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

  // BUG FIX: Add shiftLoading state for loading screen
  if (shiftLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-8 text-center">
          <p className="text-lg font-bold text-[#D4AF37]">جاري التحقق من حالة الشيفت...</p>
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
                <p className="text-[10px] md:text-xs text-muted-foreground">سرايا العرب - المطبخ</p>
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

  // Computed stats
  const confirmedCount = orders.filter(o => o.status === 'CONFIRMED').length
  const preparingCount = orders.filter(o => o.status === 'PREPARING').length
  const totalCount = orders.length

  return (
    <div
      className={`min-h-screen bg-background transition-colors duration-300 ${flashActive ? 'bg-yellow-500/5' : ''}`}
      dir="rtl"
    >
      <KitchenHeader
        confirmedCount={confirmedCount}
        preparingCount={preparingCount}
        totalCount={totalCount}
        refreshCountdown={refreshCountdown}
        isFullscreen={isFullscreen}
        onRefresh={() => { fetchOrders(); setRefreshCountdown(REFRESH_INTERVAL_SECONDS) }}
        onToggleFullscreen={toggleFullscreen}
        onLogout={onLogout}
      />

      {/* Main Content */}
      <main className="mx-auto p-2 md:p-4 lg:p-6">
        {/* Loading State */}
        {loading && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-[#D4AF37] mb-4" />
            <p className="text-lg text-muted-foreground">جاري تحميل الطلبات...</p>
          </div>
        )}

        {/* Error State */}
        {error && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
            <p className="text-lg text-red-400 mb-4">{error}</p>
            <Button
              variant="outline"
              onClick={() => fetchOrders(true)}
              className="gap-2 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
            >
              <RefreshCw className="h-4 w-4" />
              إعادة المحاولة
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && orders.length === 0 && (
          <KitchenEmptyState />
        )}

        {/* Order Cards Grid */}
        <AnimatePresence mode="popLayout">
          <div className={`grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`}>
            {orders.map((order) => (
              <KitchenOrderCard
                key={order.id}
                order={order}
                relativeTime={relativeTimers[order.id] || getRelativeTime(order.createdAt)}
                isUpdating={updatingOrderId === order.id}
                onUpdateStatus={updateKitchenStatus}
              />
            ))}
          </div>
        </AnimatePresence>
      </main>

      {/* Flash Overlay for New Orders */}
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
