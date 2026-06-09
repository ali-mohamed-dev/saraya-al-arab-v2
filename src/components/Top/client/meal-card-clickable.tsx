'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Clock, ShoppingCart, UtensilsCrossed, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { type Meal } from '@/lib/saraya/types'

interface MealCardProps {
  meal: Meal
  onViewDetail: (meal: Meal) => void
  priority?: boolean
}

export function MealCardSimple({ meal, onViewDetail, priority }: MealCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={() => onViewDetail(meal)}
      className="cursor-pointer"
    >
      <Card className="group overflow-hidden border border-border/50 bg-card transition-all duration-300 hover:border-[#D4AF37]/40 hover:shadow-[0_0_20px_rgba(202,170,74,0.15)]">
        <div className="relative aspect-[4/3] overflow-hidden">
          {meal.imageUrl ? (
            <Image src={meal.imageUrl} alt={meal.titleAr} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 768px) 50vw, 25vw" loading={priority ? 'eager' : 'lazy'} />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <UtensilsCrossed className="size-12 text-muted-foreground/40" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 border-2 border-transparent transition-colors duration-300 group-hover:border-yellow-600/30" />
          <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D4AF37] text-black shadow-lg">
              <Plus className="h-4 w-4" />
            </div>
          </div>
        </div>
        <CardContent className="space-y-3 p-4">
          <h3 className="text-lg font-bold leading-tight text-foreground text-right" dir="rtl">{meal.titleAr}</h3>
          <p className="text-sm text-muted-foreground">{meal.title}</p>
          {meal.descriptionAr && (
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground/80 text-right" dir="rtl">{meal.descriptionAr}</p>
          )}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-yellow-600">{meal.price.toFixed(2)}</span>
              <span className="text-sm font-medium text-yellow-600/80">جنيه</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="size-3.5" />
              <span className="text-xs">{meal.prepTime}</span>
            </div>
          </div>
          <div className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#D4AF37]/10 py-2 text-sm font-medium text-[#D4AF37] transition-colors group-hover:bg-[#D4AF37]/20" dir="rtl">
            <ShoppingCart className="h-4 w-4" />
            اضغط للطلب
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

