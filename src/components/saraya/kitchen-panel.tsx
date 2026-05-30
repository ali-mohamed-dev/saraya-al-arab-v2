'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChefHat, LogOut, RefreshCw, Loader2,
  Clock, Maximize, Minimize, Utensils, Phone, Package,
  Flame, Timer, CheckCircle, XCircle, AlertTriangle
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
  addOns?: { title: string; titleAr: string; price: number }[]
  imageUrl?: string
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
  subtotal: number
  serviceCharge: number
  total: number
  notes?: string
  createdAt: string
  updatedAt: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ORDER_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'جديد', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  CONFIRMED: { label: 'مؤكد', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  PREPARING: { label: 'قيد التحضير', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  READY: { label: 'جاهز', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' },
  DELIVERED: { label: 'تم التسليم', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  CANCELLED: { label: 'ملغي', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
}

const ORDER_TYPE_MAP: Record<string, { label: string; color: string }> = {
  DINE_IN: { label: 'صالة', color: 'text-blue-400' },
  TAKEAWAY: { label: 'تيكاوي', color: 'text-orange-400' },
  DELIVERY: { label: 'ديليفري', color: 'text-purple-400' },
}

const REFRESH_INTERVAL = 30 // seconds

// ── Helper Functions ──────────────────────────────────────────────────────────

function getElapsedMinutes(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, Math.floor((now - then) / 1000))
  if (diff < 60) return `منذ ${diff} ثانية`
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`
  return `منذ ${Math.floor(diff / 86400)} يوم`
}

function getUrgencyClasses(createdAt: string): string {
  const mins = getElapsedMinutes(createdAt)
  if (mins > 15) return 'border-red-500 animate-pulse'
  if (mins > 10) return 'border-orange-500'
  if (mins > 5) return 'border-yellow-500'
  return 'border-border/50'
}

function getUrgencyTextColor(createdAt: string): string {
  const mins = getElapsedMinutes(createdAt)
  if (mins > 15) return 'text-red-400'
  if (mins > 10) return 'text-orange-400'
  if (mins > 5) return 'text-yellow-400'
  return 'text-muted-foreground'
}

function transformOrder(raw: Record<string, unknown>): Order {
  const items = (raw.items as Array<Record<string, unknown>> | undefined) ?? []
  return {
    id: (raw.id as string) || '',
    orderNumber: (raw.orderNumber as number) ?? 0,
    type: (raw.type as string) as Order['type'],
    status: (raw.status as string) as Order['status'],
    customerName: (raw.customerName as string) || '',
    customerPhone: (raw.customerPhone as string) || '',
    deliveryAddress: (raw.deliveryAddress as string) || undefined,
    tableNumber: (raw.tableNumber as string) || undefined,
    subtotal: Number(raw.subtotal ?? 0),
    serviceCharge: Number(raw.serviceCharge ?? 0),
    total: Number(raw.total ?? 0),
    notes: (raw.notes as string) || undefined,
    createdAt: (raw.createdAt as string) || new Date().toISOString(),
    updatedAt: (raw.updatedAt as string) || new Date().toISOString(),
    items: items.map((item) => {
      let parsedAddOns: { title: string; titleAr: string; price: number }[] | undefined
      try {
        parsedAddOns = typeof item.addOns === 'string'
          ? JSON.parse(item.addOns || '[]')
          : (item.addOns as { title: string; titleAr: string; price: number }[] | undefined)
      } catch {
        parsedAddOns = undefined
      }
      return {
        id: (item.id as string) || '',
        mealId: (item.mealId as string) || '',
        mealTitle: (item.mealTitle as string) || '',
        mealTitleAr: (item.mealTitleAr as string) || '',
        price: Number(item.price ?? 0),
        quantity: Number(item.quantity ?? 1),
        imageUrl: (item.imageUrl as string) || undefined,
        addOns: parsedAddOns,
      }
    }),
  }
}

function getOrderTypeIcon(type: string) {
  switch (type) {
    case 'DINE_IN': return <Utensils className="h-4 w-4" />
    case 'TAKEAWAY': return <Package className="h-4 w-4" />
    case 'DELIVERY': return <Phone className="h-4 w-4" />
    default: return null
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function KitchenPanel({ onLogout }: { onLogout: () => void }) {
  const { toast } = useToast()

  // ── State ────────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [flashActive, setFlashActive] = useState(false)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [refreshCountdown, setRefreshCountdown] = useState(REFRESH_INTERVAL)
  const [relativeTimers, setRelativeTimers] = useState<Record<string, string>>({})

  const prevOrderCountRef = useRef(0)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Fetch orders ─────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true)
      setError(null)

      // Fetch all three statuses in parallel
      const [pendingRes, confirmedRes, preparingRes] = await Promise.all([
        fetch('/api/orders?status=PENDING'),
        fetch('/api/orders?status=CONFIRMED'),
        fetch('/api/orders?status=PREPARING'),
      ])

      const pending: Order[] = pendingRes.ok ? (await pendingRes.json()).map(transformOrder) : []
      const confirmed: Order[] = confirmedRes.ok ? (await confirmedRes.json()).map(transformOrder) : []
      const preparing: Order[] = preparingRes.ok ? (await preparingRes.json()).map(transformOrder) : []

      // Sort: oldest first (most urgent)
      const allOrders = [...pending, ...confirmed, ...preparing].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )

      // Detect new orders
      if (allOrders.length > prevOrderCountRef.current && prevOrderCountRef.current > 0) {
        setFlashActive(true)
        setTimeout(() => setFlashActive(false), 2000)
        const newOrder = allOrders.find(o => o.status === 'PENDING')
        if (newOrder) {
          toast({ title: 'طلب جديد!', description: `طلب رقم #${newOrder.orderNumber}` })
        }
      }
      prevOrderCountRef.current = allOrders.length

      setOrders(allOrders)
    } catch {
      setError('فشل في تحميل الطلبات')
    } finally {
      setLoading(false)
    }
  }, [toast])

  // ── Update order status ──────────────────────────────────────────────────
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        const statusLabel = ORDER_STATUS_MAP[newStatus]?.label || newStatus
        toast({ title: 'تم تحديث الحالة', description: `تم تغيير الحالة إلى: ${statusLabel}` })
        // Immediately update local state for faster UI
        setOrders(prev => prev.filter(o => {
          if (o.id !== orderId) return true
          // Remove orders that moved to READY from the active list
          return newStatus !== 'READY' && newStatus !== 'CANCELLED'
        }))
        prevOrderCountRef.current = Math.max(0, prevOrderCountRef.current - (newStatus === 'READY' || newStatus === 'CANCELLED' ? 1 : 0))
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: data.error || 'فشل في تحديث الحالة', variant: 'destructive' })
        fetchOrders() // Refresh to ensure consistency
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في الاتصال بالخادم', variant: 'destructive' })
    } finally {
      setUpdatingOrderId(null)
    }
  }

  // ── Auto-refresh every 30 seconds with countdown ─────────────────────────
  useEffect(() => {
    fetchOrders(true)

    // Countdown timer (every second)
    countdownRef.current = setInterval(() => {
      setRefreshCountdown(prev => {
        if (prev <= 1) {
          return REFRESH_INTERVAL
        }
        return prev - 1
      })
    }, 1000)

    // Refresh data every 30 seconds
    refreshRef.current = setInterval(() => {
      fetchOrders()
      setRefreshCountdown(REFRESH_INTERVAL)
    }, REFRESH_INTERVAL * 1000)

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
      if (refreshRef.current) clearInterval(refreshRef.current)
    }
  }, [fetchOrders])

  // ── Update relative timers every 10 seconds ──────────────────────────────
  useEffect(() => {
    const updateTimers = () => {
      const timers: Record<string, string> = {}
      orders.forEach((o) => { timers[o.id] = getRelativeTime(o.createdAt) })
      setRelativeTimers(timers)
    }
    updateTimers()
    const id = setInterval(updateTimers, 10000)
    return () => clearInterval(id)
  }, [orders])

  // ── Fullscreen toggle ────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }, [])

  // Listen for fullscreen changes (e.g. Escape key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // ── Computed stats ───────────────────────────────────────────────────────
  const pendingCount = orders.filter(o => o.status === 'PENDING').length
  const confirmedCount = orders.filter(o => o.status === 'CONFIRMED').length
  const preparingCount = orders.filter(o => o.status === 'PREPARING').length
  const totalCount = orders.length

  // ── Get next status action for an order ──────────────────────────────────
  const getNextAction = (order: Order): { status: string; label: string; color: string; icon: React.ReactNode } | null => {
    switch (order.status) {
      case 'PENDING':
        return { status: 'CONFIRMED', label: 'تأكيد', color: 'bg-blue-600 hover:bg-blue-500 text-white', icon: <CheckCircle className="h-5 w-5" /> }
      case 'CONFIRMED':
        return { status: 'PREPARING', label: 'تحضير', color: 'bg-amber-600 hover:bg-amber-500 text-white', icon: <Flame className="h-5 w-5" /> }
      case 'PREPARING':
        return { status: 'READY', label: 'جاهز!', color: 'bg-green-600 hover:bg-green-500 text-white', icon: <CheckCircle className="h-5 w-5" /> }
      default:
        return null
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className={`min-h-screen bg-background transition-colors duration-300 ${flashActive ? 'bg-yellow-500/5' : ''}`}
      dir="rtl"
    >
      {/* ── Sticky Header ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-[#D4AF37]/20 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 md:h-16 items-center justify-between px-3 md:px-6">
          {/* Right side: Logo + Title */}
          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-[#D4AF37]/10">
              <ChefHat className="h-5 w-5 text-[#D4AF37]" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-[#D4AF37]">شاشة المطبخ</h1>
              <p className="text-[10px] md:text-xs text-muted-foreground">سرايا العرب - المطبخ</p>
            </div>
          </div>

          {/* Left side: Controls */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Refresh Countdown Indicator */}
            <div className="flex items-center gap-1.5 rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/5 px-2 py-1">
              <RefreshCw className={`h-3.5 w-3.5 text-[#D4AF37] ${refreshCountdown <= 3 ? 'animate-spin' : ''}`} />
              <span className="text-xs font-mono text-[#D4AF37]">{refreshCountdown}s</span>
            </div>

            {/* Manual Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => { fetchOrders(); setRefreshCountdown(REFRESH_INTERVAL) }}
              className="gap-1.5 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 h-8 px-2 md:px-3"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden md:inline">تحديث</span>
            </Button>

            {/* Fullscreen Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="gap-1.5 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 h-8 px-2 md:px-3"
            >
              {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
              <span className="hidden md:inline">{isFullscreen ? 'إنهاء' : 'ملء الشاشة'}</span>
            </Button>

            {/* Logout */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="gap-1.5 text-muted-foreground hover:text-red-400 h-8 px-2 md:px-3"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden md:inline">خروج</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Stats Bar ───────────────────────────────────────────────────── */}
      <div className="border-b border-border/30 bg-muted/30">
        <div className="mx-auto flex items-center justify-center gap-3 md:gap-6 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-xs md:text-sm font-medium text-yellow-400">جديد: {pendingCount}</span>
          </div>
          <Separator orientation="vertical" className="h-5 bg-border/30" />
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            <span className="text-xs md:text-sm font-medium text-blue-400">مؤكد: {confirmedCount}</span>
          </div>
          <Separator orientation="vertical" className="h-5 bg-border/30" />
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="text-xs md:text-sm font-medium text-amber-400">قيد التحضير: {preparingCount}</span>
          </div>
          <Separator orientation="vertical" className="h-5 bg-border/30" />
          <div className="flex items-center gap-2">
            <Timer className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs md:text-sm font-medium text-muted-foreground">الإجمالي: {totalCount}</span>
          </div>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
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
          <div className="flex flex-col items-center justify-center py-20">
            <ChefHat className="h-16 w-16 text-[#D4AF37]/20 mb-4" />
            <p className="text-xl text-muted-foreground mb-1">لا توجد طلبات حالياً</p>
            <p className="text-sm text-muted-foreground/60">ستظهر الطلبات الجديدة تلقائياً</p>
          </div>
        )}

        {/* Order Cards Grid */}
        <AnimatePresence mode="popLayout">
          <div className={`grid gap-3 md:gap-4 ${
            isFullscreen
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          }`}>
            {orders.map((order) => {
              const statusInfo = ORDER_STATUS_MAP[order.status]
              const typeInfo = ORDER_TYPE_MAP[order.type]
              const nextAction = getNextAction(order)
              const urgencyClasses = getUrgencyClasses(order.createdAt)
              const urgencyTextColor = getUrgencyTextColor(order.createdAt)
              const elapsedMins = getElapsedMinutes(order.createdAt)
              const isUpdating = updatingOrderId === order.id

              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <Card className={`border-2 ${urgencyClasses} bg-card overflow-hidden transition-all`}>
                    {/* Card Header: Order # + Type + Status */}
                    <div className={`${statusInfo.bg} border-b border-border/30 px-3 py-2 md:px-4 md:py-3`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-xl md:text-2xl font-black ${statusInfo.color}`}>
                            #{order.orderNumber}
                          </span>
                          <Badge variant="outline" className={`${typeInfo.color} border-current/30 text-xs md:text-sm gap-1`}>
                            {getOrderTypeIcon(order.type)}
                            {typeInfo.label}
                          </Badge>
                        </div>
                        <Badge className={`${statusInfo.bg} ${statusInfo.color} border text-xs md:text-sm font-bold`}>
                          {statusInfo.label}
                        </Badge>
                      </div>

                      {/* Table Number (prominent for DINE_IN) */}
                      {order.type === 'DINE_IN' && order.tableNumber && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <Utensils className="h-4 w-4 text-blue-400" />
                          <span className="text-base md:text-lg font-bold text-blue-400">
                            طاولة {order.tableNumber}
                          </span>
                        </div>
                      )}

                      {/* Delivery Address */}
                      {order.type === 'DELIVERY' && order.deliveryAddress && (
                        <div className="mt-1 text-xs text-purple-400/80 truncate">
                          {order.deliveryAddress}
                        </div>
                      )}
                    </div>

                    {/* Card Body: Items + Timer */}
                    <CardContent className="p-3 md:p-4">
                      {/* Elapsed Time - KDS style large display */}
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Clock className={`h-4 w-4 ${urgencyTextColor}`} />
                          <span className={`text-sm md:text-base font-bold ${urgencyTextColor}`}>
                            {relativeTimers[order.id] || getRelativeTime(order.createdAt)}
                          </span>
                        </div>
                        {elapsedMins > 5 && (
                          <span className={`text-xs font-bold ${urgencyTextColor} bg-background/50 rounded px-1.5 py-0.5`}>
                            {elapsedMins} د
                          </span>
                        )}
                      </div>

                      {/* Items List - Large text for kitchen readability */}
                      <div className="space-y-1.5 mb-3">
                        {order.items.map((item, idx) => (
                          <div key={item.id || idx} className="flex items-start gap-2">
                            <span className="flex-shrink-0 flex h-6 w-6 md:h-7 md:w-7 items-center justify-center rounded-md bg-[#D4AF37]/10 text-xs md:text-sm font-black text-[#D4AF37]">
                              {item.quantity}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm md:text-base font-semibold leading-tight truncate">
                                {item.mealTitleAr || item.mealTitle}
                              </p>
                              {item.addOns && item.addOns.length > 0 && (
                                <div className="mt-0.5 flex flex-wrap gap-1">
                                  {item.addOns.map((addon, aIdx) => (
                                    <span key={aIdx} className="text-[10px] md:text-xs text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
                                      + {addon.titleAr || addon.title}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Notes - highlighted for kitchen attention */}
                      {order.notes && (
                        <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 md:p-2.5">
                          <div className="flex items-center gap-1 mb-0.5">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                            <span className="text-[10px] md:text-xs font-bold text-amber-400">ملاحظات</span>
                          </div>
                          <p className="text-xs md:text-sm text-amber-200/90 leading-relaxed">{order.notes}</p>
                        </div>
                      )}

                      <Separator className="my-2 bg-border/30" />

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 mt-2">
                        {nextAction && (
                          <Button
                            onClick={() => updateOrderStatus(order.id, nextAction.status)}
                            disabled={isUpdating}
                            className={`flex-1 gap-2 h-10 md:h-12 text-sm md:text-base font-bold rounded-lg ${nextAction.color} transition-all active:scale-95`}
                          >
                            {isUpdating ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              nextAction.icon
                            )}
                            {nextAction.label}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isUpdating}
                          onClick={() => updateOrderStatus(order.id, 'CANCELLED')}
                          className="gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10 h-10 md:h-12 px-3 md:px-4 text-sm"
                        >
                          <XCircle className="h-4 w-4" />
                          <span className="hidden md:inline">إلغاء</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </AnimatePresence>
      </main>

      {/* ── Flash Overlay for New Orders ─────────────────────────────────── */}
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
