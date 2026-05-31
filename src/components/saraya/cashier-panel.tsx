'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UtensilsCrossed, LogOut, RefreshCw, Loader2,
  CheckCircle, DollarSign, ClipboardList, Clock,
  Phone, Utensils, Package, Receipt,
  BadgeCheck, X, TrendingDown, Plus, Trash2, Bell,
  AlertCircle, ChevronDown, ChevronUp, ShoppingBag
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

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

interface Expense {
  id: string
  title: string
  amount: number
  category: string
  shiftId: string
  addedBy: string
  createdAt: string
}

const ORDER_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'جديد', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  CONFIRMED: { label: 'مؤكد', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  PREPARING: { label: 'قيد التحضير', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  READY: { label: 'جاهز', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' },
  DELIVERED: { label: 'تم الدفع', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  CANCELLED: { label: 'ملغي', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
}

const ORDER_TYPE_MAP: Record<string, { label: string; color: string }> = {
  DINE_IN: { label: 'صالة', color: 'text-blue-400' },
  TAKEAWAY: { label: 'تيكاوي', color: 'text-orange-400' },
  DELIVERY: { label: 'ديليفري', color: 'text-purple-400' },
}

const EXPENSE_CATEGORIES = ['خامات', 'رواتب', 'إيجار', 'فواتير', 'صيانة', 'تسويق', 'عام', 'أخرى']

function getRelativeTime(dateStr: string): string {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000))
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
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
  } catch {
    // audio not supported or blocked by browser
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
        imageUrl: (item.imageUrl as string) || undefined,
        addOns: parsedAddOns,
      }
    }),
  }
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
}

function getOrderTypeIcon(type: string) {
  switch (type) {
    case 'DINE_IN': return <Utensils className="h-3.5 w-3.5" />
    case 'TAKEAWAY': return <Package className="h-3.5 w-3.5" />
    case 'DELIVERY': return <Phone className="h-3.5 w-3.5" />
    default: return <ClipboardList className="h-3.5 w-3.5" />
  }
}

