'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2, PlayCircle, StopCircle, TrendingDown, TrendingUp,
  ChevronDown, ChevronUp, Printer, Wallet, Clock, Receipt,
  Percent, CircleDollarSign, FileSpreadsheet, RefreshCw,
  PiggyBank, CheckCircle, XCircle, ListOrdered,
  Pencil, Trash2, Plus, Banknote, CreditCard, Smartphone, Star
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import type { Order, ShiftWithDetails, ExpenseItem } from '@/lib/saraya/types'
import { transformOrder } from '@/lib/saraya/helpers'
import { printSingleOrder } from '@/components/Top/cashier/components/receipt-dialog'
import { OrderCard } from '@/components/Top/admin/orders-tab/order-card'
import { CancelOrderDialog } from '@/components/Top/admin/orders-tab/cancel-order-dialog'
import { ReceiptDialog } from '@/components/Top/cashier/components/receipt-dialog'

interface ShiftManagementProps {
  adminUsername: string
}

function fmt(n: number) {
  return n.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function StatCard({ icon: Icon, label, value, color, bg, sub }: {
  icon: any; label: string; value: string; color: string; bg: string; sub?: string
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl ${bg} border border-border/40 p-3 sm:p-4 transition-all hover:scale-[1.02]`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] sm:text-xs text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${color}`} />
      </div>
      <p className={`text-lg sm:text-2xl font-bold ${color} leading-tight`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
    </motion.div>
  )
}

export function ShiftManagement({ adminUsername }: ShiftManagementProps) {
  const { toast } = useToast()
  const [currentShift, setCurrentShift] = useState<ShiftWithDetails | null>(null)
  const [shiftExpenses, setShiftExpenses] = useState<ExpenseItem[]>([])
  const [showExpensesList, setShowExpensesList] = useState(true)
  const [shiftOrders, setShiftOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [closingShift, setClosingShift] = useState(false)
  const [shiftNotes, setShiftNotes] = useState('')
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)
  const [discountedOrders, setDiscountedOrders] = useState<any[]>([])
  const [showDiscounts, setShowDiscounts] = useState(false)
  const [showPoints, setShowPoints] = useState(false)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [newExpenseTitle, setNewExpenseTitle] = useState('')
  const [newExpenseAmount, setNewExpenseAmount] = useState('')
  const [newExpenseCategory, setNewExpenseCategory] = useState('')
  const [expenseCategories, setExpenseCategories] = useState<{ id: string; name: string }[]>([])
  const [addingExpense, setAddingExpense] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [elapsed, setElapsed] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null)
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null)

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const shiftRes = await fetch('/api/shifts?current=true')
      if (shiftRes.ok) {
        const shift = await shiftRes.json()
        setCurrentShift(shift)
        if (shift) {
          const [expRes, ordRes] = await Promise.all([
            fetch(`/api/expenses?shiftId=${shift.id}`),
            fetch(`/api/orders?shiftId=${shift.id}`),
          ])
          if (expRes.ok) setShiftExpenses(await expRes.json())
          if (ordRes.ok) {
            const rawOrders = await ordRes.json()
            setShiftOrders(rawOrders.map(transformOrder))
          }
          try {
            const ordRes2 = await fetch(`/api/orders?shiftId=${shift.id}&discountAmount_gt=0`)
            if (ordRes2.ok) {
              const rawOrders = await ordRes2.json()
              const transformed = (Array.isArray(rawOrders.data) ? rawOrders.data : Array.isArray(rawOrders) ? rawOrders : []).map(transformOrder)
              setDiscountedOrders(transformed.filter((o: any) => o.discountAmount > 0))
            } else setDiscountedOrders([])
          } catch { setDiscountedOrders([]) }
        } else {
          setCurrentShift(null); setShiftExpenses([])
          setShiftOrders([]); setDiscountedOrders([])
        }
      } else {
        setCurrentShift(null); setShiftExpenses([])
        setShiftOrders([]); setDiscountedOrders([])
      }
    } catch (err) {
      console.error('Failed to fetch shift data:', err)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Fetch expense categories
  useEffect(() => {
    fetch('/api/expenses/categories')
      .then(r => r.ok ? r.json() : [])
      .then((cats: { id: string; name: string }[]) => {
        if (cats.length > 0) {
          setExpenseCategories(cats)
          setNewExpenseCategory(prev => prev || cats[0].name)
        }
      })
      .catch(() => {})
  }, [])

  // Auto-refresh every 10s
  useEffect(() => {
    if (!currentShift) return
    const interval = setInterval(() => fetchData(false), 10000)
    return () => clearInterval(interval)
  }, [currentShift, fetchData])

  // Live elapsed timer
  useEffect(() => {
    if (!currentShift) { setElapsed(''); return }
    const update = () => {
      const diff = Date.now() - new Date(currentShift.startedAt).getTime()
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setElapsed(h > 0 ? `${h}h ${m}m` : `${m}m`)
    }
    update()
    timerRef.current = setInterval(update, 30000)
    return () => clearInterval(timerRef.current)
  }, [currentShift])

  const startNewShift = async () => {
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startedBy: adminUsername }),
      })
      if (res.ok) {
        toast({ title: '✅ تم بدء شيفت جديد' })
        fetchData()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: (data as { error?: string }).error || 'فشل بدء الشيفت', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الاتصال بالخادم', variant: 'destructive' })
    }
  }

  const closeShift = async () => {
    if (!currentShift) return
    setClosingShift(true)
    try {
      const res = await fetch(`/api/shifts/${currentShift.id}/export-and-clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endedBy: adminUsername, notes: shiftNotes, includeNonDelivered: true }),
      })
      if (res.ok) {
        setCloseError(null)
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `shift-${String(currentShift.id).slice(0, 8)}.xlsx`
        link.click()
        URL.revokeObjectURL(url)
        toast({ title: '✅ تم إغلاق الشيفت', description: 'تم تصدير التقرير بنجاح' })
        setShowCloseConfirm(false)
        fetchData()
      } else {
        const err = await res.json().catch(() => ({}))
        const msg = (err as { error?: string }).error || 'فشل تصدير الشيفت'
        setCloseError(msg)
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الاتصال بالخادم', variant: 'destructive' })
    } finally { setClosingShift(false) }
  }

  const addExpense = async () => {
    if (!currentShift || !newExpenseTitle.trim() || !newExpenseAmount) return
    setAddingExpense(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newExpenseTitle.trim(),
          amount: parseFloat(newExpenseAmount),
          category: newExpenseCategory.trim() || 'عام',
          shiftId: currentShift.id,
        }),
      })
      if (res.ok) {
        toast({ title: '✅ تم إضافة المصروف' })
        setShowAddExpense(false)
        setNewExpenseTitle('')
        setNewExpenseAmount('')
        setNewExpenseCategory('')
        fetchData()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: (data as { error?: string }).error || 'فشل الإضافة', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الاتصال', variant: 'destructive' })
    } finally { setAddingExpense(false) }
  }

  const editExpense = async () => {
    if (!editingExpense || !editTitle.trim() || !editAmount) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/expenses/${editingExpense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim(), amount: parseFloat(editAmount) }),
      })
      if (res.ok) {
        toast({ title: '✅ تم تعديل المصروف' })
        setEditingExpense(null)
        fetchData()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: (data as { error?: string }).error || 'فشل التعديل', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الاتصال', variant: 'destructive' })
    } finally { setSavingEdit(false) }
  }

  const deleteExpense = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) return
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: '🗑️ تم حذف المصروف' })
        fetchData()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: (data as { error?: string }).error || 'فشل الحذف', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الاتصال', variant: 'destructive' })
    }
  }

  const deliveredOrders = shiftOrders.filter(o => o.status === 'DELIVERED')
  const totalRevenue = deliveredOrders.reduce((s, o) => s + o.total, 0)
  const cashRevenue = deliveredOrders.reduce((sum, o) => {
    const payments = o.payments
    if (!payments || payments.length === 0) return sum + o.total
    return sum + payments.filter(p => p.method === 'CASH').reduce((s, p) => s + p.amount, 0)
  }, 0)
  const visaRevenue = deliveredOrders.reduce((sum, o) => {
    const payments = o.payments
    if (!payments) return sum
    return sum + payments.filter(p => p.method === 'VISA').reduce((s, p) => s + p.amount, 0)
  }, 0)
  const vodafoneCashRevenue = deliveredOrders.reduce((sum, o) => {
    const payments = o.payments
    if (!payments) return sum
    return sum + payments.filter(p => p.method === 'VODAFONE_CASH').reduce((s, p) => s + p.amount, 0)
  }, 0)
  const totalShiftExpenses = shiftExpenses.reduce((s, e) => s + e.amount, 0)
  const totalDiscounts = discountedOrders.reduce((s, o: any) => s + o.discountAmount, 0)
  const totalPoints = discountedOrders.filter((o: any) => o.discountType === 'POINTS').reduce((s: number, o: any) => s + o.discountAmount, 0)
  const netShift = totalRevenue - totalShiftExpenses

  const orderCount = deliveredOrders.length

  const printDiscountedOrder = async (orderNumber: number) => {
    if (!currentShift) return
    try {
      const res = await fetch(`/api/orders?shiftId=${currentShift.id}&orderNumber=${orderNumber}`)
      if (res.ok) {
        const orders = await res.json()
        if (orders.length > 0) printSingleOrder(transformOrder(orders[0]))
      }
    } catch (error) { console.error('print order error:', error) }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string, cancelReason?: string) => {
    setUpdatingOrderId(orderId)
    try {
      const payload: Record<string, unknown> = { status: newStatus }
      if (newStatus === 'CANCELLED') {
        payload.cancelledBy = adminUsername
        payload.cancelReason = cancelReason || ''
      }
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast({ title: 'تم تحديث حالة الطلب' })
        fetchData(false)
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

  const pointsOrders = discountedOrders.filter((o: any) => o.discountType === 'POINTS')
  const manualDiscounts = discountedOrders.filter((o: any) => o.discountType !== 'POINTS')
  const visibleOrders = shiftOrders.filter(o => o.status !== 'CANCELLED')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-[#D4AF37]" />
          <p className="text-sm text-muted-foreground">جاري تحميل بيانات الشيفت...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5" dir="rtl">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-[#D4AF37]" />
            إدارة الشيفت
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {currentShift ? `الشيفت الحالي مفتوح — ${elapsed}` : 'لا يوجد شيفت مفتوح'}
          </p>
        </div>
        {currentShift && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Badge className="bg-green-500/15 text-green-400 border-green-500/20 text-[11px] px-2 py-1 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              مفتوح
            </Badge>
            <Button onClick={() => setShowCloseConfirm(true)} size="sm"
              className="gap-1.5 bg-gradient-to-l from-red-600 to-red-700 text-white hover:from-red-500 hover:to-red-600 font-bold text-xs h-8">
              <StopCircle className="h-3.5 w-3.5" />
              إنهاء الشيفت
            </Button>
          </div>
        )}
      </div>

      {currentShift ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* ── Stats Grid ──────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            <StatCard
              icon={CircleDollarSign} label="إجمالي الإيرادات"
              value={`${fmt(totalRevenue)} ج.م`}
              color="text-emerald-400" bg="bg-gradient-to-br from-emerald-500/10 to-transparent"
              sub={`${orderCount} طلب`} />
            <StatCard
              icon={Banknote} label="مدفوع كاش"
              value={`${fmt(cashRevenue)} ج.م`}
              color="text-emerald-400" bg="bg-gradient-to-br from-emerald-500/10 to-transparent" />
            <StatCard
              icon={CreditCard} label="مدفوع فيزا"
              value={`${fmt(visaRevenue)} ج.م`}
              color="text-blue-400" bg="bg-gradient-to-br from-blue-500/10 to-transparent" />
            <StatCard
              icon={Smartphone} label="فودافون كاش"
              value={`${fmt(vodafoneCashRevenue)} ج.م`}
              color="text-purple-400" bg="bg-gradient-to-br from-purple-500/10 to-transparent" />
            <StatCard
              icon={TrendingDown} label="مصروفات الوردية"
              value={`${fmt(totalShiftExpenses)} ج.م`}
              color="text-red-400" bg="bg-gradient-to-br from-red-500/10 to-transparent"
              sub={`${shiftExpenses.length} بند`} />
            <StatCard
              icon={PiggyBank} label="صافي الوردية"
              value={`${fmt(netShift)} ج.م`}
              color={netShift >= 0 ? 'text-[#D4AF37]' : 'text-red-400'}
              bg={`bg-gradient-to-br ${netShift >= 0 ? 'from-[#D4AF37]/10' : 'from-red-500/10'} to-transparent`}
              sub={`${orderCount} طلب`} />
          </div>

          {/* Progress bar: revenue vs expenses */}
          {totalRevenue > 0 && (
            <div className="space-y-3">
              {/* Revenue vs Expenses bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>المصروفات {((totalShiftExpenses / totalRevenue) * 100).toFixed(0)}%</span>
                  <span>الإيرادات 100%</span>
                </div>
                <div className="h-2 rounded-full bg-muted/50 overflow-hidden flex">
                  <div className="h-full bg-emerald-400/60 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, ((totalRevenue - totalShiftExpenses) / totalRevenue) * 100)}%` }} />
                  <div className="h-full bg-red-400/60 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (totalShiftExpenses / totalRevenue) * 100)}%` }} />
                </div>
              </div>
              {/* Payment method breakdown bar */}
              {totalRevenue > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>كاش {cashRevenue > 0 ? ((cashRevenue / totalRevenue) * 100).toFixed(0) : 0}%</span>
                    <span>فيزا {visaRevenue > 0 ? ((visaRevenue / totalRevenue) * 100).toFixed(0) : 0}%</span>
                    <span>فودافون كاش {vodafoneCashRevenue > 0 ? ((vodafoneCashRevenue / totalRevenue) * 100).toFixed(0) : 0}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden flex">
                    <div className="h-full bg-emerald-400/60 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (cashRevenue / totalRevenue) * 100)}%` }} />
                    <div className="h-full bg-blue-400/60 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (visaRevenue / totalRevenue) * 100)}%` }} />
                    <div className="h-full bg-purple-400/60 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (vodafoneCashRevenue / totalRevenue) * 100)}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Shift Info Bar ──────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground bg-muted/20 rounded-xl p-3 border border-border/30">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />بداية: {new Date(currentShift.startedAt).toLocaleString('ar-EG')}
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="flex items-center gap-1.5">
              <PlayCircle className="h-3.5 w-3.5 text-green-400" />بواسطة {currentShift.startedBy}
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5 text-blue-400" />{orderCount} طلب
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="flex items-center gap-1.5">
              <ListOrdered className="h-3.5 w-3.5 text-orange-400" />{discountedOrders.length} خصم
            </span>
          </div>

          {/* ── Order Status Summary Chips ─────────────────────────── */}
          {shiftOrders.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'معلق', count: shiftOrders.filter(o => o.status === 'PENDING').length, color: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10' },
                { label: 'مؤكد', count: shiftOrders.filter(o => o.status === 'CONFIRMED').length, color: 'text-blue-400 border-blue-500/20 bg-blue-500/10' },
                { label: 'تحضير', count: shiftOrders.filter(o => o.status === 'PREPARING').length, color: 'text-orange-400 border-orange-500/20 bg-orange-500/10' },
                { label: 'جاهز', count: shiftOrders.filter(o => o.status === 'READY' || o.status === 'READY_TO_PAY').length, color: 'text-green-400 border-green-500/20 bg-green-500/10' },
                { label: 'مسلم', count: shiftOrders.filter(o => o.status === 'DELIVERED').length, color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' },
                { label: 'ملغي', count: shiftOrders.filter(o => o.status === 'CANCELLED').length, color: 'text-red-400 border-red-500/20 bg-red-500/10' },
              ].filter(c => c.count > 0).map(c => (
                <span key={c.label} className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium ${c.color}`}>
                  {c.label}
                  <span className="font-bold">{c.count}</span>
                </span>
              ))}
            </div>
          )}

          {/* ── Shift Expenses List ──────────────────────────────── */}
          <Card className="border-red-400/20 overflow-hidden">
            <button onClick={() => setShowExpensesList(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-l from-red-500/5 to-transparent border-b border-red-400/10 transition-colors hover:from-red-500/10">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-400" />
                <span className="font-bold text-sm text-red-400">مصروفات الوردية</span>
                <Badge variant="outline" className="text-[10px] border-red-400/20 text-red-400">{shiftExpenses.length}</Badge>
              </div>
              <div className="flex items-center gap-2">
                {showExpensesList && (
                  <div role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setShowAddExpense(true) }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setShowAddExpense(true) } }}
                    className="h-7 w-7 rounded-lg border border-green-400/20 text-green-400 hover:bg-green-500/10 flex items-center justify-center transition-colors cursor-pointer">
                    <Plus className="h-3.5 w-3.5" />
                  </div>
                )}
                <span className="text-sm font-bold text-red-400">{fmt(totalShiftExpenses)} ج.م</span>
                {showExpensesList ? <ChevronUp className="h-4 w-4 text-red-400/60" /> : <ChevronDown className="h-4 w-4 text-red-400/60" />}
              </div>
            </button>
            <AnimatePresence>
              {showExpensesList && (
                shiftExpenses.length > 0 ? (
                  <motion.div key="list" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="divide-y divide-red-400/5 max-h-56 overflow-y-auto">
                    {shiftExpenses.map((exp, i) => (
                      <motion.div key={exp.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center justify-between p-2.5 sm:p-3 hover:bg-red-400/[0.02] transition-colors gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="flex flex-col min-w-0 gap-0.5 flex-1">
                            <span className="text-xs sm:text-sm font-medium text-foreground truncate">{exp.title}</span>
                            <span className="text-[10px] sm:text-[11px] text-muted-foreground">
                              {exp.addedBy} · {new Date(exp.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <Badge variant="outline" className="shrink-0 text-[10px] sm:text-xs border-red-400/20 text-red-400 font-bold px-2 py-0.5">
                            {fmt(exp.amount)} ج.م
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => { setEditingExpense(exp); setEditTitle(exp.title); setEditAmount(String(exp.amount)) }}
                            className="h-7 w-7 rounded-lg border border-blue-400/20 text-blue-400 hover:bg-blue-500/10 flex items-center justify-center transition-colors">
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button onClick={() => deleteExpense(exp.id)}
                            className="h-7 w-7 rounded-lg border border-red-400/20 text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div key="empty" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="p-6 text-center">
                    <TrendingDown className="mx-auto h-8 w-8 text-muted-foreground/20 mb-2" />
                    <p className="text-xs text-muted-foreground">لا توجد مصروفات في هذه الوردية</p>
                  </motion.div>
                )
              )}
            </AnimatePresence>
          </Card>
          {/* ── Discounted Orders ────────────────────────────────── */}
          {manualDiscounts.length > 0 && (
            <Card className="border-orange-400/20 overflow-hidden">
              <button
                onClick={() => setShowDiscounts(!showDiscounts)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-l from-orange-500/5 to-transparent border-b border-orange-400/10 hover:bg-orange-500/10 transition-colors">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-orange-400" />
                  <span className="font-bold text-sm text-orange-400">الخصومات</span>
                  <Badge variant="outline" className="text-[10px] border-orange-400/20 text-orange-400">{manualDiscounts.length}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-orange-400">{fmt(totalDiscounts)} ج.م</span>
                  {showDiscounts ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>
              <AnimatePresence>
                {showDiscounts && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                    className="overflow-hidden divide-y divide-orange-400/5">
                    {manualDiscounts.map((d: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2.5 sm:p-3 hover:bg-orange-400/[0.02] transition-colors">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <span className="font-bold text-orange-400 shrink-0 text-xs sm:text-sm">#{d.orderNumber}</span>
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground truncate">{d.customerName || 'زبون'}</p>
                            <p className="text-[10px] text-orange-400/60 truncate">{d.discountReason || '—'}</p>
                          </div>
                          <Badge className="text-[10px] bg-orange-500/10 text-orange-400 border-orange-500/20">
                            يدوي
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-orange-400 font-bold text-xs sm:text-sm">{d.discountAmount.toFixed(0)} ج.م</span>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => printDiscountedOrder(d.orderNumber)}>
                            <Printer className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {/* ── Points sub-section inside Discounts card ── */}
                    
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          )}
           {pointsOrders.length > 0 && (
            <>
              
                <div className="border-purple-400/20 bg-gradient-to-l from-purple-500/5 to-transparent rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowPoints(!showPoints)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-l from-purple-500/5 to-transparent hover:bg-purple-500/10 transition-colors">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-purple-400" />
                      <span className="font-bold text-sm text-purple-400">مدفوع بنقاط الولاء</span>
                      <Badge variant="outline" className="text-[10px] border-purple-400/20 text-purple-400">{pointsOrders.length}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-purple-400">{fmt(totalPoints)} ج.م</span>
                      {showPoints ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </button>
                  <AnimatePresence>
                    {showPoints && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                        className="overflow-hidden divide-y divide-purple-400/5">
                        {pointsOrders.map((d: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2.5 sm:p-3 hover:bg-purple-400/[0.02] transition-colors">
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                              <span className="font-bold text-purple-400 shrink-0 text-xs sm:text-sm">#{d.orderNumber}</span>
                              <div className="min-w-0">
                                <p className="text-xs text-muted-foreground truncate">{d.customerName || 'زبون'}</p>
                                <p className="text-[10px] text-purple-400/60 truncate">{d.discountReason || 'نقاط'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-purple-400 font-bold text-xs sm:text-sm">{d.discountAmount.toFixed(0)} ج.م</span>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => printDiscountedOrder(d.orderNumber)}>
                                <Printer className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
         {/* ── Shift Orders ─────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-400" />
              <h2 className="text-lg font-bold">طلبات الوردية</h2>
              <Badge variant="outline" className="text-[10px] border-blue-400/20 text-blue-400">{shiftOrders.length}</Badge>
            </div>

            {visibleOrders.length === 0 ? (
              <div className="py-12 text-center">
                <Receipt className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">لا توجد طلبات في هذه الوردية</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence>
                  {visibleOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      relativeTime=""
                      isUpdating={updatingOrderId === order.id}
                      onUpdateStatus={updateOrderStatus}
                      onCancel={setCancelTarget}
                      onPrint={(o) => printSingleOrder(o)}
                      onViewReceipt={setReceiptOrder}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

        </motion.div>
      ) : (
        /* ── Empty State ───────────────────────────────────────── */
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-border/40 bg-gradient-to-b from-muted/20 to-transparent">
            <CardContent className="p-8 sm:p-12">
              <div className="text-center space-y-5 max-w-sm mx-auto">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center mx-auto">
                  <Wallet className="h-8 w-8 sm:h-10 sm:w-10 text-[#D4AF37]/40" />
                </div>
                <div>
                  <p className="text-base sm:text-lg font-bold text-foreground mb-1">لا يوجد شيفت مفتوح</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    ابدأ شيفت جديد لبدء تسجيل الطلبات والمصروفات والإيرادات
                  </p>
                </div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button onClick={startNewShift}
                    className="gap-2 bg-gradient-to-l from-[#D4AF37] to-[#C9A032] text-black hover:from-[#D4AF37]/90 hover:to-[#C9A032]/90 font-bold shadow-lg shadow-[#D4AF37]/20 px-6 py-5 sm:py-4 text-sm sm:text-base">
                    <PlayCircle className="h-5 w-5" />
                    بدء شيفت جديد
                  </Button>
                </motion.div>
                <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground/40 pt-2">
                  <span className="flex items-center gap-1"><Receipt className="h-3 w-3" />تسجيل الطلبات</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><TrendingDown className="h-3 w-3" />متابعة المصروفات</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><FileSpreadsheet className="h-3 w-3" />تصدير التقرير</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Close Shift Dialog ─────────────────────────────────── */}
      <Dialog open={showCloseConfirm} onOpenChange={(open) => { setShowCloseConfirm(open); if (!open) setCloseError(null) }}>
        <DialogContent className="bg-card border-border/50 sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <StopCircle className="h-5 w-5 text-red-400" />
              إنهاء الشيفت
            </DialogTitle>
            <DialogDescription>
              سيتم إغلاق الوردية وتصدير تقرير بالإيرادات والمصروفات
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Summary Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-gradient-to-b from-emerald-500/10 to-transparent border border-emerald-500/20 p-3 text-center">
                <p className="text-lg sm:text-xl font-bold text-emerald-400">{fmt(totalRevenue)}</p>
                <p className="text-[10px] text-muted-foreground">الإيرادات</p>
              </div>
              <div className="rounded-xl bg-gradient-to-b from-red-500/10 to-transparent border border-red-500/20 p-3 text-center">
                <p className="text-lg sm:text-xl font-bold text-red-400">{fmt(totalShiftExpenses)}</p>
                <p className="text-[10px] text-muted-foreground">المصروفات</p>
              </div>
              <div className="rounded-xl bg-gradient-to-b from-[#D4AF37]/10 to-transparent border border-[#D4AF37]/20 p-3 text-center">
                <p className={`text-lg sm:text-xl font-bold ${netShift >= 0 ? 'text-[#D4AF37]' : 'text-red-400'}`}>
                  {fmt(netShift)}
                </p>
                <p className="text-[10px] text-muted-foreground">الصافي</p>
              </div>
            </div>

            {/* Discounts info */}
            {totalDiscounts > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-orange-500/5 border border-orange-500/20 px-3 py-2 text-xs">
                <span className="text-orange-400">الخصومات الممنوحة</span>
                <span className="font-bold text-orange-400">{fmt(totalDiscounts)} ج.م</span>
              </div>
            )}

            {/* Totals row */}
            <div className="flex justify-between text-[10px] text-muted-foreground border-t border-border/20 pt-2">
              <span>{orderCount} طلب مكتمل</span>
              <span>{shiftExpenses.length} بند مصروفات</span>
              <span>{discountedOrders.length} خصم</span>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">ملاحظات (اختياري)</Label>
              <textarea
                className="w-full rounded-xl border border-border/40 bg-muted/30 p-3 text-sm resize-none text-right focus:border-[#D4AF37]/40 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all"
                rows={3}
                placeholder="أي ملاحظات عن الشيفت..."
                value={shiftNotes}
                onChange={e => setShiftNotes(e.target.value)}
              />
            </div>

            {closeError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 text-center flex items-center justify-center gap-2">
                <XCircle className="h-4 w-4 shrink-0" />
                {closeError}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowCloseConfirm(false); setCloseError(null) }}
              className="border-border/40 flex-1">إلغاء</Button>
            <Button onClick={closeShift} disabled={closingShift}
              className="gap-2 bg-gradient-to-l from-red-600 to-red-700 text-white hover:from-red-500 hover:to-red-600 font-bold flex-1">
              {closingShift ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> جاري التصدير...</>
              ) : (
                <><FileSpreadsheet className="h-4 w-4" /> إنهاء وتصدير</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Expense Dialog ────────────────────────────────── */}
      <Dialog open={showAddExpense} onOpenChange={(open) => { if (!open) { setShowAddExpense(false); setNewExpenseTitle(''); setNewExpenseAmount(''); setNewExpenseCategory('') } }}>
        <DialogContent className="bg-card border-border/50 sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-400" />
              إضافة مصروف
            </DialogTitle>
            <DialogDescription>إضافة مصروف جديد للوردية</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">الوصف</Label>
              <input value={newExpenseTitle} onChange={e => setNewExpenseTitle(e.target.value)}
                className="w-full rounded-xl border border-border/40 bg-muted/30 px-3 py-2.5 text-sm focus:border-green-400/40 focus:ring-1 focus:ring-green-400/20 transition-all"
                placeholder="وصف المصروف..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">الفئة</Label>
              <select value={newExpenseCategory} onChange={e => setNewExpenseCategory(e.target.value)}
                className="w-full rounded-xl border border-border/40 bg-muted/30 px-3 py-2.5 text-sm focus:border-green-400/40 focus:ring-1 focus:ring-green-400/20 transition-all">
                {expenseCategories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">المبلغ</Label>
              <input type="number" value={newExpenseAmount} onChange={e => setNewExpenseAmount(e.target.value)}
                className="w-full rounded-xl border border-border/40 bg-muted/30 px-3 py-2.5 text-sm focus:border-green-400/40 focus:ring-1 focus:ring-green-400/20 transition-all"
                placeholder="0.00" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowAddExpense(false); setNewExpenseTitle(''); setNewExpenseAmount(''); setNewExpenseCategory('') }}
              className="border-border/40 flex-1">إلغاء</Button>
            <Button onClick={addExpense} disabled={addingExpense || !newExpenseTitle.trim() || !newExpenseAmount}
              className="gap-2 bg-green-600 text-white hover:bg-green-500 font-bold flex-1">
              {addingExpense ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Expense Dialog ─────────────────────────────── */}
      <Dialog open={!!editingExpense} onOpenChange={(open) => { if (!open) setEditingExpense(null) }}>
        <DialogContent className="bg-card border-border/50 sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-400" />
              تعديل المصروف
            </DialogTitle>
            <DialogDescription>تعديل وصف أو قيمة المصروف</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">الوصف</Label>
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                className="w-full rounded-xl border border-border/40 bg-muted/30 px-3 py-2.5 text-sm focus:border-blue-400/40 focus:ring-1 focus:ring-blue-400/20 transition-all"
                placeholder="وصف المصروف..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">المبلغ</Label>
              <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                className="w-full rounded-xl border border-border/40 bg-muted/30 px-3 py-2.5 text-sm focus:border-blue-400/40 focus:ring-1 focus:ring-blue-400/20 transition-all"
                placeholder="0.00" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingExpense(null)}
              className="border-border/40 flex-1">إلغاء</Button>
            <Button onClick={editExpense} disabled={savingEdit || !editTitle.trim() || !editAmount}
              className="gap-2 bg-blue-600 text-white hover:bg-blue-500 font-bold flex-1">
              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CancelOrderDialog
        order={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={(orderId, reason) => updateOrderStatus(orderId, 'CANCELLED', reason)}
      />

      <ReceiptDialog
        receiptOrder={receiptOrder}
        receiptTableOrders={null}
        updatingOrderId={updatingOrderId}
        payingTable={null}
        username={adminUsername}
        onMarkAsPaid={(orderId) => updateOrderStatus(orderId, 'DELIVERED')}
        onMarkTableAsPaid={() => {}}
        onCloseOrder={() => setReceiptOrder(null)}
        onCloseTable={() => {}}
      />
    </div>
  )
}
