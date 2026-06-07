'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, TrendingDown, Loader2, AlertCircle, Pencil, X, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { getRelativeTime, safeParseFloat, playNotificationSound } from '@/lib/saraya/helpers'

const EXPENSE_CATEGORIES = ['خامات', 'رواتب', 'إيجار', 'فواتير', 'صيانة', 'تسويق', 'عام' , 'سلف العماله' , 'تحميلات']

interface CashierExpense {
  id: string
  title: string
  amount: number
  category: string
  shiftId: string
  addedBy: string
  createdAt: string
}

interface ExpenseManagerProps {
  expenses: CashierExpense[]
  currentShiftId: string
  username: string
  onExpensesChanged: () => void
  availableCash: number
  /** لو true يبقى يقدر يضيف ويعدل ويحذف — لو false يبقى عرض فقط */
  canManage?: boolean
}

export function ExpenseManager({ expenses, currentShiftId, username, onExpensesChanged, availableCash, canManage = true }: ExpenseManagerProps) {
  const { toast } = useToast()

  const [expenseTitle, setExpenseTitle] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('عام')
  const [savingExpense, setSavingExpense] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // تعديل مصروف
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editCategory, setEditCategory] = useState('عام')
  const [savingEdit, setSavingEdit] = useState(false)

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  const addExpense = async () => {
    if (!expenseTitle || !expenseAmount) return
    setError(null)
    const parsedAmount = safeParseFloat(expenseAmount, -1)
    if (parsedAmount < 0) {
      toast({ title: 'خطأ', description: 'المبلغ غير صالح', variant: 'destructive' })
      return
    }

    if (parsedAmount > availableCash) {
      const errorMsg = `لا يمكن إضافة مصروف بقيمة ${parsedAmount.toFixed(2)}. `
      setError(errorMsg)
      playNotificationSound()
      toast({
        title: 'عفواً! نقص في السيولة',
        description: errorMsg,
        variant: 'destructive',
      })
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
          shiftId: currentShiftId,
          addedBy: username,
        }),
      })
      if (res.ok) {
        toast({ title: 'تم إضافة المصروف', description: `${expenseTitle} - ${parsedAmount.toFixed(2)} ج.م` })
        setExpenseTitle('')
        setExpenseAmount('')
        setExpenseCategory('عام')
        onExpensesChanged()
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في حفظ المصروف', variant: 'destructive' })
    } finally {
      setSavingExpense(false)
    }
  }

  const startEdit = (expense: CashierExpense) => {
    setEditingId(expense.id)
    setEditTitle(expense.title)
    setEditAmount(expense.amount.toString())
    setEditCategory(expense.category)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
    setEditAmount('')
    setEditCategory('عام')
  }

  const saveEdit = async (id: string) => {
    const parsedAmount = safeParseFloat(editAmount, -1)
    if (!editTitle || parsedAmount < 0) {
      toast({ title: 'خطأ', description: 'بيانات المصروف غير صالحة', variant: 'destructive' })
      return
    }

    setSavingEdit(true)
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          amount: parsedAmount,
          category: editCategory,
        }),
      })
      if (res.ok) {
        toast({ title: 'تم تعديل المصروف', description: `${editTitle} - ${parsedAmount.toFixed(2)} ج.م` })
        cancelEdit()
        onExpensesChanged()
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
      onExpensesChanged()
    } catch (err) {
      console.error('Failed to delete expense:', err)
    }
  }

  return (
    <div className="space-y-4">
      {/* Add Expense Form — للكاشير والأدمن */}
      {canManage && (
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4 text-[#D4AF37]" />إضافة مصروف جديد
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>المبلغ (ج.م)</Label>
                <Input type="number" placeholder="0.00" value={expenseAmount} onChange={e => { setExpenseAmount(e.target.value); setError(null) }}
                  className="bg-muted/50 border-border/50 text-right" />
              </div>
              <div className="space-y-2">
                <Label>اسم المصروف</Label>
                <Input placeholder="مثال: خامات، رواتب..." value={expenseTitle} onChange={e => { setExpenseTitle(e.target.value); setError(null) }}
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

            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}

            <Button onClick={addExpense} disabled={savingExpense || !expenseTitle || !expenseAmount}
              className="w-full gap-2 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold">
              {savingExpense ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              إضافة المصروف
            </Button>
          </CardContent>
        </Card>
      )}

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
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {expenses.map(expense => (
            <motion.div key={expense.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card className={`border-border/40 bg-card ${editingId === expense.id ? 'ring-1 ring-[#D4AF37]/50' : ''}`}>
                <CardContent className="p-3" dir="rtl">
                  {editingId === expense.id ? (
                    /* ─── وضع التعديل ─── */
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">اسم المصروف</Label>
                          <Input
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            className="bg-muted/50 border-border/50 text-right text-sm h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">المبلغ (ج.م)</Label>
                          <Input
                            type="number"
                            value={editAmount}
                            onChange={e => setEditAmount(e.target.value)}
                            className="bg-muted/50 border-border/50 text-right text-sm h-9"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">الفئة</Label>
                        <Select value={editCategory} onValueChange={setEditCategory} dir="rtl">
                          <SelectTrigger className="bg-muted/50 border-border/50 text-sm h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => saveEdit(expense.id)}
                          disabled={savingEdit || !editTitle || !editAmount}
                          className="gap-1 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold h-8 text-xs"
                        >
                          {savingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          حفظ
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground">
                          <X className="h-3 w-3" />
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* ─── وضع العرض ─── */
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
                          <TrendingDown className="h-4 w-4 text-red-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{expense.title}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] border-border/50">{expense.category}</Badge>
                            <span className="text-[10px] text-muted-foreground">{getRelativeTime(expense.createdAt)}</span>
                            {expense.addedBy && (
                              <span className="text-[10px] text-muted-foreground">بواسطة {expense.addedBy}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-red-400">{expense.amount.toFixed(2)} ج.م</span>
                        {canManage && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => startEdit(expense)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-[#D4AF37]">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteExpense(expense.id)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
