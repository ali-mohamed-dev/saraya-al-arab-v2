'use client'

import { motion } from 'framer-motion'
import { Clock, Check, ChefHat, UtensilsCrossed } from 'lucide-react'

interface StatsCardsProps {
  pendingCount: number
  confirmedCount: number
  preparingCount: number
  readyCount: number
}

export function StatsCards({ pendingCount, confirmedCount, preparingCount, readyCount }: StatsCardsProps) {
  const stats = [
    {
      icon: <Clock className="h-5 w-5" />,
      gradient: 'from-yellow-500/20 to-yellow-600/5',
      border: 'border-yellow-500/15',
      iconBg: 'bg-yellow-500/15',
      iconColor: 'text-yellow-400',
      value: pendingCount,
      label: 'طلبات جديدة',
    },
    {
      icon: <Check className="h-5 w-5" />,
      gradient: 'from-blue-500/20 to-blue-600/5',
      border: 'border-blue-500/15',
      iconBg: 'bg-blue-500/15',
      iconColor: 'text-blue-400',
      value: confirmedCount,
      label: 'مؤكدة',
    },
    {
      icon: <ChefHat className="h-5 w-5" />,
      gradient: 'from-amber-500/20 to-amber-600/5',
      border: 'border-amber-500/15',
      iconBg: 'bg-amber-500/15',
      iconColor: 'text-amber-400',
      value: preparingCount,
      label: 'قيد التحضير',
    },
    {
      icon: <UtensilsCrossed className="h-5 w-5" />,
      gradient: 'from-green-500/20 to-green-600/5',
      border: 'border-green-500/15',
      iconBg: 'bg-green-500/15',
      iconColor: 'text-green-400',
      value: readyCount,
      label: 'جاهز للاستلام',
      pulse: readyCount > 0,
    },
  ]

  return (
    <div className="mb-4 sm:mb-6 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
      {stats.map((s, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <div className={`rounded-xl border ${s.border} bg-gradient-to-br ${s.gradient} p-3 sm:p-4 ${s.pulse ? 'animate-pulse' : ''}`}>
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-lg ${s.iconBg}`}>
                <span className={s.iconColor}>{s.icon}</span>
              </div>
              <div className="min-w-0">
                <p className={`text-lg sm:text-xl font-bold ${s.iconColor}`}>{s.value}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{s.label}</p>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
