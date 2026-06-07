'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Clock, Plus, ShoppingCart, UtensilsCrossed } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/store/cart-store'
import { type Meal } from '@/lib/saraya/types'

interface MealCardProps {
  meal: Meal
}

export function MealCard({ meal }: MealCardProps) {
  const addItem = useCartStore((state) => state.addItem)

  const handleAddToCart = () => {
   addItem({
      mealId: meal.id,
      title: meal.title,
      titleAr: meal.titleAr,
      price: meal.price,
      quantity: 1,
      imageUrl: meal.imageUrl,
      category: meal.category,
      preparationArea: meal.preparationArea,
      addOns: [],
    })
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Card className="group overflow-hidden border border-border/50 bg-card transition-all duration-300 hover:border-[#D4AF37]/40 hover:shadow-[0_0_20px_rgba(202,170,74,0.15)]">
        <div className="relative aspect-[4/3] overflow-hidden">
          {meal.imageUrl ? (
            <Image src={meal.imageUrl} alt={meal.titleAr} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 768px) 50vw, 25vw" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <UtensilsCrossed className="size-12 text-muted-foreground/40" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 border-2 border-transparent transition-colors duration-300 group-hover:border-yellow-600/30" />
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
          <Button onClick={handleAddToCart} className="w-full gap-2 bg-yellow-600 text-white shadow-md hover:bg-yellow-500 hover:shadow-lg active:scale-[0.98] transition-all duration-200" size="sm">
            <ShoppingCart className="size-4" />
            <span>أضف للسلة</span>
            <Plus className="size-3.5" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
