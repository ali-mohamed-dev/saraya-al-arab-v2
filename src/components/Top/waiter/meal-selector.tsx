'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, UtensilsCrossed, Utensils, Phone, MapPin, Plus, Minus, Loader2
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { CATEGORIES, ORDER_TYPE_MAP, ORDER_STATUS_MAP } from '@/lib/saraya/constants'
import type { Meal, Order, OrderType, CartItemType } from '@/lib/saraya/types'

interface MealSelectorProps {
  // Order type controls
  orderType: OrderType
  setOrderType: (type: OrderType) => void
  tableNumber: string
  setTableNumber: (v: string) => void
  customerName: string
  setCustomerName: (v: string) => void
  customerPhone: string
  setCustomerPhone: (v: string) => void
  deliveryAddress: string
  setDeliveryAddress: (v: string) => void
  existingTableOrder: Order | null

  // Meal list
  meals: Meal[]
  loadingMeals: boolean

  // Search / filter
  searchQuery: string
  setSearchQuery: (v: string) => void
  filterCategory: string
  setFilterCategory: (v: string) => void

  // Cart helpers
  cart: CartItemType[]
  addToCart: (meal: Meal) => void
  updateCartQuantity: (mealId: string, delta: number) => void
  getCartQuantity: (mealId: string) => number
}

export function MealSelector({
  orderType,
  setOrderType,
  tableNumber,
  setTableNumber,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  deliveryAddress,
  setDeliveryAddress,
  existingTableOrder,
  meals,
  loadingMeals,
  searchQuery,
  setSearchQuery,
  filterCategory,
  setFilterCategory,
  cart,
  addToCart,
  updateCartQuantity,
  getCartQuantity,
}: MealSelectorProps) {
  // Bug fix #10: useMemo for filteredMeals
  const filteredMeals = useMemo(() => {
    return meals.filter((meal) => {
      const matchSearch =
        searchQuery === '' ||
        meal.titleAr?.includes(searchQuery) ||
        meal.title?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchCategory = filterCategory === 'الكل' || meal.category === filterCategory
      const isHallItem = meal.category === 'اصناف الصالة'
      return !isHallItem && matchSearch && matchCategory
    })
  }, [meals, searchQuery, filterCategory])

  return (
    <div className="flex-1 min-h-0 flex flex-col md:border-r border-border/50 overflow-hidden">
      {/* Order type & table */}
      <div className="p-4 border-b border-border/30 space-y-3">
        <Label className="text-sm font-semibold text-[#D4AF37]">نوع الطلب</Label>
        <div className="flex gap-2">
          {(['DINE_IN', 'TAKEAWAY', 'DELIVERY'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setOrderType(type)}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                orderType === type
                  ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                  : 'border-border/50 bg-muted/30 text-muted-foreground hover:border-[#D4AF37]/30'
              }`}
            >
              {type === 'DINE_IN' && <Utensils className="h-3.5 w-3.5" />}
              {type === 'TAKEAWAY' && <Phone className="h-3.5 w-3.5" />}
              {type === 'DELIVERY' && <MapPin className="h-3.5 w-3.5" />}
              {ORDER_TYPE_MAP[type].label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {orderType === 'DINE_IN' && (
            <div>
              <Label className="text-xs text-muted-foreground">رقم الطاولة</Label>
              <Input
                type="number"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="مثال: 5"
                min="1"
                className="bg-muted border-border/50 h-9 mt-1"
                dir="rtl"
              />
              {existingTableOrder && (
                <p className="mt-2 rounded-lg border border-yellow-300/70 bg-yellow-200/10 px-3 py-2 text-xs text-yellow-800">
                  يوجد طلب مفتوح للطاولة {tableNumber.trim()} (# {existingTableOrder.orderNumber}) بحالة {ORDER_STATUS_MAP[existingTableOrder.status]?.label}.
                  سيتم إضافة الأصناف إلى الطلب المفتوح.
                </p>
              )}
            </div>
          )}
          <div className={orderType === 'DINE_IN' ? '' : 'col-span-1'}>
            <Label className="text-xs text-muted-foreground">اسم العميل</Label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="اختياري"
              className="bg-muted border-border/50 h-9 mt-1"
              dir="rtl"
            />
          </div>
          <div>
            {/* Bug fix #7: show "مطلوب" for TAKEAWAY/DELIVERY instead of "اختياري" */}
            <Label className="text-xs text-muted-foreground">رقم الهاتف</Label>
            <Input
              type="tel"
              value={customerPhone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 11)
                setCustomerPhone(val)
              }}
              placeholder={orderType !== 'DINE_IN' ? 'مطلوب' : 'اختياري'}
              className="bg-muted border-border/50 h-9 mt-1"
              dir="rtl"
            />
          </div>
        </div>

        {orderType === 'DELIVERY' && (
          <div>
            <Label className="text-xs text-muted-foreground">عنوان التوصيل</Label>
            <Input
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="عنوان العميل"
              className="bg-muted border-border/50 h-9 mt-1"
              dir="rtl"
            />
          </div>
        )}
      </div>

      {/* Search & filter */}
      <div className="p-4 border-b border-border/30 space-y-2">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن طبق..."
            className="bg-muted border-border/50 pr-9 h-9"
            dir="rtl"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['الكل', ...CATEGORIES.map((c) => c.value)].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`rounded-lg border px-2.5 py-1 text-[11px] transition-all ${
                filterCategory === cat
                  ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                  : 'border-border/50 bg-muted/50 text-muted-foreground hover:border-[#D4AF37]/30'
              }`}
            >
              {cat === 'الكل' ? 'الكل' : CATEGORIES.find((c) => c.value === cat)?.label || cat}
            </button>
          ))}
        </div>
      </div>

      {/* Meal list */}
      <ScrollArea className="flex-1 min-h-0 overflow-hidden">
        <div className="p-3 space-y-2">
          {loadingMeals ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#D4AF37]" />
            </div>
          ) : filteredMeals.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <UtensilsCrossed className="mx-auto mb-2 h-8 w-8 opacity-30" />
              <p>لا توجد أطباق</p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredMeals.map((meal) => {
                const qty = getCartQuantity(meal.id)
                return (
                  <motion.div
                    key={meal.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className={`flex items-center gap-3 rounded-lg border p-2.5 transition-all ${
                      qty > 0
                        ? 'border-[#D4AF37]/40 bg-[#D4AF37]/5'
                        : 'border-border/30 bg-muted/20 hover:border-[#D4AF37]/20'
                    }`}
                  >
                    {meal.imageUrl ? (
                      <img
                        src={meal.imageUrl}
                        alt=""
                        className="h-12 w-14 rounded-lg object-cover border border-[#D4AF37]/20 flex-shrink-0"
                      />
                    ) : (
                      <div className="flex h-12 w-14 items-center justify-center rounded-lg bg-muted border border-border/30 flex-shrink-0">
                        <UtensilsCrossed className="h-4 w-4 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{meal.titleAr || meal.title}</p>
                      <p className="text-xs text-[#D4AF37] font-bold">{meal.price.toFixed(2)} ج.م</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {qty > 0 && (
                        <>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => updateCartQuantity(meal.id, -1)}
                            className="h-7 w-7 rounded-lg border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm font-bold text-[#D4AF37]">{qty}</span>
                        </>
                      )}
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => addToCart(meal)}
                        className="h-7 w-7 rounded-lg border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

