'use client'

import { ClipboardList, Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { STATUS_FILTERS, TYPE_FILTERS } from '@/lib/saraya/constants'

interface OrderFiltersProps {
  statusFilter: string
  typeFilter: string
  fromDate: string
  toDate: string
  onStatusFilterChange: (value: string) => void
  onTypeFilterChange: (value: string) => void
  onFromDateChange: (date: string) => void
  onToDateChange: (date: string) => void
  onRefresh: () => void
}

export function OrderFilters({
  statusFilter,
  typeFilter,
  fromDate,
  toDate,
  onStatusFilterChange,
  onTypeFilterChange,
  onFromDateChange,
  onToDateChange,
  onRefresh,
}: OrderFiltersProps) {
  const today = new Date().toISOString().split('T')[0]

  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#D4AF37] flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            تصفية الطلبات
          </h3>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            الفترة الزمنيّة:
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">من:</span>
              <input
                type="date"
                value={fromDate}
                max={today}
                onChange={(e) => onFromDateChange(e.target.value)}
                className="rounded-lg border border-border/50 bg-muted/50 px-2 py-1 text-xs text-foreground focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">إلى:</span>
              <input
                type="date"
                value={toDate}
                max={today}
                onChange={(e) => onToDateChange(e.target.value)}
                className="rounded-lg border border-border/50 bg-muted/50 px-2 py-1 text-xs text-foreground focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
            {(fromDate !== today || toDate !== today) && (
              <button
                onClick={() => {
                  onFromDateChange(today)
                  onToDateChange(today)
                }}
                className="rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-2 py-1 text-[10px] text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-colors"
              >
                اليوم فقط
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">حالة الطلب:</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => onStatusFilterChange(f.value)}
                className={`rounded-lg border px-3 py-1.5 text-xs transition-all ${
                  statusFilter === f.value
                    ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                    : 'border-border/50 bg-muted/50 text-muted-foreground hover:border-[#D4AF37]/30'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">نوع الطلب:</p>
          <div className="flex flex-wrap gap-2">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => onTypeFilterChange(f.value)}
                className={`rounded-lg border px-3 py-1.5 text-xs transition-all ${
                  typeFilter === f.value
                    ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                    : 'border-border/50 bg-muted/50 text-muted-foreground hover:border-[#D4AF37]/30'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
