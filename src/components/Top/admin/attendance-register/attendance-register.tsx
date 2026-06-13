'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Clock, Check, XCircle, Loader2, Download, Users,
  LogIn, LogOut, UserX, AlertCircle, ChevronDown, ChevronUp,
  Timer, Coffee, Zap, BarChart3
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

interface Employee {
  id: string; name: string; jobTitle: string; specialization: string; dailyHours: number; isActive: boolean
}

interface DailyLog {
  id: string; employeeId: string; date: string; clockIn: string | null; clockOut: string | null; status: string; overtimeMinutes: number
}

const JOB_ORDER = ['كاشير', 'ويتر', 'شيف', 'مساعد شيف', 'مدير', 'أخرى']

export function AttendanceRegister({ username }: { username: string }) {
  const { toast } = useToast()
  const searchRef = useRef<HTMLInputElement>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [todayLogs, setTodayLogs] = useState<Record<string, DailyLog>>({})
  const [loading, setLoading] = useState(true)
  const [logging, setLogging] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const initialLoadDone = useRef(false)
  const [animatingId, setAnimatingId] = useState<string | null>(null)

  // Keyboard shortcut: Ctrl+K or / to focus search
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
      const [empRes, logRes] = await Promise.all([
        fetch('/api/employees'),
        fetch(`/api/employees/daily-logs?date=${new Date().toISOString().slice(0, 10)}`),
      ])
      if (empRes.ok) {
        const data: Employee[] = await empRes.json()
        setEmployees(data)
        if (!initialLoadDone.current) {
          initialLoadDone.current = true
          setExpandedGroups(new Set(data.map(e => e.jobTitle || 'أخرى')))
        }
      }
      if (logRes.ok) {
        const logs: DailyLog[] = await logRes.json()
        const map: Record<string, DailyLog> = {}
        logs.forEach(l => { map[l.employeeId] = l })
        setTodayLogs(map)
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحميل البيانات', variant: 'destructive' })
    } finally { setLoading(false) }
  }, [toast])

  useEffect(() => { fetchData() }, [fetchData])

  const handleClock = async (employeeId: string, action: 'clockIn' | 'clockOut' | 'markAbsent') => {
    setLogging(employeeId)
    setAnimatingId(employeeId)
    try {
      const res = await fetch('/api/employees/daily-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, action, recordedBy: username }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: 'تم', description: data.message })
        fetchData()
      } else {
        toast({ title: 'خطأ', description: data.error || 'فشل العملية', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل الاتصال', variant: 'destructive' })
    } finally {
      setLogging(null)
      setTimeout(() => setAnimatingId(null), 600)
    }
  }

  const getClockStatus = (emp: Employee): 'none' | 'absent' | 'clockedIn' | 'clockedOut' => {
    const log = todayLogs[emp.id]
    if (!log) return 'none'
    if (log.status === 'ABSENT') return 'absent'
    if (log.clockIn && !log.clockOut) return 'clockedIn'
    if (log.clockIn && log.clockOut) return 'clockedOut'
    return 'none'
  }

  const formatTime = (d: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
  }

  const activeEmployees = employees.filter(e => e.isActive)

  const grouped = activeEmployees.reduce((acc, emp) => {
    const group = emp.jobTitle || 'أخرى'
    if (!acc[group]) acc[group] = []
    acc[group].push(emp)
    return acc
  }, {} as Record<string, Employee[]>)

  // Sort groups by defined order, then alphabetical
  const sortedGroups = Object.keys(grouped).sort((a, b) => {
    const ia = JOB_ORDER.indexOf(a)
    const ib = JOB_ORDER.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.localeCompare(b)
  })

  const searchFilter = (emp: Employee) =>
    emp.name.includes(search) || emp.jobTitle.includes(search) || emp.specialization.includes(search)

  // Stats calculation
  const totalEmployees = activeEmployees.length
  const presentCount = activeEmployees.filter(e => getClockStatus(e) === 'clockedIn' || getClockStatus(e) === 'clockedOut').length
  const absentCount = activeEmployees.filter(e => getClockStatus(e) === 'absent').length
  const pendingCount = activeEmployees.filter(e => getClockStatus(e) === 'none').length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-[#D4AF37]" />
          <p className="text-sm text-muted-foreground">جاري تحميل بيانات الحضور...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-[#D4AF37]" />
            تسجيل الحضور
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {' — '}
            <span className="text-[#D4AF37]">{new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
          </p>
        </div>
        <Button onClick={() => { const a = document.createElement('a'); a.href = `/api/employees/daily-logs/export?date=${new Date().toISOString().slice(0, 10)}`; a.download = `attendance_${new Date().toISOString().slice(0, 10)}.xlsx`; a.click(); toast({ title: 'تم', description: 'جاري تحميل ملف Excel' }) }}
          className="bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 gap-2 text-sm">
          <Download className="h-4 w-4" />
          تصدير Excel
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Users} label="إجمالي الموظفين" value={String(totalEmployees)} color="text-blue-400" bg="bg-blue-500/10" border="border-blue-500/20" />
        <StatCard icon={Check} label="حاضر" value={String(presentCount)} color="text-emerald-400" bg="bg-emerald-500/10" border="border-emerald-500/20" />
        <StatCard icon={UserX} label="غائب" value={String(absentCount)} color="text-red-400" bg="bg-red-500/10" border="border-red-500/20" />
        <StatCard icon={Timer} label="لم يسجل" value={String(pendingCount)} color="text-yellow-400" bg="bg-yellow-500/10" border="border-yellow-500/20" />
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
            <XCircle className="h-4 w-4" />
          </button>
        )}
        <kbd className="absolute left-12 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 rounded border border-border/50 bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">
          /</kbd>
      </div>

      {/* Employee List by Group */}
      {sortedGroups.length === 0 ? (
        <div className="py-20 text-center">
          <Users className="mx-auto mb-4 h-16 w-16 text-muted-foreground/20" />
          <p className="text-base text-muted-foreground">
            {search ? `لا توجد نتائج لـ "${search}"` : 'لا يوجد موظفون نشطون'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedGroups.map(group => {
            const filtered = grouped[group].filter(searchFilter)
            if (filtered.length === 0) return null
            const isExpanded = expandedGroups.has(group)
            return (
              <Card key={group} className="border-border/40 overflow-hidden">
                {/* Group Header */}
                <button
                  onClick={() => {
                    const next = new Set(expandedGroups)
                    if (isExpanded) next.delete(group)
                    else next.add(group)
                    setExpandedGroups(next)
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      filtered.some(e => getClockStatus(e) === 'clockedIn' || getClockStatus(e) === 'clockedOut')
                        ? 'bg-emerald-400'
                        : filtered.some(e => getClockStatus(e) === 'absent')
                        ? 'bg-red-400'
                        : 'bg-yellow-400'
                    }`} />
                    <span className="font-bold text-sm">{group}</span>
                    <Badge variant="outline" className="text-[10px] border-border/50 text-muted-foreground">
                      {filtered.length}
                    </Badge>
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
                      <div className="divide-y divide-border/20">
                        {filtered.map(emp => {
                          const status = getClockStatus(emp)
                          const log = todayLogs[emp.id]
                          const isAnimating = animatingId === emp.id
                          return (
                            <motion.div
                              key={emp.id}
                              layout
                              animate={isAnimating ? { scale: [1, 1.02, 1] } : {}}
                              transition={{ duration: 0.3 }}
                              className={`flex items-center justify-between p-3 sm:p-4 transition-colors ${
                                status === 'clockedOut' ? 'bg-emerald-500/[0.03]' :
                                status === 'clockedIn' ? 'bg-green-500/[0.05]' :
                                status === 'absent' ? 'bg-red-500/[0.03]' : ''
                              }`}>
                              {/* Left: Employee Info */}
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                {/* Avatar */}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                  status === 'clockedOut' ? 'bg-emerald-500/15 text-emerald-400' :
                                  status === 'clockedIn' ? 'bg-green-500/20 text-green-400' :
                                  status === 'absent' ? 'bg-red-500/15 text-red-400' :
                                  'bg-muted/50 text-muted-foreground'
                                }`}>
                                  <Users className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-sm truncate">{emp.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {emp.specialization || emp.jobTitle}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    {status === 'none' && (
                                      <span className="inline-flex items-center gap-1 text-[10px] text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                                        <Timer className="h-3 w-3" />لم يسجل
                                      </span>
                                    )}
                                    {status === 'absent' && (
                                      <span className="inline-flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                                        <UserX className="h-3 w-3" />غائب
                                      </span>
                                    )}
                                    {status === 'clockedIn' && (
                                      <span className="inline-flex items-center gap-1 text-[10px] text-green-400 bg-green-500/15 px-2 py-0.5 rounded-full">
                                        <LogIn className="h-3 w-3" />
                                        {formatTime(log?.clockIn || null)}
                                      </span>
                                    )}
                                    {status === 'clockedOut' && (
                                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                        <LogOut className="h-3 w-3" />
                                        {formatTime(log?.clockIn || null)} → {formatTime(log?.clockOut || null)}
                                      </span>
                                    )}
                                    {log && log.overtimeMinutes > 0 && (
                                      <span className="inline-flex items-center gap-1 text-[10px] text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                                        <Zap className="h-3 w-3" />
                                        أوفرتايم {Math.floor(log.overtimeMinutes / 60)}h {log.overtimeMinutes % 60}m
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Right: Actions */}
                              <div className="flex gap-1.5 shrink-0">
                                {status === 'none' && (
                                  <>
                                    <ActionButton
                                      onClick={() => handleClock(emp.id, 'clockIn')}
                                      loading={logging === emp.id}
                                      icon={<Check className="h-4 w-4" />}
                                      label="حضور"
                                      className="bg-emerald-500 hover:bg-emerald-400 text-white shadow-sm shadow-emerald-500/20"
                                    />
                                    <ActionButton
                                      onClick={() => handleClock(emp.id, 'markAbsent')}
                                      loading={logging === emp.id}
                                      icon={<UserX className="h-4 w-4" />}
                                      label="غائب"
                                      className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                                    />
                                  </>
                                )}
                                {status === 'clockedIn' && (
                                  <ActionButton
                                    onClick={() => handleClock(emp.id, 'clockOut')}
                                    loading={logging === emp.id}
                                    icon={<LogOut className="h-4 w-4" />}
                                    label="انصراف"
                                    className="bg-red-500 hover:bg-red-400 text-white shadow-sm shadow-red-500/20"
                                  />
                                )}
                                {status === 'clockedOut' && (
                                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                                    <Check className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">مكتمل</span>
                                  </div>
                                )}
                                {status === 'absent' && (
                                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">غائب</span>
                                  </div>
                                )}
                              </div>
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

function StatCard({ icon: Icon, label, value, color, bg, border }: {
  icon: any; label: string; value: string; color: string; bg: string; border: string
}) {
  return (
    <div className={`rounded-xl border ${border} ${bg} p-3 sm:p-4 transition-all hover:scale-[1.02]`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`text-xl sm:text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  )
}

function ActionButton({ onClick, loading, icon, label, className }: {
  onClick: () => void; loading: boolean; icon: React.ReactNode; label: string; className: string
}) {
  return (
    <Button onClick={onClick} disabled={loading}
      className={`h-9 px-3 text-xs gap-1.5 font-medium rounded-xl transition-all active:scale-95 ${className}`}>
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  )
}
