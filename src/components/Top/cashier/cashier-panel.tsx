'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, ShoppingBag, Receipt, Loader2, TrendingDown, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import type { Order, OrderType, CartItemType, Meal } from '@/lib/saraya/types'
import { ORDER_STATUS_MAP, ORDER_TYPE_MAP, SERVICE_CHARGE_RATE, DELIVERY_FEE } from '@/lib/saraya/constants'
import { transformOrder, getRelativeTime, playNotificationSound, isValidEgyptianPhone } from '@/lib/saraya/helpers'
import { useRelativeTimers } from '@/lib/saraya/hooks'
import { NewOrderDialog } from '@/components/Top/waiter/components/new-order-dialog'

import { CashierHeader } from './cashier-header'
import { StatsBar } from './components/stats-bar'
import { OrderCard } from './components/order-card'
import { TableCard, getGroupedTableStatus } from './components/table-card'
import { ReceiptDialog } from './components/receipt-dialog'
import { ExpenseManager } from './components/expense-manager'
import { AddItemsDialog } from './components/add-items-dialog'

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

  const [username, setUsername] = useState('')
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [expenses, setExpenses] = useState<CashierExpense[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null)
  const [receiptTableOrders, setReceiptTableOrders] = useState<Order[] | null>(null)
  const [payingTable, setPayingTable] = useState<string | null>(null)
  const [addItemsOrder, setAddItemsOrder] = useState<Order | null>(null)
  // URL-persistent tab
  const [activeTab, setActiveTab] = useState('active')
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab')
    if (tab) setActiveTab(tab)
  }, [])
  const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(null)
  const [currentShiftId, setCurrentShiftId] = useState<string>('')
  const [shiftOpen, setShiftOpen] = useState<boolean | null>(null)
  const [shiftLoading, setShiftLoading] = useState(true)

  const prevOrderStatusRef = useRef<Record<string, Order['status']>>({})
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const assignedShiftRef = useRef<string | null>(null)

  // New order creation state
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [meals, setMeals] = useState<Meal[]>([])
  const [loadingMeals, setLoadingMeals] = useState(true)
  const [orderType, setOrderType] = useState<OrderType>('TAKEAWAY')
  const [tableNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [cart, setCart] = useState<CartItemType[]>([])
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Search / filter for new order
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('الكل')

  // Categories
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([])

  // Customer search
  const [customerResults, setCustomerResults] = useState<{ customerPhone: string; customerName: string; deliveryAddress: string | null; customerEmail: string }[]>([])
  const [searchingCustomer, setSearchingCustomer] = useState(false)

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
            if (assignedShiftRef.current !== shift.id) {
              assignedShiftRef.current = shift.id
              await fetch(`/api/shifts/${shift.id}/assign-open-orders`, { method: 'POST' })
            }
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

  // Fetch meals for new order
  const fetchMeals = useCallback(async () => {
    try {
      setLoadingMeals(true)
      const res = await fetch('/api/meals')
      if (res.ok) setMeals(await res.json())
    } catch (err) {
      console.error('Failed to fetch meals:', err)
    } finally {
      setLoadingMeals(false)
    }
  }, [])

  // Cart helpers
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
          preparationArea: meal.preparationArea || 'KITCHEN',
          category: meal.category || '',
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
          item.mealId === mealId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }, [])

  const getCartQuantity = useCallback((mealId: string) => {
    return cart.find((item) => item.mealId === mealId)?.quantity || 0
  }, [cart])

  // Handle submit order
  const subtotal = useMemo(() => cart.reduce(
    (sum, item) => sum + item.price * item.quantity + item.addOns.reduce((aSum, a) => aSum + a.price * item.quantity, 0), 0
  ), [cart])

  const serviceCharge = orderType === 'DINE_IN' ? Math.round(subtotal * SERVICE_CHARGE_RATE * 100) / 100 : 0
  const deliveryFee = orderType === 'DELIVERY' ? DELIVERY_FEE : 0
  const total = subtotal + serviceCharge + deliveryFee

  const handleSubmitOrder = useCallback(async () => {
    if (cart.length === 0) {
      toast({ title: 'السلة فارغة', description: 'يرجى إضافة أصناف للطلب', variant: 'destructive' })
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
    if (orderType !== 'DINE_IN' && !customerEmail.trim()) {
      toast({ title: 'البريد الإلكتروني مطلوب', description: 'يرجى إدخال البريد الإلكتروني للعميل المسجل', variant: 'destructive' })
      return
    }
    if (orderType === 'DELIVERY' && !deliveryAddress.trim()) {
      toast({ title: 'بيانات ناقصة', description: 'يرجى إدخال عنوان التوصيل', variant: 'destructive' })
      return
    }

    // Check email registration for TAKEAWAY/DELIVERY
    if (orderType !== 'DINE_IN') {
      const checkRes = await fetch('/api/web-users/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: customerEmail.trim() }),
      })
      const checkData = await checkRes.json()
      if (!checkData.exists) {
        toast({ title: 'البريد الإلكتروني غير مسجل', description: 'هذا البريد غير مسجل في النظام. الرجاء إنشاء حساب أولاً.', variant: 'destructive' })
        return
      }
      if (checkData.blocked) {
        toast({ title: 'حساب محظور', description: 'هذا الحساب محظور. لا يمكنك الطلب.', variant: 'destructive' })
        return
      }
    }

    setSubmitting(true)
    try {
      const orderPayload = {
        type: orderType,
        shiftId: currentShiftId || undefined,
        customerName: customerName.trim() || 'كاشير',
        customerPhone: customerPhone.trim() || '',
        customerEmail: customerEmail.trim() || undefined,
        deliveryAddress: orderType === 'DELIVERY' ? deliveryAddress.trim() : undefined,
        isStaff: true,
        items: cart.map((item) => ({
          mealId: item.mealId,
          mealTitle: item.title,
          mealTitleAr: item.titleAr,
          price: item.price,
          quantity: item.quantity,
          category: item.category || '',
          preparationArea: item.preparationArea || 'KITCHEN',
          addOns: item.addOns,
          imageUrl: item.imageUrl,
        })),
        subtotal,
        serviceCharge,
        deliveryFee,
        total,
        notes: notes.trim() || undefined,
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      })

      if (res.ok) {
        toast({ title: 'تم إرسال الطلب بنجاح', description: 'تم إضافة الطلب إلى الشيفت' })
        setShowNewOrder(false)
        setCart([])
        setDeliveryAddress('')
        setCustomerName('')
        setCustomerPhone('')
        setCustomerEmail('')
        setNotes('')
        fetchOrders()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: data.error || 'فشل في إرسال الطلب', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في الاتصال بالخادم', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }, [cart, orderType, customerName, customerPhone, customerEmail, deliveryAddress, currentShiftId, subtotal, serviceCharge, total, notes, toast, fetchOrders])

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
          .map((o: { customerPhone: string; customerName: string; deliveryAddress: string | null; customerEmail: string | null }) => ({
            customerPhone: o.customerPhone || '',
            customerName: o.customerName || '',
            deliveryAddress: o.deliveryAddress || null,
            customerEmail: o.customerEmail || '',
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

  const handleSelectCustomer = useCallback((result: { customerPhone: string; customerName: string; deliveryAddress: string | null; customerEmail?: string }) => {
    setCustomerPhone(result.customerPhone)
    setCustomerName(result.customerName)
    if (result.deliveryAddress) setDeliveryAddress(result.deliveryAddress)
    if (result.customerEmail) setCustomerEmail(result.customerEmail)
    setCustomerResults([])
  }, [])

  const handleEmailLookup = useCallback(async (email: string) => {
    try {
      const res = await fetch('/api/web-users/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) return
      const data = await res.json()
      if (!data.exists || !data.user) return
      const user = data.user
      if (user.name) setCustomerName(user.name)
      if (user.phone) setCustomerPhone(user.phone)
      if (user.addresses?.length > 0) {
        setDeliveryAddress(user.addresses[0].address)
      }
    } catch (err) {
      console.error('Email lookup failed:', err)
    }
  }, [])

  useEffect(() => {
    if (shiftOpen !== true) return
    if (currentShiftId) fetchExpenses()
  }, [fetchExpenses, currentShiftId, shiftOpen])

  useEffect(() => {
    if (shiftOpen !== true) return
    pollIntervalRef.current = setInterval(() => fetchOrders(), 5000)
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current) }
  }, [fetchOrders, shiftOpen])

  // Fetch meals when new order dialog opens
  useEffect(() => {
    if (showNewOrder) {
      fetchMeals()
      fetch('/api/categories').then(r => r.ok && r.json()).then(d => {
        if (Array.isArray(d)) {
          setCategories(d.map((c: { name: string }) => ({ value: c.name, label: c.name })))
        }
      }).catch((err) => console.error('Failed to fetch categories:', err))
    }
  }, [showNewOrder, fetchMeals])

  // Reset cart and form when dialog opens
  useEffect(() => {
    if (showNewOrder) {
      setCart([])
      setOrderType('TAKEAWAY')
      setCustomerName('')
      setCustomerPhone('')
      setDeliveryAddress('')
      setNotes('')
      setSearchQuery('')
      setFilterCategory('الكل')
      setCustomerResults([])
    }
  }, [showNewOrder])

  // Use shared relative timers hook
  const relativeTimers = useRelativeTimers(allOrders)

  // Actions
  const markAsPaid = async (orderId: string) => {
    setUpdatingOrderId(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
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
      const res = await fetch(`/api/orders/${orderId}`, {
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

  const rejectOrder = async (orderId: string) => {
    if (!window.confirm('هل أنت متأكد من رفض هذا الطلب؟')) return
    setUpdatingOrderId(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED', cancelledBy: username }),
      })
      if (res.ok) {
        toast({ title: 'تم رفض الطلب', description: 'تم إلغاء الطلب' })
        setAllOrders(prev => prev.filter(o => o.id !== orderId))
        fetchOrders()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: data.error || 'فشل في إلغاء الطلب', variant: 'destructive' })
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
      const res = await fetch('/api/tables/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds }),
      })
      if (res.ok) {
        toast({ title: 'تم الدفع بنجاح', description: 'تم تحديث حالة جميع الطلبات في الطاولة' })
        setAllOrders(prev => prev.filter(o => !orderIds.includes(o.id)))
        fetchOrders()
        setReceiptTableOrders(null)
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: (data as { error?: string }).error || 'فشل في تحديث حالة بعض الطلبات', variant: 'destructive' })
      }
    } catch (err) {
      console.error('Failed to pay table:', err)
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
      <div className="min-h-dvh bg-background flex items-center justify-center" dir="rtl">
        <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-8 text-center">
          <p className="text-lg font-bold text-[#D4AF37]">جاري التحقق من حالة الشيفت...</p>
        </div>
      </div>
    )
  }

  // Shift closed state
  if (shiftOpen === false) {
    return (
<div className="min-h-dvh bg-background" dir="rtl">
        <header className="sticky top-0 z-30 border-b border-[#D4AF37]/20 bg-background/95 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#D4AF37]/10">
                <DollarSign className="h-5 w-5 text-[#D4AF37]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#D4AF37]">لوحة الكاشير</h1>
                <p className="text-xs text-muted-foreground">توب  — {username}</p>
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
    <div className="min-h-dvh bg-background" dir="rtl">
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
        onNewOrder={() => setShowNewOrder(true)}
      />

      <main className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
        <StatsBar
          activeCount={activeOrders.length}
          readyCount={readyOrders.length}
          totalExpenses={totalExpenses}
        />

        {/* Sticky Tab Buttons */}
        <div className="sticky top-16 z-20 -mx-4 md:-mx-6 px-4 md:px-6 pb-3 bg-background/95 backdrop-blur-md border-b border-border/30 mb-6">
          <div className="flex gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            {[
              { value: 'active', icon: ShoppingBag, label: 'الطلبات النشطة', shortLabel: 'النشطة', count: activeOrders.length, highlight: readyOrders.length > 0 },
              { value: 'delivered', icon: Receipt, label: 'المدفوعة', shortLabel: 'المدفوعة', count: deliveredOrders.length },
              { value: 'expenses', icon: TrendingDown, label: 'المصروفات', shortLabel: 'المصروفات', count: expenses.length },
            ].map(tab => {
              const TabIcon = tab.icon
              const isActive = activeTab === tab.value
              return (
                <button
                  key={tab.value}
                  onClick={() => {
                    setActiveTab(tab.value)
                    const params = new URLSearchParams(window.location.search)
                    params.set('tab', tab.value)
                    window.history.replaceState(null, '', `?${params.toString()}`)
                  }}
                  className={`flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg text-xs sm:text-sm transition-all font-medium relative
                    ${isActive
                      ? 'bg-[#D4AF37] text-black shadow-md shadow-[#D4AF37]/20'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent hover:border-border/50'
                    }`}
                >
                  <TabIcon className={`h-4 w-4 ${isActive ? 'text-black' : ''}`} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  {tab.count > 0 && (
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-white font-bold ${tab.highlight ? 'bg-green-500' : 'bg-[#D4AF37]/70'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Active Orders */}
        {activeTab === 'active' && (
          <>
            {loadingOrders && activeOrders.length === 0 ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" /></div>
            ) : activeOrders.length === 0 ? (
              <div className="py-20 text-center">
                <ShoppingBag className="mx-auto mb-4 h-16 w-16 text-muted-foreground/20" />
                <p className="text-lg text-muted-foreground">لا توجد طلبات نشطة</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence>
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
                      onReject={rejectOrder}
                      onAddItems={setAddItemsOrder}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}

        {/* Delivered Orders */}
        {activeTab === 'delivered' && (
          <>
            {deliveredOrders.length === 0 ? (
              <div className="py-20 text-center">
                <Receipt className="mx-auto mb-4 h-16 w-16 text-muted-foreground/20" />
                <p className="text-lg text-muted-foreground">لا توجد فواتير مدفوعة</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence>
                  {deliveredOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      relativeTime={relativeTimers[order.id] || getRelativeTime(order.createdAt)}
                      updatingOrderId={updatingOrderId}
                      onConfirm={confirmOrder}
                      onMarkAsPaid={markAsPaid}
                      onViewReceipt={setReceiptOrder}
                      onReject={rejectOrder}
                      onAddItems={setAddItemsOrder}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}

        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <ExpenseManager
            expenses={expenses}
            currentShiftId={currentShiftId}
            username={username}
            onExpensesChanged={fetchExpenses}
            availableCash={shiftRevenue - totalExpenses}
          />
        )}
      </main>

      {/* Receipt Dialog */}
      <ReceiptDialog
        receiptOrder={receiptOrder}
        receiptTableOrders={receiptTableOrders}
        updatingOrderId={updatingOrderId}
        payingTable={payingTable}
        username={username}
        onMarkAsPaid={markAsPaid}
        onMarkTableAsPaid={markTableAsPaid}
        onCloseOrder={() => setReceiptOrder(null)}
        onCloseTable={() => setReceiptTableOrders(null)}
      />

      {/* Add Items to Existing Order Dialog */}
      <AddItemsDialog
        open={!!addItemsOrder}
        onOpenChange={(open) => { if (!open) setAddItemsOrder(null) }}
        order={addItemsOrder}
        onItemsAdded={() => { fetchOrders(); setAddItemsOrder(null) }}
      />

      {/* New Order Dialog */}
      <NewOrderDialog
        open={showNewOrder}
        onOpenChange={setShowNewOrder}
        orderType={orderType}
        setOrderType={setOrderType}
        tableNumber={tableNumber}
        setTableNumber={() => {}}
        customerName={customerName}
        setCustomerName={setCustomerName}
        customerPhone={customerPhone}
        setCustomerPhone={setCustomerPhone}
        customerEmail={customerEmail}
        setCustomerEmail={setCustomerEmail}
        deliveryAddress={deliveryAddress}
        setDeliveryAddress={setDeliveryAddress}
        existingTableOrder={null}
        allowedTypes={['TAKEAWAY', 'DELIVERY']}
        categories={categories}
        customerResults={customerResults}
        onSearchCustomer={handleCustomerSearch}
        onSelectCustomer={handleSelectCustomer}
        onEmailLookup={handleEmailLookup}
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
        notes={notes}
        setNotes={setNotes}
        submitting={submitting}
        onSubmit={handleSubmitOrder}
      />
    </div>
  )
}
