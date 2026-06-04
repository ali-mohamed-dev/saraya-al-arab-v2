'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, ClipboardList, Loader2, Armchair } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { SERVICE_CHARGE_RATE } from '@/lib/saraya/constants'
import { transformOrder, playNotificationSound, isValidEgyptianPhone } from '@/lib/saraya/helpers'
import type { Meal, Order, OrderType, CartItemType } from '@/lib/saraya/types'

import { ShiftLoadingScreen } from './shift-loading-screen'
import { ShiftClosedScreen } from './shift-closed-screen'
import { WaiterHeader } from './waiter-header'
import { StatsCards } from './stats-cards'
import { OrderGroupList } from './order-group-list'
import { NewOrderDialog } from './new-order-dialog'
import { OrderDetailDialog } from './order-detail-dialog'
import { TableManagement } from '../admin/table-management'

// ── Main Component ───────────────────────────────────────────────────────────

export function WaiterPanel({ onLogout }: { onLogout: () => void }) {
  const { toast } = useToast()

  // ── Active tab ─────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'orders' | 'tables'>('orders')

  // ── Orders state ────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)

  // ── Meals state ────────────────────────────────────────────────────────
  const [meals, setMeals] = useState<Meal[]>([])
  const [loadingMeals, setLoadingMeals] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('الكل')

  // ── New order form state ───────────────────────────────────────────────
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN')
  const [tableNumber, setTableNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [cart, setCart] = useState<CartItemType[]>([])
  const [notes, setNotes] = useState('')
  const [existingTableOrder, setExistingTableOrder] = useState<Order | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // ── Order detail dialog ────────────────────────────────────────────────
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // ── Shift state ────────────────────────────────────────────────────────
  const [shiftOpen, setShiftOpen] = useState<boolean | null>(null)
  const [currentShiftId, setCurrentShiftId] = useState<string>('')
  const [shiftLoading, setShiftLoading] = useState(true)
  // تتبع حالة كل قسم على حدة (عام، مطبخ، باريستا)
  const prevStatusesRef = useRef<Record<string, { status: string, kitchen: string, barista: string }>>({})

  // ── Shift status ───────────────────────────────────────────────────────
  const fetchShiftStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/shifts?current=true')
      if (res.ok) {
        const shift = await res.json()
        setShiftOpen(!!shift)
        setCurrentShiftId(shift?.id || '')
        if (shift?.id) {
          await fetch(`/api/shifts/${shift.id}/assign-open-orders`, { method: 'POST' })
        }
      } else {
        setShiftOpen(false)
        setCurrentShiftId('')
      }
    } catch {
      setShiftOpen(false)
      setCurrentShiftId('')
    } finally {
      setShiftLoading(false)
    }
  }, [])

  // ── Fetch active orders ────────────────────────────────────────────────
  const fetchActiveOrders = useCallback(async () => {
    if (shiftOpen !== true || !currentShiftId) {
      setOrders([])
      setLoadingOrders(false)
      return
    }

    try {
      const [pendingRes, confirmedRes, preparingRes, readyRes, readyToPayRes] = await Promise.all([
        fetch(`/api/orders?status=PENDING&shiftId=${currentShiftId}`),
        fetch(`/api/orders?status=CONFIRMED&shiftId=${currentShiftId}`),
        fetch(`/api/orders?status=PREPARING&shiftId=${currentShiftId}`),
        fetch(`/api/orders?status=READY&shiftId=${currentShiftId}`),
        fetch(`/api/orders?status=READY_TO_PAY&shiftId=${currentShiftId}`),
      ])
      const pending = pendingRes.ok ? (await pendingRes.json()).map(transformOrder) : []
      const confirmed = confirmedRes.ok ? (await confirmedRes.json()).map(transformOrder) : []
      const preparing = preparingRes.ok ? (await preparingRes.json()).map(transformOrder) : []
      const ready = readyRes.ok ? (await readyRes.json()).map(transformOrder) : []
      const readyToPay = readyToPayRes.ok ? (await readyToPayRes.json()).map(transformOrder) : []
      
      const fetchedOrders = [...pending, ...confirmed, ...preparing, ...ready, ...readyToPay]
      const allOrders = fetchedOrders.filter(o => 
        o.status !== 'DELIVERED' && 
        o.status !== 'CANCELLED' && 
        o.status !== 'READY_TO_PAY' // إخفاء طلبات الدفع عن الويتر
      )

      const previous = prevStatusesRef.current
      const newDineInPending = allOrders.filter((o) =>
        o.status === 'PENDING' && o.type === 'DINE_IN' && !previous[o.id]
      )

      // تحديد ما إذا كان قسم معين (مطبخ أو باريستا) قد أصبح جاهزاً للتو
      allOrders.forEach((o) => {
        const prev = previous[o.id]
        if (!prev) return

        const kitchenJustReady = prev.kitchen !== 'READY' && o.kitchenStatus === 'READY'
        const baristaJustReady = prev.barista !== 'READY' && o.baristaStatus === 'READY'

        if (kitchenJustReady || baristaJustReady) {
          playNotificationSound()
          const part = kitchenJustReady ? 'الطعام' : 'المشروبات'
          toast({ 
            title: `طلب ${part} جاهز`, 
            description: `طلب رقم #${o.orderNumber} للطاولة ${o.tableNumber || ''}` 
          })
        }
      })

      allOrders.sort((a: Order, b: Order) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      if (Object.keys(previous).length > 0 && newDineInPending.length > 0) {
        playNotificationSound()
        toast({ title: 'طلب صالة جديد', description: `طلب رقم #${newDineInPending[0].orderNumber} وصل للويتر` })
      }

      prevStatusesRef.current = Object.fromEntries(allOrders.map((o) => [
        o.id, 
        { status: o.status, kitchen: o.kitchenStatus, barista: o.baristaStatus }
      ]))
      setOrders(allOrders)
    } catch {
      /* ignore polling errors */
    } finally {
      setLoadingOrders(false)
    }
  }, [shiftOpen, currentShiftId, toast])

  // ── Fetch meals ────────────────────────────────────────────────────────
  const fetchMeals = useCallback(async () => {
    try {
      setLoadingMeals(true)
      const res = await fetch('/api/meals')
      if (res.ok) {
        const data = await res.json()
        setMeals(data.filter((m: Meal) => m.isActive))
      }
    } catch { /* ignore */ } finally { setLoadingMeals(false) }
  }, [])

  useEffect(() => {
    fetchMeals()
  }, [fetchMeals])

  useEffect(() => {
    fetchShiftStatus()
    const interval = setInterval(fetchShiftStatus, 10000)
    return () => clearInterval(interval)
  }, [fetchShiftStatus])

  useEffect(() => {
    if (shiftOpen) {
      fetchActiveOrders()
    } else if (shiftOpen === false) {
      setLoadingOrders(false)
    }
  }, [shiftOpen, fetchActiveOrders])

  useEffect(() => {
    if (shiftOpen !== true) return
    const interval = setInterval(fetchActiveOrders, 5000)
    return () => clearInterval(interval)
  }, [fetchActiveOrders, shiftOpen])

  useEffect(() => {
    if (showNewOrder) {
      fetchMeals()
      setCart([])
      setOrderType('DINE_IN')
      setTableNumber('')
      setCustomerName('')
      setCustomerPhone('')
      setDeliveryAddress('')
      setNotes('')
      setSearchQuery('')
      setFilterCategory('الكل')
      setExistingTableOrder(null)
    }
  }, [showNewOrder, fetchMeals])

  useEffect(() => {
    if (orderType !== 'DINE_IN' || !tableNumber.trim()) {
      setExistingTableOrder(null)
      return
    }
    const existing = orders.find((order) =>
      order.type === 'DINE_IN' &&
      order.tableNumber === tableNumber.trim() &&
      !['DELIVERED', 'CANCELLED', 'READY_TO_PAY'].includes(order.status)
    )
    setExistingTableOrder(existing || null)
  }, [orderType, tableNumber, orders])

  // ── Update order status ────────────────────────────────────────────────
  const updateOrderStatus = useCallback(async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          kitchenAccess: ['CONFIRMED', 'PREPARING', 'READY'].includes(newStatus),
        }),
      })
      if (res.ok) {
        toast({ title: 'تم تحديث حالة الطلب' })
        
        // تحديث الحالة المحلية فوراً لإغلاق الطاولة عند الويتر قبل انتظار الـ polling القادم
        if (newStatus === 'READY_TO_PAY') {
          setOrders(prev => prev.filter(o => o.id !== orderId))
        }
        
        fetchActiveOrders()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: data.error || 'فشل في تحديث الحالة', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في الاتصال بالخادم', variant: 'destructive' })
    } finally {
      setUpdatingOrderId(null)
    }
  }, [fetchActiveOrders, toast])

  // ── Cart operations ────────────────────────────────────────────────────
  const addToCart = useCallback((meal: Meal) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.mealId === meal.id)
      if (existing) {
        return prev.map((item) =>
          item.mealId === meal.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [
        ...prev,
        {
          mealId: meal.id,
          title: meal.title,
          titleAr: meal.titleAr,
          price: meal.price,
          quantity: 1,
          imageUrl: meal.imageUrl,
          addOns: [],
          preparationArea: meal.preparationArea || 'KITCHEN', // FIX: was missing
          category: meal.category || '',                       // FIX: was missing
        },
      ]
    })
  }, [])

  const removeFromCart = useCallback((mealId: string) => {
    setCart((prev) => prev.filter((item) => item.mealId !== mealId))
  }, [])

  const updateCartQuantity = useCallback((mealId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.mealId === mealId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    )
  }, [])

  const getCartQuantity = useCallback((mealId: string): number => {
    return cart.find((item) => item.mealId === mealId)?.quantity ?? 0
  }, [cart])

  // ── Calculations ───────────────────────────────────────────────────────
  const subtotal = useMemo(() =>
    cart.reduce(
      (sum, item) =>
        sum +
        item.price * item.quantity +
        item.addOns.reduce((aSum, a) => aSum + a.price * item.quantity, 0),
      0
    ), [cart])

  const serviceCharge = useMemo(() => Math.round(subtotal * SERVICE_CHARGE_RATE * 100) / 100, [subtotal])
  const total = useMemo(() => subtotal + serviceCharge, [subtotal, serviceCharge])

  // ── Submit new order ───────────────────────────────────────────────────
  const handleSubmitOrder = useCallback(async () => {
    if (cart.length === 0) {
      toast({ title: 'السلة فارغة', description: 'يرجى إضافة أصناف للطلب', variant: 'destructive' })
      return
    }
    if (orderType === 'DINE_IN' && !tableNumber.trim()) {
      toast({ title: 'بيانات ناقصة', description: 'يرجى إدخال رقم الطاولة', variant: 'destructive' })
      return
    }
    if ((orderType === 'TAKEAWAY' || orderType === 'DELIVERY') && !customerPhone.trim()) {
      toast({ title: 'بيانات ناقصة', description: 'يرجى إدخال رقم هاتف العميل', variant: 'destructive' })
      return
    }
    if (orderType !== 'DINE_IN' && !isValidEgyptianPhone(customerPhone)) {
      toast({ title: 'رقم الهاتف غير صالح', description: 'يجب إدخال رقم هاتف مصري صحيح (11 رقماً).', variant: 'destructive' })
      return
    }
    if (orderType === 'DELIVERY' && !deliveryAddress.trim()) {
      toast({ title: 'بيانات ناقصة', description: 'يرجى إدخال عنوان التوصيل', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const orderPayload = {
        type: orderType,
        shiftId: currentShiftId || undefined,
        tableNumber: orderType === 'DINE_IN' ? tableNumber.trim() : undefined,
        customerName: customerName.trim() || 'ويتر',
        customerPhone: customerPhone.trim() || '',
        deliveryAddress: orderType === 'DELIVERY' ? deliveryAddress.trim() : undefined,
        items: cart.map((item) => ({
          mealId: item.mealId,
          mealTitle: item.title,
          mealTitleAr: item.titleAr,
          price: item.price,
          quantity: item.quantity,
          category: item.category || '',
          preparationArea: item.preparationArea || 'KITCHEN', // FIX: was missing
          addOns: item.addOns,
          imageUrl: item.imageUrl,
        })),
        subtotal,
        serviceCharge,
        total,
        notes: notes.trim() || undefined,
      }

      let res
      if (existingTableOrder) {
        res = await fetch(`/api/orders/${existingTableOrder.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shiftId: currentShiftId || undefined,
            itemsToAdd: orderPayload.items,
            notes: orderPayload.notes,
            status: 'CONFIRMED', // إعادة الطلب لحالة التأكيد ليظهر للمطبخ/الباريستا
            kitchenStatus: 'PENDING',
            baristaStatus: 'PENDING',
          }),
        })
      } else {
        res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload),
        })
      }

      if (res.ok) {
        toast({ title: existingTableOrder ? 'تمت الإضافة إلى الطلب المفتوح' : 'تم إرسال الطلب بنجاح' })
        setShowNewOrder(false)
        setCart([])
        setTableNumber('')
        setDeliveryAddress('')
        setNotes('')
        fetchActiveOrders()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: data.error || 'فشل في إرسال الطلب', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في الاتصال بالخادم', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }, [cart, orderType, tableNumber, customerName, customerPhone, deliveryAddress, currentShiftId, existingTableOrder, subtotal, serviceCharge, total, notes, fetchActiveOrders, toast])

  // ── Order updated callback ─────────────────────────────────────────────
  const handleOrdersUpdated = useCallback((updatedOrder: Order) => {
    setOrders((prev) => prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)))
  }, [])

  // ── useMemo for counts ─────────────────────────────────────────────────
  const { pendingCount, confirmedCount, preparingCount, readyCount } = useMemo(() => ({
    pendingCount: orders.filter((o) => o.status === 'PENDING').length,
    confirmedCount: orders.filter((o) => o.status === 'CONFIRMED').length,
    preparingCount: orders.filter((o) => o.status === 'PREPARING').length,
    readyCount: orders.filter((o) => o.status === 'READY').length,
  }), [orders])

  // ── Early returns ──────────────────────────────────────────────────────
  if (shiftLoading) return <ShiftLoadingScreen />
  if (shiftOpen === false) return <ShiftClosedScreen onLogout={onLogout} />

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* حل مشكلة السكرول في النوافذ المنبثقة */}
      <style jsx global>{`
        [role="dialog"] {
          max-height: 92vh;
          overflow-y: auto !important;
        }
      `}</style>
      <WaiterHeader
        pendingCount={pendingCount}
        confirmedCount={confirmedCount}
        preparingCount={preparingCount}
        readyCount={readyCount}
        onLogout={onLogout}
      />

      {/* Tab Switcher */}
      <div className="mx-auto max-w-7xl px-4 md:px-6 pt-4">
        <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'orders'
                ? 'bg-[#D4AF37] text-black shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            الطلبات
            {orders.length > 0 && (
              <Badge className={`h-5 min-w-[20px] text-[10px] px-1.5 ${
                activeTab === 'orders' ? 'bg-black/20 text-black' : 'bg-[#D4AF37]/20 text-[#D4AF37]'
              }`}>
                {orders.length}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setActiveTab('tables')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === 'tables'
                ? 'bg-[#D4AF37] text-black shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Armchair className="h-4 w-4" />
            الطاولات
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'orders' ? (
        <main className="mx-auto max-w-7xl p-4 md:p-6 pb-24">
          <StatsCards
            pendingCount={pendingCount}
            confirmedCount={confirmedCount}
            preparingCount={preparingCount}
          />

          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#D4AF37] flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              الطلبات النشطة
              <Badge variant="outline" className="border-[#D4AF37]/30 text-[#D4AF37] text-xs">
                {orders.length}
              </Badge>
            </h2>
          </div>

          <OrderGroupList
            orders={orders}
            loadingOrders={loadingOrders}
            updatingOrderId={updatingOrderId}
            onConfirmOrder={(orderId) => updateOrderStatus(orderId, 'CONFIRMED')}
            onViewDetails={(order) => setSelectedOrder(order)}
          />
        </main>
      ) : (
        <main className="mx-auto max-w-7xl p-4 md:p-6 pb-24">
          <TableManagement />
        </main>
      )}

      {/* Floating New Order Button - only show on orders tab */}
      {activeTab === 'orders' && (
        <motion.div
          className="fixed bottom-6 left-6 z-20"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
        >
          <Button
            onClick={() => setShowNewOrder(true)}
            className="h-14 w-14 rounded-full bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/25 hover:bg-[#D4AF37]/90 transition-all active:scale-95"
            size="icon"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </motion.div>
      )}

      <NewOrderDialog
        open={showNewOrder}
        onOpenChange={setShowNewOrder}
        orderType={orderType}
        setOrderType={setOrderType}
        tableNumber={tableNumber}
        setTableNumber={setTableNumber}
        customerName={customerName}
        setCustomerName={setCustomerName}
        customerPhone={customerPhone}
        setCustomerPhone={setCustomerPhone}
        deliveryAddress={deliveryAddress}
        setDeliveryAddress={setDeliveryAddress}
        existingTableOrder={existingTableOrder}
        meals={meals}
        loadingMeals={loadingMeals}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterCategory={filterCategory}
        setFilterCategory={setFilterCategory}
        cart={cart}
        addToCart={addToCart}
        removeFromCart={removeFromCart}
        updateCartQuantity={updateCartQuantity}
        getCartQuantity={getCartQuantity}
        notes={notes}
        setNotes={setNotes}
        submitting={submitting}
        onSubmit={handleSubmitOrder}
      />

      <OrderDetailDialog
        selectedOrder={selectedOrder}
        setSelectedOrder={setSelectedOrder}
        meals={meals}
        updatingOrderId={updatingOrderId}
        updateOrderStatus={updateOrderStatus}
        onOrdersUpdated={handleOrdersUpdated}
      />
    </div>
  )
}