'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Plus, Trash2, TrendingDown, TrendingUp, Loader2, Pencil, X, Check,
  FileSpreadsheet, Calendar, ChevronDown, ChevronUp, Download
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { getRelativeTime, safeParseFloat } from '@/lib/saraya/helpers'
import type { ShiftWithDetails } from '@/lib/saraya/types'

interface MonthlyExpense {
  id: string
  title: string
  amount: number
  category: string
  addedBy: string
  createdAt: string
}

interface ShiftRevenue {
  id: string
  totalRevenue: number
  startedAt: string
}

interface AdminMonthlyReportProps {
  username: string
}

export function AdminMonthlyReport({ username }: AdminMonthlyReportProps) {
  const { toast } = useToast()

  // Month selector — defaults to the most recent month with data
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1)
    return d.getMonth()
  })
  const [selectedYear, setSelectedYear] = useState(() => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1)
    return d.getFullYear()
  })
  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
  const [exporting, setExporting] = useState(false)

  // Data
  const [expenses, setExpenses] = useState<MonthlyExpense[]>([])
  const [shifts, setShifts] = useState<ShiftRevenue[]>([])
  const [pastShifts, setPastShifts] = useState<ShiftWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  // Past shifts UI
  const [showPastShifts, setShowPastShifts] = useState(true)
  // Expanded categories (all collapsed by default)
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  // Add form
  const [expenseTitle, setExpenseTitle] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('')
  const [savingExpense, setSavingExpense] = useState(false)

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const from = new Date(selectedYear, selectedMonth, 1)
      const to = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999)

      const [expRes, shiftsRes] = await Promise.all([
        fetch('/api/expenses'),
        fetch('/api/shifts'),
      ])

      let allExpenses: MonthlyExpense[] = []
      let allShifts: ShiftRevenue[] = []
      let allPastShifts: ShiftWithDetails[] = []

      if (expRes.ok) {
        const raw: MonthlyExpense[] = await expRes.json()
        allExpenses = raw.filter(e => {
          const d = new Date(e.createdAt)
          return d >= from && d <= to
        })
      }

      if (shiftsRes.ok) {
        const raw: ShiftWithDetails[] = await shiftsRes.json()
        allPastShifts = raw.filter(s => s.status === 'CLOSED')
        allShifts = raw
          .filter(s => s.status === 'CLOSED')
          .filter(s => {
            const d = new Date(s.startedAt)
            return d >= from && d <= to
          })
          .map(s => ({ id: s.id, totalRevenue: s.totalRevenue, startedAt: s.startedAt }))
      }

      setExpenses(allExpenses)
      setShifts(allShifts)
      setPastShifts(allPastShifts)
    } catch (err) {
      console.error('Failed to fetch report data:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedMonth, selectedYear])

  useEffect(() => { fetchData() }, [fetchData])

  // ─── Derived data ──────────────────────────────
  const totalRevenue = useMemo(() => shifts.reduce((s, sh) => s + sh.totalRevenue, 0), [shifts])
  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses])
  const netRevenue = totalRevenue - totalExpenses

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

  const filteredPastShifts = useMemo(() => {
    const from = new Date(selectedYear, selectedMonth, 1)
    const to = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999)
    return pastShifts.filter(s => {
      const d = new Date(s.startedAt)
      return d >= from && d <= to
    })
  }, [pastShifts, selectedMonth, selectedYear])

  const downloadShiftExcel = async (shift: ShiftWithDetails) => {
    try {
      const res = await fetch(`/api/shifts/${shift.id}/export`)
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `shift-${String(shift.id).slice(0, 8)}.xlsx`
        link.click()
        URL.revokeObjectURL(url)
      } else {
        toast({ title: 'خطأ', description: 'فشل تحميل التقرير', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الاتصال بالخادم', variant: 'destructive' })
    }
  }

  // ─── Actions ───────────────────────────────────
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
        body: JSON.stringify({ title: editTitle, amount: parsedAmount, category: editCategory }),
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
      await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
      toast({ title: 'تم حذف المصروف' })
      fetchData()
    } catch {
      toast({ title: 'خطأ', description: 'فشل في حذف المصروف', variant: 'destructive' })
    }
  }

  const exportExcel = async () => {
    setExporting(true)
    const fromStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`
    const toStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${new Date(selectedYear, selectedMonth + 1, 0).getDate()}`
    try
    {
      const res = await fetch(`/api/reports/monthly?from=${fromStr}&to=${toStr}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `تقرير-${MONTHS[selectedMonth]}-${selectedYear}.xlsx`
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

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" /></div>
  }

  return (
    <div className="space-y-6" dir="rtl">

      {/* ── Month Filter + Export ──────────────────────── */}
      <Card className="border-border/40 bg-card">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />اختر الشهر
              </label>
              <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
                className="w-full rounded-lg border border-border/50 bg-muted/50 px-3 py-1.5 text-sm text-right">
                {MONTHS.map((name, i) => (
                  <option key={i} value={i}>{name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">السنة</label>
              <input type="number" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
                className="w-full rounded-lg border border-border/50 bg-muted/50 px-3 py-1.5 text-sm text-right" />
            </div>
            <div className="flex items-end">
              <Button onClick={exportExcel} disabled={exporting}
                className="w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-500 font-bold">
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                تصدير Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Summary Cards ──────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-[#D4AF37]/20 bg-[#D4AF37]/5">
          <CardContent className="p-4 text-center">
            <p className="text-lg font-bold text-[#D4AF37]">{totalRevenue.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">إجمالي الإيرادات</p>
          </CardContent>
        </Card>
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-4 text-center">
            <p className="text-lg font-bold text-red-400">{totalExpenses.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">إجمالي المصروفات</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4 text-center">
            <p className={`text-lg font-bold ${netRevenue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {netRevenue.toFixed(0)}
            </p>
            <p className="text-xs text-muted-foreground">صافي الإيراد</p>
          </CardContent>
        </Card>
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-4 text-center">
            <p className="text-lg font-bold text-blue-400">{shifts.length}</p>
            <p className="text-xs text-muted-foreground">عدد الشيفتات</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Per-Category Summary ─────────────────────────── */}
      {categoryTotals.length > 0 && (
        <Card className="border-border/40 bg-card">
          <CardHeader className="pb-3">
            <p className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#D4AF37]" />توزيع المصروفات حسب الفئة
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {categoryTotals.map(ct => (
                <Card key={ct.category} className="border-red-500/10 bg-red-500/[0.03]">
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground truncate">{ct.category}</p>
                    <p className="text-base font-bold text-red-400">{ct.total.toFixed(0)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Add Expense Form ──────────────────────────── */}
      <Card className="border-[#D4AF37]/20 bg-[#D4AF37]/5">
        <CardContent className="p-4 space-y-4">
          <p className="text-sm font-bold flex items-center gap-2">
            <Plus className="h-4 w-4 text-[#D4AF37]" />إضافة مصروف جديد
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>اسم المصروف</Label>
              <Input placeholder="مثال: إيجار المحل..." value={expenseTitle} onChange={e => setExpenseTitle(e.target.value)}
                className="bg-muted/50 border-border/50 text-right" />
            </div>
            <div className="space-y-2">
              <Label>المبلغ (ج.م)</Label>
              <Input type="number" placeholder="0.00" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)}
                className="bg-muted/50 border-border/50 text-right" />
            </div>
            <div className="space-y-2">
              <Label>الفئة</Label>
              <div className="relative">
                <input
                  list="cat-suggestions"
                  placeholder="اكتب فئة جديدة أو اختر من القائمة..."
                  value={expenseCategory}
                  onChange={e => setExpenseCategory(e.target.value)}
                  className="w-full rounded-lg border border-border/50 bg-muted/50 px-3 py-2 text-sm text-right"
                />
                <datalist id="cat-suggestions">
                  {existingCategories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>
          </div>
          <Button onClick={addExpense} disabled={savingExpense || !expenseTitle || !expenseAmount || !expenseCategory}
            className="w-full gap-2 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold">
            {savingExpense ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            إضافة المصروف
          </Button>
        </CardContent>
      </Card>

      {/* ── Grouped Expenses ─────────────────────────── */}
      {groupedExpenses.length === 0 ? (
        <div className="py-12 text-center">
          <TrendingDown className="mx-auto mb-4 h-12 w-12 text-muted-foreground/20" />
          <p className="text-muted-foreground">لا توجد مصروفات في هذه الفترة</p>
        </div>
      ) : (
        groupedExpenses.map(([category, items]) => {
          const catTotal = items.reduce((s, e) => s + e.amount, 0)
          const isExpanded = expandedCats.has(category)
          const toggleCat = () => {
            const next = new Set(expandedCats)
            if (isExpanded) { next.delete(category) } else { next.add(category) }
            setExpandedCats(next)
          }
          return (
            <Card key={category} className="border-border/40 bg-card overflow-hidden">
              <CardHeader className="pb-2 pt-3 px-4 bg-red-500/5 border-b border-red-500/10 cursor-pointer select-none" onClick={toggleCat}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground transition-transform" /> : <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />}
                    <TrendingDown className="h-4 w-4 text-red-400" />
                    <h4 className="text-sm font-bold">{category}</h4>
                    <Badge variant="outline" className="text-[10px] border-border/50">{items.length}</Badge>
                  </div>
                  <span className="text-sm font-bold text-red-400">{catTotal.toFixed(2)} ج.م</span>
                </div>
              </CardHeader>
              {isExpanded && (
              <CardContent className="p-2">
                <div className="space-y-1">
                  {items.map(expense => (
                    <motion.div key={expense.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <div className={`rounded-lg p-2 ${editingId === expense.id ? 'ring-1 ring-[#D4AF37]/50 bg-muted/30' : 'hover:bg-muted/20'}`}>
                        {editingId === expense.id ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <Label className="text-[10px]">الاسم</Label>
                                <Input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                                  className="bg-muted/50 border-border/50 text-right text-sm h-8" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px]">المبلغ</Label>
                                <Input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                                  className="bg-muted/50 border-border/50 text-right text-sm h-8" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px]">الفئة</Label>
                                <div className="relative">
                                  <input
                                    list="edit-cat-suggestions"
                                    value={editCategory}
                                    onChange={e => setEditCategory(e.target.value)}
                                    className="w-full rounded-lg border border-border/50 bg-muted/50 px-2 py-1.5 text-sm text-right"
                                  />
                                  <datalist id="edit-cat-suggestions">
                                    {existingCategories.map(c => <option key={c} value={c} />)}
                                  </datalist>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" onClick={() => saveEdit(expense.id)}
                                disabled={savingEdit || !editTitle || !editAmount || !editCategory}
                                className="gap-1 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold h-7 text-xs">
                                {savingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                حفظ
                              </Button>
                              <Button size="sm" variant="ghost" onClick={cancelEdit}
                                className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground">
                                <X className="h-3 w-3" />إلغاء
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-red-500/10 shrink-0">
                                <TrendingDown className="h-3 w-3 text-red-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{expense.title}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted-foreground">{getRelativeTime(expense.createdAt)}</span>
                                  {expense.addedBy && (
                                    <span className="text-[10px] text-muted-foreground">بواسطة {expense.addedBy}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-sm font-bold text-red-400">{expense.amount.toFixed(2)} ج.م</span>
                              <Button variant="ghost" size="sm" onClick={() => startEdit(expense)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-[#D4AF37]">
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteExpense(expense.id)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
              )}
            </Card>
          )
        })
      )}

      {/* ── الشيفتات السابقة ───────────────────────────── */}
      {pastShifts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-muted-foreground">
              الشيفتات السابقة ({pastShifts.length})
            </h3>
            <Button size="sm" variant="ghost" onClick={() => setShowPastShifts(p => !p)}
              className="gap-1 text-muted-foreground hover:text-foreground text-xs">
              {showPastShifts ? <><ChevronUp className="h-4 w-4" />إخفاء</> : <><ChevronDown className="h-4 w-4" />إظهار</>}
            </Button>
          </div>

          {showPastShifts && (
            <>
              {filteredPastShifts.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">لا توجد شيفتات في هذه الفترة</p>
              ) : (
                filteredPastShifts.map(shift => (
                  <Card key={shift.id} className="border-border/40 bg-card">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <p className="text-sm font-medium">{new Date(shift.startedAt).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(shift.startedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })} —
                            {shift.endedAt ? new Date(shift.endedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}
                            {' | '}{shift.startedBy}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-sm font-bold text-[#D4AF37]">{shift.totalRevenue.toFixed(0)} ج.م</p>
                            <p className="text-[10px] text-muted-foreground">إيراد</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-red-400">{shift.totalExpenses.toFixed(0)} ج.م</p>
                            <p className="text-[10px] text-muted-foreground">مصروفات</p>
                          </div>
                          <div className="text-center">
                            <p className={`text-sm font-bold ${shift.netRevenue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{shift.netRevenue.toFixed(0)} ج.م</p>
                            <p className="text-[10px] text-muted-foreground">صافي</p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => downloadShiftExcel(shift)}
                            className="gap-2 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10">
                            <Download className="h-3.5 w-3.5" />XLSX
                          </Button>
                        </div>
                      </div>
                      {shift.notes && <p className="text-xs text-muted-foreground mt-2 border-t border-border/30 pt-2">ملاحظات: {shift.notes}</p>}
                    </CardContent>
                  </Card>
                ))
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
