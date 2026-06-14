'use client'

import { motion } from 'framer-motion'
import { Clock, CheckCircle, DollarSign, AlertTriangle, Flame, CircleDollarSign, ShoppingBag } from 'lucide-react'
import type { OrderStats } from '@/lib/saraya/types'

interface OrderStatsGridProps {
  stats: OrderStats | null
  currentShiftId: string | null
}

const statCards = [
  { key: 'pendingOrders', icon: Clock, label: 'طلبات جديدة', color: 'from-yellow-500/20 to-yellow-600/5 border-yellow-500/10 text-yellow-400' },
  { key: 'preparingOrders', icon: Flame, label: 'قيد التحضير', color: 'from-orange-500/20 to-orange-600/5 border-orange-500/10 text-orange-400' },
  { key: 'readyOrders', icon: CheckCircle, label: 'جاهزة', color: 'from-green-500/20 to-green-600/5 border-green-500/10 text-green-400' },
  { key: 'readyToPayOrders', icon: CircleDollarSign, label: 'جاهز للدفع', color: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/10 text-emerald-400' },
]

export function OrderStatsGrid({ stats, currentShiftId }: OrderStatsGridProps) {
  const getValue = (key: string) => {
    if (!stats) return 0
    return (stats as any)[key] ?? 0
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`rounded-xl border bg-gradient-to-br ${stat.color} p-3 sm:p-4`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] sm:text-xs text-muted-foreground">{stat.label}</span>
              <stat.icon className="h-4 w-4 opacity-60" />
            </div>
            <motion.span
              key={getValue(stat.key)}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-xl sm:text-2xl font-bold"
            >
              {getValue(stat.key)}
            </motion.span>
          </motion.div>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border bg-gradient-to-br from-red-500/20 to-red-600/5 border-red-500/10 text-red-400 p-3 sm:p-4"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs text-muted-foreground">ملغاة</span>
            <AlertTriangle className="h-4 w-4 opacity-60" />
          </div>
          <motion.span
            key={getValue('cancelledOrders')}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-xl sm:text-2xl font-bold"
          >
            {getValue('cancelledOrders')}
          </motion.span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-xl border bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border-[#D4AF37]/10 text-[#D4AF37] p-3 sm:p-4 sm:col-span-2"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              {currentShiftId ? 'إيراد الشيفت' : 'إيراد اليوم'}
            </span>
            <DollarSign className="h-4 w-4 opacity-60" />
          </div>
          <motion.span
            key={currentShiftId ? (stats?.shiftRevenue ?? 0) : (stats?.todayRevenue ?? 0)}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-xl sm:text-2xl font-bold"
          >
            {(currentShiftId ? (stats?.shiftRevenue ?? 0) : (stats?.todayRevenue ?? 0)).toFixed(0)} ج.م
          </motion.span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border bg-gradient-to-br from-blue-500/20 to-blue-600/5 border-blue-500/10 text-blue-400 p-3 sm:p-4"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs text-muted-foreground">إجمالي</span>
            <ShoppingBag className="h-4 w-4 opacity-60" />
          </div>
          <motion.span
            key={stats?.totalOrders ?? 0}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-xl sm:text-2xl font-bold"
          >
            {stats?.totalOrders ?? 0}
          </motion.span>
        </motion.div>
      </div>

      {/* Payment method breakdown */}
      {(stats?.cashRevenue !== undefined || stats?.visaRevenue !== undefined || stats?.vodafoneCashRevenue !== undefined) && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-xl border bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 border-emerald-500/10 text-emerald-400 p-3 sm:p-4"
          >
            <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">كاش</div>
            <span className="text-lg sm:text-xl font-bold">{(stats?.cashRevenue ?? 0).toFixed(0)} ج.م</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl border bg-gradient-to-br from-blue-500/20 to-blue-600/5 border-blue-500/10 text-blue-400 p-3 sm:p-4"
          >
            <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">فيزا</div>
            <span className="text-lg sm:text-xl font-bold">{(stats?.visaRevenue ?? 0).toFixed(0)} ج.م</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="rounded-xl border bg-gradient-to-br from-purple-500/20 to-purple-600/5 border-purple-500/10 text-purple-400 p-3 sm:p-4"
          >
            <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">فودافون كاش</div>
            <span className="text-lg sm:text-xl font-bold">{(stats?.vodafoneCashRevenue ?? 0).toFixed(0)} ج.م</span>
          </motion.div>
        </div>
      )}
    </div>
  )
}
