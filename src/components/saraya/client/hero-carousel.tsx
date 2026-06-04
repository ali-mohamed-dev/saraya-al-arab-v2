'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/store/cart-store'
import { type Promotion } from '@/lib/saraya/types'
import { toast } from 'sonner'

export function HeroCarousel() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(1)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isPaused = useRef(false)
  const promotionsRef = useRef<Promotion[]>([])
  const addItem = useCartStore((s) => s.addItem)

  useEffect(() => {
    promotionsRef.current = promotions
  }, [promotions])

  useEffect(() => {
    async function fetchPromotions() {
      try {
        const res = await fetch('/api/promotions')
        if (!res.ok) throw new Error('Failed to fetch promotions')
        const data: Promotion[] = await res.json()
        const active = data.filter((p) => p.isActive)
        setPromotions(active)
      } catch (error) {
        console.error('Error fetching promotions:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchPromotions()
  }, [])

  useEffect(() => {
    if (promotions.length <= 1) return
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    timerRef.current = setInterval(() => {
      if (!isPaused.current) {
        const len = promotionsRef.current.length
        if (len > 1) { setDirection(1); setCurrent((prev) => (prev + 1) % len) }
      }
    }, 4000)
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
  }, [promotions.length])

  const goTo = (index: number) => { setDirection(index > current ? 1 : -1); setCurrent(index) }
  const goNext = () => { if (promotions.length <= 1) return; setDirection(1); setCurrent((prev) => (prev + 1) % promotions.length) }
  const goPrev = () => { if (promotions.length <= 1) return; setDirection(-1); setCurrent((prev) => (prev - 1 + promotions.length) % promotions.length) }

  const handleOrderNow = (promo: Promotion) => {
    addItem({
      mealId: promo.mealId || promo.id,
      title: promo.title,
      titleAr: promo.titleAr || promo.title,
      price: promo.price || 0,
      quantity: 1,
      imageUrl: promo.bannerImageUrl || '',
      addOns: [],
      category: 'عروض',
      preparationArea: 'KITCHEN',
    })
    toast.success(`تم إضافة "${promo.titleAr || promo.title}" للسلة`)
  }

  if (isLoading) {
    return (
      <div className="w-full h-[300px] md:h-[400px] relative overflow-hidden bg-[#0F1419]">
        <Skeleton className="w-full h-full rounded-none bg-white/5" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <Skeleton className="h-8 w-3/4 mb-3 rounded bg-white/10" />
          <Skeleton className="h-4 w-1/2 rounded bg-white/10" />
        </div>
      </div>
    )
  }

  if (promotions.length === 0) {
    return (
      <div className="w-full h-[300px] md:h-[400px] bg-[#0F1419] flex items-center justify-center">
        <div className="text-center" dir="rtl">
          <Sparkles className="size-8 text-[#D4AF37] mx-auto mb-3 opacity-60" />
          <p className="text-[#D4AF37] text-lg font-medium tracking-wide">لا توجد عروض حالياً</p>
        </div>
      </div>
    )
  }

  const promo = promotions[current]

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  }

  return (
    <div className="relative w-full group" onMouseEnter={() => { isPaused.current = true }} onMouseLeave={() => { isPaused.current = false }}>
      <div className="relative w-full h-[250px] sm:h-[300px] md:h-[400px] overflow-hidden bg-[#0F1419]">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div key={promo.id} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ x: { type: 'tween', duration: 0.4, ease: 'easeInOut' }, opacity: { duration: 0.3 } }} className="absolute inset-0">
            <img src={promo.bannerImageUrl} alt={promo.titleAr || promo.title} className="w-full h-full object-cover" draggable={false} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F1419] via-[#0F1419]/40 to-transparent" />
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-5 md:p-10 pb-8 md:pb-14" dir="rtl">
              <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="text-[#D4AF37] text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold drop-shadow-lg">
                {promo.titleAr}
              </motion.h2>
              {promo.title && (
                <motion.p initial={{ opacity: 0, y: 15 }} animate={{ opacity: 0.7, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }} className="text-white/70 text-xs sm:text-sm md:text-base mt-2">
                  {promo.title}
                </motion.p>
              )}

              {/* السعر + زرار اطلب الآن */}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.45 }} className="flex items-center gap-3 mt-4">
                {(promo.price !== undefined && promo.price > 0) && (
                  <span className="text-[#D4AF37] text-lg sm:text-xl md:text-2xl font-bold">
                    {promo.price.toFixed(2)} ج.م
                  </span>
                )}
                {(promo.mealId || promo.price > 0) && (
                  <button onClick={() => handleOrderNow(promo)} className="flex items-center gap-2 rounded-xl bg-[#D4AF37] px-4 py-2 sm:px-6 sm:py-2.5 text-sm sm:text-base font-bold text-[#0F1419] shadow-lg shadow-[#D4AF37]/30 transition-all hover:bg-[#c9a22e] hover:shadow-xl active:scale-95">
                    <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                    {promo.buttonTextAr || 'اطلب الآن'}
                  </button>
                )}
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {promotions.length > 1 && (
        <>
          <button onClick={goNext} className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 z-10 size-9 md:size-12 rounded-full border-none bg-[#D4AF37] text-[#0F1419] hover:bg-[#c9a22e] shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100 flex items-center justify-center" aria-label="العرض التالي">
            <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
          </button>
          <button onClick={goPrev} className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 z-10 size-9 md:size-12 rounded-full border-none bg-[#D4AF37] text-[#0F1419] hover:bg-[#c9a22e] shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100 flex items-center justify-center" aria-label="العرض السابق">
            <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
          </button>
        </>
      )}

      {promotions.length > 1 && (
        <div className="absolute bottom-3 md:bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
          {promotions.map((_, index) => (
            <button key={index} onClick={() => goTo(index)} className={`transition-all duration-300 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/50 ${current === index ? 'w-8 h-2.5 bg-[#D4AF37]' : 'w-2.5 h-2.5 bg-white/40 hover:bg-white/60'}`} aria-label={`الانتقال للعرض ${index + 1}`} />
          ))}
        </div>
      )}
    </div>
  )
}