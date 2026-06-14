'use client'

import { Calendar, Filter, Banknote, CreditCard, Smartphone } from 'lucide-react'
import { STATUS_FILTERS, TYPE_FILTERS } from '@/lib/saraya/constants'

const PAYMENT_FILTERS = [
  { value: 'ALL', label: 'الكل' },
  { value: 'CASH', label: 'كاش', icon: Banknote },
  { value: 'VISA', label: 'فيزا', icon: CreditCard },
  { value: 'VODAFONE_CASH', label: 'فودافون كاش', icon: Smartphone },
]

interface OrderFiltersProps {
  statusFilter: string
  typeFilter: string
  paymentFilter: string
  fromDate: string
  toDate: string
  cancelledCount?: number
  onStatusFilterChange: (value: string) => void
  onTypeFilterChange: (value: string) => void
  onPaymentFilterChange: (value: string) => void
  onFromDateChange: (date: string) => void
  onToDateChange: (date: string) => void
  onRefresh: () => void
}

export function OrderFilters({
  statusFilter,
  typeFilter,
  paymentFilter,
  fromDate,
  toDate,
  cancelledCount,
  onStatusFilterChange,
  onTypeFilterChange,
  onPaymentFilterChange,
  onFromDateChange,
  onToDateChange,
  onRefresh: _onRefresh,
}: OrderFiltersProps) {
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="rounded-xl border border-border/30 bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border border-[#D4AF37]/10 flex items-center justify-center">
          <Filter className="h-4 w-4 text-[#D4AF37]" />
        </div>
        <h3 className="text-sm font-bold">تصفية الطلبات</h3>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={fromDate}
              max={today}
              onChange={(e) => onFromDateChange(e.target.value)}
              className="rounded-lg border border-border/40 bg-muted/40 px-2.5 py-1.5 text-xs text-foreground focus:border-[#D4AF37] focus:outline-none w-32"
            />
            <span className="text-[10px] text-muted-foreground">إلى</span>
            <input
              type="date"
              value={toDate}
              max={today}
              onChange={(e) => onToDateChange(e.target.value)}
              className="rounded-lg border border-border/40 bg-muted/40 px-2.5 py-1.5 text-xs text-foreground focus:border-[#D4AF37] focus:outline-none w-32"
            />
          </div>
        </div>
        {(fromDate !== today || toDate !== today) && (
          <button
            onClick={() => { onFromDateChange(today); onToDateChange(today) }}
            className="rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-2.5 py-1.5 text-[10px] text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-colors"
          >
            اليوم
          </button>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground font-medium">الحالة</p>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => {
            const isCancelled = f.value === 'CANCELLED'
            return (
              <button
                key={f.value}
                onClick={() => onStatusFilterChange(f.value)}
                className={`rounded-lg border px-2.5 py-1 text-[10px] font-medium transition-all flex items-center gap-1 ${
                  statusFilter === f.value
                    ? isCancelled
                      ? 'border-red-500 bg-red-500/10 text-red-400 shadow-sm'
                      : 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37] shadow-sm'
                    : isCancelled
                      ? 'border-border/40 bg-muted/40 text-red-400/60 hover:border-red-500/30'
                      : 'border-border/40 bg-muted/40 text-muted-foreground hover:border-[#D4AF37]/30'
                }`}
              >
                {f.label}
                {isCancelled && cancelledCount !== undefined && cancelledCount > 0 && (
                  <span className={`text-[9px] px-1 py-0.5 rounded-full ${
                    statusFilter === 'CANCELLED' ? 'bg-red-500/20 text-red-300' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {cancelledCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground font-medium">النوع</p>
        <div className="flex flex-wrap gap-1.5">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => onTypeFilterChange(f.value)}
              className={`rounded-lg border px-2.5 py-1 text-[10px] font-medium transition-all ${
                typeFilter === f.value
                  ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37] shadow-sm'
                  : 'border-border/40 bg-muted/40 text-muted-foreground hover:border-[#D4AF37]/30'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground font-medium">طريقة الدفع</p>
        <div className="flex flex-wrap gap-1.5">
          {PAYMENT_FILTERS.map((f) => {
            const Icon = f.icon
            return (
              <button
                key={f.value}
                onClick={() => onPaymentFilterChange(f.value)}
                className={`rounded-lg border px-2.5 py-1 text-[10px] font-medium transition-all flex items-center gap-1 ${
                  paymentFilter === f.value
                    ? f.value === 'CASH'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-sm'
                      : f.value === 'VISA'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-400 shadow-sm'
                        : f.value === 'VODAFONE_CASH'
                          ? 'border-purple-500 bg-purple-500/10 text-purple-400 shadow-sm'
                          : 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37] shadow-sm'
                    : 'border-border/40 bg-muted/40 text-muted-foreground hover:border-[#D4AF37]/30'
                }`}
              >
                {Icon && <Icon className="h-3 w-3" />}
                {f.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
