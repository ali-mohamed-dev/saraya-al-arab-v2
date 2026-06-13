'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, ClipboardList, Loader2, Armchair } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { SERVICE_CHARGE_RATE, DELIVERY_FEE } from '@/lib/saraya/constants'
import { transformOrder, playNotificationSound, unlockAudio, isValidEgyptianPhone } from '@/lib/saraya/helpers'
import { useWaiterOrders, useMeals } from '@/lib/saraya/queries'
import { useQueryClient } from '@tanstack/react-query'
import type { Meal, Order, OrderType, CartItemType } from '@/lib/saraya/types'

import { ShiftLoadingScreen } from '@/components/Top/shared/shift-loading-screen'
import { ShiftClosedScreen } from '@/components/Top/shared/shift-closed-screen'
import { WaiterHeader } from './waiter-header'
import { StatsCards } from './components/stats-cards'
import { OrderGroupList } from './components/order-group-list'
import { NewOrderDialog } from './components/new-order-dialog'
import { OrderDetailDialog } from './components/order-detail-dialog'
import { TableManagement } from '../admin/table-management/table-management'
import { AddItemsDialog, type AddCartItem } from '../cashier/components/add-items-dialog'

// ── Main Component ───────────────────────────────────────────────────────────

export function WaiterPanel({ onLogout }: { onLogout: () => void }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // ── Active tab (URL-persistent) ──────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'orders' | 'tables'>('orders')
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab')
    if (tab === 'orders' || tab === 'tables') setActiveTab(tab)
  }, [])

  // ── Orders state ────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<Order[]>([])
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)

  // ── Meals (from React Query with 5m cache) ─────────────────────────────
  const { data: mealsData, isLoading: loadingMeals } = useMeals()
  const meals = useMemo(() => (mealsData || []).filter((m: Meal) => m.isActive), [mealsData])
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

  // ── Customer search ────────────────────────────────────────────────────
  const [customerResults, setCustomerResults] = useState<{ customerPhone: string; customerName: string; deliveryAddress: string | null }[]>([])
  const [searchingCustomer, setSearchingCustomer] = useState(false)
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([])

  // ── Order detail dialog ────────────────────────────────────────────────
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // ── Add items to existing order ────────────────────────────────────────
  const [addItemsOrder, setAddItemsOrder] = useState<Order | null>(null)

  // ── Shift state ────────────────────────────────────────────────────────
  const [shiftOpen, setShiftOpen] = useState<boolean | null>(null)
  const [currentShiftId, setCurrentShiftId] = useState<string>('')
  const [shiftLoading, setShiftLoading] = useState(true)
  // تتبع حالة كل قسم على حدة (عام، مطبخ، باريستا، kitchenAccess، baristaAccess)
  const prevStatusesRef = useRef<Record<string, { status: string, kitchen: string, barista: string, kitchenAccess: boolean, baristaAccess: boolean }>>({})

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
    } catch (err) {
      console.error('Failed to fetch shift:', err)
      setShiftOpen(false)
      setCurrentShiftId('')
    } finally {
      setShiftLoading(false)
    }
  }, [])

  // ── React Query: orders fetched with auto-refetch every 5s ──────────
  const { data: fetchedOrdersData, isLoading: ordersLoading } = useWaiterOrders(currentShiftId, shiftOpen === true)

  const allOrders = useMemo(() =>
    (fetchedOrdersData || [])
      .filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && o.status !== 'READY_TO_PAY' && o.type === 'DINE_IN')
      .sort((a: Order, b: Order) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [fetchedOrdersData]
  )

  // Notification logic: watch for changes in order data
  useEffect(() => {
    if (!fetchedOrdersData || shiftOpen !== true) return

    const previous = prevStatusesRef.current
    const newDineInPending = allOrders.filter((o) =>
      o.status === 'PENDING' && o.type === 'DINE_IN' && !previous[o.id]
    )

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

      if (prev.kitchenAccess === true && o.kitchenAccess === false) {
        playNotificationSound()
        toast({
          title: 'إضافات مطبخ جديدة تحتاج تأكيد',
          description: `العميل أضاف عناصر مطبخ لطلب #${o.orderNumber} - طاولة ${o.tableNumber || ''}`,
        })
      }
      if (prev.baristaAccess === true && o.baristaAccess === false) {
        playNotificationSound()
        toast({
          title: 'إضافات باريستا جديدة تحتاج تأكيد',
          description: `العميل أضاف عناصر باريستا لطلب #${o.orderNumber} - طاولة ${o.tableNumber || ''}`,
        })
      }
    })

    if (Object.keys(previous).length > 0 && newDineInPending.length > 0) {
      playNotificationSound()
      const desc = newDineInPending.length === 1
        ? `طلب رقم #${newDineInPending[0].orderNumber} وصل للويتر`
        : `${newDineInPending.length} طلبات جديدة (${newDineInPending.map(o => `#${o.orderNumber}`).join(', ')})`
      toast({ title: 'طلبات صالة جديدة', description: desc })
    }

    prevStatusesRef.current = Object.fromEntries(allOrders.map((o) => [
      o.id,
      { status: o.status, kitchen: o.kitchenStatus, barista: o.baristaStatus, kitchenAccess: o.kitchenAccess, baristaAccess: o.baristaAccess }
    ]))
  }, [fetchedOrdersData, allOrders, shiftOpen, toast])

  // Update local orders whenever data changes
  useEffect(() => {
    setOrders(allOrders)
  }, [allOrders])

  useEffect(() => {
    const unlock = () => unlockAudio()
    document.addEventListener('click', unlock, { once: true })
    document.addEventListener('touchstart', unlock, { once: true })
    return () => { document.removeEventListener('click', unlock); document.removeEventListener('touchstart', unlock) }
  }, [])

  useEffect(() => {
    fetchShiftStatus()
    const interval = setInterval(fetchShiftStatus, 10000)
    return () => clearInterval(interval)
  }, [fetchShiftStatus])

  useEffect(() => {
    if (showNewOrder) {
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
      setCustomerResults([])
      fetch('/api/categories').then(r => r.ok && r.json()).then(d => {
        if (Array.isArray(d)) {
          setCategories(d.map((c: { name: string }) => ({ value: c.name, label: c.name })))
        }
      }).catch((err) => console.error('Failed to fetch categories:', err))
    }
  }, [showNewOrder])

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
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          kitchenAccess: ['CONFIRMED', 'PREPARING', 'READY'].includes(newStatus),
          baristaAccess: ['CONFIRMED', 'PREPARING', 'READY'].includes(newStatus),
        }),
      })
      if (res.ok) {
        toast({ title: 'تم تحديث حالة الطلب' })
        
        if (newStatus === 'READY_TO_PAY') {
          setOrders(prev => prev.filter(o => o.id !== orderId))
        }
        
        queryClient.invalidateQueries({ queryKey: ['waiter-orders'] })
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: data.error || 'فشل في تحديث الحالة', variant: 'destructive' })
      }
    } catch (err) {
      console.error('Failed to update order status:', err)
      toast({ title: 'خطأ', description: 'فشل في الاتصال بالخادم', variant: 'destructive' })
    } finally {
      setUpdatingOrderId(null)
    }
  }, [queryClient, toast])

  const confirmAdditions = useCallback(async (orderId: string, department?: 'KITCHEN' | 'BARISTA') => {
    setUpdatingOrderId(orderId)
    try {
      const order = orders.find(o => o.id === orderId)
      if (!order) return

      const updatePayload: Record<string, unknown> = {}

      if (department === 'KITCHEN' || !department) {
        updatePayload.kitchenAccess = true
        updatePayload.kitchenStatus = order.items.some(i => i.preparationArea === 'KITCHEN') ? 'PENDING' : order.kitchenStatus
      }
      if (department === 'BARISTA' || !department) {
        updatePayload.baristaAccess = true
        updatePayload.baristaStatus = order.items.some(i => i.preparationArea === 'BARISTA') ? 'PENDING' : order.baristaStatus
      }

      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      })
      if (res.ok) {
        const deptName = department === 'KITCHEN' ? 'المطبخ' : department === 'BARISTA' ? 'الباريستا' : 'المطبخ والباريستا'
        toast({ title: 'تم التأكيد', description: `تم إرسال الإضافات ل${deptName}` })
        queryClient.invalidateQueries({ queryKey: ['waiter-orders'] })
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: data.error || 'فشل في تأكيد الإضافات', variant: 'destructive' })
      }
    } catch (err) {
      console.error('Failed to confirm additions:', err)
      toast({ title: 'خطأ', description: 'فشل في الاتصال بالخادم', variant: 'destructive' })
    } finally {
      setUpdatingOrderId(null)
    }
  }, [orders, queryClient, toast])

  // ── Add items to existing order (waiter) ──────────────────────────────
  const handleAddItemsToOrder = useCallback(async (items: AddCartItem[], order: Order) => {
    const itemsPayload = items.map(i => ({
      mealId: i.mealId,
      mealTitle: i.title,
      mealTitleAr: i.titleAr,
      price: i.price,
      quantity: i.quantity,
      category: i.category,
      imageUrl: i.imageUrl,
      preparationArea: i.preparationArea,
      addOns: [],
      notes: i.notes || '',
    }))

    const hasKitchen = items.some(i => i.preparationArea === 'KITCHEN')
    const hasBarista = items.some(i => i.preparationArea === 'BARISTA')
    const hasHall = items.some(i => i.preparationArea === 'HALL')

    const updatePayload: Record<string, unknown> = {
      itemsToAdd: itemsPayload,
    }

    // HALL-only additions: don't touch status or department access
    if (!hasKitchen && !hasBarista && hasHall) {
      // just add items, nothing else changes
    } else {
      if (hasKitchen) {
        updatePayload.kitchenAccess = false
        updatePayload.kitchenStatus = 'PENDING'
      }
      if (hasBarista) {
        updatePayload.baristaAccess = false
        updatePayload.baristaStatus = 'PENDING'
      }
      if (hasKitchen || hasBarista) {
        updatePayload.status = order.status === 'PENDING' ? 'CONFIRMED' : order.status
      }
    }

    const res = await fetch(`/api/orders/${order.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload),
    })

    if (res.ok) {
      toast({ title: 'تم إضافة الأصناف', description: `تمت إضافة ${items.length} صنف إلى الطلب #${order.orderNumber}` })
      queryClient.invalidateQueries({ queryKey: ['waiter-orders'] })
    } else {
      const data = await res.json().catch(() => ({}))
      toast({ title: 'خطأ', description: data.error || 'فشل في إضافة الأصناف', variant: 'destructive' })
    }
  }, [queryClient, toast])

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
          preparationArea: meal.preparationArea || (meal.category === 'اصناف الصالة' ? 'HALL' : 'KITCHEN'),
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

  const updateItemNotes = useCallback((mealId: string, notes: string) => {
    setCart((prev) => prev.map((item) =>
      item.mealId === mealId ? { ...item, notes } : item
    ))
  }, [])

  // ── Calculations ───────────────────────────────────────────────────────
  const subtotal = useMemo(() =>
    cart.reduce(
      (sum, item) =>
        sum +
        item.price * item.quantity +
        item.addOns.reduce((aSum, a) => aSum + a.price * item.quantity, 0),
      0
    ), [cart])

  const serviceCharge = useMemo(() =>
    orderType === 'DINE_IN' ? Math.round(subtotal * SERVICE_CHARGE_RATE * 100) / 100 : 0,
    [subtotal, orderType]
  )
  const deliveryFee = orderType === 'DELIVERY' ? DELIVERY_FEE : 0
  const total = useMemo(() => subtotal + serviceCharge + deliveryFee, [subtotal, serviceCharge, deliveryFee])

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
        isStaff: true,
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
          notes: item.notes || '',
        })),
        subtotal,
        serviceCharge,
        deliveryFee,
        total,
        notes: notes.trim() || undefined,
      }

      let res
      if (existingTableOrder) {
        // Re-fetch the order to avoid stale reference (race condition)
        const freshRes = await fetch(`/api/orders/${existingTableOrder.id}`)
        if (!freshRes.ok) {
          // Order no longer exists — create new order instead
          res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload),
          })
        } else {
          const freshOrder = await freshRes.json()
          if (['DELIVERED', 'CANCELLED', 'READY_TO_PAY'].includes(freshOrder.status)) {
            // Order is terminal — create new order
            res = await fetch('/api/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(orderPayload),
            })
          } else {
            res = await fetch(`/api/orders/${freshOrder.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                shiftId: currentShiftId || undefined,
                itemsToAdd: orderPayload.items,
                notes: orderPayload.notes,
                status: 'CONFIRMED',
                kitchenAccess: true,
                baristaAccess: true,
                kitchenStatus: 'PENDING',
                baristaStatus: 'PENDING',
              }),
            })
          }
        }
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
        queryClient.invalidateQueries({ queryKey: ['waiter-orders'] })
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: data.error || 'فشل في إرسال الطلب', variant: 'destructive' })
      }
    } catch (err) {
      console.error('Failed to submit order:', err)
      toast({ title: 'خطأ', description: 'فشل في الاتصال بالخادم', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }, [cart, orderType, tableNumber, customerName, customerPhone, deliveryAddress, currentShiftId, existingTableOrder, subtotal, serviceCharge, deliveryFee, total, notes, queryClient, toast])

  // ── Customer search ────────────────────────────────────────────────────
  const handleCustomerSearch = useCallback(async (query: string) => {
    if (!query.trim()) return
    setSearchingCustomer(true)
    try {
      const isPhone = /^\d{6,}$/.test(query)
      const param = isPhone ? `customerPhone=${encodeURIComponent(query)}` : `customerName=${encodeURIComponent(query)}`
      const res = await fetch(`/api/orders?${param}`)
      if (res.ok) {
        const orders = await res.json()
        const seen = new Set<string>()
        const results = (Array.isArray(orders) ? orders : [])
          .filter((o: { customerPhone: string }) => {
            const key = o.customerPhone || ''
            if (!key || seen.has(key)) return false
            seen.add(key)
            return true
          })
          .map((o: { customerPhone: string; customerName: string; deliveryAddress: string | null }) => ({
            customerPhone: o.customerPhone || '',
            customerName: o.customerName || '',
            deliveryAddress: o.deliveryAddress || null,
          }))
        setCustomerResults(results)
      } else {
        setCustomerResults([])
      }
    } catch (err) {
      console.error('Failed to search customer:', err)
      setCustomerResults([])
    } finally {
      setSearchingCustomer(false)
    }
  }, [])

  const handleSelectCustomer = useCallback((result: { customerPhone: string; customerName: string; deliveryAddress: string | null }) => {
    setCustomerPhone(result.customerPhone)
    setCustomerName(result.customerName)
    if (result.deliveryAddress) setDeliveryAddress(result.deliveryAddress)
    setCustomerResults([])
  }, [])

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
    <div className="min-h-dvh bg-background" dir="rtl">
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
            onClick={() => { setActiveTab('orders'); const p = new URLSearchParams(window.location.search); p.set('tab', 'orders'); window.history.replaceState(null, '', `?${p.toString()}`) }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'orders'
                ? 'bg-[#D4AF37] text-black shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <ClipboardList className="h-4 w-4 shrink-0" />
            <span className="truncate">الطلبات</span>
            {orders.length > 0 && (
              <Badge className={`h-5 min-w-[20px] text-[10px] px-1.5 ${
                activeTab === 'orders' ? 'bg-black/20 text-black' : 'bg-[#D4AF37]/20 text-[#D4AF37]'
              }`}>
                {orders.length}
              </Badge>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('tables'); const p = new URLSearchParams(window.location.search); p.set('tab', 'tables'); window.history.replaceState(null, '', `?${p.toString()}`) }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'tables'
                ? 'bg-[#D4AF37] text-black shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Armchair className="h-4 w-4 shrink-0" />
            <span className="truncate">الطاولات</span>
          </button>
        </div>
      </div>

      {/* Tab Content — both rendered, hidden via CSS to keep polling alive */}
      <main className={`mx-auto max-w-7xl p-4 md:p-6 pb-24 ${activeTab === 'orders' ? '' : 'hidden'}`}>
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
          loadingOrders={ordersLoading}
          updatingOrderId={updatingOrderId}
          onConfirmOrder={(orderId) => { updateOrderStatus(orderId, 'CONFIRMED') }}
          onConfirmAdditions={(orderId) => { confirmAdditions(orderId) }}
          onViewDetails={(order) => setSelectedOrder(order)}
          onAddItems={(order) => setAddItemsOrder(order)}
        />
      </main>

      <main className={`mx-auto max-w-7xl p-4 md:p-6 pb-24 ${activeTab === 'tables' ? '' : 'hidden'}`}>
        <TableManagement />
      </main>

      {/* Floating New Order Button */}
      <div className="fixed bottom-6 left-6 z-20">
        <Button
          onClick={() => setShowNewOrder(true)}
          className="h-14 w-14 rounded-full bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/25 hover:bg-[#D4AF37]/90 transition-all active:scale-95"
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

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
        customerEmail={''}
        setCustomerEmail={() => {}}
        deliveryAddress={deliveryAddress}
        setDeliveryAddress={setDeliveryAddress}
        existingTableOrder={existingTableOrder}
        allowedTypes={['DINE_IN']}
        categories={categories}
        customerResults={customerResults}
        onSearchCustomer={handleCustomerSearch}
        onSelectCustomer={handleSelectCustomer}
        searchingCustomer={searchingCustomer}
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
        updateItemNotes={updateItemNotes}
        notes={notes}
        setNotes={setNotes}
        submitting={submitting}
        onSubmit={handleSubmitOrder}
      />

      {/* Add Items to Existing Order Dialog */}
      <AddItemsDialog
        open={!!addItemsOrder}
        onOpenChange={(open) => { if (!open) setAddItemsOrder(null) }}
        order={addItemsOrder}
        onItemsAdded={() => { queryClient.invalidateQueries({ queryKey: ['waiter-orders'] }); setAddItemsOrder(null) }}
        onSubmitItems={handleAddItemsToOrder}
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
