'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingDown, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { ExpenseManager } from '../cashier/expense-manager'

interface CashierExpense {
  id: string
  title: string
  amount: number
  category: string
  shiftId: string
  addedBy: string
  createdAt: string
}

export function AdminExpensesTab() {
  const { toast } = useToast()
  const [expenses, setExpenses] = useState<CashierExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [currentShiftId, setCurrentShiftId] = useState('')

  // جلب حالة الشيفت
  useEffect(() => {
    const fetchShift = async () => {
      try {
        const res = await fetch('/api/shifts?current=true')
        if (res.ok) {
          const shift = await res.json()
          if (shift) {
            setCurrentShiftId(shift.id)
          }
        }
      } catch {
        /* ignore */
      }
    }
    fetchShift()
    const interval = setInterval(fetchShift, 10000)
    return () => clearInterval(interval)
  }, [])

  // جلب المصروفات
  const fetchExpenses = useCallback(async () => {
    try {
      const url = currentShiftId ? `/api/expenses?shiftId=${currentShiftId}` : '/api/expenses'
      const res = await fetch(url)
      if (res.ok) {
        setExpenses(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch expenses:', err)
    } finally {
      setLoading(false)
    }
  }, [currentShiftId])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
      </div>
    )
  }

  if (!currentShiftId) {
    return (
      <div className="py-12 text-center" dir="rtl">
        <TrendingDown className="mx-auto mb-4 h-16 w-16 text-muted-foreground/20" />
        <p className="text-lg text-muted-foreground">لا يوجد شيفت مفتوح — لا يمكن إضافة مصروفات</p>
      </div>
    )
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* ملخص سريع */}
      <Card className="border-[#D4AF37]/20 bg-[#D4AF37]/5">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">إجمالي مصروفات الشيفت الحالي</p>
            <p className="text-2xl font-bold text-red-400">{totalExpenses.toFixed(2)} ج.م</p>
          </div>
          <TrendingDown className="h-10 w-10 text-[#D4AF37]/30" />
        </CardContent>
      </Card>

      <ExpenseManager
        expenses={expenses}
        currentShiftId={currentShiftId}
        username="admin"
        onExpensesChanged={fetchExpenses}
        availableCash={Infinity}
        canManage={true}
      />
    </div>
  )
}
