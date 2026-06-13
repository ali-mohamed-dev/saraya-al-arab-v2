'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

interface DailyLog {
  id: string; employeeId: string; date: string; clockIn: string | null; clockOut: string | null; status: string; overtimeMinutes: number
}

interface Props {
  employeeId: string
  month: number
  year: number
  dailyHours: number
  salary: number
}

export function MonthlyAttendanceTable({ employeeId, month, year, dailyHours, salary }: Props) {
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const fetchLogs = async () => {
      try {
        const res = await fetch(`/api/employees/daily-log?employeeId=${employeeId}`)
        const data = await res.json()
        if (Array.isArray(data)) {
          const filtered = data.filter((l: DailyLog) => {
            const d = new Date(l.date)
            return d.getMonth() + 1 === month && d.getFullYear() === year
          })
          setLogs(filtered)
        }
      } catch {
        setLogs([])
      } finally { setLoading(false) }
    }
    fetchLogs()
  }, [employeeId, month, year])

  if (loading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-[#D4AF37]" /></div>
  }

  const presentLogs = logs.filter(l => l.clockIn)
  const totalOvertimeMinutes = logs.reduce((s, l) => s + l.overtimeMinutes, 0)
  const overtimeWage = dailyHours > 0 ? (salary / 30 / dailyHours) * 1.5 * (totalOvertimeMinutes / 60) : 0
  const avgHours = presentLogs.filter(l => l.clockIn && l.clockOut).length > 0
    ? (presentLogs.filter(l => l.clockIn && l.clockOut).reduce((s, l) => {
        if (l.clockIn && l.clockOut) {
          return s + (new Date(l.clockOut).getTime() - new Date(l.clockIn).getTime()) / 3600000
        }
        return s
      }, 0) / presentLogs.filter(l => l.clockIn && l.clockOut).length).toFixed(1)
    : '0'
  const missingDays = logs.filter(l => !l.clockIn && l.status === 'ABSENT').length
  const monthlyDeduction = missingDays * (salary / 30)

  return (
    <div className="overflow-x-auto">
      {logs.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">لا توجد سجلات حضور لهذا الشهر</p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2 mb-3">
            <SummaryBox label="أيام الحضور" value={`${presentLogs.length}`} color="text-emerald-400" />
            <SummaryBox label="أوفرتايم" value={`${Math.floor(totalOvertimeMinutes / 60)}h ${totalOvertimeMinutes % 60}m`} color="text-yellow-400" />
            <SummaryBox label="متوسط الساعات" value={`${avgHours} س`} color="text-blue-400" />
            <SummaryBox label="غياب" value={`${missingDays} يوم (${monthlyDeduction.toFixed(0)} ج)`} color="text-red-400" />
            {totalOvertimeMinutes > 0 && <SummaryBox label="أجر الأوفرتايم" value={`${overtimeWage.toFixed(0)} ج`} color="text-yellow-400" />}
          </div>

          <div className="space-y-1 max-h-60 overflow-y-auto">
            {presentLogs.map(l => {
              const d = new Date(l.date)
              const clockIn = l.clockIn ? new Date(l.clockIn) : null
              const clockOut = l.clockOut ? new Date(l.clockOut) : null
              const workedHrs = clockIn && clockOut ? ((clockOut.getTime() - clockIn.getTime()) / 3600000).toFixed(1) : '—'
              return (
                <div key={l.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/20 text-xs">
                  <span className="w-20">{d.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  <span className="w-24 text-center">
                    {clockIn?.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) || '—'}
                    {' → '}
                    {clockOut?.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) || '—'}
                  </span>
                  <span className="w-12 text-center">{workedHrs} س</span>
                  {l.overtimeMinutes > 0 && <span className="w-20 text-center text-yellow-400 font-bold">+{Math.floor(l.overtimeMinutes / 60)}h {l.overtimeMinutes % 60}m</span>}
                  {l.clockIn && !l.clockOut && <span className="w-20 text-center text-gray-400">لم ينصرف</span>}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function SummaryBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg bg-muted/30 p-2 text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  )
}
