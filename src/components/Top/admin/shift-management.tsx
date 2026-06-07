'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Loader2, PlayCircle, StopCircle, Download, ChevronDown, ChevronUp, Search, Calendar, TrendingUp
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
  const [pastShifts, setPastShifts] = useState<ShiftWithDetails[]>([])
  const [expenses, setExpenses] = useState<ExpenseItem[]>([])
  const [shiftOrders, setShiftOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [closingShift, setClosingShift] = useState(false)
  const [shiftNotes, setShiftNotes] = useState('')
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  // ── فلترة الشيفتات ─────────────────────────────────
  const [showPastShifts, setShowPastShifts] = useState(true)
  const [filterDate, setFilterDate] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [shiftRes, shiftsRes] = await Promise.all([
        fetch('/api/shifts?current=true'),
        fetch('/api/shifts'),
      ])
      if (shiftRes.ok) {
        const shift = await shiftRes.json()
        setCurrentShift(shift)
        if (shift) {
          const [expRes, ordRes] = await Promise.all([
            fetch(`/api/expenses?shiftId=${shift.id}`),
            fetch(`/api/orders?shiftId=${shift.id}&status=DELIVERED`),
          ])
          if (expRes.ok) setExpenses(await expRes.json())
          if (ordRes.ok) {
            const rawOrders = await ordRes.json()
            setShiftOrders(rawOrders.map(transformOrder))
          }
        } else {
          setCurrentShift(null)
          setExpenses([])
          setShiftOrders([])
        }
      } else {
        setCurrentShift(null)
        setExpenses([])
        setShiftOrders([])
      }
      if (shiftsRes.ok) {
        const all = await shiftsRes.json()
        setPastShifts(all.filter((s: ShiftWithDetails) => s.status === 'CLOSED'))
      }
    } catch (err) {
      console.error('Failed to fetch shift data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── فلترة الشيفتات السابقة ──────────────────────────
  const filteredShifts = useMemo(() => {
    return pastShifts.filter(shift => {
      const shiftDate = new Date(shift.startedAt)

      // فلتر يوم محدد
      if (filterDate) {
        const fd = new Date(filterDate)
        if (
          shiftDate.getFullYear() !== fd.getFullYear() ||
          shiftDate.getMonth() !== fd.getMonth() ||
          shiftDate.getDate() !== fd.getDate()
        ) return false
      }

      // فلتر من تاريخ
      if (filterFrom) {
        const from = new Date(filterFrom)
        from.setHours(0, 0, 0, 0)
        if (shiftDate < from) return false
      }

      // فلتر إلى تاريخ
      if (filterTo) {
        const to = new Date(filterTo)
        to.setHours(23, 59, 59, 999)
        if (shiftDate > to) return false
      }

      return true
    })
  }, [pastShifts, filterDate, filterFrom, filterTo])

  // ── إحصائيات الفترة المفلترة ────────────────────────
  const periodStats = useMemo(() => {
    const totalRev = filteredShifts.reduce((s, sh) => s + sh.totalRevenue, 0)
    const totalExp = filteredShifts.reduce((s, sh) => s + sh.totalExpenses, 0)
    const totalNet = filteredShifts.reduce((s, sh) => s + sh.netRevenue, 0)
    return { totalRev, totalExp, totalNet, count: filteredShifts.length }
  }, [filteredShifts])

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
        toast({ title: 'خطأ', description: (err as { error?: string }).error || 'فشل تصدير الشيفت', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الاتصال بالخادم', variant: 'destructive' })
    } finally {
      setClosingShift(false)
    }
  }

  const downloadExcel = async (shift: ShiftWithDetails) => {
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

  const totalRevenue = shiftOrders.reduce((s, o) => s + o.total, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)

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

      {/* Past Shifts Section */}
      {pastShifts.length > 0 && (
        <div className="space-y-3">

          {/* Header + toggle */}
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
              {/* فلاتر البحث */}
              <Card className="border-border/40 bg-card">
                <CardContent className="p-4 space-y-3">
                  <p className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                    <Search className="h-3.5 w-3.5" />بحث وفلترة
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* يوم محدد */}
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />يوم محدد
                      </label>
                      <input
                        type="date"
                        value={filterDate}
                        onChange={e => { setFilterDate(e.target.value); setFilterFrom(''); setFilterTo('') }}
                        className="w-full rounded-lg border border-border/50 bg-muted/50 px-3 py-1.5 text-sm text-right"
                      />
                    </div>
                    {/* من تاريخ */}
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">من تاريخ</label>
                      <input
                        type="date"
                        value={filterFrom}
                        onChange={e => { setFilterFrom(e.target.value); setFilterDate('') }}
                        className="w-full rounded-lg border border-border/50 bg-muted/50 px-3 py-1.5 text-sm text-right"
                      />
                    </div>
                    {/* إلى تاريخ */}
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">إلى تاريخ</label>
                      <input
                        type="date"
                        value={filterTo}
                        onChange={e => { setFilterTo(e.target.value); setFilterDate('') }}
                        className="w-full rounded-lg border border-border/50 bg-muted/50 px-3 py-1.5 text-sm text-right"
                      />
                    </div>
                  </div>
                  {(filterDate || filterFrom || filterTo) && (
                    <Button size="sm" variant="ghost" onClick={() => { setFilterDate(''); setFilterFrom(''); setFilterTo('') }}
                      className="text-xs text-muted-foreground hover:text-foreground">
                      مسح الفلتر ✕
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* إحصائيات الفترة */}
              {(filterDate || filterFrom || filterTo) && filteredShifts.length > 0 && (
                <Card className="border-[#D4AF37]/20 bg-[#D4AF37]/5">
                  <CardContent className="p-4">
                    <p className="text-xs font-bold text-[#D4AF37] flex items-center gap-1 mb-3">
                      <TrendingUp className="h-3.5 w-3.5" />إجمالي الفترة ({periodStats.count} شيفت)
                    </p>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-base font-bold text-[#D4AF37]">{periodStats.totalRev.toFixed(0)} ج.م</p>
                        <p className="text-[10px] text-muted-foreground">إجمالي الإيراد</p>
                      </div>
                      <div>
                        <p className="text-base font-bold text-red-400">{periodStats.totalExp.toFixed(0)} ج.م</p>
                        <p className="text-[10px] text-muted-foreground">إجمالي المصروفات</p>
                      </div>
                      <div>
                        <p className={`text-base font-bold ${periodStats.totalNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {periodStats.totalNet.toFixed(0)} ج.م
                        </p>
                        <p className="text-[10px] text-muted-foreground">صافي الإيراد</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* قائمة الشيفتات */}
              {filteredShifts.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">لا توجد شيفتات في هذه الفترة</p>
              ) : (
                filteredShifts.map(shift => (
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
                          <Button size="sm" variant="outline" onClick={() => downloadExcel(shift)}
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

      {/* Close Shift Dialog */}
      {showCloseConfirm && (
        <Dialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
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
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowCloseConfirm(false)} className="border-border/50">إلغاء</Button>
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