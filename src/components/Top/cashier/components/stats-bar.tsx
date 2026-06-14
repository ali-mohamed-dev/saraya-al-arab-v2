'use client'

import { motion } from 'framer-motion'
import { ShoppingBag, CheckCircle, TrendingDown, DollarSign, Banknote, CreditCard, Smartphone } from 'lucide-react'

interface StatsBarProps {
  activeCount: number
  readyCount: number
  shiftRevenue: number
  cashRevenue: number
  visaRevenue: number
  vodafoneCashRevenue: number
  totalExpenses: number
}

export function StatsBar({ activeCount, readyCount, shiftRevenue, cashRevenue, visaRevenue, vodafoneCashRevenue, totalExpenses }: StatsBarProps) {
  const stats = [
    {
      icon: <DollarSign className="h-5 w-5" />,
      gradient: 'from-emerald-500/20 to-emerald-600/5',
      border: 'border-emerald-500/15',
      iconBg: 'bg-emerald-500/15',
      iconColor: 'text-emerald-400',
      value: `${shiftRevenue.toFixed(0)} ج.م`,
      label: 'إجمالي الإيرادات',
    },
    {
      icon: <Banknote className="h-5 w-5" />,
      gradient: 'from-emerald-500/20 to-emerald-600/5',
      border: 'border-emerald-500/15',
      iconBg: 'bg-emerald-500/15',
      iconColor: 'text-emerald-400',
      value: `${cashRevenue.toFixed(0)} ج.م`,
      label: 'مدفوع كاش',
    },
    {
      icon: <CreditCard className="h-5 w-5" />,
      gradient: 'from-blue-500/20 to-blue-600/5',
      border: 'border-blue-500/15',
      iconBg: 'bg-blue-500/15',
      iconColor: 'text-blue-400',
      value: `${visaRevenue.toFixed(0)} ج.م`,
      label: 'مدفوع فيزا',
    },
    {
      icon: <Smartphone className="h-5 w-5" />,
      gradient: 'from-purple-500/20 to-purple-600/5',
      border: 'border-purple-500/15',
      iconBg: 'bg-purple-500/15',
      iconColor: 'text-purple-400',
      value: `${vodafoneCashRevenue.toFixed(0)} ج.م`,
      label: 'مدفوع فودافون كاش',
    },
    {
      icon: <ShoppingBag className="h-5 w-5" />,
      gradient: 'from-blue-500/20 to-blue-600/5',
      border: 'border-blue-500/15',
      iconBg: 'bg-blue-500/15',
      iconColor: 'text-blue-400',
      value: activeCount,
      label: 'طلبات نشطة',
    },
    {
      icon: <CheckCircle className="h-5 w-5" />,
      gradient: 'from-green-500/20 to-green-600/5',
      border: 'border-green-500/15',
      iconBg: 'bg-green-500/15',
      iconColor: 'text-green-400',
      value: readyCount,
      label: 'جاهز للدفع',
      pulse: readyCount > 0,
    },
    {
      icon: <TrendingDown className="h-5 w-5" />,
      gradient: 'from-red-500/20 to-red-600/5',
      border: 'border-red-500/15',
      iconBg: 'bg-red-500/15',
      iconColor: 'text-red-400',
      value: `${totalExpenses.toFixed(0)} ج.م`,
      label: 'مصروفات',
    },
  ]

  return (
    <div className="space-y-2">
      {/* Main stats: Revenue, Active, Ready, Expenses */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {[stats[0], stats[4], stats[5], stats[6]].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <div className={`rounded-xl border ${s.border} bg-gradient-to-br ${s.gradient} p-3 ${s.pulse ? 'animate-pulse' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg ${s.iconBg}`}>
                  <span className={s.iconColor}>{s.icon}</span>
                </div>
                <div className="min-w-0">
                  <p className={`text-base sm:text-lg font-bold ${s.iconColor}`}>{s.value}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{s.label}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      {/* Payment breakdown: Cash, Visa, Vodafone Cash */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[stats[1], stats[2], stats[3]].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}>
            <div className={`rounded-lg border ${s.border} bg-gradient-to-br ${s.gradient} p-2 sm:p-2.5`}>
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={s.iconColor}>{s.icon}</span>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{s.label}</span>
                </div>
                <span className={`text-xs sm:text-sm font-bold ${s.iconColor} shrink-0`}>{s.value}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
