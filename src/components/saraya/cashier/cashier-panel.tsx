'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, ShoppingBag, Receipt, Loader2, TrendingDown, DollarSign } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import type { Order } from '@/lib/saraya/types'
import { ORDER_STATUS_MAP, ORDER_TYPE_MAP } from '@/lib/saraya/constants'
import { transformOrder, getRelativeTime, playNotificationSound } from '@/lib/saraya/helpers'
import { useRelativeTimers } from '@/lib/saraya/hooks'

import { CashierHeader } from './cashier-header'
import { StatsBar } from './stats-bar'
import { OrderCard } from './order-card'
import { TableCard, getGroupedTableStatus } from './table-card'
import { ReceiptDialog } from './receipt-dialog'
import { ExpenseManager } from './expense-manager'

interface CashierExpense {
  id: string
  title: string
  amount: number
  category: string
  shiftId: string
  addedBy: string
  createdAt: string
}

export function CashierPanel({ onLogout }: { onLogout: () => void }) {
  const { toast } = useToast()

  // BUG FIX: Move sessionStorage read to useEffect
  const [username, setUsername] = useState('cashier')
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [expenses, setExpenses] = useState<CashierExpense[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null)
  const [receiptTableOrders, setReceiptTableOrders] = useState<Order[] | null>(null)
  const [payingTable, setPayingTable] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('active')
  const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(null)
  const [currentShiftId, setCurrentShiftId] = useState<string>('')
  const [shiftOpen, setShiftOpen] = useState<boolean | null>(null)
  const [shiftLoading, setShiftLoading] = useState(true)

  const prevOrderStatusRef = useRef<Record<string, Order['status']>>({})
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // BUG FIX: Move sessionStorage read to useEffect
  useEffect(() => {
    setUsername(sessionStorage.getItem('saraya-staff-username') || 'cashier')
  }, [])

  // Fetch shift status
  useEffect(() => {
    const fetchShiftStatus = async () => {
      try {
        const res = await fetch('/api/shifts?current=true')
        if (res.ok) {
          const shift = await res.json()
          if (shift) {
            setCurrentShiftId(shift.id)
            setShiftOpen(true)
            await fetch(`/api/shifts/${shift.id}/assign-open-orders`, { method: 'POST' })
          } else {
            setCurrentShiftId('')
            setShiftOpen(false)
          }
        } else {
          setCurrentShiftId('')
          setShiftOpen(false)
        }
      } catch (err) {
        console.error('Failed to fetch shift status:', err)
        setCurrentShiftId('')
        setShiftOpen(false)
      } finally {
        setShiftLoading(false)
      }
    }

    fetchShiftStatus()
    const interval = setInterval(fetchShiftStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  // BUG FIX: Add currentShiftId to dependency array of fetchOrders
  const fetchOrders = useCallback(async (showLoading = false) => {
    // السماح بجلب الطلبات حتى لو كانت الوردية غير محددة حالياً لرؤية الطلبات العالقة
    try {
      if (showLoading) setLoadingOrders(true)
      
      const shiftParam = currentShiftId ? `&shiftId=${currentShiftId}` : ''

      const safeFetch = async (url: string) => {
        const r = await fetch(url)
        if (!r.ok) return []
        const data = await r.json()
        return Array.isArray(data) ? data : []
      }

      const statuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'READY_TO_PAY']
      const results = await Promise.all(
        statuses.map((status) =>
          safeFetch(`/api/orders?status=${status}${shiftParam}`)
        )
      )
      
      const deliveredRes = (currentShiftId || shiftOpen === false) 
        ? await safeFetch(`/api/orders?status=DELIVERED${shiftParam}`)
        : []
      
      const deliveredData = deliveredRes.map(transformOrder)
      const orders: Order[] = [...results.flat().map(transformOrder), ...deliveredData]
      const previousStatus = prevOrderStatusRef.current

      const newPending = orders.filter((o) =>
        o.status === 'PENDING' && o.type !== 'DINE_IN' && !previousStatus[o.id]
      )
      const newReady = orders.filter((o) =>
        (o.status === 'READY_TO_PAY' || (o.status === 'READY' && o.type !== 'DINE_IN')) && previousStatus[o.id] && previousStatus[o.id] !== o.status
      )

      if (Object.keys(previousStatus).length > 0 && newPending.length > 0) {
        const newest = newPending[0]
        setNewOrderAlert(newest)
        toast({
          title: '🔔 طلب جديد للكاشير',
          description: `طلب رقم #${newest.orderNumber} - ${ORDER_TYPE_MAP[newest.type]?.label}`,
        })
        playNotificationSound()
        setTimeout(() => setNewOrderAlert(null), 5000)
      }

      if (Object.keys(previousStatus).length > 0 && newReady.length > 0) {
        const readyOrder = newReady[0]
        toast({
          title: 'طلب جاهز للكاشير',
          description: `طلب رقم #${readyOrder.orderNumber} جاهز للاستلام`,
        })
        playNotificationSound()
      }

      prevOrderStatusRef.current = Object.fromEntries(orders.map((o) => [o.id, o.status]))
      setAllOrders(orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    } catch (err) {
      console.error('Failed to fetch orders:', err)
    } finally {
      setLoadingOrders(false)
    }
  }, [toast, currentShiftId, shiftOpen]) 

  const fetchExpenses = useCallback(async () => {
    try {
      // جلب المصروفات بفلتر الوردية إذا وجد، وإلا جلب الكل
      const url = currentShiftId ? `/api/expenses?shiftId=${currentShiftId}` : '/api/expenses'
      const res = await fetch(url)
      if (res.ok) setExpenses(await res.json())
    } catch (err) {
      console.error('Failed to fetch expenses:', err)
    }
  }, [currentShiftId, shiftOpen])

  useEffect(() => {
    if (shiftOpen !== null) {
      fetchOrders(true)
    }
  }, [fetchOrders, shiftOpen])

  useEffect(() => {
    if (shiftOpen !== true) return
    if (currentShiftId) fetchExpenses()
  }, [fetchExpenses, currentShiftId, shiftOpen])

  useEffect(() => {
    if (shiftOpen !== true) return
    pollIntervalRef.current = setInterval(() => fetchOrders(), 5000)
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current) }
  }, [fetchOrders, shiftOpen])

  // Use shared relative timers hook
  const relativeTimers = useRelativeTimers(allOrders)

  // Actions
  const markAsPaid = async (orderId: string) => {
    setUpdatingOrderId(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DELIVERED' }),
      })
      if (res.ok) {
        toast({ title: 'تم الدفع بنجاح', description: 'تم تحديث حالة الطلب' })
        // حذف الأوردر من الـ state فوراً بدون انتظار الـ fetch
        setAllOrders(prev => prev.filter(o => o.id !== orderId))
        fetchOrders()
        if (receiptOrder?.id === orderId) setReceiptOrder(null)
      } else {
        toast({ title: 'خطأ', description: 'فشل في تحديث الحالة', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في الاتصال بالخادم', variant: 'destructive' })
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const confirmOrder = async (orderId: string) => {
    setUpdatingOrderId(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CONFIRMED',
          kitchenAccess: true
        }),
      })
      if (res.ok) {
        toast({ title: 'تم تأكيد الطلب', description: 'تم إرسال الطلب إلى المطبخ' })
        fetchOrders()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: data.error || 'فشل في تحديث الحالة', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في الاتصال بالخادم', variant: 'destructive' })
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const markTableAsPaid = async (orders: Order[]) => {
    const orderIds = orders.map((order) => order.id)
    setPayingTable(orders[0]?.tableNumber || orderIds[0])
    try {
      const results = await Promise.all(orderIds.map((orderId) =>
        fetch(`/api/orders/${orderId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'DELIVERED' }),
        })
      ))
      if (results.every((res) => res.ok)) {
        toast({ title: 'تم الدفع بنجاح', description: 'تم تحديث حالة جميع الطلبات في الطاولة' })
        // حذف أوردرات الطاولة من الـ state فوراً
        setAllOrders(prev => prev.filter(o => !orderIds.includes(o.id)))
        fetchOrders()
        setReceiptTableOrders(null)
      } else {
        toast({ title: 'خطأ', description: 'فشل في تحديث حالة بعض الطلبات', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في الاتصال بالخادم', variant: 'destructive' })
    } finally {
      setPayingTable(null)
    }
  }

  // Computed
  const activeOrders = allOrders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status))
  const readyOrders = allOrders.filter(o => o.status === 'READY_TO_PAY' || (o.status === 'READY' && o.type !== 'DINE_IN'))
  const deliveredOrders = allOrders.filter(o => o.status === 'DELIVERED')
  // BUG FIX: Rename todayRevenue to shiftRevenue (it's shift revenue, not today's)
  const shiftRevenue = deliveredOrders.reduce((sum, o) => sum + o.total, 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  const dineInTableGroups = activeOrders.reduce<Record<string, Order[]>>((acc, order) => {
    if (order.type === 'DINE_IN' && order.tableNumber) {
      acc[order.tableNumber] = acc[order.tableNumber] || []
      acc[order.tableNumber].push(order)
    }
    return acc
  }, {})
  const groupedTableNumbers = new Set(Object.entries(dineInTableGroups)
    .filter(([, orders]) => orders.length > 1)
    .map(([table]) => table))
  const groupedTableOrders = Object.entries(dineInTableGroups).filter(([, orders]) => orders.length > 1) as [string, Order[]][]
  const remainingOrders = activeOrders.filter(order => !(order.type === 'DINE_IN' && order.tableNumber && groupedTableNumbers.has(order.tableNumber)))

  // Loading state
  if (shiftLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-8 text-center">
          <p className="text-lg font-bold text-[#D4AF37]">جاري التحقق من حالة الشيفت...</p>
        </div>
      </div>
    )
  }

  // Shift closed state
  if (shiftOpen === false) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <header className="sticky top-0 z-30 border-b border-[#D4AF37]/20 bg-background/95 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#D4AF37]/10">
                <DollarSign className="h-5 w-5 text-[#D4AF37]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#D4AF37]">لوحة الكاشير</h1>
                <p className="text-xs text-muted-foreground">سرايا العرب — {username}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={onLogout} className="gap-2 text-muted-foreground hover:text-red-400">
                <X className="h-4 w-4" />خروج
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 md:p-6">
          <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center">
            <h2 className="mb-2 text-2xl font-bold text-red-600">الكاشير مغلق</h2>
            <p className="text-muted-foreground">الكاشير مغلق حتى يقوم المسؤول ببدء شيفت جديد.</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* New Order Alert Banner */}
      <AnimatePresence>
        {newOrderAlert && (
          <motion.div initial={{ y: -80 }} animate={{ y: 0 }} exit={{ y: -80 }}
            className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white px-4 py-3 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 animate-bounce" />
              <span className="font-bold text-lg">🆕 طلب جديد! #{newOrderAlert.orderNumber}</span>
              <span className="text-sm opacity-90">{ORDER_TYPE_MAP[newOrderAlert.type]?.label}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setNewOrderAlert(null)} className="text-white hover:bg-white/20">
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <CashierHeader
        username={username}
        readyCount={readyOrders.length}
        onRefresh={() => fetchOrders()}
        onLogout={onLogout}
      />

      <main className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
        <StatsBar
          activeCount={activeOrders.length}
          readyCount={readyOrders.length}
          totalExpenses={totalExpenses}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl" className="w-full">
          <TabsList className="mb-6 flex w-full flex-wrap gap-1 bg-muted/50 p-1 rounded-xl">
            {[
              { value: 'active', icon: <ShoppingBag className="h-4 w-4" />, label: 'الطلبات النشطة', count: activeOrders.length, highlight: readyOrders.length > 0 },
              { value: 'delivered', icon: <Receipt className="h-4 w-4" />, label: 'المدفوعة', count: deliveredOrders.length },
              { value: 'expenses', icon: <TrendingDown className="h-4 w-4" />, label: 'المصروفات', count: expenses.length },
            ].map(tab => (
              <TabsTrigger key={tab.value} value={tab.value}
                className={`flex-1 gap-2 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black rounded-lg text-xs sm:text-sm relative ${tab.highlight ? 'animate-pulse' : ''}`}>
                {tab.icon}{tab.label}
                {tab.count > 0 && (
                  <span className={`absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-white font-bold ${tab.highlight ? 'bg-green-500' : 'bg-[#D4AF37]/70'}`}>
                    {tab.count}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Active Orders */}
          <TabsContent value="active">
            {loadingOrders && activeOrders.length === 0 ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" /></div>
            ) : activeOrders.length === 0 ? (
              <div className="py-20 text-center">
                <ShoppingBag className="mx-auto mb-4 h-16 w-16 text-muted-foreground/20" />
                <p className="text-lg text-muted-foreground">لا توجد طلبات نشطة</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {groupedTableOrders.map(([table, orders]) => (
                    <TableCard key={`table-${table}`} tableNumber={table} orders={orders} onViewReceipt={setReceiptTableOrders} />
                  ))}
                  {remainingOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      relativeTime={relativeTimers[order.id] || getRelativeTime(order.createdAt)}
                      updatingOrderId={updatingOrderId}
                      onConfirm={confirmOrder}
                      onMarkAsPaid={markAsPaid}
                      onViewReceipt={setReceiptOrder}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          {/* Delivered Orders */}
          <TabsContent value="delivered">
            {deliveredOrders.length === 0 ? (
              <div className="py-20 text-center">
                <Receipt className="mx-auto mb-4 h-16 w-16 text-muted-foreground/20" />
                <p className="text-lg text-muted-foreground">لا توجد فواتير مدفوعة</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {deliveredOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      relativeTime={relativeTimers[order.id] || getRelativeTime(order.createdAt)}
                      updatingOrderId={updatingOrderId}
                      onConfirm={confirmOrder}
                      onMarkAsPaid={markAsPaid}
                      onViewReceipt={setReceiptOrder}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses">
            <ExpenseManager
              expenses={expenses}
              currentShiftId={currentShiftId}
              username={username}
              onExpensesChanged={fetchExpenses}
                availableCash={shiftRevenue - totalExpenses}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Receipt Dialog */}
      <ReceiptDialog
        receiptOrder={receiptOrder}
        receiptTableOrders={receiptTableOrders}
        updatingOrderId={updatingOrderId}
        payingTable={payingTable}
        onMarkAsPaid={markAsPaid}
        onMarkTableAsPaid={markTableAsPaid}
        onCloseOrder={() => setReceiptOrder(null)}
        onCloseTable={() => setReceiptTableOrders(null)}
      />
    </div>
  )
}