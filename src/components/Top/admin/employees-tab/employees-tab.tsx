'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Plus, Pencil, X, Check, Loader2, DollarSign, Calendar, Trash2,
  Search, ChevronDown, ChevronUp, Clock, Wallet, BadgePercent, BarChart3,
  ArrowLeft, UserSquare2, BookText, SunSnow, Timer, AlertTriangle
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { MonthlyAttendanceTable } from './monthly-attendance-table'

interface Employee {
  id: string; name: string; jobTitle: string; specialization: string
  salary: number; dailyHours: number; isActive: boolean
  _count?: { expenses: number; attendances: number }
}

interface EmployeeStats {
  id: string; name: string; jobTitle: string; specialization: string
  salary: number; dailyHours: number
  totalLoans: number; deductions: number; remainingSalary: number
  loans: { amount: number; description: string; createdAt: string; createdBy: string }[]
  attendances: { type: string; date: string | null; quantity: number; notes: string }[]
  dailyLogs?: { id: string; date: string; clockIn: string | null; clockOut: string | null; status: string; overtimeMinutes: number }[]
}

const JOB_TITLES = ['شيف', 'ويتر', 'كاشير', 'مساعد شيف', 'مدير', 'أخرى']
const SPECIALIZATIONS: Record<string, string[]> = {
  'شيف': ['سخن', 'مشويات', 'أوربي', 'بيتزا', 'مقبلات', 'حلويات', 'عام'],
  'ويتر': ['صالة', 'VIP', 'توصيل', 'عام'],
  'كاشير': ['كاشير', 'عام'],
  'مساعد شيف': ['سخن', 'مشويات', 'أوربي', 'عام'],
  'مدير': ['مدير المطعم', 'مدير وردية', 'عام'],
  'أخرى': ['عام'],
}

const JOB_ORDER = ['كاشير', 'ويتر', 'شيف', 'مساعد شيف', 'مدير', 'أخرى']

const JOB_COLORS: Record<string, string> = {
  'شيف': 'from-orange-500/20 to-orange-600/10 border-orange-500/20',
  'ويتر': 'from-blue-500/20 to-blue-600/10 border-blue-500/20',
  'كاشير': 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20',
  'مساعد شيف': 'from-purple-500/20 to-purple-600/10 border-purple-500/20',
  'مدير': 'from-red-500/20 to-red-600/10 border-red-500/20',
  'أخرى': 'from-gray-500/20 to-gray-600/10 border-gray-500/20',
}

