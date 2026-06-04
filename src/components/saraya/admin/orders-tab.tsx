'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardList, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useRelativeTimers } from '@/lib/saraya/hooks'
import { transformOrder, escapeHtml } from '@/lib/saraya/helpers'
import { ORDER_STATUS_MAP } from '@/lib/saraya/constants'
import { OrderStatsGrid } from './order-stats-grid'
import { OrderCard } from './order-card'
import { OrderFilters } from './order-filters'
import { CancelledOrders } from './cancelled-orders'
import { CancelOrderDialog } from './cancel-order-dialog'
import type { Order, OrderStats, KitchenBaristaStatus } from '@/lib/saraya/types'

interface OrdersTabProps {
  adminUsername: string
}

export function OrdersTab({ adminUsername }: OrdersTabProps) {
  const { toast } = useToast()
  const lastPendingCountRef = useRef(0)
  const lastReadyToPayCountRef = useRef(0)

  // Orders state
  const [orders, setOrders] = useState<Order[]>([])
  const [cancelledOrders, setCancelledOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL')
  const [orderTypeFilter, setOrderTypeFilter] = useState('ALL')
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null)
  const [currentShiftId, setCurrentShiftId] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)

  // Relative timers hook (replaces manual timer state)
  const relativeTimers = useRelativeTimers(orders)

  // Fetch current shift
  const fetchCurrentShift = useCallback(async () => {
    try {
      const res = await fetch('/api/shifts?current=true')
      if (res.ok) {
        const shift = await res.json()
        setCurrentShiftId(shift?.id || null)
      } else {
        setCurrentShiftId(null)
      }
    } catch {
      setCurrentShiftId(null)
    }
  }, [])

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      setLoadingOrders(true)
      const params = new URLSearchParams()
      if (orderStatusFilter !== 'ALL') params.set('status', orderStatusFilter)
      if (orderTypeFilter !== 'ALL') params.set('type', orderTypeFilter)
      if (currentShiftId) params.set('shiftId', currentShiftId)
      const res = await fetch(`/api/orders?${params.toString()}`)
      if (res.ok) {
        const rawData = await res.json()
        const allOrders = rawData.map(transformOrder)
        setOrders(allOrders.filter((order) => order.status !== 'CANCELLED'))
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err)
    } finally {
      setLoadingOrders(false)
    }
  }, [orderStatusFilter, orderTypeFilter, currentShiftId])

  const fetchCancelledOrders = useCallback(async () => {
    if (!currentShiftId) {
      setCancelledOrders([])
      return
    }
    try {
      const params = new URLSearchParams({ status: 'CANCELLED', shiftId: currentShiftId })
      const res = await fetch(`/api/orders?${params.toString()}`)
      if (res.ok) {
        const rawData = await res.json()
        setCancelledOrders(rawData.map(transformOrder))
      }
    } catch (err) {
      console.error('Failed to fetch cancelled orders:', err)
    }
  }, [currentShiftId])

  const fetchStats = useCallback(async (shiftId?: string) => {
    try {
      const params = new URLSearchParams()
      if (shiftId) params.set('shiftId', shiftId)
      const url = `/api/orders/stats${params.toString() ? `?${params.toString()}` : ''}`
      const res = await fetch(url)
      if (res.ok) setOrderStats(await res.json())
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }, [])

  // Bug fix: parallel fetch with Promise.all
  const fetchAllOrderData = useCallback(async (shiftId?: string) => {
    await Promise.all([
      fetchOrders(),
      fetchCancelledOrders(),
      fetchStats(shiftId),
    ])
  }, [fetchOrders, fetchCancelledOrders, fetchStats])

  useEffect(() => { fetchCurrentShift() }, [fetchCurrentShift])
  useEffect(() => { fetchOrders() }, [fetchOrders])
  useEffect(() => { fetchCancelledOrders() }, [fetchCancelledOrders])
  useEffect(() => { fetchStats(currentShiftId ?? undefined) }, [fetchStats, currentShiftId])

  // Print order with XSS fix
  const printOrder = (order: Order) => {
    const content = `
      <html>
        <head>
          <title>Order #${order.orderNumber}</title>
          <style>body{font-family: sans-serif;direction: rtl;text-align: right;}table{width:100%;border-collapse: collapse;}td,th{padding:8px;border:1px solid #ddd;}h1,h2{margin:0 0 8px;} .muted{color:#666;font-size:0.9rem;}</style>
        </head>
        <body>
          <h1>فاتورة الطلب #${order.orderNumber}</h1>
          <p class="muted">الحالة: ${ORDER_STATUS_MAP[order.status]?.label ?? order.status}</p>
          <p>الزبون: ${escapeHtml(order.customerName)}</p>
          <p>الهاتف: ${escapeHtml(order.customerPhone || '-')} ${order.tableNumber ? ` | طاولة ${escapeHtml(order.tableNumber)}` : ''}</p>
          ${order.deliveryAddress ? `<p>العنوان: ${escapeHtml(order.deliveryAddress)}</p>` : ''}
          <table>
            <thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th></tr></thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td>${escapeHtml(item.mealTitleAr || item.mealTitle)}</td>
                  <td>${item.quantity}</td>
                  <td>${(item.price * item.quantity).toFixed(2)} ج.م</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <p class="muted">الإجمالي: ${order.total.toFixed(2)} ج.م</p>
          ${order.notes ? `<p class="muted">ملاحظات: ${escapeHtml(order.notes)}</p>` : ''}
          ${order.status === 'CANCELLED' && order.cancelledBy ? `<p class="muted">ملغي بواسطة: ${escapeHtml(order.cancelledBy)}</p>` : ''}
          <script>window.print();</script>
        </body>
      </html>
    `
    const printWindow = window.open('', '_blank', 'width=700,height=900')
    if (printWindow) {
      printWindow.document.write(content)
      printWindow.document.close()
    }
  }

  // Update order status with proper typing (fix: replace `any` with proper type)
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId)
    try {
      const order = orders.find(o => o.id === orderId)
      const payload: Record<string, unknown> = { status: newStatus }

      if (newStatus === 'CONFIRMED') {
        payload.kitchenStatus = 'CONFIRMED' as KitchenBaristaStatus
        payload.baristaStatus = 'CONFIRMED' as KitchenBaristaStatus
        payload.kitchenAccess = true
      }
      if (newStatus === 'PREPARING') {
        if (order?.kitchenStatus === 'PENDING' || order?.kitchenStatus === 'CONFIRMED') {
          payload.kitchenStatus = 'PREPARING' as KitchenBaristaStatus
        }
        if (order?.baristaStatus === 'PENDING' || order?.baristaStatus === 'CONFIRMED') {
          payload.baristaStatus = 'PREPARING' as KitchenBaristaStatus
        }
      }
      if (newStatus === 'READY') {
        payload.kitchenStatus = 'READY' as KitchenBaristaStatus
        payload.baristaStatus = 'READY' as KitchenBaristaStatus
      }
      if (newStatus === 'CANCELLED') {
        payload.cancelledBy = adminUsername
        payload.kitchenStatus = 'CANCELLED' as KitchenBaristaStatus
        payload.baristaStatus = 'CANCELLED' as KitchenBaristaStatus
      }

      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast({ title: 'تم تحديث حالة الطلب' })
        // Reset status filter to ALL so the order stays visible after status change
        if (orderStatusFilter !== 'ALL') {
          setOrderStatusFilter('ALL')
        }
        await fetchAllOrderData(currentShiftId ?? undefined)
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: (data as { error?: string }).error || 'فشل في تحديث الحالة', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في الاتصال بالخادم', variant: 'destructive' })
    } finally {
      setUpdatingOrderId(null)
    }
  }

  // Polling-based real-time
  useEffect(() => {
    if (!currentShiftId) return

    const initializeCounts = async () => {
      try {
        const pendingParams = new URLSearchParams({ status: 'PENDING', shiftId: currentShiftId })
        const readyToPayParams = new URLSearchParams({ status: 'READY_TO_PAY', shiftId: currentShiftId })

        const [pendingRes, readyRes] = await Promise.all([
          fetch(`/api/orders?${pendingParams.toString()}`),
          fetch(`/api/orders?${readyToPayParams.toString()}`),
        ])

        if (!pendingRes.ok || !readyRes.ok) return

        const pendingOrders = (await pendingRes.json()).map(transformOrder)
        const readyToPayOrders = (await readyRes.json()).map(transformOrder)

        lastPendingCountRef.current = pendingOrders.length
        lastReadyToPayCountRef.current = readyToPayOrders.length
      } catch (err) {
        console.error('Failed to initialize polling counts:', err)
      }
    }

    initializeCounts()

    const pollInterval = setInterval(async () => {
      try {
        const pendingParams = new URLSearchParams({ status: 'PENDING', shiftId: currentShiftId })
        const readyToPayParams = new URLSearchParams({ status: 'READY_TO_PAY', shiftId: currentShiftId })

        const [pendingRes, readyRes] = await Promise.all([
          fetch(`/api/orders?${pendingParams.toString()}`),
          fetch(`/api/orders?${readyToPayParams.toString()}`),
        ])

        if (!pendingRes.ok || !readyRes.ok) return

        const pendingOrders = (await pendingRes.json()).map(transformOrder)
        const readyToPayOrders = (await readyRes.json()).map(transformOrder)

        const pendingChanged = pendingOrders.length > lastPendingCountRef.current
        const readyToPayChanged = readyToPayOrders.length !== lastReadyToPayCountRef.current

        if (pendingChanged || readyToPayChanged) {
          if (pendingChanged) {
            const newOrder = pendingOrders[0]
            toast({ title: 'طلب جديد! 🍽️', description: `طلب رقم #${newOrder.orderNumber}` })
          }
          if (readyToPayChanged && readyToPayOrders.length > lastReadyToPayCountRef.current) {
            toast({ title: 'طلب جاهز للدفع', description: `عدد الطلبات الجاهزة للدفع الآن ${readyToPayOrders.length}` })
          }

          lastPendingCountRef.current = pendingOrders.length
          lastReadyToPayCountRef.current = readyToPayOrders.length
          fetchOrders()
          fetchStats(currentShiftId)
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }, 5000)

    return () => clearInterval(pollInterval)
  }, [currentShiftId, fetchOrders, fetchStats, toast])

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <OrderStatsGrid stats={orderStats} currentShiftId={currentShiftId} />

      {/* Filters */}
      <div className="space-y-3">
        <OrderFilters
          statusFilter={orderStatusFilter}
          typeFilter={orderTypeFilter}
          onStatusFilterChange={setOrderStatusFilter}
          onTypeFilterChange={setOrderTypeFilter}
          onRefresh={() => fetchAllOrderData(currentShiftId ?? undefined)}
        />
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAllOrderData(currentShiftId ?? undefined)}
            className="gap-2 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 h-8"
          >
            <RefreshCw className="h-3 w-3" />
            تحديث يدوي
          </Button>
        </div>
      </div>

      {/* Orders List */}
      {loadingOrders ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
        </div>
      ) : orders.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <ClipboardList className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p>لا توجد طلبات حالياً</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                relativeTime={relativeTimers[order.id] || ''}
                isUpdating={updatingOrderId === order.id}
                onUpdateStatus={updateOrderStatus}
                onCancel={setCancelTarget}
                onPrint={printOrder}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Cancelled Orders */}
      <CancelledOrders orders={cancelledOrders} />

      {/* Cancel Order Dialog */}
      <CancelOrderDialog
        order={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={(orderId) => updateOrderStatus(orderId, 'CANCELLED')}
      />
    </div>
  )
}
