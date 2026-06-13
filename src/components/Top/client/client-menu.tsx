'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, Flame, ShoppingBasket, Phone } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { HeroCarousel } from '@/components/Top/client/promotions/hero-carousel'
import { MenuHeader } from '@/components/Top/client/menu-header'
import { MenuCategories } from '@/components/Top/client/menu/menu-categories'
import { MenuGrid } from '@/components/Top/client/menu/menu-grid'
import { CartSummary } from '@/components/Top/client/cart-summary'
import { OrderDetail } from '@/components/Top/client/orders/order-detail'
import { OrderTracking } from '@/components/Top/client/orders/order-tracking'
import { PromotionCard } from '@/components/Top/client/promotions/promotion-card'
import { useCartStore } from '@/store/cart-store'
import { type Meal, type Promotion } from '@/lib/saraya/types'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

interface ClientMenuProps {
  onAdminClick: () => void
  onUserClick?: () => void
  initialMeals?: Meal[]
  initialPromotions?: Promotion[]
  initialTakingOrders?: boolean | null
  initialStoreMessage?: string
}

export function ClientMenu({ onAdminClick, onUserClick, initialMeals = [], initialPromotions = [], initialTakingOrders = null, initialStoreMessage = '' }: ClientMenuProps) {
  const [meals, setMeals] = useState<Meal[]>(initialMeals)
  const [loading, setLoading] = useState(initialMeals.length === 0)
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // ── Meal detail state ──
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null)
  const [orderDetailOpen, setOrderDetailOpen] = useState(false)

  // ── Promotion detail state ──
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null)
  const [promotionDetailOpen, setPromotionDetailOpen] = useState(false)

  const [promotions, setPromotions] = useState<Promotion[]>(initialPromotions)
  const [promotionsLoading, setPromotionsLoading] = useState(false)

  const cartItems = useCartStore((s) => s.items)
  const [cartOpen, setCartOpen] = useState(false)
  const [takingOrders, setTakingOrders] = useState<boolean | null>(initialTakingOrders)
  const [storeMessage, setStoreMessage] = useState(initialStoreMessage)

  const totalItems = cartItems.reduce((sum, i) => sum + i.quantity, 0)

  const [trackingOpen, setTrackingOpen] = useState(false)
  const [trackingPhone, setTrackingPhone] = useState('')
  const [trackedOrderId, setTrackedOrderId] = useState<string | null>(null)

  useEffect(() => {
    const savedPhone = localStorage.getItem('saraya-customer-phone')
    if (savedPhone) setTrackingPhone(savedPhone)

    const params = new URLSearchParams(window.location.search)
    const tableParam = params.get('table')
    const codeParam = params.get('code')
    if (tableParam && codeParam) {
      localStorage.setItem('saraya-table-number', tableParam)
      localStorage.setItem('saraya-table-code', codeParam.toUpperCase())
      window.history.replaceState({}, '', '/')
    }

    const activeOrderId = localStorage.getItem('saraya-active-order-id')
    if (activeOrderId) {
      fetch(`/api/orders/${activeOrderId}`)
        .then(res => res.ok ? res.json() : null)
        .then(order => {
          if (order && ['DELIVERED', 'CANCELLED'].includes(order.status)) {
            localStorage.removeItem('saraya-active-order-id')
          }
        })
        .catch(() => { /* don't remove on network error — key may still be valid */ })
    }
  }, [])

  useEffect(() => {
    if (initialMeals.length > 0) { setLoading(false); return }
    async function fetchMeals() {
      try {
        const res = await fetch('/api/meals')
        if (res.ok) {
          const data: Meal[] = await res.json()
          setMeals(data.filter((m) => m.isActive && m.category !== 'اصناف الصالة'))
        }
      } catch (error) {
        console.error('Error fetching meals:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchMeals()
  }, [initialMeals.length])

  useEffect(() => {
    if (initialTakingOrders !== null) return
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setTakingOrders(data.takingOrders)
          setStoreMessage(data.message || '')
        }
      })
      .catch(() => {})
  }, [initialTakingOrders])

  useEffect(() => {
    if (activeCategory === 'عروض') {
      if (initialPromotions.length > 0) return
      setPromotionsLoading(true)
      fetch('/api/promotions?active=true')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setPromotions(Array.isArray(data) ? data : []))
        .catch(() => setPromotions([]))
        .finally(() => setPromotionsLoading(false))
    }
  }, [activeCategory, initialPromotions.length])

  const filteredMeals = useMemo(() => {
    let result = meals
    if (activeCategory !== 'all' && activeCategory !== 'عروض') {
      result = result.filter((m) => m.category === activeCategory)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.titleAr.includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.descriptionAr.includes(q)
      )
    }
    return result
  }, [meals, activeCategory, searchQuery])

  // ── Handlers ──
  const handleViewDetail = (meal: Meal) => {
    setSelectedMeal(meal)
    setOrderDetailOpen(true)
  }

  const handleCloseDetail = () => {
    setOrderDetailOpen(false)
    setTimeout(() => setSelectedMeal(null), 300)
  }

  // فتح OrderDetail للعرض
  const handleViewPromoDetail = (promo: Promotion) => {
    setSelectedPromotion(promo)
    setPromotionDetailOpen(true)
  }

  const handleClosePromoDetail = () => {
    setPromotionDetailOpen(false)
    setTimeout(() => setSelectedPromotion(null), 300)
  }

  const handleOpenTracking = () => {
    const savedId = localStorage.getItem('saraya-active-order-id')
    if (savedId) {
      setTrackedOrderId(savedId)
      setTrackingOpen(true)
    } else {
      setTrackedOrderId(null)
      setTrackingOpen(true)
    }
  }

  const handleTrackOrder = async () => {
    if (!trackingPhone || trackingPhone.length < 11) {
      toast.error('يرجى إدخال رقم هاتف صحيح')
      return
    }
    try {
      const res = await fetch(`/api/orders?customerPhone=${trackingPhone}`)
      if (res.ok) {
        const orders = await res.json()
        const activeOrders = orders.filter((o: any) => !['DELIVERED', 'CANCELLED'].includes(o.status))
        if (activeOrders.length > 0) {
          const latestOrder = activeOrders.sort((a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0]
          setTrackedOrderId(latestOrder.id)
        } else {
          toast.error('لا توجد طلبات نشطة حالياً مرتبطة بهذا الرقم')
        }
      } else {
        toast.error('حدث خطأ أثناء البحث عن الطلب')
      }
    } catch (error) {
      console.error('Tracking error:', error)
      toast.error('فشل الاتصال بالخادم')
    }
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {takingOrders === false && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-center" dir="rtl">
          <span className="text-sm text-red-400 font-medium">
            {storeMessage || 'المطعم مغلق حالياً، لا يمكن استقبال الطلبات'}
          </span>
        </div>
      )}

      <MenuHeader onAdminClick={onAdminClick} onUserClick={onUserClick} onTrackClick={handleOpenTracking} />

      {/* زرار السلة العائم — ظاهر على طول */}
      <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.3 }}
          onClick={() => setCartOpen(true)}
          className="fixed right-3 bottom-20 z-50 flex items-center justify-center rounded-full shadow-xl transition-all hover:scale-110 active:scale-95 md:right-5 md:bottom-24"
          style={{
            width: totalItems > 0 ? '60px' : '50px',
            height: totalItems > 0 ? '60px' : '50px',
            backgroundColor: totalItems > 0 ? '#D4AF37' : 'rgba(15,20,25,0.9)',
            color: totalItems > 0 ? '#0F1419' : '#D4AF37',
            boxShadow: totalItems > 0 ? '0 4px 20px rgba(212,175,55,0.4)' : '0 4px 15px rgba(0,0,0,0.3)',
            border: '2px solid',
            borderColor: totalItems > 0 ? 'rgba(212,175,55,0.6)' : 'rgba(212,175,55,0.2)',
          }}
        >
          <motion.div
            key={totalItems}
            initial={{ scale: 1.4 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          >
            <ShoppingBasket className="h-6 w-6" />
          </motion.div>
          {totalItems > 0 && (
            <motion.span
              key={`badge-${totalItems}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15 }}
              className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-background"
            >
              {totalItems}
            </motion.span>
          )}
        </motion.button>

      <HeroCarousel />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <div className="mb-6">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن طبق..."
              className="bg-muted/50 border-border/50 pr-10 placeholder:text-muted-foreground/60"
              dir="rtl"
            />
          </div>
        </div>

        <MenuCategories activeCategory={activeCategory} onCategoryChange={setActiveCategory} />

        {activeCategory === 'عروض' ? (
          promotionsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-52 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : promotions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Flame className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-lg">لا توجد عروض حالياً</p>
              <p className="text-sm mt-1">ترقب عروضنا القادمة!</p>
            </div>
          ) : (
            // ✅ استخدام PromotionCard بنفس شكل MealCardSimple
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {promotions.map((promo) => (
                <PromotionCard
                  key={promo.id}
                  promo={promo}
                  onViewDetail={handleViewPromoDetail}
                />
              ))}
            </div>
          )
        ) : (
          <MenuGrid
            meals={filteredMeals}
            loading={loading}
            activeCategory={activeCategory}
            onViewDetail={handleViewDetail}
          />
        )}
      </main>

      <footer className="mt-auto border-t border-[#D4AF37]/10 bg-muted/20 py-6">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <p className="text-sm text-muted-foreground">© 2024 توب | Top - جميع الحقوق محفوظة</p>
          <p className="mt-1 text-xs text-muted-foreground/60">Fine Arabic Dining Experience</p>
        </div>
      </footer>

      {/* OrderDetail للوجبة العادية */}
      <OrderDetail
        key={selectedMeal?.id || 'meal-none'}
        meal={selectedMeal}
        open={orderDetailOpen}
        onClose={handleCloseDetail}
      />

      {/* ✅ OrderDetail للعرض — بيبعت promotion prop */}
      <OrderDetail
        key={selectedPromotion?.id || 'promo-none'}
        meal={null}
        open={promotionDetailOpen}
        onClose={handleClosePromoDetail}
        promotion={selectedPromotion}
      />

      {/* Tracking Dialog */}
      <Dialog open={trackingOpen} onOpenChange={(o) => { setTrackingOpen(o); if (!o) setTrackedOrderId(null) }}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md bg-background border-[#D4AF37]/20 rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-[#D4AF37] flex items-center gap-2">تتبع حالة طلبك</DialogTitle>
            <DialogDescription className="text-gray-400">
              أدخل رقم الهاتف الذي استخدمته عند إرسال الطلب لمتابعة حالته.
            </DialogDescription>
          </DialogHeader>
          {!trackedOrderId ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm">رقم الهاتف</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D4AF37]" />
                  <Input
                    type="tel"
                    value={trackingPhone}
                    onChange={(e) => setTrackingPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="01xxxxxxxxx"
                    className="bg-muted border-border/10 pr-10 text-center text-lg tracking-widest"
                  />
                </div>
              </div>
              <Button onClick={handleTrackOrder} className="w-full bg-[#D4AF37] text-black font-bold hover:bg-[#c9a430]">
                ابحث عن طلبي
              </Button>
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto">
              <OrderTracking
                orderId={trackedOrderId}
                onBackToMenu={() => { setTrackedOrderId(null); setTrackingOpen(false) }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cart Dialog */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl" dir="rtl">
          <VisuallyHidden asChild>
            <DialogTitle>سلة المشتريات</DialogTitle>
          </VisuallyHidden>
          <CartSummary onClose={() => setCartOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
