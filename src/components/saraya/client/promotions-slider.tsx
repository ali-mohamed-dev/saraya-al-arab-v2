'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCartStore } from '@/store/cart-store'
import { ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'

interface Promotion {
  id: string
  bannerImageUrl: string
  title: string
  titleAr: string
  description: string
  descriptionAr: string
  price: number
  mealId: string | null
  buttonText: string
  buttonTextAr: string
  mealItems?: Array<{ id: string; mealId: string; meal: { title: string; titleAr: string } }>
  isActive: boolean
}

interface PromotionsSliderProps {
  activeOnly?: boolean
}

export function PromotionsSlider({ activeOnly = true }: PromotionsSliderProps) {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(true)
  const addItem = useCartStore((s) => s.addItem)

  const fetchPromotions = useCallback(async () => {
    try {
      const url = activeOnly ? '/api/promotions?active=true' : '/api/promotions'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setPromotions(Array.isArray(data) ? data : [])
      }
    } catch {
      setPromotions([])
    } finally {
      setLoading(false)
    }
  }, [activeOnly])

  useEffect(() => {
    fetchPromotions()
  }, [fetchPromotions])

  useEffect(() => {
    if (promotions.length <= 1) return
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % promotions.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [promotions.length])

  const goNext = () => {
    if (promotions.length <= 1) return
    setCurrent((prev) => (prev + 1) % promotions.length)
  }

  const goPrev = () => {
    if (promotions.length <= 1) return
    setCurrent((prev) => (prev - 1 + promotions.length) % promotions.length)
  }

  const handleOrderNow = (promo: Promotion) => {
    const mealsList = promo.mealItems?.map(mi => mi.meal?.titleAr || mi.meal?.title).join(' + ')
    const displayTitleAr = mealsList ? `${promo.titleAr || promo.title} (${mealsList})` : (promo.titleAr || promo.title)

    addItem({
      mealId: promo.mealId || promo.id,
      title: promo.title,
      titleAr: displayTitleAr,
      price: promo.price,
      quantity: 1,
      imageUrl: promo.bannerImageUrl,
      addOns: [],
      category: 'عروض',
      preparationArea: 'KITCHEN',
    })
    toast.success(`تم إضافة "${promo.titleAr || promo.title}" للسلة`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 rounded-2xl bg-muted animate-pulse">
        <p className="text-muted-foreground">جاري تحميل العروض...</p>
      </div>
    )
  }

  if (promotions.length === 0) return null

  const promo = promotions[current]

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-lg">
      <div className="relative h-48 sm:h-56 md:h-64">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={promo.bannerImageUrl}
          alt={promo.titleAr || promo.title}
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <h2 className="text-white text-xl font-bold mb-1 drop-shadow-lg">
            {promo.titleAr || promo.title}
          </h2>

          {(promo.descriptionAr || promo.description) && (
            <p className="text-white/80 text-sm mb-2 line-clamp-2">
              {promo.descriptionAr || promo.description}
            </p>
          )}

          <div className="flex items-center gap-3">
            {promo.price > 0 && (
              <span className="text-primary font-bold text-lg">
                {promo.price.toFixed(2)} ج.م
              </span>
            )}

            <button
              onClick={() => handleOrderNow(promo)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg"
            >
              <ShoppingCart className="h-4 w-4" />
              اطلب الآن
            </button>
          </div>
        </div>

        {promotions.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {promotions.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {promotions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all ${
                  i === current ? 'w-6 bg-primary' : 'w-2 bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}