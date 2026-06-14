'use client'

import { useState, useCallback, useEffect } from 'react'
import { MenuHeader } from '@/components/Top/client/menu-header'
import { HeroCarousel } from '@/components/Top/client/promotions/hero-carousel'
import { MenuCategories } from '@/components/Top/client/menu/menu-categories'
import { MenuGrid } from '@/components/Top/client/menu/menu-grid'
import { PromotionsGrid } from '@/components/Top/client/menu/promotions-grid'
import { OrderDetail } from '@/components/Top/client/orders/order-detail'
import { OrderTracking } from '@/components/Top/client/orders/order-tracking'
import { CartSummary } from '@/components/Top/client/cart-summary'
import { ShoppingCart, Package } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/store/cart-store'
import type { Meal, Promotion } from '@/lib/saraya/types'

interface ClientMenuProps {
  onAdminClick: () => void
  onUserClick: () => void
  initialMeals: Meal[]
  initialPromotions: Promotion[]
  initialTakingOrders: boolean | null
  initialStoreMessage: string
}

/* ── Splash Screen ──────────────────────────────────── */
function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'enter' | 'exit' | 'done'>('enter')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('exit'), 2000)
    const t2 = setTimeout(() => { setPhase('done'); onDone() }, 3000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  if (phase === 'done') return null

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === 'exit' ? 0 : 1 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-[#0a0a0a] via-[#111] to-[#0a0a0a]"
      dir="rtl"
    >
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#D4AF37]/5 blur-[120px]" />
        <div className="absolute -bottom-1/2 right-1/4 w-[400px] h-[400px] rounded-full bg-[#D4AF37]/3 blur-[100px]" />
      </div>

      {/* Logo animation */}
      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
        className="relative"
      >
        <motion.div
          animate={phase === 'enter' ? { boxShadow: ['0 0 0px rgba(212, 175, 55, 0)', '0 0 60px rgba(212, 175, 55, 0.3)', '0 0 0px rgba(212, 175, 55, 0)'] } : {}}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="h-28 w-28 rounded-3xl bg-gradient-to-br from-[#D4AF37] to-[#B8962F] flex items-center justify-center shadow-2xl shadow-[#D4AF37]/30"
        >
          <motion.span
            animate={phase === 'enter' ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="text-5xl font-black text-black"
          >
            T
          </motion.span>
        </motion.div>
      </motion.div>

      {/* Name */}
      <motion.h1
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
        className="mt-6 text-4xl sm:text-5xl font-black tracking-wider"
      >
        <span className="bg-gradient-to-l from-[#D4AF37] to-[#F7E8B0] bg-clip-text text-transparent">
          TOP
        </span>
      </motion.h1>

      {/* Tagline */}
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.7, ease: 'easeOut' }}
        className="mt-3 text-sm text-[#D4AF37]/60 tracking-[0.3em]"
      >
        FINE DINING
      </motion.p>

      {/* Dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-16 flex gap-2"
      >
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            className="h-2 w-2 rounded-full bg-[#D4AF37]/60"
          />
        ))}
      </motion.div>
    </motion.div>
  )
}

/* ── Container animation variants ───────────────────── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.3,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
}

/* ── Main Component ─────────────────────────────────── */
export function ClientMenu({
  onAdminClick,
  onUserClick,
  initialMeals,
  initialPromotions,
  initialTakingOrders: _initialTakingOrders,
  initialStoreMessage: _initialStoreMessage,
}: ClientMenuProps) {
  const [splashDone, setSplashDone] = useState(false)
  const handleSplashDone = useCallback(() => setSplashDone(true), [])
  const [activeCategory, setActiveCategory] = useState('الكل')
  const [viewingMeal, setViewingMeal] = useState<Meal | null>(null)
  const [viewingPromotion, setViewingPromotion] = useState<Promotion | null>(null)
  const [showTracking, setShowTracking] = useState(false)
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)
  const [showCart, setShowCart] = useState(false)

  useEffect(() => {
    setActiveOrderId(localStorage.getItem('saraya-active-order-id'))
  }, [])
  const [meals] = useState(initialMeals)
  const [promotions] = useState(initialPromotions.filter(p => p.isActive))
  const [loading] = useState(false)
  const cartCount = useCartStore((s) => s.items.reduce((sum, item) => sum + item.quantity, 0))

  const filteredMeals = activeCategory === 'الكل'
    ? meals
    : meals.filter(m => m.category === activeCategory)

  const handleViewDetail = useCallback((meal: Meal) => {
    setViewingMeal(meal)
  }, [])

  const handleViewPromoDetail = useCallback((promo: Promotion) => {
    setViewingPromotion(promo)
  }, [])

  if (!splashDone) {
    return <SplashScreen onDone={handleSplashDone} />
  }

  if (showTracking) {
    return (
      <div className="min-h-dvh bg-background">
        <MenuHeader onAdminClick={onAdminClick} onUserClick={onUserClick} onTrackClick={() => setShowTracking(false)} />
        <main className="mx-auto max-w-2xl p-4">
          {activeOrderId ? (
            <OrderTracking orderId={activeOrderId} onBackToMenu={() => setShowTracking(false)} />
          ) : (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-6 text-center" dir="rtl">
              <Package className="h-16 w-16 text-muted-foreground/40" />
              <p className="text-lg font-bold text-foreground">لا يوجد طلب نشط</p>
              <p className="text-sm text-muted-foreground">لم تقم بتقديم أي طلب بعد. يمكنك تصفح القائمة وبدء طلب جديد.</p>
              <Button
                className="w-full mt-2 bg-[#D4AF37] text-black font-bold hover:bg-[#c9a430]"
                onClick={() => setShowTracking(false)}
              >
                العودة للقائمة
              </Button>
            </div>
          )}
        </main>
      </div>
    )
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-dvh bg-background/95"
    >
      <motion.div variants={itemVariants}>
        <MenuHeader onAdminClick={onAdminClick} onUserClick={onUserClick} onTrackClick={() => { setActiveOrderId(localStorage.getItem('saraya-active-order-id')); setShowTracking(true) }} />
      </motion.div>

      <main className="mx-auto max-w-7xl">
        <motion.div variants={itemVariants}>
          <HeroCarousel />
        </motion.div>

        <div className="sticky top-0 z-20 px-3 sm:px-4 -mt-2 bg-background/95 backdrop-blur-sm">
          <motion.div variants={itemVariants}>
            <MenuCategories activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
          </motion.div>
        </div>

        <div className="px-3 sm:px-4 mt-4 pb-28">
          <motion.div variants={itemVariants}>
            {activeCategory === 'عروض' ? (
              <PromotionsGrid
                promotions={promotions}
                onViewDetail={handleViewPromoDetail}
              />
            ) : (
              <MenuGrid
                meals={filteredMeals}
                loading={loading}
                activeCategory={activeCategory}
                onViewDetail={handleViewDetail}
              />
            )}
          </motion.div>
        </div>
      </main>

      {/* Floating Cart Button */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.5, ease: 'easeOut' }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
      >
        <button onClick={() => setShowCart(true)}
          className="relative flex items-center gap-2.5 h-12 px-6 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#C9A431] text-black font-bold shadow-2xl shadow-[#D4AF37]/30 hover:shadow-[#D4AF37]/50 transition-all hover:scale-105 active:scale-95">
          <ShoppingCart className="h-5 w-5" />
          عرض السلة
          {cartCount > 0 && (
            <motion.span
              key={cartCount}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="absolute -top-2 -right-2 h-5 min-w-[20px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 shadow-lg"
            >
              {cartCount}
            </motion.span>
          )}
        </button>
      </motion.div>

      {/* Order Detail Sheet */}
      <AnimatePresence>
        {viewingMeal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setViewingMeal(null)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-background"
              onClick={e => e.stopPropagation()}>
              <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted-foreground/20" />
              <OrderDetail meal={viewingMeal} open={true} onClose={() => setViewingMeal(null)} promotion={null} />
            </motion.div>
          </motion.div>
        )}
        {viewingPromotion && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setViewingPromotion(null)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-background"
              onClick={e => e.stopPropagation()}>
              <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted-foreground/20" />
              <OrderDetail meal={null} open={true} onClose={() => setViewingPromotion(null)} promotion={viewingPromotion} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Drawer */}
      <AnimatePresence>
        {showCart && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCart(false)}>
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute top-0 bottom-0 left-0 w-full max-w-md bg-background shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <CartSummary onClose={() => setShowCart(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
