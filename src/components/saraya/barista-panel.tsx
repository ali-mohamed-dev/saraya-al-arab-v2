'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LogOut, RefreshCw, Loader2, Clock, Maximize, Minimize,
  CheckCircle, XCircle, Coffee, Flame, Timer
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'

// ── Interfaces ────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string
  mealId: string
  mealTitle: string
  mealTitleAr: string
  quantity: number
  price: number
  category?: string
  preparationArea?: 'KITCHEN' | 'BARISTA' | 'HALL'
  addOns?: { title: string; titleAr: string; price: number }[]
  imageUrl?: string
  addedQuantity?: number
  createdAt: string
  updatedAt: string
}

function isBaristaItem(item: OrderItem) {
  return item.preparationArea === 'BARISTA'
}

interface Order {
  id: string
  orderNumber: number
  type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED'
  customerName: string
  customerPhone: string
  deliveryAddress?: string
  tableNumber?: string
  items: OrderItem[]
  kitchenStatus: string
  baristaStatus: string
  subtotal: number
  serviceCharge: number
  total: number
  notes?: string
  createdAt: string
  updatedAt: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ORDER_TYPE_MAP: Record<string, { label: string; color: string }> = {
  DINE_IN:  { label: 'صالة',    color: 'text-blue-400'   },
  TAKEAWAY: { label: 'تيكاوي', color: 'text-orange-400' },
  DELIVERY: { label: 'ديليفري', color: 'text-purple-400' },
}

const REFRESH_INTERVAL = 5 // seconds

function playNotificationSound() {
  try {
    const ctx = new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 660
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.35)
  } catch {}
}

function getElapsedMinutes(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
}