export function CashierPanel({ onLogout }: { onLogout: () => void }) {
  const { toast } = useToast()
  const username = typeof window !== 'undefined' ? sessionStorage.getItem('saraya-staff-username') || 'cashier' : 'cashier'

  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null)
  const [receiptTableOrders, setReceiptTableOrders] = useState<Order[] | null>(null)
  const [payingTable, setPayingTable] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('active')
  const [relativeTimers, setRelativeTimers] = useState<Record<string, string>>({})
  const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(null)
  const [currentShiftId, setCurrentShiftId] = useState<string>('')
  const [shiftOpen, setShiftOpen] = useState<boolean | null>(null)
  const [shiftLoading, setShiftLoading] = useState(true)

  // Expense form state
  const [expenseTitle, setExpenseTitle] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('عام')
  const [savingExpense, setSavingExpense] = useState(false)

  const prevOrderStatusRef = useRef<Record<string, Order['status']>>({})
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const fetchShiftStatus = async () => {
      try {
        const res = await fetch('/api/shifts?current=true')
        if (res.ok) {
          const shift = await res.json()
          if (shift) {
            setCurrentShiftId(shift.id)
            setShiftOpen(true)
          } else {
            setCurrentShiftId('')
            setShiftOpen(false)
          }
        } else {
          setCurrentShiftId('')
          setShiftOpen(false)
        }
      } catch {
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

const fetchOrders = useCallback(async (showLoading = false) => {
    if (shiftOpen !== true) {
      setAllOrders([])
      setLoadingOrders(false)
      return
    }
    try {
      if (showLoading) setLoadingOrders(true)
      const statuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY']
      const results = await Promise.all(
        statuses.map(s => fetch(`/api/orders?status=${s}`).then(r => r.ok ? r.json() : []))
      )
      let deliveredData: Order[] = []
      if (currentShiftId) {
        const deliveredRes = await fetch(`/api/orders?status=DELIVERED&shiftId=${currentShiftId}`)
        deliveredData = deliveredRes.ok ? (await deliveredRes.json()).map(transformOrder) : []
      }
      const orders: Order[] = [...results.flat().map(transformOrder), ...deliveredData]
      const previousStatus = prevOrderStatusRef.current

      const newPending = orders.filter((o) =>
        o.status === 'PENDING' && o.type !== 'DINE_IN' && !previousStatus[o.id]
      )
      const newReady = orders.filter((o) =>
        o.status === 'READY' && o.type !== 'DINE_IN' && previousStatus[o.id] && previousStatus[o.id] !== 'READY'
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
    } catch { /* ignore */ } finally {
      setLoadingOrders(false)
    }
  }, [toast, shiftOpen])

  const fetchExpenses = useCallback(async () => {
    if (shiftOpen !== true || !currentShiftId) {
      setExpenses([])
      return
    }

    try {
      const url = `/api/expenses?shiftId=${currentShiftId}`
      const res = await fetch(url)
      if (res.ok) setExpenses(await res.json())
    } catch { /* ignore */ }
  }, [currentShiftId, shiftOpen])

  useEffect(() => {
    if (shiftOpen === true) {
      fetchOrders(true)
    } else if (shiftOpen === false) {
      setLoadingOrders(false)
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

  useEffect(() => {
    const update = () => {
      const timers: Record<string, string> = {}
      allOrders.forEach(o => { timers[o.id] = getRelativeTime(o.createdAt) })
      setRelativeTimers(timers)
    }
    update()
    const id = setInterval(update, 30000)
    return () => clearInterval(id)
  }, [allOrders])

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
        body: JSON.stringify({ status: 'CONFIRMED' }),
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

  const addExpense = async () => {
    if (!expenseTitle || !expenseAmount) return
    setSavingExpense(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: expenseTitle,
          amount: parseFloat(expenseAmount),
          category: expenseCategory,
          shiftId: currentShiftId,
          addedBy: username,
        }),
      })
      if (res.ok) {
        toast({ title: 'تم إضافة المصروف', description: `${expenseTitle} - ${expenseAmount} ج.م` })
        setExpenseTitle('')
        setExpenseAmount('')
        setExpenseCategory('عام')
        fetchExpenses()
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في حفظ المصروف', variant: 'destructive' })
    } finally {
      setSavingExpense(false)
    }
  }

  const deleteExpense = async (id: string) => {
    try {
      await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
      fetchExpenses()
    } catch { /* ignore */ }
  }

  // Computed
  const activeOrders = allOrders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status))
  const readyOrders = allOrders.filter(o => o.status === 'READY')
  const deliveredOrders = allOrders.filter(o => o.status === 'DELIVERED')
  const todayRevenue = deliveredOrders.reduce((sum, o) => sum + o.total, 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const netRevenue = todayRevenue - totalExpenses

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
                <DollarSign className="h-5 w-5 text-[#D4AF37]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#D4AF37]">لوحة الكاشير</h1>
                <p className="text-xs text-muted-foreground">سرايا العرب — {username}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={onLogout} className="gap-2 text-muted-foreground hover:text-red-400">
                <LogOut className="h-4 w-4" />خروج
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

  const renderReceipt = (order: Order) => (
    <div className="bg-background text-foreground rounded-xl overflow-hidden" dir="rtl">
      <div className="bg-[#D4AF37]/10 border-b border-[#D4AF37]/30 px-6 py-5 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <UtensilsCrossed className="h-6 w-6 text-[#D4AF37]" />
          <h2 className="text-2xl font-bold text-[#D4AF37]">سرايا العرب</h2>
        </div>
        <p className="text-xs text-muted-foreground">Saraya Al-Arab Restaurant</p>
      </div>
      <div className="px-6 py-4 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">رقم الطلب</span><span className="font-bold text-[#D4AF37]">#{order.orderNumber}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">التاريخ</span><span>{formatDate(order.createdAt)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">الوقت</span><span>{formatTime(order.createdAt)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">النوع</span><span className={ORDER_TYPE_MAP[order.type]?.color || ''}>{ORDER_TYPE_MAP[order.type]?.label || order.type}</span></div>
        {order.type === 'DINE_IN' && order.tableNumber && <div className="flex justify-between"><span className="text-muted-foreground">رقم الطاولة</span><span>{order.tableNumber}</span></div>}
        <div className="flex justify-between"><span className="text-muted-foreground">العميل</span><span>{order.customerName}</span></div>
        {order.customerPhone && <div className="flex justify-between"><span className="text-muted-foreground">الهاتف</span><span dir="ltr">{order.customerPhone}</span></div>}
        {order.deliveryAddress && <div className="flex justify-between"><span className="text-muted-foreground">العنوان</span><span className="text-left max-w-[60%]">{order.deliveryAddress}</span></div>}
      </div>
      <Separator className="bg-border/30" />
      <div className="px-6 py-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30 text-muted-foreground">
              <th className="pb-2 text-right font-medium">الصنف</th>
              <th className="pb-2 text-center font-medium w-16">الكمية</th>
              <th className="pb-2 text-left font-medium w-24">السعر</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map(item => (
              <tr key={item.id} className="border-b border-border/10">
                <td className="py-2.5">
                  <p className="font-medium">{item.mealTitleAr || item.mealTitle}</p>
                  {item.addOns?.map((a, i) => <p key={i} className="text-xs text-muted-foreground">+ {a.titleAr || a.title} ({a.price.toFixed(2)} ج.م)</p>)}
                </td>
                <td className="py-2.5 text-center">{item.quantity}</td>
                <td className="py-2.5 text-left">{(item.price * item.quantity).toFixed(2)} ج.م</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Separator className="bg-border/30" />
      <div className="px-6 py-4 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">المجموع الفرعي</span><span>{order.subtotal.toFixed(2)} ج.م</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">رسوم الخدمة</span><span>{order.serviceCharge.toFixed(2)} ج.م</span></div>
        <Separator className="bg-border/30 my-1" />
        <div className="flex justify-between text-lg font-bold">
          <span className="text-[#D4AF37]">الإجمالي</span>
          <span className="text-[#D4AF37]">{order.total.toFixed(2)} ج.م</span>
        </div>
      </div>
      {order.notes && <div className="px-6 py-3"><p className="text-xs text-muted-foreground">ملاحظات: {order.notes}</p></div>}
    </div>
  )

  const renderTableReceipt = (tableOrders: Order[]) => {
    const tableNumber = tableOrders[0].tableNumber || ''
    const orderNumbers = tableOrders.map((o) => `#${o.orderNumber}`).join(' + ')
    const subtotal = tableOrders.reduce((sum, order) => sum + order.subtotal, 0)
    const serviceCharge = tableOrders.reduce((sum, order) => sum + order.serviceCharge, 0)
    const total = tableOrders.reduce((sum, order) => sum + order.total, 0)

    const aggregatedItems = tableOrders.flatMap((order) =>
      order.items.map((item) => ({
        ...item,
        key: `${item.mealId}-${item.price}-${JSON.stringify(item.addOns || [])}`,
        orderNumber: order.orderNumber,
      }))
    ).reduce<Record<string, { mealTitle: string; mealTitleAr: string; quantity: number; price: number; addOns: string; orderNumbers: Set<number> }>>((acc, item) => {
      const key = item.key
      if (!acc[key]) {
        acc[key] = {
          mealTitle: item.mealTitle,
          mealTitleAr: item.mealTitleAr,
          quantity: item.quantity,
          price: item.price,
          addOns: item.addOns ? JSON.stringify(item.addOns) : '[]',
          orderNumbers: new Set([item.orderNumber]),
        }
      } else {
        acc[key].quantity += item.quantity
        acc[key].orderNumbers.add(item.orderNumber)
      }
      return acc
    }, {})

    return (
      <div className="bg-background text-foreground rounded-xl overflow-hidden" dir="rtl">
        <div className="bg-[#D4AF37]/10 border-b border-[#D4AF37]/30 px-6 py-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <UtensilsCrossed className="h-6 w-6 text-[#D4AF37]" />
            <h2 className="text-2xl font-bold text-[#D4AF37]">فاتورة طاولة {tableNumber}</h2>
          </div>
          <p className="text-xs text-muted-foreground">طلبات {orderNumbers}</p>
        </div>
        <div className="px-6 py-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">رقم الطاولة</span><span>{tableNumber}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">عدد الطلبات</span><span>{tableOrders.length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">النوع</span><span className={ORDER_TYPE_MAP['DINE_IN']?.color || ''}>{ORDER_TYPE_MAP['DINE_IN']?.label}</span></div>
        </div>
        <Separator className="bg-border/30" />
        <div className="px-6 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 text-muted-foreground">
                <th className="pb-2 text-right font-medium">الصنف</th>
                <th className="pb-2 text-center font-medium w-16">الكمية</th>
                <th className="pb-2 text-left font-medium w-24">السعر</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(aggregatedItems).map((item, index) => (
                <tr key={`${item.mealTitle}-${index}`} className="border-b border-border/10">
                  <td className="py-2.5">
                    <p className="font-medium">{item.mealTitleAr || item.mealTitle}</p>
                    {item.addOns !== '[]' && <p className="text-xs text-muted-foreground">+ إضافات</p>}
                    <p className="text-[10px] text-muted-foreground">طلبات {Array.from(item.orderNumbers).map((num) => `#${num}`).join(' + ')}</p>
                  </td>
                  <td className="py-2.5 text-center">{item.quantity}</td>
                  <td className="py-2.5 text-left">{(item.price * item.quantity).toFixed(2)} ج.م</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Separator className="bg-border/30" />
        <div className="px-6 py-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">المجموع الفرعي</span><span>{subtotal.toFixed(2)} ج.م</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">رسوم الخدمة</span><span>{serviceCharge.toFixed(2)} ج.م</span></div>
          <Separator className="bg-border/30 my-1" />
          <div className="flex justify-between text-lg font-bold">
            <span className="text-[#D4AF37]">الإجمالي</span>
            <span className="text-[#D4AF37]">{total.toFixed(2)} ج.م</span>
          </div>
        </div>
      </div>
    )
  }

  const getGroupedTableStatus = (orders: Order[]) => {
    if (orders.some((o) => o.status === 'READY')) return 'READY'
    if (orders.some((o) => o.status === 'PREPARING')) return 'PREPARING'
    if (orders.some((o) => o.status === 'CONFIRMED')) return 'CONFIRMED'
    return 'PENDING'
  }

  const renderTableCard = (tableNumber: string, orders: Order[]) => {
    const groupStatus = getGroupedTableStatus(orders)
    const statusInfo = ORDER_STATUS_MAP[groupStatus]
    const total = orders.reduce((sum, order) => sum + order.total, 0)
    const isReady = groupStatus === 'READY'

    return (
      <motion.div key={`table-${tableNumber}`} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} layout>
        <Card
          className={`border overflow-hidden cursor-pointer transition-all duration-200 ${isReady ? 'border-green-500/50 hover:border-green-400/70 bg-green-500/5' : 'border-border/50 hover:border-[#D4AF37]/40 bg-card'}`}
          onClick={() => setReceiptTableOrders(orders)}
          dir="rtl"
        >
          <div className={`h-1 ${isReady ? 'bg-gradient-to-l from-green-500 to-green-400/40' : 'bg-gradient-to-l from-[#D4AF37] to-[#D4AF37]/40'}`} />
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isReady ? 'bg-green-500/10' : 'bg-[#D4AF37]/10'}`}>
                  <span className={`text-sm font-bold ${isReady ? 'text-green-400' : 'text-[#D4AF37]'}`}>طاولة {tableNumber}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusInfo?.bg || ''}`}>
                      <span className={statusInfo?.color || ''}>{statusInfo?.label || groupStatus}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#D4AF37]">
                      طلبات {orders.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">أحدث طلب {getRelativeTime(orders[0].createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              {orders.slice(0, 2).map((order) => (
                <div key={order.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-bold flex-shrink-0">#{order.orderNumber}</span>
                    <span className="truncate">{ORDER_STATUS_MAP[order.status]?.label || order.status}</span>
                  </div>
                  <span className="text-muted-foreground flex-shrink-0">{order.total.toFixed(2)} ج.م</span>
                </div>
              ))}
              {orders.length > 2 && <p className="text-[10px] text-muted-foreground text-center">+{orders.length - 2} طلبات إضافية</p>}
            </div>
            <Separator className="bg-border/20" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground">الإجمالي كله</p>
                <p className={`text-lg font-bold ${isReady ? 'text-green-400' : 'text-[#D4AF37]'}`}>{total.toFixed(2)} ج.م</p>
              </div>
              <Button size="sm" variant={isReady ? 'default' : 'outline'} className="gap-2 h-9 px-4"
                onClick={(e) => { e.stopPropagation(); setReceiptTableOrders(orders) }}>
                <Receipt className="h-4 w-4" />عرض الفاتورة
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  const renderOrderCard = (order: Order) => {
    const statusInfo = ORDER_STATUS_MAP[order.status]
    const typeInfo = ORDER_TYPE_MAP[order.type]
    const isReady = order.status === 'READY'

    return (
      <motion.div key={order.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} layout>
        <Card
          className={`border overflow-hidden cursor-pointer transition-all duration-200 ${isReady ? 'border-green-500/50 hover:border-green-400/70 bg-green-500/5' : 'border-border/50 hover:border-[#D4AF37]/40 bg-card'}`}
          onClick={() => setReceiptOrder(order)}
          dir="rtl"
        >
          <div className={`h-1 ${isReady ? 'bg-gradient-to-l from-green-500 to-green-400/40' : 'bg-gradient-to-l from-[#D4AF37] to-[#D4AF37]/40'}`} />
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isReady ? 'bg-green-500/10' : 'bg-[#D4AF37]/10'}`}>
                  <span className={`text-sm font-bold ${isReady ? 'text-green-400' : 'text-[#D4AF37]'}`}>#{order.orderNumber}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusInfo?.bg || ''}`}>
                      <span className={statusInfo?.color || ''}>{statusInfo?.label || order.status}</span>
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${typeInfo?.color || ''}`}>
                      {getOrderTypeIcon(order.type)}{typeInfo?.label || order.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">{relativeTimers[order.id] || getRelativeTime(order.createdAt)}</span>
                  </div>
                </div>
              </div>
              {order.type === 'DINE_IN' && order.tableNumber && (
                <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-[10px] gap-1">
                  <Utensils className="h-2.5 w-2.5" />طاولة {order.tableNumber}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{order.customerName}</span>
              {order.customerPhone && <span className="flex items-center gap-1" dir="ltr"><Phone className="h-3 w-3" />{order.customerPhone}</span>}
            </div>
            <div className="space-y-1.5">
              {order.items.slice(0, 3).map(item => (
                <div key={item.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-bold flex-shrink-0">{item.quantity}</span>
                    <span className="truncate">{item.mealTitleAr || item.mealTitle}</span>
                  </div>
                  <span className="text-muted-foreground flex-shrink-0 mr-2">{(item.price * item.quantity).toFixed(2)} ج.م</span>
                </div>
              ))}
              {order.items.length > 3 && <p className="text-[10px] text-muted-foreground text-center">+{order.items.length - 3} أصناف أخرى</p>}
            </div>
            <Separator className="bg-border/20" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground">الإجمالي</p>
                <p className={`text-lg font-bold ${isReady ? 'text-green-400' : 'text-[#D4AF37]'}`}>{order.total.toFixed(2)} ج.م</p>
              </div>
              {order.status === 'PENDING' && order.type !== 'DINE_IN' ? (
              <Button size="sm" onClick={(e) => { e.stopPropagation(); confirmOrder(order.id) }} disabled={updatingOrderId === order.id}
                className="gap-2 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold h-9 px-4">
                {updatingOrderId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                تأكيد
              </Button>
            ) : isReady ? (
              <Button size="sm" onClick={(e) => { e.stopPropagation(); markAsPaid(order.id) }} disabled={updatingOrderId === order.id}
                className="gap-2 bg-green-600 text-white hover:bg-green-500 font-bold h-9 px-4">
                {updatingOrderId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                تم الدفع
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setReceiptOrder(order) }}
                className="gap-2 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10">
                <Receipt className="h-4 w-4" />الفاتورة
              </Button>
            )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
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
            {readyOrders.length > 0 && (
              <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-1.5 animate-pulse">
                <Bell className="h-4 w-4 text-green-400" />
                <span className="text-sm font-bold text-green-400">{readyOrders.length} جاهز للدفع</span>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={() => fetchOrders()} className="gap-2 text-muted-foreground hover:text-[#D4AF37]">
              <RefreshCw className="h-4 w-4" />تحديث
            </Button>
            <Button variant="ghost" onClick={onLogout} className="gap-2 text-muted-foreground hover:text-red-400">
              <LogOut className="h-4 w-4" />خروج
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: <ShoppingBag className="h-6 w-6 text-blue-400" />, bg: 'bg-blue-500/10', value: activeOrders.length, label: 'طلبات نشطة', color: 'text-blue-400' },
            { icon: <CheckCircle className="h-6 w-6 text-green-400" />, bg: 'bg-green-500/10', value: readyOrders.length, label: 'جاهز للدفع', color: 'text-green-400' },
            { icon: <TrendingDown className="h-6 w-6 text-red-400" />, bg: 'bg-red-500/10', value: `${totalExpenses.toFixed(0)} ج.م`, label: 'مصروفات', color: 'text-red-400' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-border/50 bg-card">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.bg}`}>{s.icon}</div>
                  <div>
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Net Revenue Card */}
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
                  {groupedTableOrders.map(([table, orders]) => renderTableCard(table, orders))}
                  {remainingOrders.map(order => renderOrderCard(order))}
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
                  {deliveredOrders.map(order => renderOrderCard(order))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses">
            <div className="space-y-4">
              {/* Add Expense Form */}
              <Card className="border-border/50 bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="h-4 w-4 text-[#D4AF37]" />إضافة مصروف جديد
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>اسم المصروف</Label>
                      <Input placeholder="مثال: خامات، رواتب..." value={expenseTitle} onChange={e => setExpenseTitle(e.target.value)}
                        className="bg-muted/50 border-border/50 text-right" />
                    </div>
                    <div className="space-y-2">
                      <Label>المبلغ (ج.م)</Label>
                      <Input type="number" placeholder="0.00" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)}
                        className="bg-muted/50 border-border/50 text-right" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>الفئة</Label>
                    <Select value={expenseCategory} onValueChange={setExpenseCategory} dir="rtl">
                      <SelectTrigger className="bg-muted/50 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={addExpense} disabled={savingExpense || !expenseTitle || !expenseAmount}
                    className="w-full gap-2 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold">
                    {savingExpense ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    إضافة المصروف
                  </Button>
                </CardContent>
              </Card>

              {/* Expenses Summary */}
              <Card className="border-red-500/20 bg-red-500/5">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي المصروفات</p>
                    <p className="text-2xl font-bold text-red-400">{totalExpenses.toFixed(2)} ج.م</p>
                  </div>
                  <TrendingDown className="h-10 w-10 text-red-400/30" />
                </CardContent>
              </Card>

              {/* Expenses List */}
              {expenses.length === 0 ? (
                <div className="py-12 text-center">
                  <TrendingDown className="mx-auto mb-4 h-12 w-12 text-muted-foreground/20" />
                  <p className="text-muted-foreground">لا توجد مصروفات مسجلة</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {expenses.map(expense => (
                    <motion.div key={expense.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Card className="border-border/40 bg-card">
                        <CardContent className="p-3 flex items-center justify-between" dir="rtl">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
                              <TrendingDown className="h-4 w-4 text-red-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{expense.title}</p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] border-border/50">{expense.category}</Badge>
                                <span className="text-[10px] text-muted-foreground">{getRelativeTime(expense.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-base font-bold text-red-400">{expense.amount.toFixed(2)} ج.م</span>
                            <Button variant="ghost" size="sm" onClick={() => deleteExpense(expense.id)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Receipt Dialog */}
      <Dialog open={!!receiptOrder || !!receiptTableOrders} onOpenChange={(open) => {
        if (!open) {
          setReceiptOrder(null)
          setReceiptTableOrders(null)
        }
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0 bg-background border-[#D4AF37]/20">
          <DialogHeader className="sr-only">
            <DialogTitle>فاتورة الطلب</DialogTitle>
            <DialogDescription>تفاصيل فاتورة الطلب</DialogDescription>
          </DialogHeader>
          {receiptOrder && (
            <>
              {renderReceipt(receiptOrder)}
              <DialogFooter className="p-4 pt-0 gap-2" dir="rtl">
                {receiptOrder.status === 'READY' && (
                  <Button onClick={() => markAsPaid(receiptOrder.id)} disabled={updatingOrderId === receiptOrder.id}
                    className="flex-1 gap-2 bg-green-600 text-white hover:bg-green-500 font-bold">
                    {updatingOrderId === receiptOrder.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                    تم الدفع
                  </Button>
                )}
                <Button variant="outline" onClick={() => window.print()}
                  className="flex-1 gap-2 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10">
                  <Receipt className="h-4 w-4" />طباعة
                </Button>
                <Button variant="ghost" onClick={() => setReceiptOrder(null)} className="gap-2 text-muted-foreground hover:text-red-400">
                  <X className="h-4 w-4" />إغلاق
                </Button>
              </DialogFooter>
            </>
          )}
          {receiptTableOrders && (
            <>
              {renderTableReceipt(receiptTableOrders)}
              <DialogFooter className="p-4 pt-0 gap-2" dir="rtl">
                {getGroupedTableStatus(receiptTableOrders) === 'READY' && (
                  <Button onClick={() => markTableAsPaid(receiptTableOrders)} disabled={payingTable === receiptTableOrders[0]?.tableNumber}
                    className="flex-1 gap-2 bg-green-600 text-white hover:bg-green-500 font-bold">
                    {payingTable === receiptTableOrders[0]?.tableNumber ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                    تم الدفع
                  </Button>
                )}
                <Button variant="outline" onClick={() => window.print()}
                  className="flex-1 gap-2 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10">
                  <Receipt className="h-4 w-4" />طباعة
                </Button>
                <Button variant="ghost" onClick={() => setReceiptTableOrders(null)} className="gap-2 text-muted-foreground hover:text-red-400">
                  <X className="h-4 w-4" />إغلاق
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
