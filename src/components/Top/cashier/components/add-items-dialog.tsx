'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Minus, Loader2, ShoppingCart, Send, UtensilsCrossed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import type { Order, Meal } from '@/lib/saraya/types'
import { CATEGORIES } from '@/lib/saraya/constants'

export interface AddCartItem {
  mealId: string
  title: string
  titleAr: string
  price: number
  quantity: number
  imageUrl: string
  category: string
  preparationArea: string
  addOns: never[]
  notes?: string
}

interface AddItemsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order | null
  onItemsAdded: () => void
  onSubmitItems?: (items: AddCartItem[], order: Order) => Promise<void>
}

export function AddItemsDialog({ open, onOpenChange, order, onItemsAdded, onSubmitItems }: AddItemsDialogProps) {
  const { toast } = useToast()
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('الكل')
  const [cart, setCart] = useState<AddCartItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [mobileTab, setMobileTab] = useState<'menu' | 'cart'>('menu')

  useEffect(() => {
    if (open) {
      setCart([])
      setSearchQuery('')
      setFilterCategory('الكل')
      setMobileTab('menu')
      fetchMeals()
    }
  }, [open])

  const fetchMeals = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/meals')
      if (res.ok) setMeals(await res.json())
    } catch (err) {
      console.error('Failed to fetch meals:', err)
      toast({ title: 'خطأ', description: 'فشل تحميل قائمة الأكل', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (meal: Meal) => {
    setCart(prev => {
      const existing = prev.find(i => i.mealId === meal.id)
      if (existing) {
        return prev.map(i =>
          i.mealId === meal.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, {
        mealId: meal.id,
        title: meal.title,
        titleAr: meal.titleAr,
        price: meal.price,
        quantity: 1,
        imageUrl: meal.imageUrl || '',
        category: meal.category || '',
        preparationArea: meal.preparationArea || (meal.category === 'اصناف الصالة' ? 'HALL' : 'KITCHEN'),
        addOns: [],
        notes: '',
      }]
    })
  }

  const updateQty = (mealId: string, delta: number) => {
    setCart(prev =>
      prev.map(i =>
        i.mealId === mealId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i
      ).filter(i => i.quantity > 0)
    )
  }

  const getQty = (mealId: string) => cart.find(i => i.mealId === mealId)?.quantity || 0

  const updateItemNotes = (mealId: string, notes: string) => {
    setCart(prev => prev.map(i =>
      i.mealId === mealId ? { ...i, notes } : i
    ))
  }

  const filteredMeals = useMemo(() => {
    let result = meals
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(m =>
        m.title.toLowerCase().includes(q) ||
        (m.titleAr || '').toLowerCase().includes(q)
      )
    }
    if (filterCategory !== 'الكل') {
      result = result.filter(m => m.category === filterCategory)
    }
    return result
  }, [meals, searchQuery, filterCategory])

  const categories = useMemo(() => {
    const unique = new Set(meals.map(m => m.category).filter(Boolean))
    const fromMeals = Array.from(unique).map(c => ({ value: c, label: c }))
    const fromConst = CATEGORIES.filter(c => c.value !== 'الكل' && unique.has(c.value))
    return [{ value: 'الكل', label: 'الكل' }, ...fromConst, ...fromMeals.filter(c => !fromConst.find(fc => fc.value === c.value))]
  }, [meals])

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)
  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity + (i.addOns || []).reduce((aSum, a: any) => aSum + a.price * i.quantity, 0), 0)

  const handleSubmit = async () => {
    if (cart.length === 0 || !order) {
      toast({ title: 'السلة فارغة', description: 'اختر أصنافاً لإضافتها', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      if (onSubmitItems) {
        await onSubmitItems(cart, order)
        onItemsAdded()
        onOpenChange(false)
      } else {
        const res = await fetch(`/api/orders/${order.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemsToAdd: cart.map(i => ({
              mealId: i.mealId,
              mealTitle: i.title,
              mealTitleAr: i.titleAr,
              price: i.price,
              quantity: i.quantity,
              category: i.category,
              preparationArea: i.preparationArea || 'KITCHEN',
              imageUrl: i.imageUrl,
              addOns: [],
              notes: i.notes || '',
            })),
          }),
        })
        if (res.ok) {
          toast({ title: 'تم إضافة الأصناف', description: `تمت إضافة ${cartCount} صنف إلى الطلب #${order.orderNumber}` })
          onItemsAdded()
          onOpenChange(false)
        } else {
          const data = await res.json().catch(() => ({}))
          toast({ title: 'خطأ', description: data.error || 'فشل في إضافة الأصناف', variant: 'destructive' })
        }
      }
    } catch (err) {
      console.error('Failed to submit items:', err)
      toast({ title: 'خطأ', description: 'فشل في الاتصال بالخادم', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[95vw] md:max-w-[92vw] max-h-[90vh] overflow-hidden p-0 gap-0 flex flex-col" dir="rtl">
        <DialogHeader className="p-4 md:p-6 md:pb-4 border-b border-border/50 shrink-0">
          <DialogTitle className="text-[#D4AF37] flex items-center gap-2 text-lg">
            <ShoppingCart className="h-5 w-5" />
            إضافة أصناف للطلب #{order?.orderNumber}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            اختر الأصناف التي تريد إضافتها للطلب
          </DialogDescription>

          {/* Mobile tabs */}
          <div className="flex md:hidden mt-3 rounded-lg border border-border/50 overflow-hidden">
            <button
              onClick={() => setMobileTab('menu')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all ${
                mobileTab === 'menu'
                  ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-b-2 border-[#D4AF37]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UtensilsCrossed className="h-4 w-4" />
              القائمة
            </button>
            <button
              onClick={() => setMobileTab('cart')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all relative ${
                mobileTab === 'cart'
                  ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-b-2 border-[#D4AF37]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              السلة
              {cartCount > 0 && (
                <span className="absolute top-1 bg-[#D4AF37] text-black text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center" style={{ insetInlineStart: '30%' }}>
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 overflow-hidden md:flex-row-reverse">
          {/* Left: Meal selection - hidden on mobile when cart tab is active */}
          <div className={`flex-1 min-h-0 flex flex-col md:border-r border-border/50 overflow-hidden ${mobileTab !== 'menu' ? 'hidden md:flex' : 'flex'}`}>
            <ScrollArea className="flex-1 min-h-0">
            {/* Search */}
            <div className="p-4 border-b border-border/30">
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
            </div>

            {/* Category tabs */}
            <div className="px-4 pb-4 pt-2 border-b border-border/30">
              <div className="flex flex-wrap gap-1.5">
                {categories.map(cat => (
                  <button key={cat.value} onClick={() => setFilterCategory(cat.value)}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] transition-all ${
                      filterCategory === cat.value
                        ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                        : 'border-border/50 bg-muted/50 text-muted-foreground hover:border-[#D4AF37]/30'
                    }`}>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Meal list */}
            <div className="p-3 space-y-2">
                {loading ? (
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
                    {filteredMeals.map(meal => {
                      const qty = getQty(meal.id)
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
                                  onClick={() => updateQty(meal.id, -1)}
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

          {/* Right: Cart - hidden on mobile when menu tab is active */}
          <div className={`w-full md:w-80 min-h-0 flex flex-col border-t md:border-t-0 border-border/50 bg-muted/20 overflow-hidden flex-1 md:flex-none md:h-full ${mobileTab !== 'cart' ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-border/30 shrink-0">
              <h3 className="font-bold text-[#D4AF37] flex items-center gap-2 text-sm">
                <ShoppingCart className="h-4 w-4" />
                الأصناف المضافة
                {cart.length > 0 && (
                  <Badge className="bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30 text-[10px]">
                    {cartCount} صنف
                  </Badge>
                )}
              </h3>
            </div>

            <ScrollArea className="flex-1 min-h-0 overflow-hidden">
              <div className="p-3 space-y-2">
                {cart.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    <ShoppingCart className="mx-auto mb-2 h-8 w-8 opacity-20" />
                    <p>السلة فارغة</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {cart.map(item => (
                      <motion.div
                        key={item.mealId}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="rounded-lg border border-border/30 bg-background p-2"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{item.titleAr || item.title}</p>
                            <p className="text-[10px] text-muted-foreground">{item.quantity} × {item.price.toFixed(2)} ج.م</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                const q = getQty(item.mealId)
                                if (q <= 1) { updateQty(item.mealId, -1); return }
                                updateQty(item.mealId, -1)
                              }}
                              className="h-6 w-6 text-muted-foreground hover:text-red-400"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-xs font-bold w-5 text-center text-[#D4AF37]">{item.quantity}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => updateQty(item.mealId, 1)}
                              className="h-6 w-6 text-muted-foreground hover:text-green-400"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <Input
                          placeholder="ملاحظات (قهوة سادة, إلخ)"
                          value={item.notes || ''}
                          onChange={(e) => updateItemNotes(item.mealId, e.target.value)}
                          className="mt-1.5 h-7 text-[10px] bg-muted/30 border-border/30"
                          dir="rtl"
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border/30 space-y-3 shrink-0">
              <Separator className="bg-border/30" />
              <div className="flex justify-between font-bold text-[#D4AF37]">
                <span>المجموع</span>
                <span>{cartTotal.toFixed(2)} ج.م</span>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={submitting || cart.length === 0}
                className="w-full bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 gap-2 font-bold"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    تأكيد الإضافة
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile bottom bar - quick cart summary */}
        {mobileTab === 'menu' && cartCount > 0 && (
          <div className="md:hidden shrink-0 border-t border-border/50 bg-background p-3 flex items-center gap-3">
            <div className="flex-1 text-sm">
              <span className="text-muted-foreground">{cartCount} صنف — </span>
              <span className="font-bold text-[#D4AF37]">
                {cartTotal.toFixed(2)} ج.م
              </span>
            </div>
            <button
              onClick={() => setMobileTab('cart')}
              className="rounded-lg bg-[#D4AF37] text-black px-4 py-2 text-sm font-bold flex items-center gap-1.5 hover:bg-[#D4AF37]/90"
            >
              <ShoppingCart className="h-4 w-4" />
              السلة
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
