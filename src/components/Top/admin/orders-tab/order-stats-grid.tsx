'use client'

import { motion } from 'framer-motion'
import { Clock, CheckCircle, DollarSign, AlertTriangle, Flame } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { OrderStats } from '@/lib/saraya/types'

interface OrderStatsGridProps {
  stats: OrderStats | null
  currentShiftId: string | null
}

export function OrderStatsGrid({ stats, currentShiftId }: OrderStatsGridProps) {
  const row1 = [
    {
      icon: DollarSign,
      value: stats?.readyToPayOrders ?? 0,
      label: 'جاهز للدفع',
      borderColor: 'border-emerald-500/20',
      bgColor: 'bg-emerald-500/5',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-400',
      valueColor: 'text-emerald-400',
    },
    {
      icon: Clock,
      value: stats?.pendingOrders ?? 0,
      label: 'طلبات جديدة',
      borderColor: 'border-yellow-500/20',
      bgColor: 'bg-yellow-500/5',
      iconBg: 'bg-yellow-500/10',
      iconColor: 'text-yellow-400',
      valueColor: 'text-yellow-400',
    },
    {
      icon: Flame,
      value: stats?.preparingOrders ?? 0,
      label: 'قيد التحضير',
      borderColor: 'border-[#D4AF37]/20',
      bgColor: 'bg-[#D4AF37]/5',
      iconBg: 'bg-[#D4AF37]/10',
      iconColor: 'text-[#D4AF37]',
      valueColor: 'text-[#D4AF37]',
    },
    {
      icon: CheckCircle,
      value: stats?.readyOrders ?? 0,
      label: 'جاهزة للاستلام',
      borderColor: 'border-green-500/20',
      bgColor: 'bg-green-500/5',
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-400',
      valueColor: 'text-green-400',
    },
  ]

  const row2 = [
    {
      icon: AlertTriangle,
      value: stats?.cancelledOrders ?? 0,
      label: 'طلبات ملغاة',
      borderColor: 'border-red-500/20',
      bgColor: 'bg-red-500/5',
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-400',
      valueColor: 'text-red-400',
    },
    {
      icon: DollarSign,
      value: (stats?.todayRevenue ?? 0).toFixed(0),
      label: currentShiftId ? 'إيراد الشيفت الحالي (ج.م)' : 'إيراد اليوم (ج.م)',
      borderColor: 'border-[#D4AF37]/20',
      bgColor: 'bg-[#D4AF37]/5',
      iconBg: 'bg-[#D4AF37]/10',
      iconColor: 'text-[#D4AF37]',
      valueColor: 'text-[#D4AF37]',
    },
  ]

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {row1.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className={`${stat.borderColor} ${stat.bgColor}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconBg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${stat.valueColor}`}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-3">
        {row2.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className={`${stat.borderColor} ${stat.bgColor}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconBg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${stat.valueColor}`}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </>
  )
}

