'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, TrendingDown, TrendingUp, Loader2, Pencil, X, Check, CirclePlus,
  FileSpreadsheet, ChevronDown, ChevronUp, Eye, EyeOff, DollarSign, Receipt,
  Calendar, Banknote, Wallet, HandCoins, ChartPie, Filter, Search,
  UserCircle, Building2, RefreshCw, Ban, ChevronLeft, ChevronRight
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { getRelativeTime, safeParseFloat } from '@/lib/saraya/helpers'

interface MonthlyExpense {
  id: string
  title: string
  amount: number
  category: string
  addedBy: string
  createdAt: string
  shiftId?: string | null
  employeeId?: string | null
}

interface Employee {
  id: string
  name: string
  jobTitle: string
}

interface ShiftRevenue {
  id: string
  totalRevenue: number
  totalDiscounts: number
  totalLoyaltyDiscounts: number
  startedAt: string
}

interface DiscountedOrder {
  orderNumber: number
  discountAmount: number
  discountType: string
  discountValue: number
  discountReason: string
  discountAppliedBy: string
  customerName: string
}

interface AdminMonthlyReportProps {
  username: string
}

function StatCard({ icon: Icon, label, value, color, sub, badge }: { icon: any; label: string; value: string; color: string; sub?: string; badge?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border ${color.includes('border-') ? color : 'border-border/30'} bg-gradient-to-br ${color || 'from-card to-card'} p-3 sm:p-4 transition-all hover:scale-[1.02] hover:shadow-lg`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-lg sm:text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
        <div className={`h-9 w-9 rounded-xl ${color?.replace('text-', 'bg-').replace('-400', '-500/10') || 'bg-muted/30'} flex items-center justify-center shrink-0`}>
          <Icon className={`h-4 w-4 ${color?.split(' ')[0] || 'text-muted-foreground'}`} />
        </div>
      </div>
      {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
      {badge && (
        <Badge variant="outline" className="mt-2 text-[9px] h-5 border-border/30">{badge}</Badge>
      )}
    </motion.div>
  )
}

export function AdminMonthlyReport({ username }: AdminMonthlyReportProps) {
  const { toast } = useToast()

  const today = new Date()
  const formatDate = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
  type ReportMode = 'month' | 'day' | 'range'
  const [reportMode, setReportMode] = useState<ReportMode>('month')
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth())
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())
  const [selectedDay, setSelectedDay] = useState(1)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const monthStart = () => formatDate(new Date(selectedYear, selectedMonth, 1))
  const monthEnd = () => formatDate(new Date(selectedYear, selectedMonth + 1, 0))

  const fromDate = reportMode === 'range' ? customFrom : (reportMode === 'day' ? formatDate(new Date(selectedYear, selectedMonth, selectedDay)) : monthStart())
  const toDate = reportMode === 'range' ? customTo : (reportMode === 'day' ? formatDate(new Date(selectedYear, selectedMonth, selectedDay)) : monthEnd())

  const [exporting, setExporting] = useState(false)

  const [expenses, setExpenses] = useState<MonthlyExpense[]>([])
  const [shifts, setShifts] = useState<ShiftRevenue[]>([])
  const [discounts, setDiscounts] = useState<DiscountedOrder[]>([])
  const [revenueTotal, setRevenueTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const [showDiscounts, setShowDiscounts] = useState(false)
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  const [expenseTitle, setExpenseTitle] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('')
  const [savingExpense, setSavingExpense] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [availableCategories, setAvailableCategories] = useState<{ id: string; name: string; isActive: boolean }[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [savingCategory, setSavingCategory] = useState(false)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [renamingCategory, setRenamingCategory] = useState(false)

  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [editEmployeeId, setEditEmployeeId] = useState('')

  const [handover, setHandover] = useState<{ id: string; netRevenue: number; handedOverBy: string; createdAt: string } | null>(null)
  const [handingOver, setHandingOver] = useState(false)

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/expenses/categories')
      if (res.ok) {
        const cats: { id: string; name: string; isActive: boolean }[] = await res.json()
        setAvailableCategories(cats)
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    }
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  useEffect(() => {
    fetch('/api/employees')
      .then(r => r.ok ? r.json() : [])
      .then((emps: Employee[]) => setEmployees(emps))
      .catch((err) => console.error('Failed to fetch employees:', err))
  }, [])

  const fetchData = useCallback(async () => {
    if (reportMode === 'range') {
      if (!customFrom || !customTo || customFrom.length < 10 || customTo.length < 10) { setLoading(false); return }
    }
    setLoading(true)
    try {
      const from = new Date((fromDate || monthStart()) + 'T00:00:00')
      const to = new Date((toDate || monthEnd()) + 'T23:59:59')
      if (isNaN(from.getTime()) || isNaN(to.getTime())) { setLoading(false); return }

      const [expRes, shiftsRes, discRes] = await Promise.all([
        fetch('/api/expenses?adminReport=true'),
        fetch(`/api/shifts?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`),
        fetch(`/api/reports/discounts?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`),
      ])

      let allExpenses: MonthlyExpense[] = []
      let allShifts: ShiftRevenue[] = []
      let rawShifts: any[] = []

      if (shiftsRes.ok) {
        rawShifts = await shiftsRes.json()
        allShifts = rawShifts
          .map((s: any) => ({ id: s.id, totalRevenue: s.totalRevenue, totalDiscounts: s.totalDiscounts || 0, totalLoyaltyDiscounts: s.totalLoyaltyDiscounts || 0, startedAt: s.startedAt }))
      }

      if (expRes.ok) {
        const raw: MonthlyExpense[] = await expRes.json()
        allExpenses = raw.filter(e => {
          if (e.shiftId) {
            const shift = rawShifts.find((s: any) => s.id === e.shiftId)
            if (shift) {
              const d = new Date(shift.startedAt)
              return d >= from && d <= to
            }
          }
          const d = new Date(e.createdAt)
          return d >= from && d <= to
        })
      }

      setExpenses(allExpenses)
      setShifts(allShifts)

      if (reportMode === 'month') {
        const handoverRes = await fetch(`/api/reports/handover?month=${selectedMonth + 1}&year=${selectedYear}`)
        if (handoverRes.ok) {
          const handovers = await handoverRes.json()
          setHandover(handovers.length > 0 ? handovers[0] : null)
        }
      } else {
        setHandover(null)
      }

      if (discRes.ok) {
        const discData = await discRes.json()
        setDiscounts(discData.orders || [])
        setRevenueTotal(discData.totalRevenue || 0)
      } else {
        setDiscounts([])
        setRevenueTotal(0)
      }
    } catch (err) {
      console.error('Failed to fetch report data:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedMonth, selectedYear, selectedDay, customFrom, customTo, reportMode])

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 500)
    return () => clearTimeout(timer)
  }, [fetchData])

  const totalRevenue = useMemo(() => {
    const shiftTotal = shifts.reduce((s, sh) => s + sh.totalRevenue, 0)
    if (shiftTotal > 0) return shiftTotal
    return revenueTotal
  }, [revenueTotal, shifts])
  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses])
  const netRevenue = totalRevenue - totalExpenses
  const totalDiscounts = useMemo(() => {
    return shifts.reduce((s, sh) => s + (sh.totalDiscounts || 0), 0)
  }, [shifts])
  const totalPointsRevenue = useMemo(() => {
    return shifts.reduce((s, sh) => s + (sh.totalLoyaltyDiscounts || 0), 0)
  }, [shifts])

  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of expenses) {
      map.set(e.category, (map.get(e.category) || 0) + e.amount)
    }
    return Array.from(map.entries())
      .map(([cat, total]) => ({ category: cat, total }))
      .sort((a, b) => b.total - a.total)
  }, [expenses])

  const groupedExpenses = useMemo(() => {
    const map = new Map<string, MonthlyExpense[]>()
    for (const e of expenses) {
      const list = map.get(e.category) || []
      list.push(e)
      map.set(e.category, list)
    }
    return Array.from(map.entries()).sort((a, b) => {
      const aTotal = a[1].reduce((s, e) => s + e.amount, 0)
      const bTotal = b[1].reduce((s, e) => s + e.amount, 0)
      return bTotal - aTotal
    })
  }, [expenses])

  const existingCategories = useMemo(() => {
    return Array.from(new Set(expenses.map(e => e.category))).sort()
  }, [expenses])

  const addExpense = async () => {
    if (!expenseTitle || !expenseAmount || !expenseCategory) return
    const parsedAmount = safeParseFloat(expenseAmount, -1)
    if (parsedAmount < 0) {
      toast({ title: 'خطأ', description: 'المبلغ غير صالح', variant: 'destructive' })
      return
    }
    setSavingExpense(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: expenseTitle,
          amount: parsedAmount,
          category: expenseCategory,
          addedBy: username,
          employeeId: expenseCategory === 'سلف العماله' ? (selectedEmployeeId || null) : null,
        }),
      })
      if (res.ok) {
        toast({ title: 'تم إضافة المصروف', description: `${expenseTitle} - ${parsedAmount.toFixed(2)} ج.م` })
        setExpenseTitle('')
        setExpenseAmount('')
        setExpenseCategory('')
        fetchData()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: (data as { error?: string }).error || 'فشل في حفظ المصروف', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في الاتصال بالخادم', variant: 'destructive' })
    } finally {
      setSavingExpense(false)
    }
  }

  const startEdit = (exp: MonthlyExpense) => {
    setEditingId(exp.id)
    setEditTitle(exp.title)
    setEditAmount(exp.amount.toString())
    setEditCategory(exp.category)
    setEditEmployeeId(exp.employeeId || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
    setEditAmount('')
    setEditCategory('')
  }

  const saveEdit = async (id: string) => {
    const parsedAmount = safeParseFloat(editAmount, -1)
    if (!editTitle || !editCategory || parsedAmount < 0) {
      toast({ title: 'خطأ', description: 'بيانات المصروف غير صالحة', variant: 'destructive' })
      return
    }
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, amount: parsedAmount, category: editCategory, employeeId: editCategory === 'سلف العماله' ? (editEmployeeId || null) : null }),
      })
      if (res.ok) {
        toast({ title: 'تم تعديل المصروف' })
        cancelEdit()
        fetchData()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: (data as { error?: string }).error || 'فشل في تعديل المصروف', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في الاتصال بالخادم', variant: 'destructive' })
    } finally {
      setSavingEdit(false)
    }
  }

  const deleteExpense = async (id: string) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'تم حذف المصروف' })
        fetchData()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: (data as { error?: string }).error || 'فشل في حذف المصروف', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في الاتصال بالخادم', variant: 'destructive' })
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    setSavingCategory(true)
    try {
      const res = await fetch('/api/expenses/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      })
      if (res.ok) {
        const cat = await res.json()
        setAvailableCategories(prev => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)))
        setExpenseCategory(cat.name)
        setNewCategoryName('')
        setShowNewCategory(false)
        toast({ title: 'تم إضافة الفئة' })
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: (data as { error?: string }).error || 'فشل إضافة الفئة', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الاتصال بالخادم', variant: 'destructive' })
    } finally {
      setSavingCategory(false)
    }
  }

  const handleRenameCategory = async (id: string) => {
    if (!editingCategoryName.trim()) return
    setRenamingCategory(true)
    try {
      const res = await fetch(`/api/expenses/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingCategoryName.trim() }),
      })
      if (res.ok) {
        const updated = await res.json()
        setAvailableCategories(prev => prev.map(c => c.id === id ? { ...c, name: updated.name } : c))
        setEditingCategoryId(null)
        setEditingCategoryName('')
        toast({ title: 'تم تعديل الفئة' })
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: (data as { error?: string }).error || 'فشل تعديل الفئة', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الاتصال بالخادم', variant: 'destructive' })
    } finally {
      setRenamingCategory(false)
    }
  }

  const handleToggleCategory = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/expenses/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !current }),
      })
      if (res.ok) {
        setAvailableCategories(prev => prev.map(c => c.id === id ? { ...c, isActive: !current } : c))
        toast({ title: !current ? '✅ الفئة متاحة للكاشير' : '🟡 الفئة مخفية عن الكاشير' })
      } else {
        toast({ title: 'خطأ', description: 'فشل تحديث الفئة', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الاتصال', variant: 'destructive' })
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الفئة؟')) return
    try {
      const res = await fetch(`/api/expenses/categories/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'تم حذف الفئة' })
        setAvailableCategories(prev => prev.filter(x => x.id !== id))
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: (data as { error?: string }).error || 'فشل الحذف', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الاتصال بالخادم', variant: 'destructive' })
    }
  }

  const exportExcel = async () => {
    setExporting(true)
    let title = ''
    let filename = ''
    if (reportMode === 'month') {
      title = `تقارير شهر ${MONTHS[selectedMonth]} ${selectedYear}`
      filename = `تقرير-شهري-${MONTHS[selectedMonth]}-${selectedYear}`
    } else if (reportMode === 'day') {
      title = `تقرير يومي يوم ${selectedDay} ${MONTHS[selectedMonth]} ${selectedYear}`
      filename = `تقرير-يومي-${selectedDay}-${MONTHS[selectedMonth]}-${selectedYear}`
    } else {
      title = `تقارير من ${customFrom} إلى ${customTo}`
      filename = `تقرير-فترة-${customFrom}-${customTo}`
    }
    try {
      const res = await fetch(`/api/reports/monthly?from=${fromDate}&to=${toDate}&title=${encodeURIComponent(title)}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${filename}.xlsx`
        link.click()
        URL.revokeObjectURL(url)
        toast({ title: 'تم تصدير التقرير' })
      } else {
        toast({ title: 'خطأ', description: 'فشل في تصدير التقرير', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في الاتصال بالخادم', variant: 'destructive' })
    } finally {
      setExporting(false)
    }
  }

  // ── Loading Skeleton ──────────────────────────────
  if (loading) {
    return (
      <div className="space-y-5" dir="rtl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-[#D4AF37]" />
            </div>
            <div>
              <h1 className="text-xl font-bold">التقارير</h1>
              <div className="h-3 w-28 mt-1 rounded bg-muted/60 animate-pulse" />
            </div>
          </div>
          <div className="h-9 w-32 rounded-xl bg-muted/60 animate-pulse" />
        </div>
        <div className="h-24 rounded-xl bg-muted/30 animate-pulse border border-border/30" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted/30 animate-pulse border border-border/30" />
          ))}
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/20 animate-pulse border border-border/30" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5" dir="rtl">

      {/* ═══════════════════════════════════════════════
          HEADER
         ═══════════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border border-[#D4AF37]/10 flex items-center justify-center">
            <Receipt className="h-5 w-5 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-xl font-bold">التقارير المالية</h1>
            <p className="text-[11px] text-muted-foreground">
              {reportMode === 'month' ? `شهر ${MONTHS[selectedMonth]} ${selectedYear}` :
               reportMode === 'day' ? `يوم ${selectedDay} ${MONTHS[selectedMonth]} ${selectedYear}` :
               customFrom && customTo ? `من ${customFrom} إلى ${customTo}` : 'اختر الفترة'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={fetchData}
            className="h-9 w-9 p-0 border-border/40 rounded-xl">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button onClick={exportExcel} disabled={exporting}
            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-500 font-bold h-9 text-xs rounded-xl shadow-lg shadow-emerald-600/20">
            {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
            تصدير Excel
          </Button>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════
          DATE FILTER
         ═══════════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.03 }}>
        <Card className="border-border/30 bg-gradient-to-br from-card to-muted/10 overflow-hidden">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Calendar className="h-4 w-4 text-[#D4AF37]" />
              <span className="text-sm font-bold">فلترة التقرير</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['month', 'day', 'range'] as const).map(mode => (
                <button key={mode}
                  onClick={() => setReportMode(mode)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    reportMode === mode
                      ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20'
                      : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 border border-border/30'
                  }`}>
                  {mode === 'month' ? '📅 شهري' : mode === 'day' ? '📆 يومي' : '📋 فترة مخصصة'}
                </button>
              ))}
            </div>
            {reportMode === 'month' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">الشهر</Label>
                  <div className="relative">
                    <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
                      className="w-full rounded-xl border border-border/30 bg-muted/30 px-3 py-2 text-sm appearance-none">
                      {MONTHS.map((name, i) => (
                        <option key={i} value={i}>{name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">السنة</Label>
                  <Input type="number" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
                    className="bg-muted/30 border-border/30 h-10 rounded-xl text-right" />
                </div>
              </div>
            )}
            {reportMode === 'day' && (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">الشهر</Label>
                  <div className="relative">
                    <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
                      className="w-full rounded-xl border border-border/30 bg-muted/30 px-3 py-2 text-sm appearance-none">
                      {MONTHS.map((name, i) => (
                        <option key={i} value={i}>{name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">السنة</Label>
                  <Input type="number" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
                    className="bg-muted/30 border-border/30 h-10 rounded-xl text-right" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">اليوم</Label>
                  <div className="relative">
                    <select value={selectedDay} onChange={e => setSelectedDay(Number(e.target.value))}
                      className="w-full rounded-xl border border-border/30 bg-muted/30 px-3 py-2 text-sm appearance-none">
                      {Array.from({ length: new Date(selectedYear, selectedMonth + 1, 0).getDate() }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                  </div>
                </div>
              </div>
            )}
            {reportMode === 'range' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">من تاريخ</Label>
                  <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                    className="bg-muted/30 border-border/30 h-10 rounded-xl text-right" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">إلى تاريخ</Label>
                  <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                    className="bg-muted/30 border-border/30 h-10 rounded-xl text-right" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══════════════════════════════════════════════
          SUMMARY CARDS
         ═══════════════════════════════════════════════ */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.06 }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <StatCard icon={Banknote} label="إجمالي الإيرادات" value={`${totalRevenue.toFixed(0)} ج.م`}
          color="text-emerald-400 from-emerald-500/10 border-emerald-500/20"
          badge={`${shifts.length} شيفت`} />
        <StatCard icon={HandCoins} label="إجمالي المصروفات" value={`${totalExpenses.toFixed(0)} ج.م`}
          color="text-red-400 from-red-500/10 border-red-500/20"
          badge={`${expenses.length} بند`} />
        <StatCard icon={Wallet} label="صافي الإيراد" value={`${handover ? '0.00' : netRevenue.toFixed(0)} ج.م`}
          color={handover ? 'text-blue-400 from-blue-500/10 border-blue-500/20' : (netRevenue >= 0 ? 'text-emerald-400 from-emerald-500/10 border-emerald-500/20' : 'text-red-400 from-red-500/10 border-red-500/20')}
          badge={handover ? 'مُسلَّم للأونر' : (netRevenue >= 0 ? 'إيجابي' : 'سلبي')} />
        <StatCard icon={TrendingDown} label="إجمالي الخصومات" value={`${totalDiscounts.toFixed(0)} ج.م`}
          color="text-orange-400 from-orange-500/10 border-orange-500/20"
          badge={`${discounts.length} خصم`} />
        <StatCard icon={HandCoins} label="خصم نقاط الولاء" value={`${totalPointsRevenue.toFixed(0)} ج.م`}
          color="text-purple-400 from-purple-500/10 border-purple-500/20" />
        <StatCard icon={DollarSign} label="عدد الشيفتات" value={String(shifts.length)}
          color="text-blue-400 from-blue-500/10 border-blue-500/20" />
      </motion.div>

      {/* ═══════════════════════════════════════════════
          MONTHLY HANDOVER
         ═══════════════════════════════════════════════ */}
      {reportMode === 'month' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card className={`border overflow-hidden ${
            handover
              ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent'
              : 'border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent'
          }`}>
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    handover ? 'bg-emerald-500/10' : 'bg-amber-500/10'
                  }`}>
                    {handover ? (
                      <Check className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold">
                      {handover ? 'تم تسليم الشهر للأونر' : 'الشهر لم يسلم بعد'}
                    </p>
                    {handover ? (
                      <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                        <p>بواسطة {handover.handedOverBy}</p>
                        <p>{new Date(handover.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <p>صافي الإيراد المُسلم: <span className="font-bold text-emerald-400">{handover.netRevenue.toFixed(2)} ج.م</span></p>
                      </div>
                    ) : (
                      <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                        <p>صافي الإيراد الحالي: <span className={`font-bold ${netRevenue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{netRevenue.toFixed(2)} ج.م</span></p>
                        <p className="text-amber-400/80">بعد التسليم سيتم توثيق المبلغ للأونر</p>
                      </div>
                    )}
                  </div>
                </div>
                {!handover && (
                  <Button
                    onClick={async () => {
                      if (!window.confirm(`هل أنت متأكد من تسليم شهر ${MONTHS[selectedMonth]} ${selectedYear} للأونر؟\nصافي الإيراد: ${netRevenue.toFixed(2)} ج.م`)) return
                      setHandingOver(true)
                      try {
                        const res = await fetch('/api/reports/handover', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            month: selectedMonth + 1,
                            year: selectedYear,
                            handedOverBy: username,
                            notes: '',
                          }),
                        })
                        if (res.ok) {
                          const h = await res.json()
                          setHandover(h)
                          toast({ title: 'تم تسليم الشهر', description: `صافي ${h.netRevenue.toFixed(2)} ج.م تم توثيقها للأونر` })
                        } else {
                          const data = await res.json().catch(() => ({}))
                          toast({ title: 'خطأ', description: (data as { error?: string }).error || 'فشل تسليم الشهر', variant: 'destructive' })
                        }
                      } catch {
                        toast({ title: 'خطأ', description: 'فشل الاتصال بالخادم', variant: 'destructive' })
                      } finally {
                        setHandingOver(false)
                      }
                    }}
                    disabled={handingOver || netRevenue < 0}
                    className="gap-2 bg-amber-600 text-white hover:bg-amber-500 font-bold h-9 text-xs rounded-xl shadow-lg shadow-amber-600/20 shrink-0"
                  >
                    {handingOver ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    تسليم الشهر للأونر
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════
          CATEGORY BREAKDOWN
         ═══════════════════════════════════════════════ */}
      {categoryTotals.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <Card className="border-border/30 bg-gradient-to-br from-card to-muted/5 overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-5 border-b border-border/20">
              <div className="flex items-center gap-2">
                <ChartPie className="h-4 w-4 text-[#D4AF37]" />
                <p className="text-sm font-bold">توزيع المصروفات حسب الفئة</p>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {categoryTotals.map(ct => {
                  const maxTotal = Math.max(...categoryTotals.map(x => x.total))
                  const pct = Math.round(ct.total / maxTotal * 100)
                  return (
                    <motion.div key={ct.category} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className="rounded-xl border border-red-500/10 bg-gradient-to-br from-red-500/[0.03] to-transparent p-3 text-center hover:border-red-500/20 transition-all">
                      <p className="text-[11px] text-muted-foreground truncate">{ct.category}</p>
                      <p className="text-lg font-bold text-red-400">{ct.total.toFixed(0)}</p>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted/30 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-l from-red-500/60 to-red-400/60" style={{ width: `${pct}%` }} />
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════
          ADD EXPENSE FORM
         ═══════════════════════════════════════════════ */}
      <Card className={`border-[#D4AF37]/20 overflow-hidden ${
        handover ? 'opacity-50 pointer-events-none' : 'bg-gradient-to-br from-[#D4AF37]/[0.03] to-transparent'
      }`}>
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
              <Plus className="h-4 w-4 text-[#D4AF37]" />
            </div>
            <p className="text-sm font-bold">إضافة مصروف جديد</p>
            {handover && <span className="text-xs text-muted-foreground mr-auto">— الشهر مُسلَّم، لا يمكن إضافة مصروفات</span>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">اسم المصروف</Label>
              <div className="relative">
                <Receipt className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                <Input placeholder="مثال: إيجار المحل" value={expenseTitle} onChange={e => setExpenseTitle(e.target.value)}
                  className="bg-muted/30 border-border/30 h-10 pr-10 rounded-xl" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">المبلغ (ج.م)</Label>
              <div className="relative">
                <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                <Input type="number" placeholder="0.00" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)}
                  className="bg-muted/30 border-border/30 h-10 pr-10 rounded-xl" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">الفئة</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                  <select
                    value={expenseCategory}
                    onChange={e => setExpenseCategory(e.target.value)}
                    className="w-full rounded-xl border border-border/30 bg-muted/30 px-3 py-2.5 text-sm pr-10 appearance-none"
                  >
                    <option value="">اختر فئة...</option>
                    {availableCategories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <button onClick={() => setShowNewCategory(!showNewCategory)}
                  className="h-10 w-10 rounded-xl border border-border/30 flex items-center justify-center text-muted-foreground hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all shrink-0"
                  title="إضافة فئة جديدة">
                  {showNewCategory ? <X className="h-4 w-4" /> : <CirclePlus className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {showNewCategory && (
            <div className="flex gap-2 items-center p-3 rounded-xl bg-muted/20 border border-border/20">
              <Input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                placeholder="اسم الفئة الجديدة..."
                className="bg-muted/30 border-border/30 h-9 text-sm rounded-xl flex-1"
                onKeyDown={e => { if (e.key === 'Enter') handleAddCategory() }} />
              <Button size="sm" onClick={handleAddCategory} disabled={savingCategory || !newCategoryName.trim()}
                className="bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 h-9 px-4 rounded-xl shadow-lg shadow-[#D4AF37]/20">
                {savingCategory ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                إضافة
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowNewCategory(false); setNewCategoryName('') }}
                className="h-9 px-3 border-border/30 rounded-xl">إلغاء</Button>
            </div>
          )}

          {expenseCategory === 'سلف العماله' && employees.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">اختر العامل</Label>
              <div className="relative">
                <UserCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                <select
                  value={selectedEmployeeId}
                  onChange={e => setSelectedEmployeeId(e.target.value)}
                  className="w-full rounded-xl border border-border/30 bg-muted/30 px-3 py-2.5 text-sm pr-10 appearance-none"
                >
                  <option value="">اختر العامل...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} — {emp.jobTitle}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <Button onClick={addExpense} disabled={savingExpense || !expenseTitle || !expenseAmount || !expenseCategory}
            className="w-full gap-2 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold h-10 rounded-xl shadow-lg shadow-[#D4AF37]/20">
            {savingExpense ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            إضافة المصروف
          </Button>

          {/* Category Tags */}
          {availableCategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {availableCategories.map(c => (
                <Badge key={c.id} variant="outline"
                  className={`gap-1.5 border-border/30 text-xs h-7 px-2.5 rounded-lg transition-all hover:border-border/50 ${
                    !c.isActive ? 'opacity-50' : ''
                  }`}>
                  {editingCategoryId === c.id ? (
                    <div className="flex items-center gap-1">
                      <input value={editingCategoryName} onChange={e => setEditingCategoryName(e.target.value)}
                        className="w-20 rounded border border-border/30 bg-muted/50 px-1.5 py-0.5 text-xs text-right"
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRenameCategory(c.id)
                          if (e.key === 'Escape') setEditingCategoryId(null)
                        }}
                        autoFocus />
                      <button onClick={() => handleRenameCategory(c.id)} disabled={renamingCategory}
                        className="text-emerald-500 hover:text-emerald-400">
                        {renamingCategory ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      </button>
                      <button onClick={() => setEditingCategoryId(null)}
                        className="text-muted-foreground hover:text-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className={c.isActive ? '' : 'line-through text-muted-foreground'}>{c.name}</span>
                      <button onClick={() => handleToggleCategory(c.id, c.isActive)}
                        className={`transition-colors ${c.isActive ? 'text-emerald-500 hover:text-emerald-400' : 'text-muted-foreground hover:text-emerald-500'}`}
                        title={c.isActive ? 'إخفاء عن الكاشير' : 'إظهار للكاشير'}>
                        {c.isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      </button>
                      <button onClick={() => { setEditingCategoryId(c.id); setEditingCategoryName(c.name) }}
                        className="text-muted-foreground hover:text-[#D4AF37] transition-colors">
                        <Pencil className="h-2.5 w-2.5" />
                      </button>
                      <button onClick={() => handleDeleteCategory(c.id)}
                        className="text-muted-foreground hover:text-red-400 transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════
          DISCOUNTS SUMMARY
         ═══════════════════════════════════════════════ */}
      {discounts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <Card className="border-orange-500/20 overflow-hidden bg-gradient-to-br from-orange-500/[0.03] to-transparent">
            <CardHeader
              className="pb-3 pt-4 px-5 border-b border-orange-500/10 cursor-pointer select-none hover:bg-orange-500/5 transition-colors"
              onClick={() => setShowDiscounts(!showDiscounts)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`transition-transform duration-200 ${showDiscounts ? 'rotate-0' : '-rotate-90'}`}>
                    <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <TrendingDown className="h-4 w-4 text-orange-400" />
                  <h4 className="text-sm font-bold">الخصومات</h4>
                  <Badge variant="outline" className="text-[10px] border-border/30 bg-orange-500/5 text-orange-400 h-5">
                    {discounts.length}
                  </Badge>
                </div>
                <span className="text-sm font-bold text-orange-400">{totalDiscounts.toFixed(2)} ج.م</span>
              </div>
            </CardHeader>
            <AnimatePresence>
              {showDiscounts && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                  <CardContent className="p-2">
                    <div className="space-y-1">
                      {discounts.map((d, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                          className="rounded-xl p-2.5 hover:bg-muted/20 transition-colors">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                                <TrendingDown className="h-3.5 w-3.5 text-orange-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">
                                  طلب <span className="font-bold">#{d.orderNumber}</span>
                                  {d.customerName ? ` — ${d.customerName}` : ''}
                                </p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {d.discountReason && (
                                    <span className="text-[10px] text-muted-foreground">السبب: {d.discountReason}</span>
                                  )}
                                  {d.discountAppliedBy && (
                                    <span className="text-[10px] text-muted-foreground">بواسطة {d.discountAppliedBy}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant="outline" className="text-[10px] border-orange-500/20 text-orange-400 h-5 bg-orange-500/5">
                                {d.discountType?.replace('_', ' ') || 'خصم'}
                              </Badge>
                              <span className="text-sm font-bold text-orange-400">{d.discountAmount.toFixed(2)} ج.م</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════
          GROUPED EXPENSES
         ═══════════════════════════════════════════════ */}
      {groupedExpenses.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="py-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
            <Receipt className="h-10 w-10 text-muted-foreground/20" />
          </div>
          <p className="text-sm text-muted-foreground">لا توجد مصروفات في هذه الفترة</p>
          <p className="text-[11px] text-muted-foreground/60 mt-1">يمكنك إضافة مصروف جديد من الأعلى</p>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.14 }} className="space-y-2">
          <p className="text-[11px] text-muted-foreground">
            {expenses.length} مصروف في {groupedExpenses.length} فئة
          </p>
          <AnimatePresence>
            {groupedExpenses.map(([category, items], idx) => {
              const catTotal = items.reduce((s, e) => s + e.amount, 0)
              const isExpanded = expandedCats.has(category)
              const toggleCat = () => {
                const next = new Set(expandedCats)
                if (isExpanded) { next.delete(category) } else { next.add(category) }
                setExpandedCats(next)
              }
              return (
                <motion.div key={category} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}>
                  <Card className="border-border/30 overflow-hidden bg-gradient-to-br from-card to-muted/5">
                    <CardHeader
                      className="pb-3 pt-4 px-5 border-b border-border/20 cursor-pointer select-none hover:bg-muted/10 transition-colors"
                      onClick={toggleCat}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
                            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="h-7 w-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                            <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                          </div>
                          <h4 className="text-sm font-bold">{category}</h4>
                          <Badge variant="outline" className="text-[10px] border-border/30 bg-red-500/5 text-red-400 h-5">
                            {items.length}
                          </Badge>
                        </div>
                        <span className="text-sm font-bold text-red-400">{catTotal.toFixed(2)} ج.م</span>
                      </div>
                    </CardHeader>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                          <CardContent className="p-2">
                            <div className="space-y-1">
                              {items.map(expense => (
                                <motion.div key={expense.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                                  <div className={`rounded-xl p-2.5 transition-all ${
                                    editingId === expense.id
                                      ? 'ring-1 ring-[#D4AF37]/50 bg-muted/20 shadow-sm'
                                      : 'hover:bg-muted/10'
                                  }`}>
                                    {editingId === expense.id ? (
                                      <div className="space-y-3">
                                        <p className="text-xs font-bold text-[#D4AF37] flex items-center gap-1.5">
                                          <Pencil className="h-3 w-3" />تعديل المصروف
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                          <div className="space-y-1">
                                            <Label className="text-[10px] text-muted-foreground">الاسم</Label>
                                            <Input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                                              className="bg-muted/30 border-border/30 text-right text-sm h-9 rounded-xl" />
                                          </div>
                                          <div className="space-y-1">
                                            <Label className="text-[10px] text-muted-foreground">المبلغ</Label>
                                            <Input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                                              className="bg-muted/30 border-border/30 text-right text-sm h-9 rounded-xl" />
                                          </div>
                                          <div className="space-y-1">
                                            <Label className="text-[10px] text-muted-foreground">الفئة</Label>
                                            <select value={editCategory} onChange={e => setEditCategory(e.target.value)}
                                              className="w-full rounded-xl border border-border/30 bg-muted/30 px-2.5 py-2 text-sm appearance-none">
                                              {availableCategories.map(c => (
                                                <option key={c.id} value={c.name}>{c.name}</option>
                                              ))}
                                            </select>
                                          </div>
                                        </div>
                                        {editCategory === 'سلف العماله' && employees.length > 0 && (
                                          <div className="space-y-1">
                                            <Label className="text-[10px] text-muted-foreground">العامل</Label>
                                            <select value={editEmployeeId} onChange={e => setEditEmployeeId(e.target.value)}
                                              className="w-full rounded-xl border border-border/30 bg-muted/30 px-2.5 py-2 text-sm appearance-none">
                                              <option value="">اختر العامل...</option>
                                              {employees.map(emp => (
                                                <option key={emp.id} value={emp.id}>{emp.name} — {emp.jobTitle}</option>
                                              ))}
                                            </select>
                                          </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                          <Button size="sm" onClick={() => saveEdit(expense.id)}
                                            disabled={savingEdit || !editTitle || !editAmount || !editCategory}
                                            className="gap-1.5 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold h-8 text-xs rounded-xl shadow-lg shadow-[#D4AF37]/20">
                                            {savingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                            حفظ
                                          </Button>
                                          <Button size="sm" variant="outline" onClick={cancelEdit}
                                            className="h-8 text-xs gap-1 border-border/30 rounded-xl">
                                            <X className="h-3 w-3" />إلغاء
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                          <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                                            <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium truncate">{expense.title}</p>
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                <Calendar className="h-3 w-3 text-muted-foreground/50" />
                                                {getRelativeTime(expense.createdAt)}
                                              </span>
                                              {expense.addedBy && (
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                  <UserCircle className="h-3 w-3 text-muted-foreground/50" />
                                                  {expense.addedBy}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <span className="text-sm font-bold text-red-400">{expense.amount.toFixed(2)} ج.م</span>
                                          {!handover && (
                                            <div className="flex items-center gap-0.5">
                                              <button onClick={() => startEdit(expense)}
                                                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-[#D4AF37] hover:bg-[#D4AF37]/5 flex items-center justify-center transition-all"
                                                title="تعديل">
                                                <Pencil className="h-3 w-3" />
                                              </button>
                                              <button onClick={() => deleteExpense(expense.id)}
                                                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/5 flex items-center justify-center transition-all"
                                                title="حذف">
                                                <Trash2 className="h-3 w-3" />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}

    </div>
  )
}
