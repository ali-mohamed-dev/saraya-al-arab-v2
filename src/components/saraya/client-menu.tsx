'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UtensilsCrossed, Search, Loader2, Settings, ClipboardList, Phone, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { HeroCarousel } from '@/components/saraya/hero-carousel'
import { MealCardSimple } from '@/components/saraya/meal-card-clickable'
import { type Meal } from '@/components/saraya/meal-card'
import { CartSummary } from '@/components/saraya/cart-summary'
import { OrderDetail } from '@/components/saraya/order-detail'
import { OrderTracking } from '@/components/saraya/order-tracking'
import { toast } from 'sonner'

interface ClientMenuProps {
  onAdminClick: () => void
}

const CATEGORY_FILTERS = [
  { value: 'all', label: 'الكل', labelEn: 'All' },
  { value: 'مشويات', label: 'مشويات', labelEn: 'Grills' },
  { value: 'مقبلات', label: 'مقبلات', labelEn: 'Appetizers' },
  { value: 'ساندويتشات', label: 'ساندويتشات', labelEn: 'Sandwiches' },
  { value: 'حلويات', label: 'حلويات', labelEn: 'Desserts' },
  { value: 'مشروبات', label: 'مشروبات', labelEn: 'Beverages' },
  { value: 'أطباق رئيسية', label: 'أطباق رئيسية', labelEn: 'Main Courses' },
]

export function ClientMenu({ onAdminClick }: ClientMenuProps) {
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null)
  const [orderDetailOpen, setOrderDetailOpen] = useState(false)
  
  // Tracking states
  const [trackingOpen, setTrackingOpen] = useState(false)
  const [trackingPhone, setTrackingPhone] = useState('')
  const [trackedOrderId, setTrackedOrderId] = useState<string | null>(null)

  // تحميل رقم الهاتف المحفوظ إن وجد
  useEffect(() => {
    const savedPhone = localStorage.getItem('saraya-customer-phone')
    if (savedPhone) setTrackingPhone(savedPhone)
  }, [])

  // التحقق من وجود طلب نشط محفوظ في المتصفح عند التحميل
  useEffect(() => {
    const savedId = localStorage.getItem('saraya-active-order-id')
    if (savedId && !trackedOrderId) {
      // نحن لا نفتحه تلقائياً لكي لا نزعج العميل، لكن نجهزه للزر
      console.log('Active order found in storage:', savedId)
    }
  }, [trackedOrderId])

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

  const filteredMeals = useMemo(() => {
    let result = meals

    if (activeCategory !== 'all') {
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

  const handleOpenTracking = () => {
    const savedId = localStorage.getItem('saraya-active-order-id')
    if (savedId) {
      // إذا كان هناك طلب محفوظ، نفتحه مباشرة
      setTrackedOrderId(savedId)
      setTrackingOpen(true)
    } else {
      // إذا لم يوجد، نفتح نافذة البحث برقم الهاتف
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
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#D4AF37]/20 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden">
              <img src="/logo.webp" alt="سرايا العرب" className="h-10 w-10 object-contain" />
            </div>
            <div>
              <h1 className="text-gold-gradient text-xl font-bold">سرايا العرب</h1>
              <p className="text-xs text-muted-foreground">Saraya Al-Arab</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenTracking}
              data-track-button
              className="flex items-center gap-2 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
            >
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">تتبع طلبي</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onAdminClick}
              className="text-muted-foreground hover:text-[#D4AF37]"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Carousel */}
      <HeroCarousel />

      {/* Menu Section */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        {/* Search */}
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

        {/* Category Filters */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                activeCategory === cat.value
                  ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.15)]'
                  : 'border-border/50 bg-muted/30 text-muted-foreground hover:border-[#D4AF37]/30 hover:text-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Active Category Label */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 text-center"
          >
            <h2 className="text-2xl font-bold text-foreground">
              {activeCategory === 'all' ? 'القائمة الكاملة' : CATEGORY_FILTERS.find((c) => c.value === activeCategory)?.label}
            </h2>
            <Badge variant="outline" className="mt-2 border-[#D4AF37]/30 text-[#D4AF37]">
              {filteredMeals.length} طبق
            </Badge>
          </motion.div>
        </AnimatePresence>

        {/* Meals Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-[#D4AF37]" />
            <p className="mt-4 text-muted-foreground">جاري تحميل القائمة...</p>
          </div>
        ) : filteredMeals.length === 0 ? (
          <div className="py-20 text-center">
            <UtensilsCrossed className="mx-auto mb-4 h-16 w-16 text-muted-foreground/20" />
            <p className="text-lg text-muted-foreground">لا توجد أطباق في هذا التصنيف</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {filteredMeals.map((meal, index) => (
                <motion.div
                  key={meal.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <MealCardSimple meal={meal} onViewDetail={handleViewDetail} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#D4AF37]/10 bg-muted/20 py-6">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 سرايا العرب | Saraya Al-Arab - جميع الحقوق محفوظة
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Fine Arabic Dining Experience
          </p>
        </div>
      </footer>

      {/* Order Detail Sheet */}
      <OrderDetail
        key={selectedMeal?.id || 'none'}
        meal={selectedMeal}
        open={orderDetailOpen}
        onClose={handleCloseDetail}
      />

      {/* Track Order Dialog */}
      <Dialog open={trackingOpen} onOpenChange={(o) => {
        setTrackingOpen(o)
        if (!o) {
          setTrackedOrderId(null)
          setTrackingPhone('')
        }
      }}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md bg-[#1A1A1A] border-[#D4AF37]/20 text-white rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-[#D4AF37] flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              تتبع حالة طلبك
            </DialogTitle>
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
                    className="bg-[#222] border-white/10 pr-10 text-center text-lg tracking-widest"
                  />
                </div>
              </div>
              <Button 
                onClick={handleTrackOrder}
                className="w-full bg-[#D4AF37] text-black font-bold hover:bg-[#c9a430]"
              >
                ابحث عن طلبي
              </Button>
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto">
              <OrderTracking 
                orderId={trackedOrderId} 
                onBackToMenu={() => {
                  setTrackedOrderId(null)
                  setTrackingOpen(false)
                  // ملاحظة: لا نمسح الـ storage هنا لربما أراد العميل العودة للتتبع
                }} 
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Floating Cart */}
      <CartSummary />
    </div>
  )
}