export function EmployeesTab({ username }: { username: string }) {
  const { toast } = useToast()
  const searchRef = useRef<HTMLInputElement>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [stats, setStats] = useState<EmployeeStats[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')

  // Add form
  const [newName, setNewName] = useState('')
  const [newJob, setNewJob] = useState('شيف')
  const [newSpec, setNewSpec] = useState('')
  const [newSalary, setNewSalary] = useState('')
  const [newDailyHours, setNewDailyHours] = useState('8')
  const [saving, setSaving] = useState(false)

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editJob, setEditJob] = useState('')
  const [editSpec, setEditSpec] = useState('')
  const [editSalary, setEditSalary] = useState('')
  const [editDailyHours, setEditDailyHours] = useState('8')

  // Detail
  const [detailId, setDetailId] = useState<string | null>(null)

  // Monthly attendance
  const [attMonth, setAttMonth] = useState(new Date().getMonth() + 1)
  const [attYear, setAttYear] = useState(new Date().getFullYear())

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const initialLoadDone = useRef(false)

  // Keyboard shortcut for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === 'k') || (!e.ctrlKey && !e.metaKey && e.key === '/' && e.target === document.body)) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const [empRes, statsRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/employees/stats'),
      ])
      if (empRes.ok) {
        const data: Employee[] = await empRes.json()
        setEmployees(data)
        if (!initialLoadDone.current) {
          initialLoadDone.current = true
          setExpandedGroups(new Set(data.map(e => e.jobTitle || 'أخرى')))
        }
      }
      if (statsRes.ok) setStats(await statsRes.json())
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحميل بيانات العمال', variant: 'destructive' })
    } finally { setLoading(false) }
  }, [toast])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAdd = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), jobTitle: newJob, specialization: newSpec, salary: parseFloat(newSalary) || 0, dailyHours: parseFloat(newDailyHours) || 8 }),
      })
      if (res.ok) {
        toast({ title: '✅ تم', description: `إضافة ${newName.trim()}` })
        setNewName(''); setNewSpec(''); setNewSalary(''); setNewDailyHours('8'); setShowAdd(false)
        fetchData()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: (data as { error?: string }).error || 'فشل الإضافة', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الاتصال', variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const handleEdit = async (id: string) => {
    if (!editName.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), jobTitle: editJob, specialization: editSpec, salary: parseFloat(editSalary) || 0, dailyHours: parseFloat(editDailyHours) || 8 }),
      })
      if (res.ok) {
        toast({ title: '✅ تم التعديل' })
        setEditingId(null)
        fetchData()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: (data as { error?: string }).error || 'فشل التعديل', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الاتصال', variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${name}"؟`)) return
    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: '🗑️ تم الحذف', description: name })
        fetchData()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: (data as { error?: string }).error || 'فشل الحذف', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الاتصال بالخادم', variant: 'destructive' })
    }
  }

  const [attQuantity, setAttQuantity] = useState('1')
  const [attType, setAttType] = useState('VACATION')
  const [attNotes, setAttNotes] = useState('')
  const [savingAtt, setSavingAtt] = useState(false)

  const addAttendance = async (empId: string) => {
    const qty = parseFloat(attQuantity)
    if (!qty || qty <= 0) return
    setSavingAtt(true)
    try {
      const res = await fetch(`/api/employees/${empId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: qty, type: attType, notes: attNotes, createdBy: username }),
      })
      if (res.ok) {
        toast({ title: '✅ تم الإضافة', description: `${attType === 'VACATION' ? 'أجازة' : 'خصم'} - ${qty} يوم` })
        setAttQuantity('1'); setAttNotes('')
        fetchData()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'خطأ', description: (data as { error?: string }).error || 'فشل الإضافة', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الاتصال', variant: 'destructive' })
    } finally { setSavingAtt(false) }
  }

  const empStats = detailId ? stats.find(s => s.id === detailId) : null
  const detailEmp = detailId ? employees.find(e => e.id === detailId) : null

  // Aggregate stats
  const totalSalary = employees.reduce((s, e) => s + e.salary, 0)
  const totalLoans = stats.reduce((s, st) => s + st.totalLoans, 0)
  const totalRemaining = stats.reduce((s, st) => s + st.remainingSalary, 0)
  const employeeCount = employees.length

  // Group employees by job title
  const grouped = employees.reduce((acc, emp) => {
    const g = emp.jobTitle || 'أخرى'
    if (!acc[g]) acc[g] = []
    acc[g].push(emp)
    return acc
  }, {} as Record<string, Employee[]>)

  const sortedGroups = Object.keys(grouped).sort((a, b) => {
    const ia = JOB_ORDER.indexOf(a); const ib = JOB_ORDER.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1; if (ib !== -1) return 1
    return a.localeCompare(b)
  })

  const searchFilter = (emp: Employee) =>
    emp.name.includes(search) || emp.jobTitle.includes(search) || emp.specialization.includes(search)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-[#D4AF37]" />
          <p className="text-sm text-muted-foreground">جاري تحميل بيانات العمال...</p>
        </div>
      </div>
    )
  }

  // ==================== DETAIL VIEW ====================
  if (detailId && empStats && detailEmp) {
    return (
      <div className="space-y-5" dir="rtl">
        {/* Back button + name header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setDetailId(null)}
            className="text-muted-foreground hover:text-foreground gap-1">
            <ArrowLeft className="h-4 w-4" />رجوع
          </Button>
          <div className="h-6 w-px bg-border/50" />
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 flex items-center justify-center">
              <Users className="h-5 w-5 text-[#D4AF37]" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{detailEmp.name}</h2>
              <p className="text-xs text-muted-foreground">{detailEmp.jobTitle}{detailEmp.specialization ? ` - ${detailEmp.specialization}` : ''}</p>
            </div>
          </div>
        </div>

        {/* Summary grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard icon={Wallet} label="المرتب" value={`${detailEmp.salary.toFixed(0)} ج`} color="text-emerald-400" bg="bg-emerald-500/10" />
          <SummaryCard icon={Clock} label="ساعات/يوم" value={`${detailEmp.dailyHours || 8} س`} color="text-blue-400" bg="bg-blue-500/10" />
          <SummaryCard icon={BadgePercent} label="الخصومات" value={`${empStats.deductions.toFixed(0)} ج`} color="text-red-400" bg="bg-red-500/10" />
          <SummaryCard icon={DollarSign} label="صافي المستحق" value={`${empStats.remainingSalary.toFixed(0)} ج`}
            color={empStats.remainingSalary >= 0 ? 'text-emerald-400' : 'text-red-400'}
            bg={empStats.remainingSalary >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Loans */}
          <Card className="border-red-500/15 bg-gradient-to-br from-red-500/[0.03] to-transparent overflow-hidden">
            <CardHeader className="pb-2 pt-3 px-4 border-b border-red-500/10">
              <p className="text-sm font-bold flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <DollarSign className="h-3.5 w-3.5 text-red-400" />
                </div>
                السلف
                <Badge variant="outline" className="text-[10px] border-red-400/20 text-red-400">{empStats.loans.length}</Badge>
              </p>
            </CardHeader>
            <CardContent className="p-3">
              {empStats.loans.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">لا توجد سلف</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {empStats.loans.map((loan, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-red-500/5 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm truncate">{loan.description}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(loan.createdAt).toLocaleDateString('ar-EG')} · {loan.createdBy}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-red-400 shrink-0">{loan.amount.toFixed(0)} ج</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vacations & Deductions */}
          <Card className="border-blue-500/15 bg-gradient-to-br from-blue-500/[0.03] to-transparent overflow-hidden">
            <CardHeader className="pb-2 pt-3 px-4 border-b border-blue-500/10">
              <p className="text-sm font-bold flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <SunSnow className="h-3.5 w-3.5 text-blue-400" />
                </div>
                الأجازات والخصم
                <Badge variant="outline" className="text-[10px] border-blue-400/20 text-blue-400">{empStats.attendances.length}</Badge>
              </p>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              {/* Add form */}
              <div className="flex flex-wrap gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">النوع</Label>
                  <div className="flex gap-1">
                    <button onClick={() => setAttType('VACATION')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${attType === 'VACATION' ? 'bg-blue-500/15 text-blue-400 border border-blue-400/20' : 'bg-muted/30 text-muted-foreground border border-transparent hover:border-border/30'}`}>
                      أجازة
                    </button>
                    <button onClick={() => setAttType('ABSENCE')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${attType === 'ABSENCE' ? 'bg-red-500/15 text-red-400 border border-red-400/20' : 'bg-muted/30 text-muted-foreground border border-transparent hover:border-border/30'}`}>
                      خصم
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">الأيام</Label>
                  <Input type="number" step="0.5" min="0.5" value={attQuantity} onChange={e => setAttQuantity(e.target.value)}
                    className="bg-muted/30 border-border/40 h-8 text-xs w-20 text-center" />
                </div>
                <div className="space-y-1 flex-1 min-w-[100px]">
                  <Label className="text-[10px] text-muted-foreground">ملاحظات</Label>
                  <input value={attNotes} onChange={e => setAttNotes(e.target.value)}
                    className="w-full rounded-lg border border-border/40 bg-muted/30 px-2 py-1.5 text-xs h-8"
                    placeholder="اختياري" />
                </div>
                <Button size="sm" onClick={() => addAttendance(detailId)} disabled={savingAtt || !attQuantity || parseFloat(attQuantity) <= 0}
                  className="bg-blue-500 text-white hover:bg-blue-400 h-8 text-xs gap-1 shadow-sm shadow-blue-500/20">
                  {savingAtt ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  إضافة
                </Button>
              </div>

              {/* List */}
              {empStats.attendances.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">لا توجد أيام مسجلة</p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {empStats.attendances.map((att: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/20">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                          att.type === 'VACATION' ? 'bg-blue-500/10' : 'bg-red-500/10'
                        }`}>
                          {att.type === 'VACATION' ? <SunSnow className="h-3 w-3 text-blue-400" /> : <AlertTriangle className="h-3 w-3 text-red-400" />}
                        </div>
                        <span className="text-sm font-medium">{att.type === 'VACATION' ? 'أجازة' : 'خصم'}</span>
                        <Badge variant="outline" className={`text-[10px] ${att.type === 'VACATION' ? 'border-blue-400/20 text-blue-400' : 'border-red-400/20 text-red-400'}`}>
                          {att.quantity || 1} يوم
                        </Badge>
                        {att.notes && <span className="text-xs text-muted-foreground hidden sm:inline">· {att.notes}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Monthly Attendance */}
        <Card className="border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.02] to-transparent">
          <CardHeader className="pb-2 pt-3 px-4 border-b border-emerald-500/10 flex flex-row items-center justify-between">
            <p className="text-sm font-bold flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Calendar className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              سجل الحضور الشهري
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => { const d = new Date(attYear, attMonth - 2); setAttMonth(d.getMonth() + 1); setAttYear(d.getFullYear()) }}
                className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-sm">‹</button>
              <span className="text-xs font-medium min-w-[100px] text-center">
                {new Date(attYear, attMonth - 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => { const d = new Date(attYear, attMonth); setAttMonth(d.getMonth() + 1); setAttYear(d.getFullYear()) }}
                className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-sm">›</button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <MonthlyAttendanceTable
              employeeId={detailId} month={attMonth} year={attYear}
              dailyHours={detailEmp.dailyHours || 8} salary={detailEmp.salary}
              key={`${attMonth}-${attYear}`} />
          </CardContent>
        </Card>
      </div>
    )
  }

  // ==================== LIST VIEW ====================
  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-[#D4AF37]" />
            العمال
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">{employeeCount} موظف</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}
          className={`gap-2 transition-all ${showAdd ? 'bg-red-500 hover:bg-red-400 text-white' : 'bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90'} font-bold shadow-lg ${showAdd ? 'shadow-red-500/20' : 'shadow-[#D4AF37]/20'}`}>
          {showAdd ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showAdd ? 'إلغاء' : 'إضافة عامل'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Users} label="الموظفين" value={String(employeeCount)} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard icon={Wallet} label="إجمالي المرتبات" value={`${totalSalary.toFixed(0)} ج`} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard icon={DollarSign} label="إجمالي السلف" value={`${totalLoans.toFixed(0)} ج`} color="text-red-400" bg="bg-red-500/10" />
        <StatCard icon={BarChart3} label="صافي المستحق" value={`${totalRemaining.toFixed(0)} ج`} color="text-[#D4AF37]" bg="bg-[#D4AF37]/10" />
      </div>

      {/* Search */}
      <div className="relative group">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-[#D4AF37] transition-colors z-10" />
        <Input
          ref={searchRef}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو الوظيفة... (Ctrl+K)"
          className="pr-12 bg-muted/30 border-border/40 h-12 text-base rounded-xl focus-visible:ring-[#D4AF37]/30 focus-visible:border-[#D4AF37]/50 transition-all"
        />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
        <kbd className="absolute left-12 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 rounded border border-border/50 bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">/</kbd>
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="border-[#D4AF37]/20 bg-gradient-to-br from-[#D4AF37]/[0.03] to-transparent overflow-hidden">
              <CardContent className="p-5">
<div className="text-sm font-bold mb-4 flex items-center gap-2">
  <div className="w-6 h-6 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
    <Plus className="h-3.5 w-3.5 text-[#D4AF37]" />
  </div>
  إضافة موظف جديد
</div>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">الاسم</Label>
                    <Input value={newName} onChange={e => setNewName(e.target.value)}
                      className="bg-muted/30 border-border/40 h-10 text-right" placeholder="اسم الموظف" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">الوظيفة</Label>
                    <select value={newJob} onChange={e => { setNewJob(e.target.value); setNewSpec('') }}
                      className="w-full rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-sm h-10">
                      {JOB_TITLES.map(j => <option key={j} value={j}>{j}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">التخصص</Label>
                    <select value={newSpec} onChange={e => setNewSpec(e.target.value)}
                      className="w-full rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-sm h-10">
                      <option value="">اختر...</option>
                      {(SPECIALIZATIONS[newJob] || []).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">المرتب الشهري</Label>
                    <Input type="number" value={newSalary} onChange={e => setNewSalary(e.target.value)}
                      className="bg-muted/30 border-border/40 h-10 text-right" placeholder="0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">ساعات العمل/يوم</Label>
                    <Input type="number" step="0.5" value={newDailyHours} onChange={e => setNewDailyHours(e.target.value)}
                      className="bg-muted/30 border-border/40 h-10 text-right" placeholder="8" />
                  </div>
                </div>
                <Button onClick={handleAdd} disabled={saving || !newName.trim()}
                  className="mt-4 w-full gap-2 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 font-bold h-10 shadow-lg shadow-[#D4AF37]/20">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  إضافة الموظف
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grouped Employee Cards */}
      {sortedGroups.length === 0 ? (
        <div className="py-20 text-center">
          <Users className="mx-auto mb-4 h-16 w-16 text-muted-foreground/20" />
          <p className="text-base text-muted-foreground">
            {search ? `لا توجد نتائج لـ "${search}"` : 'لا يوجد عمال. اضف العمال لإدارة السلف والأجازات.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedGroups.map(group => {
            const filtered = grouped[group].filter(searchFilter)
            if (filtered.length === 0) return null
            const isExpanded = expandedGroups.has(group)
            const groupColor = JOB_COLORS[group] || JOB_COLORS['أخرى']
            const groupTotalSalary = filtered.reduce((s, e) => s + e.salary, 0)
            const groupTotalLoans = filtered.reduce((s, e) => s + (stats.find(st => st.id === e.id)?.totalLoans || 0), 0)
            return (
              <Card key={group} className="border-border/40 overflow-hidden">
                <button onClick={() => {
                  const next = new Set(expandedGroups)
                  isExpanded ? next.delete(group) : next.add(group)
                  setExpandedGroups(next)
                }}
                  className={`w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r ${groupColor} transition-colors`}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{group}</span>
                    <Badge variant="outline" className="text-[10px] border-border/30 text-muted-foreground">{filtered.length}</Badge>
                    <span className="text-[10px] text-muted-foreground hidden sm:inline">
                      مرتب {groupTotalSalary.toFixed(0)} ج · سلف {groupTotalLoans.toFixed(0)} ج
                    </span>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden">
                      <div className="divide-y divide-border/10">
                        {filtered.map(emp => {
                          const s = stats.find(st => st.id === emp.id)
                          const salaryRatio = emp.salary > 0 ? Math.min((s?.totalLoans || 0) / emp.salary, 1) : 0
                          return (
                            <motion.div key={emp.id} layout
                              className="group cursor-pointer hover:bg-muted/20 transition-colors"
                              onClick={() => setDetailId(emp.id)}>
                              {editingId === emp.id ? (
                                // Inline Edit
                                <div className="p-4 space-y-2" onClick={e => e.stopPropagation()}>
                                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                    <Input value={editName} onChange={e => setEditName(e.target.value)}
                                      className="bg-muted/30 border-border/40 text-xs h-8 col-span-2" placeholder="الاسم" />
                                    <select value={editJob} onChange={e => { setEditJob(e.target.value); setEditSpec('') }}
                                      className="rounded-lg border border-border/40 bg-muted/30 px-2 text-xs h-8">
                                      {JOB_TITLES.map(j => <option key={j} value={j}>{j}</option>)}
                                    </select>
                                    <select value={editSpec} onChange={e => setEditSpec(e.target.value)}
                                      className="rounded-lg border border-border/40 bg-muted/30 px-2 text-xs h-8">
                                      <option value="">تخصص</option>
                                      {(SPECIALIZATIONS[editJob] || []).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <Input type="number" value={editSalary} onChange={e => setEditSalary(e.target.value)}
                                      className="bg-muted/30 border-border/40 text-xs h-8" placeholder="المرتب" />
                                    <Input type="number" step="0.5" value={editDailyHours} onChange={e => setEditDailyHours(e.target.value)}
                                      className="bg-muted/30 border-border/40 text-xs h-8" placeholder="ساعات/يوم" />
                                  </div>
                                  <div className="flex gap-2 pt-1">
                                    <Button size="sm" onClick={() => handleEdit(emp.id)} disabled={saving || !editName.trim()}
                                      className="bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 h-8 text-xs gap-1 px-4">
                                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                      حفظ
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}
                                      className="h-8 text-xs">إلغاء</Button>
                                  </div>
                                </div>
                              ) : (
                                // Card content
                                <div className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${groupColor.replace('border', 'from').replace('/20', '/15').replace('/10', '/10')} flex items-center justify-center shrink-0`}>
                                        <Users className="h-4 w-4 text-foreground/70" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-bold text-sm truncate">{emp.name}</p>
                                        <p className="text-[11px] text-muted-foreground truncate">{emp.jobTitle}{emp.specialization ? ` - ${emp.specialization}` : ''}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={e => { e.stopPropagation(); setEditingId(emp.id); setEditName(emp.name); setEditJob(emp.jobTitle); setEditSpec(emp.specialization); setEditSalary(String(emp.salary)); setEditDailyHours(String(emp.dailyHours || 8)) }}
                                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-[#D4AF37] transition-colors">
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button onClick={e => { e.stopPropagation(); handleDelete(emp.id, emp.name) }}
                                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-red-400 transition-colors">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 mt-2">
                                    <div className="flex items-center gap-1.5 text-[11px]">
                                      <Wallet className="h-3 w-3 text-emerald-400" />
                                      <span className="font-medium text-emerald-400">{emp.salary.toFixed(0)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px]">
                                      <DollarSign className="h-3 w-3 text-red-400" />
                                      <span className="font-medium text-red-400">{s ? s.totalLoans.toFixed(0) : 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px]">
                                      <Clock className="h-3 w-3 text-blue-400" />
                                      <span className="font-medium text-blue-400">{emp.dailyHours || 8}h</span>
                                    </div>
                                    {s && (
                                      <div className={`mr-auto text-[11px] font-medium ${s.remainingSalary >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {s.remainingSalary >= 0 ? '+' : ''}{s.remainingSalary.toFixed(0)} ج
                                      </div>
                                    )}
                                  </div>
                                  {/* Loan progress bar */}
                                  {s && s.totalLoans > 0 && (
                                    <div className="mt-2 h-1 rounded-full bg-muted/50 overflow-hidden">
                                      <div className="h-full rounded-full bg-gradient-to-r from-red-400 to-red-500 transition-all"
                                        style={{ width: `${Math.min(salaryRatio * 100, 100)}%` }} />
                                    </div>
                                  )}
                                </div>
                              )}
                            </motion.div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color, bg }: {
  icon: any; label: string; value: string; color: string; bg: string
}) {
  return (
    <div className={`rounded-xl ${bg} border border-border/40 p-4 transition-all hover:scale-[1.02]`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-5 w-5 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`text-xl sm:text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value, color, bg }: {
  icon: any; label: string; value: string; color: string; bg: string
}) {
  return (
    <div className={`rounded-xl ${bg} border border-border/40 p-4`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <p className={`text-base font-bold ${color}`}>{value}</p>
    </div>
  )
}
