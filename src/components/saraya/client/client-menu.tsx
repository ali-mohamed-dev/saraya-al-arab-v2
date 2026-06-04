'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, ShoppingCart, Flame, ShoppingBag, X, Phone } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input as PhoneInput } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { HeroCarousel } from '@/components/saraya/client/hero-carousel'
import { MenuHeader } from '@/components/saraya/client/menu-header'
import { MenuCategories } from '@/components/saraya/client/menu-categories'
import { MenuGrid } from '@/components/saraya/client/menu-grid'
import { CartSummary } from '@/components/saraya/client/cart-summary'
import { OrderDetail } from '@/components/saraya/client/order-detail'
import { OrderTracking } from '@/components/saraya/client/order-tracking'
import { useCartStore } from '@/store/cart-store'
import { type Meal } from '@/lib/saraya/types'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface Promotion {
  id: string
  bannerImageUrl: string
  title: string
  titleAr: string
  description: string
  descriptionAr: string
  price: number
  mealId: string | null
  buttonTextAr: string
  isActive: boolean
}

interface ClientMenuProps {
  onAdminClick: () => void
}

export function ClientMenu({ onAdminClick }: ClientMenuProps) {
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null)
  const [orderDetailOpen, setOrderDetailOpen] = useState(false)
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [promotionsLoading, setPromotionsLoading] = useState(false)
  const addItem = useCartStore((s) => s.addItem)
  const cartItems = useCartStore((s) => s.items)
  const [cartOpen, setCartOpen] = useState(false)
  const [takingOrders, setTakingOrders] = useState<boolean | null>(null) // null = loading
  const [storeMessage, setStoreMessage] = useState('')

  const totalItems = cartItems.reduce((sum, i) => sum + i.quantity, 0)
  const totalPrice = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)

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
  }, [])

  useEffect(() => {
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
  }, [])

  // جلب حالة استلام الطلبات من الإعدادات
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setTakingOrders(data.takingOrders)
          setStoreMessage(data.message || '')
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (activeCategory === 'عروض') {
      setPromotionsLoading(true)
      fetch('/api/promotions?active=true')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setPromotions(Array.isArray(data) ? data : []))
        .catch(() => setPromotions([]))
        .finally(() => setPromotionsLoading(false))
    }
  }, [activeCategory])

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

  const handleViewDetail = (meal: Meal) => {
    setSelectedMeal(meal)
    setOrderDetailOpen(true)
  }

  const handleCloseDetail = () => {
    setOrderDetailOpen(false)
    setTimeout(() => setSelectedMeal(null), 300)
  }

  const handleOrderPromotion = (promo: Promotion) => {
    addItem({
      mealId: promo.mealId || promo.id,
      title: promo.title,
      titleAr: promo.titleAr,
      price: promo.price,
      quantity: 1,
      imageUrl: promo.bannerImageUrl,
      addOns: [],
      category: 'عروض',
      preparationArea: 'KITCHEN',
    })
    toast.success(`تم إضافة "${promo.titleAr || promo.title}" للسلة`)
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* شريط حالة استلام الطلبات */}
      {takingOrders === false && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-center" dir="rtl">
          <span className="text-sm text-red-400 font-medium">
            {storeMessage || 'المطعم مغلق حالياً، لا يمكن استقبال الطلبات'}
          </span>
        </div>
      )}
      <MenuHeader onAdminClick={onAdminClick} onTrackClick={handleOpenTracking} />
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {promotions.map((promo) => (
                <div key={promo.id} className="group rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all">
                  {promo.bannerImageUrl && (
                    <div className="relative h-32 overflow-hidden">
                      <img src={promo.bannerImageUrl} alt={promo.titleAr || promo.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute top-2 right-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">عرض خاص</div>
                    </div>
                  )}
                  <div className="p-3 space-y-2">
                    <h3 className="font-semibold text-sm truncate">{promo.titleAr || promo.title}</h3>
                    {(promo.descriptionAr || promo.description) && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{promo.descriptionAr || promo.description}</p>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-bold text-primary">
                        {promo.price > 0 ? `${promo.price.toFixed(2)} ج.م` : 'مجاني'}
                      </span>
                      <button onClick={() => handleOrderPromotion(promo)} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors">
                        <ShoppingCart className="h-3.5 w-3.5" />
                        اطلب الآن
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <MenuGrid meals={filteredMeals} loading={loading} activeCategory={activeCategory} onViewDetail={handleViewDetail} />
        )}
      </main>

      <footer className="mt-auto border-t border-[#D4AF37]/10 bg-muted/20 py-6">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <p className="text-sm text-muted-foreground">© 2024 سرايا العرب | Saraya Al-Arab - جميع الحقوق محفوظة</p>
          <p className="mt-1 text-xs text-muted-foreground/60">Fine Arabic Dining Experience</p>
        </div>
      </footer>

      {/* زرار السلة العائم تحت */}
      <AnimatePresence>
        {totalItems > 0 && !cartOpen && (
          <motion.button
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={() => setCartOpen(true)}
            className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border-none bg-[#D4AF37] px-6 py-3.5 text-[#0F1419] shadow-xl shadow-[#D4AF37]/30 transition-all hover:bg-[#c9a22e] hover:shadow-2xl active:scale-95"
          >
            <ShoppingBag className="h-6 w-6" />
            <span className="font-bold">السلة</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">{totalItems}</span>
            <span className="text-sm font-semibold">{totalPrice.toFixed(2)} ج.م</span>
          </motion.button>
        )}
      </AnimatePresence>

      <OrderDetail key={selectedMeal?.id || 'none'} meal={selectedMeal} open={orderDetailOpen} onClose={handleCloseDetail} />

      <Dialog open={trackingOpen} onOpenChange={(o) => { setTrackingOpen(o); if (!o) { setTrackedOrderId(null); setTrackingPhone('') } }}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md bg-background border-[#D4AF37]/20 rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-[#D4AF37] flex items-center gap-2">تتبع حالة طلبك</DialogTitle>
            <DialogDescription className="text-gray-400">أدخل رقم الهاتف الذي استخدمته عند إرسال الطلب لمتابعة حالته.</DialogDescription>
          </DialogHeader>
          {!trackedOrderId ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm">رقم الهاتف</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D4AF37]" />
                  <PhoneInput type="tel" value={trackingPhone} onChange={(e) => setTrackingPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="01xxxxxxxxx" className="bg-muted border-border/10 pr-10 text-center text-lg tracking-widest" />
                </div>
              </div>
              <Button onClick={handleTrackOrder} className="w-full bg-[#D4AF37] text-black font-bold hover:bg-[#c9a430]">ابحث عن طلبي</Button>
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto">
              <OrderTracking orderId={trackedOrderId} onBackToMenu={() => { setTrackedOrderId(null); setTrackingOpen(false) }} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cart Summary Dialog */}
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