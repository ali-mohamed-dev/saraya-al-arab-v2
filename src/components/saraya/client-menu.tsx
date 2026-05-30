'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UtensilsCrossed, Search, Loader2, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { HeroCarousel } from '@/components/saraya/hero-carousel'
import { MealCardSimple } from '@/components/saraya/meal-card-clickable'
import { type Meal } from '@/components/saraya/meal-card'
import { CartSummary } from '@/components/saraya/cart-summary'
import { OrderDetail } from '@/components/saraya/order-detail'

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

  useEffect(() => {
    async function fetchMeals() {
      try {
        const res = await fetch('/api/meals')
        if (res.ok) {
          const data: Meal[] = await res.json()
          setMeals(data.filter((m) => m.isActive))
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
          <Button
            variant="ghost"
            size="icon"
            onClick={onAdminClick}
            className="text-muted-foreground hover:text-[#D4AF37]"
          >
            <Settings className="h-5 w-5" />
          </Button>
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

      {/* Floating Cart */}
      <CartSummary />
    </div>
  )
}
