'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UtensilsCrossed, Plus, LogOut, Clock, ChefHat, Check,
  Loader2, Search, ShoppingCart, Minus, X, Utensils,
  Phone, MapPin, ClipboardList, Timer, Eye, ChevronDown, ChevronUp,
  Send, StickyNote, Hash
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

// ── Interfaces ────────────────────────────────────────────────────────────────

interface Meal {
  id: string
  title: string
  titleAr: string
  description: string
  descriptionAr: string
  price: number
  prepTime: string
  category: string
  categoryAr: string
  imageUrl: string
  isActive: boolean
}

interface OrderItem {
  id: string
  mealId: string
  mealTitle: string
  mealTitleAr: string
  quantity: number
  price: number
  category?: string
  addOns?: { title: string; titleAr: string; price: number }[]
  imageUrl?: string
}

interface Order {
  id: string
  orderNumber: number
  type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'READY_TO_PAY' | 'DELIVERED' | 'CANCELLED'
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

const CATEGORIES = [
  { value: 'مشويات', label: 'مشويات' },
  { value: 'مقبلات', label: 'مقبلات' },
  { value: 'ساندويتشات', label: 'ساندويتشات' },
  { value: 'حلويات', label: 'حلويات' },
  { value: 'مشروبات', label: 'مشروبات' },
  { value: 'أطباق رئيسية', label: 'أطباق رئيسية' },
]

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

const SERVICE_CHARGE_RATE = 0.10

// ── Helpers ───────────────────────────────────────────────────────────────────

function getRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, Math.floor((now - then) / 1000))
  if (diff < 60) return `منذ ${diff} ثانية`
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`
  return `منذ ${Math.floor(diff / 86400)} يوم`
}

function playNotificationSound() {
  try {
    const ctx = new AudioContext()
    if (ctx.state === 'suspended') {
      void ctx.resume()
    }
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.35)
  } catch {
    // browser may block autoplay without interaction
  }
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
      } catch { parsedAddOns = undefined }
      return {
        id: (item.id as string) || '',
        mealId: (item.mealId as string) || '',
        mealTitle: (item.mealTitle as string) || '',
        mealTitleAr: (item.mealTitleAr as string) || '',
        price: Number(item.price ?? 0),
        quantity: Number(item.quantity ?? 1),
        category: (item.category as string) || undefined,
        imageUrl: (item.imageUrl as string) || undefined,
        addOns: parsedAddOns,
      }
    }),
  }
}

// ── Cart Item for new order ───────────────────────────────────────────────────

interface CartItem {
  mealId: string
  mealTitle: string
  mealTitleAr: string
  price: number
  quantity: number
  category: string
  imageUrl: string
  addOns: { title: string; titleAr: string; price: number }[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WaiterPanel({ onLogout }: { onLogout: () => void }) {
  const { toast } = useToast()

  // ── Orders state ──────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)

  // ── Meals state ───────────────────────────────────────────────────────────
  const [meals, setMeals] = useState<Meal[]>([])
  const [loadingMeals, setLoadingMeals] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('الكل')

  // ── New order form state ──────────────────────────────────────────────────
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'>('DINE_IN')
  const [tableNumber, setTableNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [notes, setNotes] = useState('')
  const [existingTableOrder, setExistingTableOrder] = useState<Order | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // ── Order detail dialog ───────────────────────────────────────────────────
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [editableOrderItems, setEditableOrderItems] = useState<OrderItem[] | null>(null)
  const [removedOrderItemIds, setRemovedOrderItemIds] = useState<string[]>([])
  const [savingOrderEdits, setSavingOrderEdits] = useState(false)

  useEffect(() => {
    if (selectedOrder) {
      setEditableOrderItems(selectedOrder.items)
      setRemovedOrderItemIds([])
    } else {
      setEditableOrderItems(null)
      setRemovedOrderItemIds([])
    }
  }, [selectedOrder])

  // ── Relative time refresh ─────────────────────────────────────────────────
  const [timeKey, setTimeKey] = useState(0)
  const [shiftOpen, setShiftOpen] = useState<boolean | null>(null)
  const [currentShiftId, setCurrentShiftId] = useState<string>('')
  const [shiftLoading, setShiftLoading] = useState(true)
  const prevOrderStatusRef = useRef<Record<string, Order['status']>>({})

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

  // ── Fetch active orders ───────────────────────────────────────────────────
  const fetchActiveOrders = useCallback(async () => {
    if (shiftOpen !== true || !currentShiftId) {
      setOrders([])
      setLoadingOrders(false)
      return
    }

    try {
      const [pendingRes, confirmedRes, preparingRes, readyRes] = await Promise.all([
        fetch(`/api/orders?status=PENDING&shiftId=${currentShiftId}`),
        fetch(`/api/orders?status=CONFIRMED&shiftId=${currentShiftId}`),
        fetch(`/api/orders?status=PREPARING&shiftId=${currentShiftId}`),
        fetch(`/api/orders?status=READY&shiftId=${currentShiftId}`),
      ])
      const pending = pendingRes.ok ? (await pendingRes.json()).map(transformOrder) : []
      const confirmed = confirmedRes.ok ? (await confirmedRes.json()).map(transformOrder) : []
      const preparing = preparingRes.ok ? (await preparingRes.json()).map(transformOrder) : []
      const ready = readyRes.ok ? (await readyRes.json()).map(transformOrder) : []
      const allOrders = [...pending, ...confirmed, ...preparing, ...ready]
      const previousStatus = prevOrderStatusRef.current
      const newDineInPending = allOrders.filter((o) =>
        o.status === 'PENDING' && o.type === 'DINE_IN' && !previousStatus[o.id]
      )
      const readyDineInOrders = allOrders.filter((o) =>
        o.status === 'READY' && o.type === 'DINE_IN' && previousStatus[o.id] && previousStatus[o.id] !== 'READY'
      )

      // Sort by creation date (newest first)
      allOrders.sort((a: Order, b: Order) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      if (Object.keys(previousStatus).length > 0) {
        if (newDineInPending.length > 0) {
          playNotificationSound()
          toast({
            title: 'طلب صالة جديد',
            description: `طلب رقم #${newDineInPending[0].orderNumber} وصل للويتر`,
          })
        }
        if (readyDineInOrders.length > 0) {
          playNotificationSound()
          toast({
            title: 'طلب صالة جاهز',
            description: `طلب رقم #${readyDineInOrders[0].orderNumber} جاهز للاستلام`,
          })
        }
      }

      prevOrderStatusRef.current = Object.fromEntries(allOrders.map((o) => [o.id, o.status]))
      setOrders(allOrders)
    } catch {
      /* ignore polling errors */
    } finally {
      setLoadingOrders(false)
    }
  }, [shiftOpen])

  // ── Fetch meals for new order ─────────────────────────────────────────────
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

  // ── Initial fetch ─────────────────────────────────────────────────────────
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

  // ── Polling every 5 seconds ──────────────────────────────────────────────
  useEffect(() => {
    if (shiftOpen !== true) return
    const interval = setInterval(() => {
      fetchActiveOrders()
      setTimeKey((k) => k + 1)
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchActiveOrders, shiftOpen])

  // ── Fetch meals when dialog opens ─────────────────────────────────────────
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
      !['DELIVERED', 'CANCELLED'].includes(order.status)
    )
    setExistingTableOrder(existing || null)
  }, [orderType, tableNumber, orders])

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
        toast({ title: 'تم تحديث حالة الطلب' })
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
  }

  // ── Cart operations ───────────────────────────────────────────────────────
  const addToCart = (meal: Meal) => {
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
          mealTitle: meal.title,
          mealTitleAr: meal.titleAr,
          price: meal.price,
          quantity: 1,
          category: meal.category,
          imageUrl: meal.imageUrl,
          addOns: [],
        },
      ]
    })
  }

  const removeFromCart = (mealId: string) => {
    setCart((prev) => prev.filter((item) => item.mealId !== mealId))
  }

  const updateCartQuantity = (mealId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.mealId === mealId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  const getCartQuantity = (mealId: string): number => {
    return cart.find((item) => item.mealId === mealId)?.quantity ?? 0
  }

  // ── Calculations ──────────────────────────────────────────────────────────
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const serviceCharge = Math.round(subtotal * SERVICE_CHARGE_RATE * 100) / 100
  const total = subtotal + serviceCharge

  // ── Submit new order ─────────────────────────────────────────────────────
  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      toast({ title: 'السلة فارغة', description: 'يرجى إضافة أصناف للطلب', variant: 'destructive' })
      return
    }
    if (orderType === 'DINE_IN' && !tableNumber.trim()) {
      toast({ title: 'بيانات ناقصة', description: 'يرجى إدخال رقم الطاولة', variant: 'destructive' })
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
          mealTitle: item.mealTitle,
          mealTitleAr: item.mealTitleAr,
          price: item.price,
          quantity: item.quantity,
          category: item.category,
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
  }

  const handleEditItemQuantity = (itemId: string, delta: number) => {
    setEditableOrderItems((prev) => {
      if (!prev) return prev
      return prev.flatMap((item) => {
        if (item.id !== itemId) return item
        const nextQuantity = Math.max(0, item.quantity + delta)
        if (nextQuantity <= 0) {
          setRemovedOrderItemIds((ids) => [...new Set([...ids, itemId])])
          return []
        }
        return [{ ...item, quantity: nextQuantity }]
      })
    })
  }

  const handleChangeOrderItemMeal = (itemId: string, mealId: string) => {
    const meal = meals.find((m) => m.id === mealId)
    if (!meal) return
    setEditableOrderItems((prev) =>
      prev
        ? prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  mealId: meal.id,
                  mealTitle: meal.title,
                  mealTitleAr: meal.titleAr,
                  price: meal.price,
                  category: meal.category,
                  imageUrl: meal.imageUrl,
                  addOns: [],
                }
              : item
          )
        : prev
    )
  }

  const handleRemoveOrderItem = (itemId: string) => {
    setEditableOrderItems((prev) => prev?.filter((item) => item.id !== itemId) ?? null)
    setRemovedOrderItemIds((ids) => [...new Set([...ids, itemId])])
  }

  const handleSaveOrderEdits = async () => {
    if (!selectedOrder || !editableOrderItems) return

    setSavingOrderEdits(true)
    try {
const requestBody: Record<string, unknown> = {
      customerName: selectedOrder.customerName,
      customerPhone: selectedOrder.customerPhone,
      tableNumber: selectedOrder.tableNumber,
    }

    if (selectedOrder.status === 'PENDING') {
      requestBody.itemUpdates = editableOrderItems.map((item) => ({
        id: item.id,
        mealId: item.mealId,
        mealTitle: item.mealTitle,
        mealTitleAr: item.mealTitleAr,
        price: item.price,
        quantity: item.quantity,
        addOns: item.addOns || [],
        category: item.category || '',
        imageUrl: item.imageUrl || '',
      }))
      requestBody.removedItemIds = removedOrderItemIds
    }

    const response = await fetch(`/api/orders/${selectedOrder.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'فشل في حفظ التعديلات')
      }

      const updatedOrder = transformOrder(await response.json())
      setSelectedOrder(updatedOrder)
      setOrders((prev) => prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)))
      toast({ title: 'تم حفظ التعديلات', description: `تم تحديث طلب رقم #${updatedOrder.orderNumber}` })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'حدث خطأ'
      toast({ title: 'خطأ', description: message, variant: 'destructive' })
    } finally {
      setSavingOrderEdits(false)
    }
  }

  // ── Group orders by table ─────────────────────────────────────────────────
  const groupedOrders = orders.reduce<Record<string, Order[]>>((acc, order) => {
    const key = order.type === 'DINE_IN' && order.tableNumber
      ? `طاولة ${order.tableNumber}`
      : 'بدون طاولة'
    if (!acc[key]) acc[key] = []
    acc[key].push(order)
    return acc
  }, {})

  // Sort groups: tables with numbers first (sorted numerically), then "بدون طاولة"
  const sortedGroups = Object.entries(groupedOrders).sort(([a], [b]) => {
    if (a === 'بدون طاولة') return 1
    if (b === 'بدون طاولة') return -1
    const numA = parseInt(a.replace('طاولة ', ''))
    const numB = parseInt(b.replace('طاولة ', ''))
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB
    return a.localeCompare(b, 'ar')
  })

  // ── Filter meals ──────────────────────────────────────────────────────────
  const filteredMeals = meals.filter((meal) => {
    const matchSearch =
      searchQuery === '' ||
      meal.titleAr?.includes(searchQuery) ||
      meal.title?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchCategory = filterCategory === 'الكل' || meal.category === filterCategory
    const isHallItem = meal.category === 'اصناف الصالة'
    return !isHallItem && matchSearch && matchCategory
  })

  // ── Count active orders ──────────────────────────────────────────────────
  const pendingCount = orders.filter((o) => o.status === 'PENDING').length
  const confirmedCount = orders.filter((o) => o.status === 'CONFIRMED').length
  const preparingCount = orders.filter((o) => o.status === 'PREPARING').length
  const readyCount = orders.filter((o) => o.status === 'READY').length

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
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#D4AF37]/10">
                <UtensilsCrossed className="h-5 w-5 text-[#D4AF37]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#D4AF37]">لوحة الويتر</h1>
                <p className="text-xs text-muted-foreground">سرايا العرب</p>
              </div>
            </div>
            <div>
              <Button variant="ghost" onClick={onLogout} className="gap-2 text-muted-foreground hover:text-red-400">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">خروج</span>
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 md:p-6">
          <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center">
            <h2 className="mb-2 text-2xl font-bold text-red-600">الشيفت مغلق</h2>
            <p className="text-muted-foreground">الويتر مغلق حتى يقوم المسؤول ببدء شيفت جديد.</p>
          </div>
        </main>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-[#D4AF37]/20 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#D4AF37]/10">
              <UtensilsCrossed className="h-5 w-5 text-[#D4AF37]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#D4AF37]">لوحة الويتر</h1>
              <p className="text-xs text-muted-foreground">سرايا العرب</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Active counts badges */}
            <div className="hidden sm:flex items-center gap-2">
              {pendingCount > 0 && (
                <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30 gap-1">
                  <Clock className="h-3 w-3" />
                  {pendingCount} جديد
                </Badge>
              )}
              {confirmedCount > 0 && (
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 gap-1">
                  <Check className="h-3 w-3" />
                  {confirmedCount} مؤكد
                </Badge>
              )}
              {preparingCount > 0 && (
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 gap-1">
                  <ChefHat className="h-3 w-3" />
                  {preparingCount} يُحضّر
                </Badge>
              )}
              {readyCount > 0 && (
                <Badge className="bg-green-500/10 text-green-400 border-green-500/30 gap-1">
                  <Check className="h-3 w-3" />
                  {readyCount} جاهز للاستلام
                </Badge>
              )}
            </div>
            <Button variant="ghost" onClick={onLogout} className="gap-2 text-muted-foreground hover:text-red-400">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">خروج</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Main Content ───────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl p-4 md:p-6 pb-24">
        {/* Stats cards */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <Card className="border-yellow-500/20 bg-yellow-500/5">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                  <Clock className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-400">{pendingCount}</p>
                  <p className="text-xs text-muted-foreground">طلبات جديدة</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Check className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-400">{confirmedCount}</p>
                  <p className="text-xs text-muted-foreground">مؤكدة</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                  <ChefHat className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-400">{preparingCount}</p>
                  <p className="text-xs text-muted-foreground">قيد التحضير</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Active Orders */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#D4AF37] flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            الطلبات النشطة
            <Badge variant="outline" className="border-[#D4AF37]/30 text-[#D4AF37] text-xs">
              {orders.length}
            </Badge>
          </h2>
        </div>

        {loadingOrders ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-[#D4AF37]" />
              <p className="text-sm text-muted-foreground">جاري تحميل الطلبات...</p>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center"
          >
            <ClipboardList className="mx-auto mb-4 h-16 w-16 text-muted-foreground/20" />
            <p className="text-lg text-muted-foreground">لا توجد طلبات نشطة حالياً</p>
            <p className="text-sm text-muted-foreground/60 mt-1">سيتم تحديث القائمة تلقائياً</p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {sortedGroups.map(([groupName, groupOrders]) => (
                <motion.div
                  key={groupName}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Group header */}
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D4AF37]/10">
                      {groupName === 'بدون طاولة' ? (
                        <Phone className="h-4 w-4 text-[#D4AF37]" />
                      ) : (
                        <Hash className="h-4 w-4 text-[#D4AF37]" />
                      )}
                    </div>
                    <h3 className="font-bold text-[#D4AF37]">{groupName}</h3>
                    <Badge variant="outline" className="border-[#D4AF37]/30 text-[#D4AF37] text-xs">
                      {groupOrders.length} طلب
                    </Badge>
                  </div>

                  {/* Order cards */}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <AnimatePresence>
                      {groupOrders.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          timeKey={timeKey}
                          updatingOrderId={updatingOrderId}
                          onConfirm={() => updateOrderStatus(order.id, 'CONFIRMED')}
                          onViewDetails={() => setSelectedOrder(order)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* ─── Floating New Order Button ──────────────────────────────────────── */}
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

      {/* ─── New Order Dialog ───────────────────────────────────────────────── */}
      <Dialog open={showNewOrder} onOpenChange={setShowNewOrder}>
        <DialogContent className="w-full max-w-[95vw] md:max-w-[92vw] max-h-[90vh] overflow-y-auto p-0 gap-0" dir="rtl">
          <DialogHeader className="p-6 pb-4 border-b border-border/50">
            <DialogTitle className="text-[#D4AF37] flex items-center gap-2 text-lg">
              <ShoppingCart className="h-5 w-5" />
              طلب جديد
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              إضافة طلب جديد للعميل
            </DialogDescription>
          </DialogHeader>

          <div className="flex h-full min-h-[360px] flex-col overflow-hidden md:flex-row-reverse">
            {/* Left: Meal selection */}
            <div className="flex-1 min-h-0 flex flex-col md:border-r border-border/50 overflow-hidden">
              {/* Order type & table */}
              <div className="p-4 border-b border-border/30 space-y-3">
                <Label className="text-sm font-semibold text-[#D4AF37]">نوع الطلب</Label>
                <div className="flex gap-2">
                  {(['DINE_IN', 'TAKEAWAY', 'DELIVERY'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setOrderType(type)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                        orderType === type
                          ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                          : 'border-border/50 bg-muted/30 text-muted-foreground hover:border-[#D4AF37]/30'
                      }`}
                    >
                      {type === 'DINE_IN' && <Utensils className="h-3.5 w-3.5" />}
                      {type === 'TAKEAWAY' && <Phone className="h-3.5 w-3.5" />}
                      {type === 'DELIVERY' && <MapPin className="h-3.5 w-3.5" />}
                      {ORDER_TYPE_MAP[type].label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {orderType === 'DINE_IN' && (
                    <div>
                      <Label className="text-xs text-muted-foreground">رقم الطاولة</Label>
                      <Input
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        placeholder="مثال: 5"
                        className="bg-muted border-border/50 h-9 mt-1"
                        dir="rtl"
                      />
                      {existingTableOrder && (
                        <p className="mt-2 rounded-lg border border-yellow-300/70 bg-yellow-200/10 px-3 py-2 text-xs text-yellow-800">
                          يوجد طلب مفتوح للطاولة {tableNumber.trim()} (# {existingTableOrder.orderNumber}) بحالة {ORDER_STATUS_MAP[existingTableOrder.status]?.label}.
                          سيتم إضافة الأصناف إلى الطلب المفتوح.
                        </p>
                      )}
                    </div>
                  )}
                  <div className={orderType === 'DINE_IN' ? '' : 'col-span-1'}>
                    <Label className="text-xs text-muted-foreground">اسم العميل</Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="اختياري"
                      className="bg-muted border-border/50 h-9 mt-1"
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">رقم الهاتف</Label>
                    <Input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="اختياري"
                      className="bg-muted border-border/50 h-9 mt-1"
                      dir="rtl"
                    />
                  </div>
                </div>

                {orderType === 'DELIVERY' && (
                  <div>
                    <Label className="text-xs text-muted-foreground">عنوان التوصيل</Label>
                    <Input
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="عنوان العميل"
                      className="bg-muted border-border/50 h-9 mt-1"
                      dir="rtl"
                    />
                  </div>
                )}
              </div>

              {/* Search & filter */}
              <div className="p-4 border-b border-border/30 space-y-2">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث عن طبق..."
                    className="bg-muted border-border/50 pr-9 h-9"
                    dir="rtl"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['الكل', ...CATEGORIES.map((c) => c.value)].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className={`rounded-lg border px-2.5 py-1 text-[11px] transition-all ${
                        filterCategory === cat
                          ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                          : 'border-border/50 bg-muted/50 text-muted-foreground hover:border-[#D4AF37]/30'
                      }`}
                    >
                      {cat === 'الكل' ? 'الكل' : CATEGORIES.find((c) => c.value === cat)?.label || cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Meal list */}
              <ScrollArea className="flex-1 min-h-0 overflow-hidden">
                <div className="p-3 space-y-2">
                  {loadingMeals ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-[#D4AF37]" />
                    </div>
                  ) : filteredMeals.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-sm">
                      <UtensilsCrossed className="mx-auto mb-2 h-8 w-8 opacity-30" />
                      <p>لا توجد أطباق</p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {filteredMeals.map((meal) => {
                        const qty = getCartQuantity(meal.id)
                        return (
                          <motion.div
                            key={meal.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className={`flex items-center gap-3 rounded-lg border p-2.5 transition-all ${
                              qty > 0
                                ? 'border-[#D4AF37]/40 bg-[#D4AF37]/5'
                                : 'border-border/30 bg-muted/20 hover:border-[#D4AF37]/20'
                            }`}
                          >
                            {meal.imageUrl ? (
                              <img
                                src={meal.imageUrl}
                                alt=""
                                className="h-12 w-14 rounded-lg object-cover border border-[#D4AF37]/20 flex-shrink-0"
                              />
                            ) : (
                              <div className="flex h-12 w-14 items-center justify-center rounded-lg bg-muted border border-border/30 flex-shrink-0">
                                <UtensilsCrossed className="h-4 w-4 text-muted-foreground/40" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{meal.titleAr || meal.title}</p>
                              <p className="text-xs text-[#D4AF37] font-bold">{meal.price.toFixed(2)} ج.م</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {qty > 0 && (
                                <>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() => updateCartQuantity(meal.id, -1)}
                                    className="h-7 w-7 rounded-lg border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="w-6 text-center text-sm font-bold text-[#D4AF37]">{qty}</span>
                                </>
                              )}
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => addToCart(meal)}
                                className="h-7 w-7 rounded-lg border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Right: Cart summary */}
            <div className="w-full md:w-80 min-h-0 flex flex-col border-t md:border-t-0 border-border/50 bg-muted/20 overflow-hidden">
              <div className="p-4 border-b border-border/30">
                <h3 className="font-bold text-[#D4AF37] flex items-center gap-2 text-sm">
                  <ShoppingCart className="h-4 w-4" />
                  السلة
                  {cart.length > 0 && (
                    <Badge className="bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30 text-[10px]">
                      {cart.reduce((sum, item) => sum + item.quantity, 0)} صنف
                    </Badge>
                  )}
                </h3>
              </div>

              <ScrollArea className="max-h-[24rem] min-h-0 overflow-hidden">
                <div className="p-3 space-y-2">
                  {cart.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">
                      <ShoppingCart className="mx-auto mb-2 h-8 w-8 opacity-20" />
                      <p>السلة فارغة</p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {cart.map((item) => (
                        <motion.div
                          key={item.mealId}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="flex items-center gap-2 rounded-lg border border-border/30 bg-background p-2"
                        >
                          {item.imageUrl && (
                            <img
                              src={item.imageUrl}
                              alt=""
                              className="h-8 w-10 rounded object-cover border border-[#D4AF37]/20 flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{item.mealTitleAr || item.mealTitle}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {item.quantity} × {item.price.toFixed(2)} ج.م
                            </p>
                          </div>
                          <span className="text-xs font-bold text-[#D4AF37] flex-shrink-0">
                            {(item.price * item.quantity).toFixed(2)}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeFromCart(item.mealId)}
                            className="h-6 w-6 text-muted-foreground hover:text-red-400 flex-shrink-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              </ScrollArea>

              {/* Totals & submit */}
              <div className="p-4 border-t border-border/30 space-y-3">
                {/* Notes */}
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <StickyNote className="h-3 w-3" />
                    ملاحظات
                  </Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="أي ملاحظات على الطلب..."
                    className="bg-muted border-border/50 mt-1 min-h-[60px] text-xs"
                    dir="rtl"
                  />
                </div>

                <Separator className="bg-border/30" />

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>المجموع الفرعي</span>
                    <span>{subtotal.toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>خدمة (10%)</span>
                    <span>{serviceCharge.toFixed(2)} ج.م</span>
                  </div>
                  <Separator className="bg-border/30" />
                  <div className="flex justify-between font-bold text-[#D4AF37]">
                    <span>الإجمالي</span>
                    <span>{total.toFixed(2)} ج.م</span>
                  </div>
                </div>

                <Button
                  onClick={handleSubmitOrder}
                  disabled={submitting || cart.length === 0}
                  className="w-full bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 gap-2 font-bold"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      إرسال الطلب
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Order Detail Dialog ────────────────────────────────────────────── */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-lg max-h-[calc(100vh-4rem)] overflow-hidden" dir="rtl">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="text-[#D4AF37] flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  طلب #{selectedOrder.orderNumber}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  تفاصيل الطلب
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="space-y-5 max-h-[calc(100vh-20rem)] overflow-hidden pr-4">
                {/* Order meta */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">الحالة</p>
                    <Badge className={`mt-1 ${ORDER_STATUS_MAP[selectedOrder.status]?.bg} ${ORDER_STATUS_MAP[selectedOrder.status]?.color} border`}>
                      {ORDER_STATUS_MAP[selectedOrder.status]?.label}
                    </Badge>
                  </div>
                  <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">النوع</p>
                    <p className={`mt-1 text-sm font-semibold ${ORDER_TYPE_MAP[selectedOrder.type]?.color}`}>
                      {ORDER_TYPE_MAP[selectedOrder.type]?.label}
                    </p>
                  </div>
                  {selectedOrder.type === 'DINE_IN' && (
                    <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">رقم الطاولة</p>
                      {selectedOrder.status !== 'DELIVERED' && selectedOrder.status !== 'CANCELLED' ? (
                        <Input
                          value={selectedOrder.tableNumber ?? ''}
                          onChange={(e) => setSelectedOrder((prev) => prev ? { ...prev, tableNumber: e.target.value } : prev)}
                          className="mt-1"
                        />
                      ) : (
                        <p className="mt-1 text-sm font-semibold text-[#D4AF37]">{selectedOrder.tableNumber}</p>
                      )}
                    </div>
                  )}
                  <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">الوقت</p>
                    <p className="mt-1 text-sm font-semibold text-muted-foreground">
                      {getRelativeTime(selectedOrder.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
                    <Label className="text-xs text-muted-foreground">اسم العميل</Label>
                    <Input
                      value={selectedOrder.customerName}
                      onChange={(e) => setSelectedOrder((prev) => prev ? { ...prev, customerName: e.target.value } : prev)}
                      disabled={selectedOrder.status === 'DELIVERED' || selectedOrder.status === 'CANCELLED'}
                      className="mt-1"
                    />
                  </div>
                  <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
                    <Label className="text-xs text-muted-foreground">رقم الهاتف</Label>
                    <Input
                      value={selectedOrder.customerPhone}
                      onChange={(e) => setSelectedOrder((prev) => prev ? { ...prev, customerPhone: e.target.value } : prev)}
                      disabled={selectedOrder.status === 'DELIVERED' || selectedOrder.status === 'CANCELLED'}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h4 className="text-sm font-semibold text-[#D4AF37] mb-2">الأصناف</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                      {(selectedOrder.status === 'PENDING' && editableOrderItems ? editableOrderItems : selectedOrder.items).map((item) => (
                        <div
                          key={item.id}
                          className="rounded-lg border border-border/30 bg-muted/10 p-2.5"
                        >
                          <div className="flex items-start gap-3">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt=""
                                className="h-10 w-12 rounded-lg object-cover border border-[#D4AF37]/20 flex-shrink-0"
                              />
                            ) : (
                              <div className="flex h-10 w-12 items-center justify-center rounded-lg bg-muted border border-border/30 flex-shrink-0">
                                <UtensilsCrossed className="h-3 w-3 text-muted-foreground/40" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0 space-y-2">
                              {selectedOrder.status === 'PENDING' ? (
                                <select
                                  className="w-full rounded-lg border border-border/30 bg-background px-2 py-1 text-sm text-white"
                                  value={item.mealId}
                                  onChange={(e) => handleChangeOrderItemMeal(item.id, e.target.value)}
                                >
                                  {meals.filter((meal) => meal.isActive).map((meal) => (
                                    <option key={meal.id} value={meal.id}>
                                      {meal.titleAr || meal.title} — {meal.price.toFixed(2)}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <p className="text-sm font-semibold truncate">{item.mealTitleAr || item.mealTitle}</p>
                              )}

                              {selectedOrder.status === 'PENDING' ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="flex items-center gap-1">
                                    <Button size="sm" variant="secondary" onClick={() => handleEditItemQuantity(item.id, -1)}>-</Button>
                                    <span className="text-sm font-semibold">{item.quantity}</span>
                                    <Button size="sm" variant="secondary" onClick={() => handleEditItemQuantity(item.id, 1)}>+</Button>
                                  </div>
                                  <Button size="sm" variant="ghost" className="text-red-400" onClick={() => handleRemoveOrderItem(item.id)}>
                                    حذف
                                  </Button>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  {item.quantity} × {item.price.toFixed(2)} ج.م
                                </p>
                              )}

                              {Array.isArray(item.addOns) && item.addOns.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {item.addOns.map((addon, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="outline"
                                      className="border-orange-500/20 text-orange-400 text-[9px] px-1.5 py-0"
                                    >
                                      {addon.titleAr || addon.title} (+{addon.price.toFixed(2)})
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <span className="text-sm font-bold text-[#D4AF37] flex-shrink-0">
                              {(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Notes */}
                {selectedOrder.notes && (
                  <div className="rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-3">
                    <p className="text-xs text-[#D4AF37] font-semibold mb-1">ملاحظات</p>
                    <p className="text-sm text-muted-foreground">{selectedOrder.notes}</p>
                  </div>
                )}

                {/* Totals */}
                <Separator className="bg-border/30" />
                <div className="space-y-3 text-m">
                  {selectedOrder.status === 'PENDING' && editableOrderItems ? (
                    (() => {
                      const currentItems = editableOrderItems
                      const ratio = selectedOrder.subtotal > 0 ? selectedOrder.serviceCharge / selectedOrder.subtotal : SERVICE_CHARGE_RATE
                      const computedSubtotal = currentItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
                      const computedService = Math.round(computedSubtotal * ratio * 100) / 100
                      const computedTotal = computedSubtotal + computedService
                      return (
                        <>
                          <div className="flex justify-between text-muted-foreground">
                            <span>المجموع الفرعي</span>
                            <span>{computedSubtotal.toFixed(2)} ج.م</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>خدمة</span>
                            <span>{computedService.toFixed(2)} ج.م</span>
                          </div>
                          <Separator className="bg-border/30" />
                          <div className="flex justify-between font-bold text-[#D4AF37] text-base ">
                            <span>الإجمالي</span>
                            <span>{computedTotal.toFixed(2)} ج.م</span>
                          </div>
                        </>
                      )
                    })()
                  ) : (
                    <>
                      <div className="flex justify-between text-muted-foreground mb-3 mt-3">
                        <span>المجموع الفرعي</span>
                        <span>{selectedOrder.subtotal.toFixed(2)} ج.م</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground mb-3 mt-3">
                        <span>خدمة</span>
                        <span>{selectedOrder.serviceCharge.toFixed(2)} ج.م</span>
                      </div>
                      <Separator className="bg-border/30" />
                      <div className="flex justify-between font-bold text-[#D4AF37] text-base mb-3 mt-3">
                        <span>الإجمالي</span>
                        <span>{selectedOrder.total.toFixed(2)} ج.م</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Action buttons */}
                {selectedOrder.status !== 'DELIVERED' && selectedOrder.status !== 'CANCELLED' && (
                  <Button
                    onClick={handleSaveOrderEdits}
                    disabled={savingOrderEdits}
                    className="w-full bg-blue-600 text-white hover:bg-blue-500 gap-2 font-bold mb-3 mt-3"
                  >
                    {savingOrderEdits ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    حفظ التعديلات
                  </Button>
                )}
                {selectedOrder.type === 'DINE_IN' && selectedOrder.status === 'READY' && (
                  <Button
                    onClick={() => {
                      updateOrderStatus(selectedOrder.id, 'READY_TO_PAY')
                      setSelectedOrder(null)
                    }}
                    disabled={updatingOrderId === selectedOrder.id}
                    className="w-full bg-green-600 text-white hover:bg-green-500 gap-2 font-bold mb-3"
                  >
                    {updatingOrderId === selectedOrder.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    إغلاق الطاولة وإرسال للكاشير
                  </Button>
                )}
                {selectedOrder.status === 'PENDING' && selectedOrder.type === 'DINE_IN' && (
                  <Button
                    onClick={() => {
                      updateOrderStatus(selectedOrder.id, 'CONFIRMED')
                      setSelectedOrder(null)
                    }}
                    disabled={updatingOrderId === selectedOrder.id || savingOrderEdits}
                    className="w-full bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 gap-2 font-bold"
                  >
                    {updatingOrderId === selectedOrder.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    تأكيد الطلب
                  </Button>
                )}
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Order Card Sub-component ─────────────────────────────────────────────────

function OrderCard({
  order,
  timeKey,
  updatingOrderId,
  onConfirm,
  onViewDetails,
}: {
  order: Order
  timeKey: number
  updatingOrderId: string | null
  onConfirm: () => void
  onViewDetails: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const statusInfo = ORDER_STATUS_MAP[order.status]
  const typeInfo = ORDER_TYPE_MAP[order.type]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={`border ${statusInfo?.bg || 'border-border/50'} bg-card overflow-hidden`}>
        <CardContent className="p-4">
          {/* Top row */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-[#D4AF37]">#{order.orderNumber}</span>
              <Badge className={`${statusInfo?.bg} ${statusInfo?.color} border text-[10px]`}>
                {statusInfo?.label}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Timer className="h-3 w-3" />
              <span key={timeKey}>{getRelativeTime(order.createdAt)}</span>
            </div>
          </div>

          {/* Type & table */}
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs font-semibold ${typeInfo?.color}`}>
              {typeInfo?.label}
            </span>
            {order.tableNumber && (
              <>
                <span className="text-border">•</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  طاولة {order.tableNumber}
                </span>
              </>
            )}
          </div>

          {/* Items preview */}
          <div className="space-y-1.5">
            {(expanded ? order.items : order.items.slice(0, 3)).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="bg-[#D4AF37]/10 text-[#D4AF37] rounded px-1.5 py-0.5 text-[10px] font-bold flex-shrink-0">
                    {item.quantity}×
                  </span>
                  <span className="truncate text-xs">{item.mealTitleAr || item.mealTitle}</span>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0 mr-2">
                  {(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
            {order.items.length > 3 && !expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1"
              >
                <ChevronDown className="h-3 w-3" />
                +{order.items.length - 3} أصناف أخرى
              </button>
            )}
            {expanded && order.items.length > 3 && (
              <button
                onClick={() => setExpanded(false)}
                className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1"
              >
                <ChevronUp className="h-3 w-3" />
                عرض أقل
              </button>
            )}
          </div>

          {/* Notes indicator */}
          {order.notes && (
            <div className="mt-2 rounded border border-[#D4AF37]/20 bg-[#D4AF37]/5 px-2 py-1 text-[10px] text-[#D4AF37] truncate">
              📝 {order.notes}
            </div>
          )}

          {/* Bottom row */}
          <div className="mt-3 flex items-center justify-between pt-3 border-t border-border/30">
            <span className="font-bold text-[#D4AF37]">{order.total.toFixed(2)} ج.م</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onViewDetails}
                className="gap-1 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 h-8 px-3 text-xs"
              >
                <Eye className="h-3 w-3" />
                التفاصيل
              </Button>
              {order.status === 'PENDING' && order.type === 'DINE_IN' && (
                <Button
                  size="sm"
                  onClick={onConfirm}
                  disabled={updatingOrderId === order.id}
                  className="gap-1 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 h-8 px-3 text-xs"
                >
                  {updatingOrderId === order.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                  تأكيد
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
