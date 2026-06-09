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
import { ReceiptDialog } from '@/components/Top/cashier/receipt-dialog'
import type { Order, OrderStats, KitchenBaristaStatus } from '@/lib/saraya/types'

interface OrdersTabProps {
  adminUsername: string
}

export function OrdersTab({ adminUsername }: OrdersTabProps) {
  const { toast } = useToast()
  const lastPendingCountRef = useRef(0)
  const lastReadyToPayCountRef = useRef(0)

  const [orders, setOrders] = useState<Order[]>([])
  const [cancelledOrders, setCancelledOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL')
  const [orderTypeFilter, setOrderTypeFilter] = useState('ALL')
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null)
  const [shiftIds, setShiftIds] = useState<string[]>([])
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0])
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0])

  // ── Receipt dialog state ──
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const relativeTimers = useRelativeTimers(orders)

  const fetchShiftsByRange = useCallback(async (from: string, to: string) => {
    try {
      if (from === today && to === today) {
        const res = await fetch('/api/shifts?current=true')
        if (res.ok) {
          const shift = await res.json()
          setShiftIds(shift?.id ? [shift.id] : [])
          return
        }
      }
      const res = await fetch('/api/shifts')
      if (res.ok) {
        const allShifts: any[] = await res.json()
        const start = new Date(from); start.setHours(0, 0, 0, 0)
        const end = new Date(to); end.setHours(23, 59, 59, 999)
        const inRange = allShifts.filter(s => {
          const d = new Date(s.createdAt)
          return d >= start && d <= end
        })
        setShiftIds(inRange.map(s => s.id))
      }
    } catch (err) {
      console.error('Failed to fetch shifts:', err)
      setShiftIds([])
    }
  }, [today])

  const fetchOrders = useCallback(async () => {
    if (shiftIds.length === 0) { setOrders([]); return }
    try {
      const allFetchedOrders: Order[] = []
      await Promise.all(shiftIds.map(async (sid) => {
        const params = new URLSearchParams()
        if (orderStatusFilter !== 'ALL') params.set('status', orderStatusFilter)
        if (orderTypeFilter !== 'ALL') params.set('type', orderTypeFilter)
        params.set('shiftId', sid)
        const res = await fetch(`/api/orders?${params.toString()}`)
        if (res.ok) {
          const rawData = await res.json()
          allFetchedOrders.push(...rawData.map(transformOrder))
        }
      }))
      setOrders(
        allFetchedOrders
          .filter((order) => order.status !== 'CANCELLED')
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      )
    } catch (err) {
      console.error('Failed to fetch orders:', err)
    }
  }, [orderStatusFilter, orderTypeFilter, shiftIds])

  const fetchCancelledOrders = useCallback(async () => {
    if (shiftIds.length === 0) { setCancelledOrders([]); return }
    try {
      const allCancelled: Order[] = []
      await Promise.all(shiftIds.map(async (sid) => {
        const params = new URLSearchParams({ status: 'CANCELLED', shiftId: sid })
        const res = await fetch(`/api/orders?${params.toString()}`)
        if (res.ok) {
          const rawData = await res.json()
          allCancelled.push(...rawData.map(transformOrder))
        }
      }))
      setCancelledOrders(allCancelled.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    } catch (err) {
      console.error('Failed to fetch cancelled orders:', err)
    }
  }, [shiftIds])

  const fetchStats = useCallback(async (ids: string[]) => {
    if (ids.length === 0) { setOrderStats(null); return }
    try {
      const statsResults = await Promise.all(ids.map(async (sid) => {
        const res = await fetch(`/api/orders/stats?shiftId=${sid}`)
        return res.ok ? await res.json() : null
      }))
      const aggregated = statsResults.reduce((acc, curr) => {
        if (!curr) return acc
        return {
          pendingOrders:    (acc.pendingOrders    || 0) + (curr.pendingOrders    || 0),
          confirmedOrders:  (acc.confirmedOrders  || 0) + (curr.confirmedOrders  || 0),
          preparingOrders:  (acc.preparingOrders  || 0) + (curr.preparingOrders  || 0),
          readyOrders:      (acc.readyOrders      || 0) + (curr.readyOrders      || 0),
          readyToPayOrders: (acc.readyToPayOrders || 0) + (curr.readyToPayOrders || 0),
          deliveredOrders:  (acc.deliveredOrders  || 0) + (curr.deliveredOrders  || 0),
          cancelledOrders:  (acc.cancelledOrders  || 0) + (curr.cancelledOrders  || 0),
          todayRevenue:     (acc.todayRevenue     || 0) + (curr.todayRevenue     || 0),
          totalOrders:      (acc.totalOrders      || 0) + (curr.totalOrders      || 0),
          todayOrders:      (acc.todayOrders      || 0) + (curr.todayOrders      || 0),
        }
      }, {
        pendingOrders: 0,
        confirmedOrders: 0,
        preparingOrders: 0,
        readyOrders: 0,
        readyToPayOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        todayRevenue: 0,
        totalOrders: 0,
        todayOrders: 0,
      } as OrderStats)
      setOrderStats(aggregated)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }, [])

  const fetchAllOrderData = useCallback(async () => {
    setLoadingOrders(true)
    try {
      await Promise.all([fetchOrders(), fetchCancelledOrders(), fetchStats(shiftIds)])
    } finally {
      setLoadingOrders(false)
    }
  }, [fetchOrders, fetchCancelledOrders, fetchStats, shiftIds])

  useEffect(() => { fetchShiftsByRange(fromDate, toDate) }, [fromDate, toDate, fetchShiftsByRange])
  useEffect(() => { fetchAllOrderData() }, [fetchAllOrderData])

  const printOrder = (order: Order) => {
    const content = `
      <html>
        <head>
          <title>Order #${order.orderNumber}</title>
          <style>body{font-family:sans-serif;direction:rtl;text-align:right;}table{width:100%;border-collapse:collapse;}td,th{padding:8px;border:1px solid #ddd;}h1,h2{margin:0 0 8px;}.muted{color:#666;font-size:0.9rem;}</style>
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
    if (printWindow) { printWindow.document.write(content); printWindow.document.close() }
  }

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
        if (order?.kitchenStatus === 'PENDING' || order?.kitchenStatus === 'CONFIRMED')
          payload.kitchenStatus = 'PREPARING' as KitchenBaristaStatus
        if (order?.baristaStatus === 'PENDING' || order?.baristaStatus === 'CONFIRMED')
          payload.baristaStatus = 'PREPARING' as KitchenBaristaStatus
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
        if (orderStatusFilter !== 'ALL') setOrderStatusFilter('ALL')
        // لو الـ receipt dialog مفتوح على نفس الأوردر، أغلقه بعد التحديث
        if (receiptOrder?.id === orderId) setReceiptOrder(null)
        await fetchAllOrderData()
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

  useEffect(() => {
    if (shiftIds.length === 0 || fromDate !== today || toDate !== today || !shiftIds[0]) return
    const pollShiftId = shiftIds[0]

    const initializeCounts = async () => {
      try {
        const [pendingRes, readyRes] = await Promise.all([
          fetch(`/api/orders?${new URLSearchParams({ status: 'PENDING', shiftId: pollShiftId })}`),
          fetch(`/api/orders?${new URLSearchParams({ status: 'READY_TO_PAY', shiftId: pollShiftId })}`),
        ])
        if (!pendingRes.ok || !readyRes.ok) return
        lastPendingCountRef.current = (await pendingRes.json()).length
        lastReadyToPayCountRef.current = (await readyRes.json()).length
      } catch (err) { console.error('Failed to initialize polling counts:', err) }
    }
    initializeCounts()

    const pollInterval = setInterval(async () => {
      try {
        const [pendingRes, readyRes] = await Promise.all([
          fetch(`/api/orders?${new URLSearchParams({ status: 'PENDING', shiftId: pollShiftId })}`),
          fetch(`/api/orders?${new URLSearchParams({ status: 'READY_TO_PAY', shiftId: pollShiftId })}`),
        ])
        if (!pendingRes.ok || !readyRes.ok) return

        const pendingOrders = (await pendingRes.json()).map(transformOrder)
        const readyToPayOrders = (await readyRes.json()).map(transformOrder)

        const pendingChanged = pendingOrders.length > lastPendingCountRef.current
        const readyToPayChanged = readyToPayOrders.length !== lastReadyToPayCountRef.current

        if (pendingChanged || readyToPayChanged) {
          if (pendingChanged) toast({ title: 'طلب جديد! 🍽️', description: `طلب رقم #${pendingOrders[0].orderNumber}` })
          if (readyToPayChanged && readyToPayOrders.length > lastReadyToPayCountRef.current)
            toast({ title: 'طلب جاهز للدفع', description: `عدد الطلبات الجاهزة للدفع الآن ${readyToPayOrders.length}` })

          lastPendingCountRef.current = pendingOrders.length
          lastReadyToPayCountRef.current = readyToPayOrders.length
          fetchOrders()
          fetchStats([pollShiftId])
        }
      } catch (err) { console.error('Polling error:', err) }
    }, 5000)

    return () => clearInterval(pollInterval)
  }, [shiftIds, fromDate, toDate, today, fetchOrders, fetchStats, toast])

  return (
    <div className="space-y-6">
      <OrderStatsGrid stats={orderStats} currentShiftId={shiftIds.length > 0 ? shiftIds[0] : null} />

      <div className="space-y-3">
        <OrderFilters
          statusFilter={orderStatusFilter}
          typeFilter={orderTypeFilter}
          fromDate={fromDate}
          toDate={toDate}
          onStatusFilterChange={setOrderStatusFilter}
          onTypeFilterChange={setOrderTypeFilter}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
          onRefresh={fetchAllOrderData}
        />
        <div className="flex justify-end">
          <Button
            variant="outline" size="sm"
            onClick={fetchAllOrderData}
            className="gap-2 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 h-8"
          >
            <RefreshCw className="h-3 w-3" />تحديث يدوي
          </Button>
        </div>
      </div>

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
          <AnimatePresence>
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                relativeTime={relativeTimers[order.id] || ''}
                isUpdating={updatingOrderId === order.id}
                onUpdateStatus={updateOrderStatus}
                onCancel={setCancelTarget}
                onPrint={printOrder}
                onViewReceipt={setReceiptOrder}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <CancelledOrders orders={cancelledOrders} />

      <CancelOrderDialog
        order={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={(orderId) => updateOrderStatus(orderId, 'CANCELLED')}
      />

      {/* ── Receipt Dialog (نفس بتاع الكاشير) ── */}
      <ReceiptDialog
        receiptOrder={receiptOrder}
        receiptTableOrders={null}
        updatingOrderId={updatingOrderId}
        payingTable={null}
        onMarkAsPaid={(orderId) => updateOrderStatus(orderId, 'DELIVERED')}
        onMarkTableAsPaid={() => {}}
        onCloseOrder={() => setReceiptOrder(null)}
        onCloseTable={() => {}}
      />
    </div>
  )
}
