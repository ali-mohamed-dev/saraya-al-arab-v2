'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { useState } from 'react'
import { Clock, ShoppingCart, UtensilsCrossed } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { type Meal } from '@/lib/saraya/types'

interface MealCardProps {
  meal: Meal
  onViewDetail: (meal: Meal) => void
  priority?: boolean
}

export function MealCardSimple({ meal, onViewDetail, priority }: MealCardProps) {
  const [imgError, setImgError] = useState(false)

  return (
    <motion.div
      whileHover={{ scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      onClick={() => onViewDetail(meal)}
      className="h-full cursor-pointer"
    >
      <Card className="group h-full overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm transition-all duration-300 hover:border-[#D4AF37]/45 hover:shadow-[0_10px_28px_rgba(0,0,0,0.12)]">
        <div className="relative aspect-square overflow-hidden bg-muted sm:aspect-[4/3]">
          {meal.imageUrl && !imgError ? (
            <Image
              src={meal.imageUrl}
              alt={meal.titleAr || meal.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              loading={priority ? 'eager' : 'lazy'}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <UtensilsCrossed className="size-10 text-muted-foreground/40" />
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
            <Clock className="h-3 w-3 text-[#D4AF37]" />
            <span>{meal.prepTime}</span>
          </div>
          <div className="absolute left-2 top-2 rounded-md bg-[#D4AF37] px-2 py-1 text-sm font-black text-[#0F1419] shadow">
            {meal.price.toFixed(0)} ج.م
          </div>
        </div>

        <CardContent className="flex h-[168px] flex-col p-3 sm:h-[178px] sm:p-4">
          <h3 className="line-clamp-2 min-h-[40px] text-right text-base font-black leading-tight text-foreground sm:text-lg" dir="rtl">
            {meal.titleAr || meal.title}
          </h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">{meal.title}</p>
          {meal.descriptionAr && (
            <p className="mt-2 line-clamp-2 text-right text-xs leading-relaxed text-muted-foreground/80 sm:text-sm" dir="rtl">
              {meal.descriptionAr}
            </p>
          )}
          <div className="mt-auto flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[#D4AF37]/12 text-sm font-bold text-[#9A6F00] transition-colors group-hover:bg-[#D4AF37] group-hover:text-[#0F1419]" dir="rtl">
            <ShoppingCart className="h-4 w-4" />
            عرض التفاصيل
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