function getRelativeTime(dateStr: string): string {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000))
  if (diff < 60)   return `منذ ${diff} ثانية`
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`
  return `منذ ${Math.floor(diff / 3600)} ساعة`
}

function getUrgencyClasses(createdAt: string): string {
  const mins = getElapsedMinutes(createdAt)
  if (mins > 15) return 'border-red-500 animate-pulse'
  if (mins > 10) return 'border-orange-500'
  if (mins > 5)  return 'border-yellow-500'
  return 'border-blue-500/30'
}

function getUrgencyTextColor(createdAt: string): string {
  const mins = getElapsedMinutes(createdAt)
  if (mins > 15) return 'text-red-400'
  if (mins > 10) return 'text-orange-400'
  if (mins > 5)  return 'text-yellow-400'
  return 'text-blue-400'
}

function transformOrder(raw: Record<string, unknown>): Order {
  const items = (raw.items as Array<Record<string, unknown>> | undefined) ?? []
  return {
    id:              (raw.id as string)          || '',
    orderNumber:     (raw.orderNumber as number) ?? 0,
    type:            (raw.type as string)         as Order['type'],
    status:          (raw.status as string)       as Order['status'],
    customerName:    (raw.customerName as string) || '',
    customerPhone:   (raw.customerPhone as string)|| '',
    deliveryAddress: (raw.deliveryAddress as string) || undefined,
    tableNumber:     (raw.tableNumber as string)  || undefined,
    kitchenStatus:   (raw.kitchenStatus as string) || 'PENDING',
    baristaStatus:   (raw.baristaStatus as string) || 'PENDING',
    subtotal:        Number(raw.subtotal     ?? 0),
    serviceCharge:   Number(raw.serviceCharge ?? 0),
    total:           Number(raw.total         ?? 0),
    notes:           (raw.notes as string)        || undefined,
    createdAt:       (raw.createdAt as string)    || new Date().toISOString(),
    updatedAt:       (raw.updatedAt as string)    || new Date().toISOString(),
    items: items.map((item) => ({
      id:              (item.id as string)          || '',
      mealId:          (item.mealId as string)      || '',
      mealTitle:       (item.mealTitle as string)   || '',
      mealTitleAr:     (item.mealTitleAr as string) || '',
      price:           Number(item.price    ?? 0),
      quantity:        Number(item.quantity ?? 1),
      category:        (item.category as string) || undefined,
      preparationArea: (item.preparationArea as OrderItem['preparationArea']) || undefined,
      imageUrl:        (item.imageUrl as string) || undefined,
      addOns: typeof item.addOns === 'string'
        ? (() => { try { return JSON.parse(item.addOns as string) } catch { return [] } })()
        : ((item.addOns as unknown[]) || []) as OrderItem['addOns'],
      addedQuantity:   Number(item.lastAddedQuantity ?? 0),
      createdAt:       (item.createdAt as string) || new Date().toISOString(),
      updatedAt:       (item.updatedAt as string) || new Date().toISOString(),
    })),
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BaristaPanel({ onLogout }: { onLogout: () => void }) {
  const { toast } = useToast()

  const [orders,           setOrders]           = useState<Order[]>([])
  const [loading,          setLoading]           = useState(true)
  const [isFullscreen,     setIsFullscreen]      = useState(false)
  const [flashActive,      setFlashActive]       = useState(false)
  const [updatingOrderId,  setUpdatingOrderId]   = useState<string | null>(null)
  const [refreshCountdown, setRefreshCountdown]  = useState(REFRESH_INTERVAL)
  const [relativeTimers,   setRelativeTimers]    = useState<Record<string, string>>({})
  // FIX 1: null = not yet fetched, true/false = known state
  const [shiftOpen,        setShiftOpen]         = useState<boolean | null>(null)

  const prevOrderIdsRef      = useRef<Set<string>>(new Set())
  const prevOrderUpdatedAtRef = useRef<Record<string, string>>({})

  // ── Shift status ────────────────────────────────────────────────────────────

  const fetchShiftStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/shifts?current=true')
      setShiftOpen(res.ok ? !!(await res.json()) : false)
    } catch {
      setShiftOpen(false)
    }
  }, [])

  // ── Orders ──────────────────────────────────────────────────────────────────

  const fetchOrders = useCallback(async (showLoading = false) => {
    // FIX 2: guard against fetching when shift is not open or unknown
    if (shiftOpen !== true) {
      setOrders([])
      setLoading(false)
      return
    }

    try {
      if (showLoading) setLoading(true)

      const [pendingRes, confirmedRes, preparingRes, readyRes] = await Promise.all([
        fetch('/api/orders?status=PENDING'),
        fetch('/api/orders?status=CONFIRMED'),
        fetch('/api/orders?status=PREPARING'),
        fetch('/api/orders?status=READY'),
      ])

      const pending: Order[] = pendingRes.ok ? (await pendingRes.json()).map(transformOrder) : []
      const confirmed: Order[] = confirmedRes.ok
        ? (await confirmedRes.json()).map(transformOrder)
        : []
      const preparing: Order[] = preparingRes.ok
        ? (await preparingRes.json()).map(transformOrder)
        : []
      const ready: Order[] = readyRes.ok
        ? (await readyRes.json()).map(transformOrder)
        : []

      const allOrders     = [...pending, ...confirmed, ...preparing, ...ready].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      const visibleOrders = allOrders.filter((o) => 
        o.items.some(isBaristaItem) && 
        o.baristaStatus !== 'READY' &&
        o.baristaStatus !== 'CANCELLED'
      )

      // ── Notifications ──────────────────────────────────────────────────────
      const currentIds = new Set(visibleOrders.map((o) => o.id))
      const newOrders  = visibleOrders.filter((o) => !prevOrderIdsRef.current.has(o.id))

      // FIX 3: only fire "new order" toast when we already had data (not on first load)
      if (newOrders.length > 0 && prevOrderIdsRef.current.size > 0) {
        setFlashActive(true)
        setTimeout(() => setFlashActive(false), 2000)
        playNotificationSound()
        toast({
          title:       'طلب مشروبات جديد! ☕',
          description: `وصل ${newOrders.length > 1 ? `${newOrders.length} طلبات جديدة` : 'طلب جديد'} لقسم الباريستا`,
        })
      }

      // Updated orders (already known, but updatedAt changed)
      const updatedOrders = visibleOrders.filter((order) => {
        const prevContent = prevOrderUpdatedAtRef.current[order.id]
        const currentContent = JSON.stringify(order.items.filter(isBaristaItem)) + (order.notes || '')
        return prevContent && prevContent !== currentContent
      })

      if (updatedOrders.length > 0) {
        setFlashActive(true)
        setTimeout(() => setFlashActive(false), 2000)
        playNotificationSound()
        toast({
          title:       'تعديل في الطلبات',
          description: updatedOrders.length === 1
            ? `تم إضافة مشروبات للطلب #${updatedOrders[0].orderNumber}`
            : `تم تحديث ${updatedOrders.length} طلبات`,
        })
      }

      // FIX 4: use a Set for ids instead of a plain count — more accurate
      prevOrderIdsRef.current       = currentIds
      prevOrderUpdatedAtRef.current = Object.fromEntries(
        visibleOrders.map((o) => [
          o.id, 
          JSON.stringify(o.items.filter(isBaristaItem)) + (o.notes || '')
        ])
      )

      setOrders(visibleOrders)
    } catch {
      toast({ title: 'خطأ', description: 'فشل في تحميل طلبات الباريستا', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast, shiftOpen])

  // ── Status update ───────────────────────────────────────────────────────────

  const updateBaristaStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId)
    try {
      const order = orders.find(o => o.id === orderId)
      if (!order) return

      const payload: Record<string, unknown> = { baristaStatus: newStatus }

      // ─── عند بدء التحضير ───────────────────────────────────────
      if (newStatus === 'PREPARING') {
        // نأكد إن الطلب وصل للباريستا بتفعيل kitchenAccess
        payload.kitchenAccess = true

        // لو الحالة العامة أقل من PREPARING، نرفعها
        if (order.status === 'PENDING') {
          // الطلب لسه جديد - نأكده أولاً ثم نبدأ التحضير
          payload.status = 'CONFIRMED'
          payload.kitchenStatus = order.kitchenStatus === 'PENDING' ? 'CONFIRMED' : order.kitchenStatus
          // ثم نبدأ التحضير مباشرة
          payload.baristaStatus = 'PREPARING'
          payload.status = 'PREPARING'
        } else if (order.status === 'CONFIRMED') {
          payload.status = 'PREPARING'
        }
        // لو الحالة العامة PREPARING أو أكتر، مفيش داعي نغيرها
      }

      // ─── عند الانتهاء ───────────────────────────────────────
      if (newStatus === 'READY') {
        const hasKitchen = order.items.some(i => i.preparationArea === 'KITCHEN')
        const kitchenDone = !hasKitchen || order.kitchenStatus === 'READY' || order.kitchenStatus === 'CANCELLED'
        
        if (kitchenDone) {
          payload.status = 'READY'
        }
      }

      // ─── عند الإلغاء ───────────────────────────────────────
      if (newStatus === 'CANCELLED') {
        const hasKitchen = order.items.some(i => i.preparationArea === 'KITCHEN')
        if (!hasKitchen) {
          // مفيش مطبخ - نلغي الطلب بالكامل
          payload.status = 'CANCELLED'
        }
        // لو فيه مطبخ، فضل الطلب شغال عند المطبخ
      }


      const res = await fetch(`/api/orders/${orderId}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })


      if (res.ok) {
        const updatedOrderRaw = await res.json().catch(() => null)
        const updatedOrder = updatedOrderRaw ? transformOrder(updatedOrderRaw) : null


        toast({ title: 'تم تحديث حالة الباريستا', description: `الحالة الآن: ${newStatus === 'READY' ? 'جاهز' : 'قيد التحضير'}` })

        setOrders((prev) => {
          const next = prev
            .map((o) => (o.id === orderId ? (updatedOrder || { ...o, baristaStatus: newStatus }) : o))
            .filter((o) => o.baristaStatus !== 'READY' && o.baristaStatus !== 'CANCELLED')
          
          prevOrderIdsRef.current = new Set(next.map((o) => o.id))
          if (updatedOrder) {
            prevOrderUpdatedAtRef.current[orderId] = JSON.stringify(updatedOrder.items.filter(isBaristaItem)) + (updatedOrder.notes || '')
          }
          if (newStatus === 'READY' || newStatus === 'CANCELLED') {
            delete prevOrderUpdatedAtRef.current[orderId]
          }
          return next
        })

        // نعمل refresh بعد التحديث مباشرة عشان نتأكد إن الحالة اتحفظت فعلاً
        setTimeout(() => fetchOrders(), 1000)
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

  // ── Fullscreen ──────────────────────────────────────────────────────────────

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }, [])

  // ── Effects ─────────────────────────────────────────────────────────────────

  // Fetch shift status once on mount
  useEffect(() => {
    fetchShiftStatus()
  }, [fetchShiftStatus])

  // FIX 6: start the refresh interval ONLY after shiftOpen is determined
  useEffect(() => {
    if (shiftOpen === null) return // still loading shift info

    // Initial fetch
    fetchOrders(true)

    const interval = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          fetchOrders()
          return REFRESH_INTERVAL
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftOpen]) // intentionally exclude fetchOrders to avoid re-creating interval on every render

  // Fullscreen listener
  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFs)
    return () => document.removeEventListener('fullscreenchange', handleFs)
  }, [])

  // Relative-time ticker (every 10 s)
  useEffect(() => {
    const id = setInterval(() => {
      setRelativeTimers(
        Object.fromEntries(orders.map((o) => [o.id, getRelativeTime(o.createdAt)]))
      )
    }, 10_000)
    return () => clearInterval(id)
  }, [orders])

  // ── Shift closed guard ──────────────────────────────────────────────────────

  if (shiftOpen === false) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8" dir="rtl">
      <Card className="border-red-500/20 bg-red-500/5 p-8 text-center max-w-md">
        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-red-600 mb-2">قسم الباريستا مغلق</h2>
        <p className="text-muted-foreground">لا يوجد شيفت عمل مفتوح حالياً.</p>
        <Button onClick={onLogout} variant="outline" className="mt-6">خروج</Button>
      </Card>
    </div>
  )

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className={`min-h-screen bg-[#0c0c0c] transition-colors duration-300 ${flashActive ? 'bg-blue-500/5' : ''}`}
      dir="rtl"
    >
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-blue-500/20 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 overflow-hidden">
              <img src="/logo.webp" alt="Logo" className="h-full w-full object-cover" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-blue-400">شاشة الباريستا</h1>
              <p className="text-xs text-muted-foreground">سرايا العرب - المشروبات</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/5 px-2 py-1">
              <RefreshCw className={`h-3.5 w-3.5 text-blue-400 ${refreshCountdown <= 2 ? 'animate-spin' : ''}`} />
              <span className="text-xs font-mono text-blue-400">{refreshCountdown}s</span>
            </div>
            <Button
              variant="outline" size="sm"
              onClick={toggleFullscreen}
              className="border-blue-500/30 text-blue-400"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={onLogout}
              className="text-muted-foreground hover:text-red-400"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="p-4 md:p-6">
        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-blue-400" />
          </div>
        )}

        {/* Empty state */}
        {!loading && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 opacity-30">
            <Coffee className="h-20 w-20 text-blue-400 mb-4" />
            <p className="text-xl">لا توجد طلبات مشروبات حالياً</p>
          </div>
        )}

        {/* FIX 7: AnimatePresence is now correctly INSIDE the grid div */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {orders.map((order) => {
              const typeInfo    = ORDER_TYPE_MAP[order.type]
              const isUpdating  = updatingOrderId === order.id
              const items       = order.items.filter(isBaristaItem)
              const urgencyCls  = getUrgencyClasses(order.createdAt)
              const urgencyTxt  = getUrgencyTextColor(order.createdAt)
              const elapsedMins = Math.max(0, getElapsedMinutes(order.createdAt))

              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Card className={`border-2 ${urgencyCls} bg-card overflow-hidden transition-all`}>
                    {/* Card header */}
                    <div className="bg-blue-500/10 border-b border-blue-500/20 px-4 py-3 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-blue-400">#{order.orderNumber}</span>
                        <Badge variant="outline" className={`${typeInfo.color} border-current/30 text-[10px]`}>
                          {typeInfo.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {relativeTimers[order.id] || getRelativeTime(order.createdAt)}
                      </div>
                    </div>

                    <CardContent className="p-4">
                      {/* Table number */}
                      {order.type === 'DINE_IN' && order.tableNumber && (
                        <div className="mb-3 rounded-lg bg-blue-500/10 p-2 text-center border border-blue-500/20">
                          <span className="text-xs text-blue-300 block">طاولة</span>
                          <span className="text-3xl font-black text-blue-400">{order.tableNumber}</span>
                        </div>
                      )}

                      {/* Elapsed time */}
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Clock className={`h-4 w-4 ${urgencyTxt}`} />
                          <span className={`text-sm font-bold ${urgencyTxt}`}>
                            {relativeTimers[order.id] || getRelativeTime(order.createdAt)}
                          </span>
                        </div>
                        {elapsedMins > 5 && (
                          <Badge variant="outline" className={`text-[10px] ${urgencyTxt} border-current/20`}>
                            {elapsedMins} دقيقة
                          </Badge>
                        )}
                      </div>

                      {/* Items */}
                      <div className="space-y-3 mb-4">
                        {items.map((item, idx) => (
                          <div key={item.id || idx} className="flex gap-3 items-start">
                            <span className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/20 text-blue-400 font-bold">
                              {item.quantity}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-lg leading-tight">
                                  {item.mealTitleAr || item.mealTitle}
                                </p>
                                {(item.addedQuantity ?? 0) > 0 && (
                                  <Badge className="bg-emerald-500 text-white text-[10px]">
                                    +{item.addedQuantity}
                                  </Badge>
                                )}
                              </div>
                              {item.addOns && item.addOns.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {item.addOns.map((a, i) => (
                                    <span
                                      key={i}
                                      className="text-[10px] text-blue-300/70 bg-blue-500/5 px-1.5 rounded"
                                    >
                                      {a.titleAr || a.title}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Notes */}
                      {order.notes && (
                        <div className="mb-4 p-2 rounded bg-amber-500/5 border border-amber-500/20 text-xs text-amber-200">
                          <span className="font-bold block mb-0.5">ملاحظات:</span>
                          {order.notes}
                        </div>
                      )}

                      <Separator className="mb-4 opacity-10" />

                      {/* Actions */}
                      <div className="flex gap-2">
                        {(order.baristaStatus === 'PENDING' || order.baristaStatus === 'CONFIRMED') && (
                          <Button
                            onClick={() => updateBaristaStatus(order.id, 'PREPARING')}
                            disabled={isUpdating}
                            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold h-12"
                          >
                            {isUpdating
                              ? <Loader2 className="animate-spin" />
                              : <Flame className="ml-2 h-5 w-5" />
                            }
                            تحضير المشروبات
                          </Button>
                        )}
                        {order.baristaStatus === 'PREPARING' && (
                          <Button
                            onClick={() => updateBaristaStatus(order.id, 'READY')}
                            disabled={isUpdating}
                            className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold h-12"
                          >
                            {isUpdating
                              ? <Loader2 className="animate-spin" />
                              : <CheckCircle className="ml-2 h-5 w-5" />
                            }
                            مشروبات جاهزة!
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isUpdating}
                          onClick={() => updateBaristaStatus(order.id, 'CANCELLED')}
                          className="gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10 h-12 px-4"
                        >
                          <XCircle className="h-5 w-5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>{/* ← grid closes AFTER AnimatePresence */}
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