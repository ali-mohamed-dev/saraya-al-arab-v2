'use client'

import { motion } from 'framer-motion'
import { ShoppingCart, UtensilsCrossed, Plus, Tag } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { type Promotion } from '@/lib/saraya/types'

interface PromotionCardProps {
  promo: Promotion
  onViewDetail: (promo: Promotion) => void
}

export function PromotionCard({ promo, onViewDetail }: PromotionCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={() => onViewDetail(promo)}
      className="cursor-pointer"
    >
      <Card className="group overflow-hidden border border-border/50 bg-card transition-all duration-300 hover:border-[#D4AF37]/40 hover:shadow-[0_0_20px_rgba(202,170,74,0.15)]">
        <div className="relative aspect-[4/3] overflow-hidden">
          {promo.bannerImageUrl ? (
            <img
              src={promo.bannerImageUrl}
              alt={promo.titleAr || promo.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <UtensilsCrossed className="size-12 text-muted-foreground/40" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
            <Tag className="h-3 w-3" />
            عرض خاص
          </div>
          {promo.discount > 0 && (
            <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-green-500 px-2 py-1 text-xs font-bold text-white shadow-lg">
              -{promo.discount}%
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 border-2 border-transparent transition-colors duration-300 group-hover:border-yellow-600/30" />

          {/* Hover plus button — same as MealCardSimple */}
          <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D4AF37] text-black shadow-lg">
              <Plus className="h-4 w-4" />
            </div>
          </div>
        </div>

        <CardContent className="space-y-3 p-4">
          <h3 className="text-lg font-bold leading-tight text-foreground text-right" dir="rtl">
            {promo.titleAr || promo.title}
          </h3>
          <p className="text-sm text-muted-foreground">{promo.title}</p>
          {(promo.descriptionAr || promo.description) && (
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground/80 text-right" dir="rtl">
              {promo.descriptionAr || promo.description}
            </p>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-yellow-600">{promo.price.toFixed(2)}</span>
              <span className="text-sm font-medium text-yellow-600/80">جنيه</span>
              {promo.oldPrice > promo.price && (
                <span className="text-sm text-muted-foreground line-through">{promo.oldPrice.toFixed(2)}</span>
              )}
            </div>
            {promo.mealItems && promo.mealItems.length > 0 && (
              <Badge variant="outline" className="border-[#D4AF37]/30 text-[#D4AF37] text-xs">
                {promo.mealItems.length} صنف
              </Badge>
            )}
          </div>

          {/* Bottom CTA — same style as MealCardSimple */}
          <div
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#D4AF37]/10 py-2 text-sm font-medium text-[#D4AF37] transition-colors group-hover:bg-[#D4AF37]/20"
            dir="rtl"
          >
            <ShoppingCart className="h-4 w-4" />
            اضغط للطلب
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}