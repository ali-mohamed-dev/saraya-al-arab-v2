'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, Plus, Minus, ShoppingCart, Check, Star,
  Loader2, X, Flame, ChevronLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle
} from '@/components/ui/sheet'
import { useCartStore, type SelectedAddOn } from '@/store/cart-store'
import { useToast } from '@/hooks/use-toast'

interface Meal {
  id: string
  title: string
  titleAr: string
  description: string
  descriptionAr: string
  price: number
  prepTime: string
  category: string
  categoryAr: string
  imageUrl: string
  isActive: boolean
}

interface AddOn {
  id: string
  mealId: string
  title: string
  titleAr: string
  price: number
  imageUrl: string
  isRecommended: boolean
  isActive: boolean
}

interface OrderDetailProps {
  meal: Meal | null
  open: boolean
  onClose: () => void
}

export function OrderDetail({ meal, open, onClose }: OrderDetailProps) {
  const [addons, setAddons] = useState<AddOn[]>([])
  const [selectedAddOns, setSelectedAddOns] = useState<SelectedAddOn[]>([])
  const [quantity, setQuantity] = useState(1)
  const [fetchingAddons, setFetchingAddons] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)
  const addItem = useCartStore((s) => s.addItem)
  const { toast } = useToast()

  // Fetch add-ons when meal changes
  useEffect(() => {
    if (!meal) return

    let cancelled = false

    // Use microtask to avoid synchronous setState in effect
    queueMicrotask(() => {
      if (!cancelled) setFetchingAddons(true)
    })

    fetch(`/api/meals/${meal.id}/addons`)
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setAddons(data) })
      .catch(console.error)
      .finally(() => { if (!cancelled) setFetchingAddons(false) })

    return () => { cancelled = true }
  }, [meal])

  const toggleAddOn = (addon: AddOn) => {
    setSelectedAddOns((prev) => {
      const exists = prev.find((a) => a.id === addon.id)
      if (exists) {
        return prev.filter((a) => a.id !== addon.id)
      }
      return [...prev, { id: addon.id, title: addon.title, titleAr: addon.titleAr, price: addon.price }]
    })
  }

  const isAddOnSelected = (addonId: string) => selectedAddOns.some((a) => a.id === addonId)

  const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0)
  const itemTotal = (meal ? meal.price + addOnsTotal : 0) * quantity

  const handleAddToCart = () => {
    if (!meal) return
    addItem({
      mealId: meal.id,
      title: meal.title,
      titleAr: meal.titleAr,
      price: meal.price,
      imageUrl: meal.imageUrl,
      addOns: selectedAddOns,
    })
    setAddedToCart(true)
    toast({
      title: 'تمت الإضافة للسلة! 🎉',
      description: `${meal.titleAr} ${selectedAddOns.length > 0 ? `+ ${selectedAddOns.length} إضافات` : ''}`,
    })
    setTimeout(() => {
      setAddedToCart(false)
      onClose()
    }, 800)
  }

  if (!meal) return null

  const recommendedAddOns = addons.filter((a) => a.isRecommended)
  const otherAddOns = addons.filter((a) => !a.isRecommended)

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent
        side="left"
        className="w-full sm:max-w-lg border-[#D4AF37]/20 bg-[#0F1419] text-white p-0 overflow-y-auto"
      >
        {/* Hero Image */}
        <div className="relative h-56 md:h-64">
          {meal.imageUrl ? (
            <img src={meal.imageUrl} alt={meal.titleAr} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
              <ShoppingCart className="h-16 w-16 text-muted-foreground/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F1419] via-[#0F1419]/40 to-transparent" />

          <button onClick={onClose} className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors z-10">
            <X className="h-4 w-4" />
          </button>
          <button onClick={onClose} className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-black/60 px-3 py-1.5 text-white text-xs hover:bg-black/80 transition-colors z-10">
            <ChevronLeft className="h-3 w-3" /> رجوع
          </button>

          <div className="absolute bottom-4 right-4 left-4" dir="rtl">
            <h2 className="text-2xl md:text-3xl font-bold text-[#D4AF37] drop-shadow-lg">{meal.titleAr}</h2>
            <p className="text-white/70 text-sm mt-1">{meal.title}</p>
          </div>
        </div>

        <div className="p-5 space-y-5" dir="rtl">
          {/* Meal Info */}
          <div>
            <p className="text-white/80 text-sm leading-relaxed">{meal.descriptionAr || meal.description}</p>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{meal.prepTime}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-[#D4AF37]">{meal.price.toFixed(2)}</span>
                <span className="text-sm text-[#D4AF37]/80">جنيه</span>
              </div>
            </div>
          </div>

          <Separator className="bg-[#D4AF37]/10" />

          {fetchingAddons ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#D4AF37]" /></div>
          ) : (
            <>
              {/* ===== Chef's Recommendations ===== */}
              {recommendedAddOns.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-orange-500" />
                    <h3 className="text-lg font-bold text-[#D4AF37]">توصيات الشيف</h3>
                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px]">لا تفوّت!</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">إضافات مختارة خصيصاً لتكمل متعتك 🤤</p>
                  <div className="space-y-2">
                    {recommendedAddOns.map((addon) => {
                      const selected = isAddOnSelected(addon.id)
                      return (
                        <motion.button
                          key={addon.id}
                          onClick={() => toggleAddOn(addon)}
                          whileTap={{ scale: 0.98 }}
                          className={`w-full flex items-center gap-3 rounded-xl p-3 transition-all text-right ${
                            selected
                              ? 'bg-[#D4AF37]/15 border-2 border-[#D4AF37]/50 shadow-[0_0_15px_rgba(212,175,55,0.1)]'
                              : 'bg-white/5 border-2 border-transparent hover:border-[#D4AF37]/20 hover:bg-white/8'
                          }`}
                        >
                          {addon.imageUrl ? (
                            <img src={addon.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center flex-shrink-0">
                              <Star className="h-5 w-5 text-[#D4AF37]" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{addon.titleAr || addon.title}</p>
                            <p className="text-xs text-muted-foreground">{addon.title}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className="text-sm font-bold text-[#D4AF37]">+{addon.price.toFixed(2)} جنيه</span>
                            {selected && (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex h-5 w-5 items-center justify-center rounded-full bg-[#D4AF37]">
                                <Check className="h-3 w-3 text-black" />
                              </motion.div>
                            )}
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ===== Other Add-ons ===== */}
              {otherAddOns.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-[#D4AF37]" />
                    <h3 className="text-base font-bold text-white/90">إضافات أخرى</h3>
                  </div>
                  <div className="space-y-2">
                    {otherAddOns.map((addon) => {
                      const selected = isAddOnSelected(addon.id)
                      return (
                        <motion.button
                          key={addon.id}
                          onClick={() => toggleAddOn(addon)}
                          whileTap={{ scale: 0.98 }}
                          className={`w-full flex items-center gap-3 rounded-xl p-3 transition-all text-right ${
                            selected ? 'bg-[#D4AF37]/10 border-2 border-[#D4AF37]/30' : 'bg-white/3 border-2 border-transparent hover:border-white/10'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{addon.titleAr || addon.title}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs font-medium text-[#D4AF37]">+{addon.price.toFixed(2)}</span>
                            <div className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${selected ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-white/20'}`}>
                              {selected && <Check className="h-3 w-3 text-black" />}
                            </div>
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              )}

              {addons.length === 0 && (
                <div className="py-6 text-center"><p className="text-sm text-muted-foreground">لا توجد إضافات لهذا الطبق</p></div>
              )}
            </>
          )}

          <Separator className="bg-[#D4AF37]/10" />

          {/* Quantity & Total */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white/80">الكمية</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-lg font-bold min-w-[2rem] text-center">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D4AF37] text-black hover:bg-[#C9A431] transition-colors">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2 bg-white/5 rounded-xl p-3">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>سعر الطبق</span>
                <span>{meal.price.toFixed(2)} جنيه</span>
              </div>
              {selectedAddOns.map((addon) => (
                <div key={addon.id} className="flex justify-between text-sm text-muted-foreground">
                  <span>+ {addon.titleAr}</span>
                  <span>{addon.price.toFixed(2)} جنيه</span>
                </div>
              ))}
              {quantity > 1 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>× {quantity}</span>
                  <span>{(meal.price + addOnsTotal).toFixed(2)} × {quantity}</span>
                </div>
              )}
              <Separator className="bg-[#D4AF37]/10" />
              <div className="flex justify-between items-center">
                <span className="font-bold text-white">الإجمالي</span>
                <span className="text-2xl font-extrabold text-[#D4AF37]">{itemTotal.toFixed(2)} جنيه</span>
              </div>
            </div>

            <Button
              onClick={handleAddToCart}
              disabled={addedToCart}
              className="w-full gap-3 py-6 text-base font-bold transition-all"
              style={{ backgroundColor: addedToCart ? '#22c55e' : '#D4AF37', color: '#000' }}
            >
              {addedToCart ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                  <Check className="h-5 w-5" /> تمت الإضافة!
                </motion.div>
              ) : (
                <>
                  <ShoppingCart className="h-5 w-5" />
                  أضف للسلة - {itemTotal.toFixed(2)} جنيه
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
