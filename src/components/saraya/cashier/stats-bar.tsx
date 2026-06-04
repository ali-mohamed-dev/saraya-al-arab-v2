'use client'

import { motion } from 'framer-motion'
import { ShoppingBag, CheckCircle, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface StatsBarProps {
  activeCount: number
  readyCount: number
  totalExpenses: number
}

export function StatsBar({ activeCount, readyCount, totalExpenses }: StatsBarProps) {
  const stats = [
    { icon: <ShoppingBag className="h-6 w-6 text-blue-400" />, bg: 'bg-blue-500/10', value: activeCount, label: 'طلبات نشطة', color: 'text-blue-400' },
    { icon: <CheckCircle className="h-6 w-6 text-green-400" />, bg: 'bg-green-500/10', value: readyCount, label: 'جاهز للدفع', color: 'text-green-400' },
    { icon: <TrendingDown className="h-6 w-6 text-red-400" />, bg: 'bg-red-500/10', value: `${totalExpenses.toFixed(0)} ج.م`, label: 'مصروفات', color: 'text-red-400' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <Card className="border-border/50 bg-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.bg}`}>{s.icon}</div>
              <div>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
