'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, PlayCircle, StopCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import type { Order, ShiftWithDetails, ExpenseItem } from '@/lib/saraya/types'
import { transformOrder } from '@/lib/saraya/helpers'

interface ShiftManagementProps {
  adminUsername: string
}

export function ShiftManagement({ adminUsername }: ShiftManagementProps) {
  const { toast } = useToast()
  const [currentShift, setCurrentShift] = useState<ShiftWithDetails | null>(null)
  const [adminExpenses, setAdminExpenses] = useState<ExpenseItem[]>([])
  const [shiftOrders, setShiftOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [closingShift, setClosingShift] = useState(false)
  const [shiftNotes, setShiftNotes] = useState('')
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const shiftRes = await fetch('/api/shifts?current=true')
      if (shiftRes.ok) {
        const shift = await shiftRes.json()
        setCurrentShift(shift)
        if (shift) {
          const [admExpRes, ordRes] = await Promise.all([
            fetch('/api/expenses?adminExpense=true'),
            fetch(`/api/orders?shiftId=${shift.id}&status=DELIVERED`),
          ])
          if (admExpRes.ok) setAdminExpenses(await admExpRes.json())
          if (ordRes.ok) {
            const rawOrders = await ordRes.json()
            setShiftOrders(rawOrders.map(transformOrder))
          }
        } else {
          setCurrentShift(null)
          setAdminExpenses([])
          setShiftOrders([])
        }
      } else {
        setCurrentShift(null)
        setAdminExpenses([])
        setShiftOrders([])
      }
    } catch (err) {
      console.error('Failed to fetch shift data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const startNewShift = async () => {
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startedBy: adminUsername }),
      })
      if (res.ok) {
        toast({ title: 'تم بدء شيفت جديد' })
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
        toast({ title: 'تم إغلاق الشيفت', description: 'تم تصدير التقرير بنجاح' })
        setShowCloseConfirm(false)
        fetchData()
      } else {
        const err = await res.json().catch(() => ({}))
        const msg = (err as { error?: string }).error || 'فشل تصدير الشيفت'
        setCloseError(msg)
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الاتصال بالخادم', variant: 'destructive' })
    } finally {
      setClosingShift(false)
    }
  }

  const totalRevenue = shiftOrders.reduce((s, o) => s + o.total, 0)
  const totalExpenses = adminExpenses.reduce((s, e) => s + e.amount, 0)

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" /></div>

  return (
    <div className="space-y-6" dir="rtl">

      {/* Current Shift */}
      {currentShift ? (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h3 className="text-green-400 flex items-center gap-2 text-lg font-semibold">
                <PlayCircle className="h-5 w-5" />الشيفت الحالي — مفتوح
              </h3>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">نشط</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'الإيرادات', value: `${totalRevenue.toFixed(2)} ج.م`, color: 'text-[#D4AF37]' },
                { label: 'المصروفات', value: `${totalExpenses.toFixed(2)} ج.م`, color: 'text-red-400' },
                { label: 'صافي الإيراد', value: `${(totalRevenue - totalExpenses).toFixed(2)} ج.م`, color: totalRevenue - totalExpenses >= 0 ? 'text-emerald-400' : 'text-red-400' },
                { label: 'طلبات مكتملة', value: shiftOrders.length, color: 'text-blue-400' },
              ].map((s, i) => (
                <Card key={i} className="border-border/40 bg-card">
                  <CardContent className="p-3">
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              بدأ: {new Date(currentShift.startedAt).toLocaleString('ar-EG')} — بواسطة {currentShift.startedBy}
            </div>

            <Button onClick={() => setShowCloseConfirm(true)} className="gap-2 bg-red-600 text-white hover:bg-red-500 font-bold">
              <StopCircle className="h-4 w-4" />إنهاء الشيفت وتسليم الإيراد
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/40 bg-card">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <StopCircle className="h-12 w-12 text-muted-foreground/30 mx-auto" />
              <p className="text-muted-foreground">لا يوجد شيفت مفتوح حالياً</p>
              <Button onClick={startNewShift} className="gap-2 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold">
                <PlayCircle className="h-4 w-4" />بدء شيفت جديد
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Close Shift Dialog */}
      {showCloseConfirm && (
        <Dialog open={showCloseConfirm} onOpenChange={(open) => { setShowCloseConfirm(open); if (!open) setCloseError(null) }}>
          <DialogContent className="bg-card border-border/50" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-red-400 flex items-center gap-2">
                <StopCircle className="h-5 w-5" />إنهاء الشيفت
              </DialogTitle>
              <DialogDescription>سيتم تسجيل الإيرادات والمصروفات وإغلاق الشيفت الحالي.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-lg font-bold text-[#D4AF37]">{totalRevenue.toFixed(0)} ج.م</p>
                  <p className="text-xs text-muted-foreground">إيراد</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-lg font-bold text-red-400">{totalExpenses.toFixed(0)} ج.م</p>
                  <p className="text-xs text-muted-foreground">مصروفات</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className={`text-lg font-bold ${totalRevenue - totalExpenses >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{(totalRevenue - totalExpenses).toFixed(0)} ج.م</p>
                  <p className="text-xs text-muted-foreground">صافي</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>ملاحظات (اختياري)</Label>
                <textarea
                  className="w-full rounded-lg border border-border/50 bg-muted/50 p-3 text-sm resize-none text-right"
                  rows={3}
                  placeholder="أي ملاحظات عن الشيفت..."
                  value={shiftNotes}
                  onChange={e => setShiftNotes(e.target.value)}
                />
              </div>
            </div>
            {closeError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 text-center">
                {closeError}
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setShowCloseConfirm(false); setCloseError(null) }} className="border-border/50">إلغاء</Button>
              <Button onClick={closeShift} disabled={closingShift} className="gap-2 bg-red-600 text-white hover:bg-red-500 font-bold">
                {closingShift ? <Loader2 className="h-4 w-4 animate-spin" /> : <StopCircle className="h-4 w-4" />}
                إنهاء الشيفت
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
