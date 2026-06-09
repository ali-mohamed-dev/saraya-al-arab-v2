'use client'

import { motion } from 'framer-motion'
import { Clock, Check, ChefHat } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface StatsCardsProps {
  pendingCount: number
  confirmedCount: number
  preparingCount: number
}

export function StatsCards({ pendingCount, confirmedCount, preparingCount }: StatsCardsProps) {
  return (
    <div className="mb-4 sm:mb-6 grid grid-cols-3 gap-2 sm:gap-3">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 }}
      >
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-yellow-500/10">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold text-yellow-400">{pendingCount}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">طلبات جديدة</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Check className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold text-blue-400">{confirmedCount}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">مؤكدة</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <ChefHat className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold text-amber-400">{preparingCount}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">قيد التحضير</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

