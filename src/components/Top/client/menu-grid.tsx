'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { UtensilsCrossed, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { MealCardSimple } from '@/components/Top/client/meal-card-clickable'
import { type Meal } from '@/lib/saraya/types'

interface MenuGridProps {
  meals: Meal[]
  loading: boolean
  activeCategory: string
  onViewDetail: (meal: Meal) => void
}

export function MenuGrid({ meals, loading, activeCategory, onViewDetail }: MenuGridProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-[#D4AF37]" />
        <p className="mt-4 text-muted-foreground">جاري تحميل القائمة...</p>
      </div>
    )
  }

  if (meals.length === 0) {
    return (
      <div className="py-20 text-center">
        <UtensilsCrossed className="mx-auto mb-4 h-16 w-16 text-muted-foreground/20" />
        <p className="text-lg text-muted-foreground">لا توجد أطباق في هذا التصنيف</p>
      </div>
    )
  }

  return (
    <>
      {/* Active Category Label */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mb-6 text-center"
        >
          <h2 className="text-2xl font-bold text-foreground">
            {activeCategory === 'all' ? 'القائمة الكاملة' : activeCategory}
          </h2>
          <Badge variant="outline" className="mt-2 border-[#D4AF37]/30 text-[#D4AF37]">
            {meals.length} طبق
          </Badge>
        </motion.div>
      </AnimatePresence>

      {/* Meals Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {meals.map((meal, index) => (
            <motion.div
              key={meal.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <MealCardSimple meal={meal} onViewDetail={onViewDetail} priority={index < 6} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  )
}
