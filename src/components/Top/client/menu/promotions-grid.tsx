'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ShoppingCart, ChefHat, UtensilsCrossed, Percent, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { type Promotion } from '@/lib/saraya/types'

interface PromotionsGridProps {
  promotions: Promotion[]
  onViewDetail: (promo: Promotion) => void
}

function PromoCard({ promo, onViewDetail, index }: { promo: Promotion; onViewDetail: (promo: Promotion) => void; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.3), ease: 'easeOut' }}
      whileHover={{ y: -4 }}
      onClick={() => onViewDetail(promo)}
      className="group cursor-pointer"
    >
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card transition-all duration-300 hover:border-[#D4AF37]/30 hover:shadow-[0_0_30px_rgba(212,175,55,0.12)]">
        {/* Image */}
        <div className="relative aspect-[16/9] sm:aspect-[4/3] overflow-hidden">
          {promo.bannerImageUrl ? (
            <img
              src={promo.bannerImageUrl}
              alt={promo.titleAr || promo.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <UtensilsCrossed className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          {/* Badges */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-red-500/90 backdrop-blur-sm px-3 py-1 text-[11px] font-bold text-white shadow-lg">
            <Tag className="h-3 w-3" />
            عرض خاص
          </div>
          {promo.discount > 0 && (
            <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-emerald-500/90 backdrop-blur-sm px-2.5 py-1 text-[11px] font-bold text-white shadow-lg">
              <Percent className="h-3 w-3" />
              خصم {promo.discount}%
            </div>
          )}

          {/* Bottom info on image */}
          <div className="absolute bottom-3 right-3 left-3 flex items-end justify-between">
            <div className="flex items-center gap-2">
              {promo.mealItems && promo.mealItems.length > 0 && (
                <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm border-0 text-[10px] h-5 px-2">
                  <ChefHat className="h-3 w-3 ml-1" />
                  {promo.mealItems.length} {promo.mealItems.length === 1 ? 'صنف' : 'أصناف'}
                </Badge>
              )}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-white drop-shadow-lg">{promo.price.toFixed(0)}</span>
              <span className="text-[10px] font-medium text-white/80 drop-shadow">ج.م</span>
              {promo.oldPrice > promo.price && (
                <span className="text-[11px] text-red-300 line-through drop-shadow">{promo.oldPrice.toFixed(0)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-2.5">
          <div>
            <h3 className="font-bold text-sm leading-tight text-right" dir="rtl">{promo.titleAr || promo.title}</h3>
            <p className="text-[11px] text-muted-foreground/60 truncate">{promo.title}</p>
          </div>
          {(promo.descriptionAr || promo.description) && (
            <p className="text-xs text-muted-foreground/70 line-clamp-2 leading-relaxed text-right" dir="rtl">
              {promo.descriptionAr || promo.description}
            </p>
          )}

          {/* Price row */}
          <div className="flex items-center justify-between pt-1 border-t border-border/20">
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-[#D4AF37]">{promo.price.toFixed(2)}</span>
              <span className="text-[10px] text-[#D4AF37]/70">ج.م</span>
              {promo.oldPrice > promo.price && (
                <span className="text-[11px] text-muted-foreground line-through">{promo.oldPrice.toFixed(2)}</span>
              )}
            </div>
            <span className="text-[10px] inline-flex items-center gap-1 rounded-md bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-0.5 font-medium">
              <ShoppingCart className="h-3 w-3" />
              اطلب الآن
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function PromotionsGrid({ promotions, onViewDetail }: PromotionsGridProps) {
  if (promotions.length === 0) {
    return (
      <div className="py-20 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-20 h-20 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-10 w-10 text-muted-foreground/20" />
          </div>
          <p className="text-lg font-bold text-muted-foreground mb-1">لا توجد عروض حالياً</p>
          <p className="text-sm text-muted-foreground/60">تابعنا قريباً لعروض وخصومات جديدة</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div>
      <AnimatePresence mode="wait">
        <motion.div
          key="promotions-header"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-red-500/20 to-red-600/5 border border-red-500/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-red-400" />
            </div>
            <h2 className="text-lg sm:text-xl font-black">العروض</h2>
          </div>
          <Badge variant="outline" className="rounded-md border-red-500/30 px-3 py-1 text-red-400">
            {promotions.length} عرض
          </Badge>
        </motion.div>
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {promotions.map((promo, index) => (
          <PromoCard key={promo.id} promo={promo} onViewDetail={onViewDetail} index={index} />
        ))}
      </div>
    </div>
  )
}
