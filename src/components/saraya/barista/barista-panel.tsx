'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, XCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import type { Order, KitchenBaristaStatus } from '@/lib/saraya/types'
import { transformOrder, getRelativeTime, playNotificationSound } from '@/lib/saraya/helpers'
import { useRelativeTimers } from '@/lib/saraya/hooks'

import { BaristaHeader } from './barista-header'
import { BaristaOrderCard } from './barista-order-card'
import { BaristaEmptyState } from './barista-empty-state'

const REFRESH_INTERVAL_SECONDS = 5

function isBaristaItem(item: any) {
  return item?.preparationArea === 'BARISTA' || item?.category === 'مشروبات'
}

// BUG FIX: Proper typed payload instead of `any`
interface BaristaUpdatePayload {
  baristaStatus: KitchenBaristaStatus
  kitchenAccess?: boolean
  status?: string
  kitchenStatus?: KitchenBaristaStatus
}

export function BaristaPanel({ onLogout }: { onLogout: () => void }) {
  const { toast } = useToast()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [flashActive, setFlashActive] = useState(false)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [refreshCountdown, setRefreshCountdown] = useState(REFRESH_INTERVAL_SECONDS)
  const [shiftOpen, setShiftOpen] = useState<boolean | null>(null)
  const [shiftLoading, setShiftLoading] = useState(true) // BUG FIX: Add shiftLoading state
  const [currentShiftId, setCurrentShiftId] = useState<string>('') // BUG FIX: Track shiftId

  const prevOrderIdsRef = useRef<Set<string>>(new Set())
  const prevOrderUpdatedAtRef = useRef<Record<string, string>>({})

  // BUG FIX: Store shiftId from shift response
  const fetchShiftStatus = useCallback(async () => {
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
      setShiftOpen(false)
      setCurrentShiftId('')
    } finally {
      setShiftLoading(false)
    }
  }, [])

  // BUG FIX: Add shiftId parameter to API calls
  const fetchOrders = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true)
      // Fetch all relevant orders for the current shift
      const shiftParam = currentShiftId ? `&shiftId=${currentShiftId}` : ''

      // Safe fetch helper to handle potential API errors or non-array responses
      const safeFetch = async (url: string) => {
        try {
          const r = await fetch(url)
          if (!r.ok) return []
          const data = await r.json()
          if (!Array.isArray(data)) return []
          return data.map(o => {
            try {
              return transformOrder(o)
            } catch (e) { return null }
          }).filter(Boolean) as Order[]
        } catch (e) {
          console.error(`Fetch error for ${url}:`, e)
          return []
        }
      }

      const [pending, confirmed, preparing, ready] = await Promise.all([
        safeFetch(`/api/orders?status=PENDING${shiftParam}`),
        safeFetch(`/api/orders?status=CONFIRMED${shiftParam}`),
        safeFetch(`/api/orders?status=PREPARING${shiftParam}`),
        safeFetch(`/api/orders?status=READY${shiftParam}`),
      ])

      const allOrders = [...pending, ...confirmed, ...preparing, ...ready].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      const visibleOrders = allOrders.filter((o) =>
        (o.items?.some(isBaristaItem) ?? false) &&
        o.baristaStatus !== 'READY' &&
        o.baristaStatus !== 'CANCELLED'
      )

      // Notifications
      const currentIds = new Set(visibleOrders.map((o) => o.id))
      const newOrders = visibleOrders.filter((o) => !prevOrderIdsRef.current.has(o.id))

      if (newOrders.length > 0 && prevOrderIdsRef.current.size > 0) {
        setFlashActive(true)
        setTimeout(() => setFlashActive(false), 2000)
        playNotificationSound()
        toast({
          title: 'طلب مشروبات جديد! ☕',
          description: `وصل ${newOrders.length > 1 ? `${newOrders.length} طلبات جديدة` : 'طلب جديد'} لقسم الباريستا`,
        })
      }

      const updatedOrders = visibleOrders.filter((order) => {
        const prevContent = prevOrderUpdatedAtRef.current[order.id]
        // تتبع حالة المطبخ أيضاً لتنبيه الباريستا عند تغيرها
        const currentContent = JSON.stringify(order.items.filter(isBaristaItem)) + 
                              (order.notes || '') + order.kitchenStatus
        return prevContent && prevContent !== currentContent
      })

      // تحديد الطلبات التي أصبح طعامها جاهزاً للتو
      const kitchenReadyOrders = visibleOrders.filter(order => {
        const prevContent = prevOrderUpdatedAtRef.current[order.id]
        return prevContent && !prevContent.endsWith('READY') && order.kitchenStatus === 'READY'
      })

      // تحديد الطلبات التي تم إضافة مشروبات جديدة لها
      const newDrinksOrders = updatedOrders.filter(o => !kitchenReadyOrders.find(kr => kr.id === o.id))

      if (kitchenReadyOrders.length > 0) {
        playNotificationSound()
        toast({
          title: 'الطعام جاهز! 🍔',
          description: kitchenReadyOrders.length === 1
            ? `طعام الطلب #${kitchenReadyOrders[0].orderNumber} جاهز من المطبخ`
            : `${kitchenReadyOrders.length} طلبات أصبح طعامها جاهزاً`,
        })
      }

      if (newDrinksOrders.length > 0) {
        setFlashActive(true)
        setTimeout(() => setFlashActive(false), 2000)
        playNotificationSound()
        toast({
          title: 'مشروبات إضافية',
          description: `تم إضافة مشروبات جديدة لطلبات قيد التحضير`,
        })
      }

      prevOrderIdsRef.current = currentIds
      prevOrderUpdatedAtRef.current = Object.fromEntries(
        visibleOrders.map((o) => [
          o.id,
          JSON.stringify(o.items.filter(isBaristaItem)) + (o.notes || '') + o.kitchenStatus
        ])
      )

      setOrders(visibleOrders)
    } catch (err) {
      console.error('Failed to fetch barista orders:', err)
      toast({ title: 'خطأ', description: 'فشل في تحميل طلبات الباريستا', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast, shiftOpen, currentShiftId])

  // BUG FIX: Proper typed payload, fix double status assignment, remove console.log, fix side-effects in state updater
  const updateBaristaStatus = async (orderId: string, newStatus: KitchenBaristaStatus) => {
    if (!orderId) return; // Prevent 404 from undefined IDs
    setUpdatingOrderId(orderId)
    try {
      const order = orders.find(o => o.id === orderId)
      if (!order) return

      const payload: BaristaUpdatePayload = { baristaStatus: newStatus as KitchenBaristaStatus }

      if (newStatus === 'PREPARING') {
        payload.kitchenAccess = true
        const hasKitchenItems = order.items.some(i => i.preparationArea === 'KITCHEN')

        if (order.status === 'PENDING') {
          // إذا كان هناك مطبخ، نجعل الحالة "مؤكد" فقط لكي لا يظن المطبخ أن العمل بدأ عندهم
          payload.status = hasKitchenItems ? 'CONFIRMED' : 'PREPARING'
          payload.kitchenStatus = order.kitchenStatus === 'PENDING' ? 'CONFIRMED' as KitchenBaristaStatus : order.kitchenStatus
        } else if (order.status === 'CONFIRMED' && !hasKitchenItems) {
          // نحدث الحالة العامة لتحضير فقط إذا لم يكن هناك مطبخ (طلب مشروبات فقط)
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

      // استخدام المسار الرئيسي لتحديث الطلب لضمان تفعيل الإشعارات كما في لوحة الأدمن
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const rawData = await res.json().catch(() => null)
        // التحقق من أن البيانات القادمة هي طلب فعلي وليست رسالة خطأ
        const updatedOrder = (rawData && rawData.id) ? transformOrder(rawData) : null

        if (updatedOrder && updatedOrder.items) {
          prevOrderUpdatedAtRef.current[orderId] = JSON.stringify(updatedOrder.items.filter(isBaristaItem)) + (updatedOrder.notes || '') + updatedOrder.kitchenStatus
        }

        // تصحيح النوع (Casting) لضمان عدم ظهور خطأ TypeScript
        const nextOrders = (orders.map((o) => 
          o.id === orderId ? (updatedOrder || { ...o, baristaStatus: newStatus }) : o
        ) as Order[]).filter((o) => 
          o.baristaStatus !== 'READY' && o.baristaStatus !== 'CANCELLED'
        )

        prevOrderIdsRef.current = new Set(nextOrders.map((o) => o.id))
        if (newStatus === 'READY' || newStatus === 'CANCELLED') {
          delete prevOrderUpdatedAtRef.current[orderId]
        }

        setOrders(nextOrders)

        // BUG FIX: Remove setTimeout - use direct fetch instead
        fetchOrders()
      } else {
        const data = await res.json().catch(() => ({}))
        console.error('[Barista] Update failed:', res.status, data)
        toast({ title: 'خطأ في التحديث', description: data.error || `فشل في تحديث الحالة (كود ${res.status})`, variant: 'destructive' })
        fetchOrders()
      }
    } catch (err) {
      console.error('[Barista] Network error:', err)
      toast({ title: 'خطأ في الاتصال', variant: 'destructive' })
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }, [])

  // Effects
  useEffect(() => {
    fetchShiftStatus()
    const shiftInterval = setInterval(fetchShiftStatus, 10000)
    return () => clearInterval(shiftInterval)
  }, [fetchShiftStatus])

  // BUG FIX: Fix dependency - include fetchOrders properly, remove eslint-disable
  useEffect(() => {
    if (shiftOpen === null) return;
    
    fetchOrders(true)

    const interval = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          fetchOrders()
          return REFRESH_INTERVAL_SECONDS
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [shiftOpen, fetchOrders])

  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFs)
    return () => document.removeEventListener('fullscreenchange', handleFs)
  }, [])

  const relativeTimers = useRelativeTimers(orders)

  // BUG FIX: Add shiftLoading state for loading screen
  if (shiftLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-8 text-center">
          <p className="text-lg font-bold text-blue-400">جاري التحقق من حالة الشيفت...</p>
        </div>
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
          <Button onClick={onLogout} variant="outline" className="mt-6">خروج</Button>
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
        onRefresh={() => { fetchOrders(); setRefreshCountdown(REFRESH_INTERVAL_SECONDS) }}
        onToggleFullscreen={toggleFullscreen}
        onLogout={onLogout}
      />

      {/* Main */}
      <main className="p-4 md:p-6">
        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-blue-400" />
          </div>
        )}

        {/* Empty state */}
        {!loading && orders.length === 0 && (
          <BaristaEmptyState />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {orders.map((order) => (
              <BaristaOrderCard
                key={order.id}
                order={order}
                relativeTime={relativeTimers[order.id] || getRelativeTime(order.createdAt)}
                isUpdating={updatingOrderId === order.id}
                onUpdateStatus={updateBaristaStatus}
              />
            ))}
          </AnimatePresence>
        </div>
      </main>

      {/* Flash border overlay */}
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
