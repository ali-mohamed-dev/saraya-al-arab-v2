'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Clock, Plus, Minus, ShoppingCart, Check, Star,
  Loader2, X, Flame, ChevronLeft, UtensilsCrossed
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle
} from '@/components/ui/sheet'
import { useCartStore, type SelectedAddOn } from '@/store/cart-store'
import { type Meal, type AddOn, Promotion } from '@/lib/saraya/types'
import { toast } from 'sonner'

interface OrderDetailProps {
  meal: Meal | null
  open: boolean
  onClose: () => void
  promotion?: Promotion | null
}

export function OrderDetail({ meal, open, onClose, promotion }: OrderDetailProps) {
  const [addons, setAddons] = useState<AddOn[]>([])
  const [selectedAddOns, setSelectedAddOns] = useState<SelectedAddOn[]>([])
  const [quantity, setQuantity] = useState(1)
  const [fetchingAddons, setFetchingAddons] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)
  const [bannerError, setBannerError] = useState(false)
  const addItem = useCartStore((s) => s.addItem)

  // FIX #6: Reset state when sheet opens or meal changes
  useEffect(() => {
    if (open) {
      setSelectedAddOns([])
      setQuantity(1)
      setAddedToCart(false)
    }
  }, [open, meal?.id])

  // Fetch add-ons when meal changes
  useEffect(() => {
    if (!meal) return

    let cancelled = false

    setFetchingAddons(true)

    fetch(`/api/meals/${meal.id}/addons`)
      .then((res) => {
        if (!res.ok) { console.warn('Addons fetch failed:', res.status); return [] }
        return res.json()
      })
      .then((data) => {
        if (!cancelled) {
          setAddons(Array.isArray(data) ? data : [])
        }
      })
      .catch((err) => {
        console.warn('Addons fetch error:', err)
        if (!cancelled) setAddons([])
      })
      .finally(() => {
        if (!cancelled) setFetchingAddons(false)
      })

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

  const effectivePrice = promotion ? promotion.price : (meal ? meal.price : 0)
  const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0)
  const itemTotal = (effectivePrice + addOnsTotal) * quantity

  const handleAddToCart = () => {
    if (promotion) {
      const mealsList = promotion.mealItems?.map(mi => mi.meal?.titleAr || mi.meal?.title).join(' + ')
      const displayTitleAr = mealsList ? `${promotion.titleAr} (${mealsList})` : promotion.titleAr
      addItem({
        mealId: promotion.mealId || promotion.id,
        title: promotion.title,
        titleAr: displayTitleAr,
        price: promotion.price,
        quantity: quantity,
        imageUrl: promotion.bannerImageUrl,
        addOns: selectedAddOns,
        category: 'عروض',
        preparationArea: 'KITCHEN',
      })
      setAddedToCart(true)
      toast.success(`${quantity > 1 ? quantity + '× ' : ''}${promotion.titleAr || promotion.title}`, {
        description: 'تمت الإضافة للسلة!',
      })
    } else if (meal) {
      addItem({
        mealId: meal.id,
        title: meal.title,
        titleAr: meal.titleAr,
        price: meal.price,
        imageUrl: meal.imageUrl,
        category: meal.category,
        preparationArea: meal.preparationArea,
        addOns: selectedAddOns,
        quantity: quantity,
      })
      setAddedToCart(true)
      toast.success(`${quantity > 1 ? quantity + '× ' : ''}${meal.titleAr}${selectedAddOns.length > 0 ? ` + ${selectedAddOns.length} إضافات` : ''}`, {
        description: 'تمت الإضافة للسلة!',
      })
    }
    setTimeout(() => {
      setAddedToCart(false)
      onClose()
    }, 800)
  }

  if (!meal && !promotion) return null

  const displayItem = promotion || meal
  const safeAddons = Array.isArray(addons) ? addons : []
  const recommendedAddOns = safeAddons.filter((a) => a.isRecommended)
  const otherAddOns = safeAddons.filter((a) => !a.isRecommended)

  // FIX #2: Safe title — meal might be null when promotion exists
  const sheetTitle = meal?.titleAr || promotion?.titleAr || 'تفاصيل الطبق'

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent
        side="left"
        className="w-full sm:max-w-lg border-[#D4AF37]/20 bg-background text-foreground p-0 overflow-y-auto"
      >
        <SheetHeader className="sr-only">
          {/* FIX #2: use safe sheetTitle instead of meal.titleAr directly */}
          <SheetTitle>{sheetTitle}</SheetTitle>
        </SheetHeader>

        {/* FIX #1: removed the extra/duplicate wrapping div */}
        <div className="relative h-56 md:h-64">
          {(promotion?.bannerImageUrl || meal?.imageUrl) && !bannerError ? (
            <img
              src={(promotion?.bannerImageUrl || meal?.imageUrl) as string}
              alt={displayItem!.titleAr}
              className="w-full h-full object-cover"
              onError={() => setBannerError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
              <ShoppingCart className="h-16 w-16 text-muted-foreground/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

          <button
            onClick={onClose}
            className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors z-10"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-black/60 px-3 py-1.5 text-white text-xs hover:bg-black/80 transition-colors z-10"
          >
            <ChevronLeft className="h-3 w-3" /> رجوع
          </button>

          <div className="absolute bottom-4 right-4 left-4" dir="rtl">
            {promotion && (
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-red-500 text-white text-xs">عرض خاص</Badge>
                {promotion.discount > 0 && (
                  <Badge className="bg-green-500 text-white text-xs">خصم {promotion.discount}%</Badge>
                )}
              </div>
            )}
            <h2 className="text-2xl md:text-3xl font-bold text-[#D4AF37] drop-shadow-lg">{displayItem!.titleAr}</h2>
            <p className="text-foreground/70 text-sm mt-1">{displayItem!.title}</p>
          </div>
        </div>

        <div className="p-5 space-y-5" dir="rtl">
          {/* Meal Info */}
          <div>
            <p className="text-foreground/80 text-sm leading-relaxed">{displayItem!.descriptionAr || displayItem!.description}</p>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {/* FIX #2: safe access — meal might be null */}
                <span className="text-sm text-muted-foreground">{!promotion && meal?.prepTime}</span>
              </div>
              <div className="flex items-baseline gap-1">
                {promotion && promotion.oldPrice > promotion.price && (
                  <span className="text-sm text-muted-foreground line-through ml-2">{promotion.oldPrice.toFixed(2)}</span>
                )}
                <span className="text-2xl font-bold text-[#D4AF37]">{effectivePrice.toFixed(2)}</span>
                <span className="text-sm text-[#D4AF37]/80">جنيه</span>
              </div>
            </div>
          </div>

          <Separator className="bg-[#D4AF37]/10" />

          {fetchingAddons ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#D4AF37]" />
            </div>
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
                  <p className="text-xs text-muted-foreground">إضافات مختارة خصيصاً لتكمل متعتك</p>
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
                              : 'bg-foreground/5 border-2 border-transparent hover:border-[#D4AF37]/20 hover:bg-foreground/[0.08]'
                          }`}
                        >
                          {addon.imageUrl ? (
                            <img src={addon.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden') }} />
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
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="flex h-5 w-5 items-center justify-center rounded-full bg-[#D4AF37]"
                              >
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
                    <h3 className="text-base font-bold text-foreground/90">إضافات أخرى</h3>
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
                            selected
                              ? 'bg-[#D4AF37]/10 border-2 border-[#D4AF37]/30'
                              : 'bg-foreground/[0.03] border-2 border-transparent hover:border-foreground/10'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{addon.titleAr || addon.title}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs font-medium text-[#D4AF37]">+{addon.price.toFixed(2)}</span>
                            <div className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${selected ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-foreground/20'}`}>
                              {selected && <Check className="h-3 w-3 text-black" />}
                            </div>
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              )}

              {safeAddons.length === 0 && (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">لا توجد إضافات لهذا الطبق</p>
                </div>
              )}
            </>
          )}

          {/* FIX #3: UtensilsCrossed is now imported — مكونات العرض */}
          {promotion && promotion.mealItems && promotion.mealItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5 text-[#D4AF37]" />
                <h3 className="text-lg font-bold text-[#D4AF37]">مكونات العرض</h3>
                <Badge variant="outline" className="border-[#D4AF37]/30 text-[#D4AF37] text-[10px]">
                  {promotion.mealItems.length} صنف
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">العرض يشمل الأصناف التالية</p>
              <div className="space-y-2">
                {promotion.mealItems.map((mi) => (
                  <div key={mi.id} className="flex items-center gap-3 rounded-xl bg-foreground/5 border border-foreground/10 p-3">
                    {mi.meal?.imageUrl ? (
                      <img
                        src={mi.meal.imageUrl}
                        alt={mi.meal.titleAr || mi.meal.title}
                        className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center flex-shrink-0">
                        <UtensilsCrossed className="h-5 w-5 text-[#D4AF37]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{mi.meal?.titleAr || mi.meal?.title || 'صنف'}</p>
                      {mi.meal?.descriptionAr && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{mi.meal.descriptionAr}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator className="bg-[#D4AF37]/10" />

          {/* Quantity & Total */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground/80">الكمية</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 text-foreground hover:bg-foreground/20 transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-lg font-bold min-w-[2rem] text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D4AF37] text-black hover:bg-[#C9A431] transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* FIX #4 & #5: removed duplicate price columns */}
            <div className="space-y-2 bg-foreground/5 rounded-xl p-3">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>سعر الطبق</span>
                <span>{effectivePrice.toFixed(2)} جنيه</span>
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
                  <span>{(effectivePrice + addOnsTotal).toFixed(2)} × {quantity}</span>
                </div>
              )}
              <Separator className="bg-[#D4AF37]/10" />
              <div className="flex justify-between items-center">
                <span className="font-bold text-foreground">الإجمالي</span>
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
