'use client'

import { useEffect, useState, useRef } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Sparkles, ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/store/cart-store'
import { type Promotion } from '@/lib/saraya/types'
import { toast } from 'sonner'

export function HeroCarousel() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const isPaused = useRef(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const addItem = useCartStore((s) => s.addItem)

  useEffect(() => {
    fetch('/api/promotions?active=true')
      .then(res => res.ok ? res.json() : [])
      .then(data => setPromotions(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  // ── الحل الصح: translateX بنسبة مئوية من عرض الـ track نفسه ──
  // لو عندنا n slides، الـ track عرضه n*100%
  // للانتقال للـ slide رقم i، نحرك بـ (i/n * 100)% من عرض الـ track
  // = i * (100/n)% — بس ده معقد. الأسهل: نستخدم calc بـ px
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const slideWidth = track.parentElement?.clientWidth || 0
    track.style.transform = `translateX(${current * slideWidth}px)`
  }, [current, promotions.length])

  // resize observer عشان لو الـ window اتغير حجمه
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const observer = new ResizeObserver(() => {
      const slideWidth = track.parentElement?.clientWidth || 0
      track.style.transform = `translateX(${current * slideWidth}px)`
    })
    if (track.parentElement) observer.observe(track.parentElement)
    return () => observer.disconnect()
  }, [current])

  // Auto-play
  useEffect(() => {
    if (promotions.length <= 1) return
    const interval = setInterval(() => {
      if (!isPaused.current) {
        setCurrent(prev => (prev + 1) % promotions.length)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [promotions.length])

  const goNext = () => setCurrent(prev => (prev + 1) % promotions.length)
  const goPrev = () => setCurrent(prev => (prev - 1 + promotions.length) % promotions.length)

  const handleOrderNow = (promo: Promotion) => {
    const mealsList = promo.mealItems?.map(mi => mi.meal?.titleAr || mi.meal?.title).join(' + ')
    const displayTitleAr = mealsList
      ? `${promo.titleAr || promo.title} (${mealsList})`
      : (promo.titleAr || promo.title)
    addItem({
      mealId: promo.mealId || promo.id,
      title: promo.title,
      titleAr: displayTitleAr,
      price: (promo.price && promo.price > 0) ? promo.price : 0,
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
      <div className="w-full h-[300px] md:h-[400px] relative overflow-hidden bg-background">
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
      <div className="w-full h-[300px] md:h-[400px] bg-background flex items-center justify-center">
        <div className="text-center" dir="rtl">
          <Sparkles className="size-8 text-[#D4AF37] mx-auto mb-3 opacity-60" />
          <p className="text-[#D4AF37] text-lg font-medium">لا توجد عروض حالياً</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative w-full group"
      onMouseEnter={() => { isPaused.current = true }}
      onMouseLeave={() => { isPaused.current = false }}
    >
      {/* Viewport */}
      <div className="relative w-full h-[250px] sm:h-[300px] md:h-[400px] overflow-hidden bg-background">

        {/* Track: flex row بـ px width ثابت */}
        <div
          ref={trackRef}
          dir="ltr"
          className="flex h-full"
          style={{
            width: `${promotions.length * 100}%`,
            transition: 'transform 0.7s cubic-bezier(0.25, 0.1, 0.25, 1)',
            willChange: 'transform',
          }}
        >
          {promotions.map((promo) => (
            <div
              key={promo.id}
              className="relative h-full"
              style={{ width: `${100 / promotions.length}%` }}
            >
              {promo.bannerImageUrl && !failedImages.has(promo.id) ? (
                <img
                  src={promo.bannerImageUrl}
                  alt={promo.titleAr || promo.title}
                  className="w-full h-full object-cover"
                  draggable={false}
                  loading="eager"
                  onError={() => setFailedImages(prev => new Set(prev).add(promo.id))}
                />
              ) : (
                <div className="w-full h-full bg-muted" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-5 md:p-10 pb-8 md:pb-14" dir="rtl">
                <h2 className="text-[#D4AF37] text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold drop-shadow-lg">
                  {promo.titleAr}
                </h2>
                {promo.title && (
                  <p className="text-foreground/70 text-xs sm:text-sm md:text-base mt-2">{promo.title}</p>
                )}
                <div className="flex items-center gap-3 mt-4">
                  {promo.price !== undefined && promo.price > 0 && (
                    <span className="text-[#D4AF37] text-lg sm:text-xl md:text-2xl font-bold">
                      {promo.price.toFixed(2)} ج.م
                    </span>
                  )}
                  {(promo.mealId || (promo.price && promo.price > 0)) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOrderNow(promo) }}
                      className="flex items-center gap-2 rounded-xl bg-[#D4AF37] px-4 py-2 sm:px-6 sm:py-2.5 text-sm sm:text-base font-bold text-[#0F1419] shadow-lg shadow-[#D4AF37]/30 transition-all hover:bg-[#c9a22e] active:scale-95"
                    >
                      <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                      {promo.buttonTextAr || 'اطلب الآن'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Arrows */}
      {promotions.length > 1 && (
        <>
          <button onClick={goNext}
            className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 z-10 size-9 md:size-12 rounded-full bg-[#D4AF37] text-[#0F1419] hover:bg-[#c9a22e] shadow-lg transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center"
            aria-label="العرض التالي">
            <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
          </button>
          <button onClick={goPrev}
            className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 z-10 size-9 md:size-12 rounded-full bg-[#D4AF37] text-[#0F1419] hover:bg-[#c9a22e] shadow-lg transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center"
            aria-label="العرض السابق">
            <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
          </button>
        </>
      )}

      {/* Dots */}
      {promotions.length > 1 && (
        <div className="absolute bottom-3 md:bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
          {promotions.map((_, index) => (
            <button key={index} onClick={() => setCurrent(index)}
              className={`transition-all duration-300 rounded-full ${
                current === index ? 'w-8 h-2.5 bg-[#D4AF37]' : 'w-2.5 h-2.5 bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`الانتقال للعرض ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
