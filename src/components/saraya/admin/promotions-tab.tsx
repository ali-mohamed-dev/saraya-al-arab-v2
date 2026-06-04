'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Megaphone, Trash2, RefreshCw, Loader2, UtensilsCrossed, BadgePercent } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { ImageUpload } from '@/components/saraya/shared/image-upload'
import { DeleteConfirmDialog } from './delete-confirm-dialog'
import type { Promotion, DeleteTarget, Meal } from '@/lib/saraya/types'

interface NewPromoForm {
  bannerImageUrl: string
  title: string
  titleAr: string
  description: string
  descriptionAr: string
  price: string
  oldPrice: string
  discount: string
  mealIds: string[]
  buttonText: string
  buttonTextAr: string
}

const emptyForm: NewPromoForm = {
  bannerImageUrl: '',
  title: '',
  titleAr: '',
  description: '',
  descriptionAr: '',
  price: '',
  oldPrice: '',
  discount: '',
  mealIds: [],
  buttonText: '',
  buttonTextAr: '',
}

export function PromotionsTab() {
  const { toast } = useToast()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [meals, setMeals] = useState<Meal[]>([])
  const [loadingPromos, setLoadingPromos] = useState(true)
  const [newPromo, setNewPromo] = useState<NewPromoForm>(emptyForm)
  const [creatingPromo, setCreatingPromo] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  const fetchPromotions = useCallback(async () => {
    try {
      setLoadingPromos(true)
      const res = await fetch('/api/promotions')
      if (res.ok) setPromotions(await res.json())
    } catch (err) {
      console.error('Failed to fetch promotions:', err)
    } finally {
      setLoadingPromos(false)
    }
  }, [])

  const fetchMeals = useCallback(async () => {
    try {
      const res = await fetch('/api/meals')
      if (res.ok) {
        const data = await res.json()
        setMeals(data.filter((m: Meal) => m.isActive))
      }
    } catch (err) {
      console.error('Failed to fetch meals:', err)
    }
  }, [])

  useEffect(() => { fetchPromotions(); fetchMeals() }, [fetchPromotions, fetchMeals])

  // حساب الخصم تلقائياً عند تغيير oldPrice و price
  const updateDiscount = (oldPrice: string, price: string) => {
    const old = parseFloat(oldPrice)
    const p = parseFloat(price)
    if (old > 0 && p > 0 && p < old) {
      const disc = Math.round(((old - p) / old) * 100)
      return String(disc)
    }
    return '0'
  }

  const handleCreatePromo = async () => {
    if (!newPromo.bannerImageUrl) {
      toast({ title: 'بيانات ناقصة', description: 'يرجى رفع صورة البانر', variant: 'destructive' })
      return
    }
    setCreatingPromo(true)
    try {
      const res = await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newPromo,
          price: parseFloat(newPromo.price) || 0,
          oldPrice: parseFloat(newPromo.oldPrice) || 0,
          discount: parseInt(newPromo.discount) || 0,
          isActive: true,
        }),
      })
      if (res.ok) {
        toast({ title: 'تم الإضافة', description: 'تم إضافة العرض الجديد بنجاح' })
        setNewPromo(emptyForm)
        fetchPromotions()
      } else {
        const data = await res.json()
        toast({ title: 'خطأ', description: data.error || 'فشل في إضافة العرض', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في إضافة العرض', variant: 'destructive' })
    } finally {
      setCreatingPromo(false)
    }
  }

  const handleTogglePromo = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/promotions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (res.ok) {
        toast({ title: 'تم التحديث', description: `تم ${!isActive ? 'تفعيل' : 'إلغاء تفعيل'} العرض` })
        fetchPromotions()
      }
    } catch {
      toast({ title: 'خطأ', variant: 'destructive' })
    }
  }

  const handleDeletePromo = async (id: string) => {
    try {
      const res = await fetch(`/api/promotions/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'تم الحذف', description: 'تم حذف العرض بنجاح' })
        fetchPromotions()
      }
    } catch {
      toast({ title: 'خطأ', variant: 'destructive' })
    }
    setDeleteTarget(null)
  }

  const handleDeleteConfirm = (type: DeleteTarget['type'], id: string) => {
    if (type === 'promotion') handleDeletePromo(id)
  }

  const toggleMealId = (mealId: string) => {
    setNewPromo((prev) => ({
      ...prev,
      mealIds: prev.mealIds.includes(mealId)
        ? prev.mealIds.filter((id) => id !== mealId)
        : [...prev.mealIds, mealId],
    }))
  }

  return (
    <div className="space-y-6">
      {/* Add New Promotion Card */}
      <Card className="border-border/50 bg-card max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-[#D4AF37] flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            إضافة عرض جديد
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ImageUpload
            value={newPromo.bannerImageUrl}
            onChange={(url) => setNewPromo({ ...newPromo, bannerImageUrl: url })}
            label="صورة البانر *"
            aspect="banner"
            placeholder="اضغط لرفع صورة البانر أو التقط من الكاميرا"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">عنوان العرض (عربي) *</Label>
              <Input
                value={newPromo.titleAr}
                onChange={(e) => setNewPromo({ ...newPromo, titleAr: e.target.value })}
                placeholder="مثلاً: عرض العائلة"
                className="bg-muted border-border/50"
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Promotion Title (English)</Label>
              <Input
                value={newPromo.title}
                onChange={(e) => setNewPromo({ ...newPromo, title: e.target.value })}
                placeholder="e.g. Family Offer"
                className="bg-muted border-border/50"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">الوصف (عربي)</Label>
              <Input
                value={newPromo.descriptionAr}
                onChange={(e) => setNewPromo({ ...newPromo, descriptionAr: e.target.value })}
                placeholder="وصف العرض بالعربية"
                className="bg-muted border-border/50"
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Description (English)</Label>
              <Input
                value={newPromo.description}
                onChange={(e) => setNewPromo({ ...newPromo, description: e.target.value })}
                placeholder="Offer description"
                className="bg-muted border-border/50"
                dir="ltr"
              />
            </div>
          </div>

          {/* السعر */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <BadgePercent className="h-4 w-4 text-red-400" />
                السعر الأصلي (قبل الخصم)
              </Label>
              <Input
                type="number"
                value={newPromo.oldPrice}
                onChange={(e) => {
                  const oldPrice = e.target.value
                  const discount = updateDiscount(oldPrice, newPromo.price)
                  setNewPromo({ ...newPromo, oldPrice, discount })
                }}
                placeholder="0"
                className="bg-muted border-border/50"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5 text-green-400">
                {newPromo.discount && parseInt(newPromo.discount) > 0
                  ? <span>بعد الخصم <span className="bg-green-500/20 px-1.5 py-0.5 rounded text-xs">-{newPromo.discount}%</span></span>
                  : 'السعر بعد الخصم'}
              </Label>
              <Input
                type="number"
                value={newPromo.price}
                onChange={(e) => {
                  const price = e.target.value
                  const discount = updateDiscount(newPromo.oldPrice, price)
                  setNewPromo({ ...newPromo, price, discount })
                }}
                placeholder="0"
                className="bg-muted border-border/50"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">نسبة الخصم (%)</Label>
              <Input
                type="number"
                value={newPromo.discount}
                onChange={(e) => setNewPromo({ ...newPromo, discount: e.target.value })}
                placeholder="0"
                className="bg-muted border-border/50"
                dir="ltr"
              />
            </div>
          </div>

          {/* اختيار الوجبات المرتبطة */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <UtensilsCrossed className="h-4 w-4 text-[#D4AF37]" />
              الوجبات المشمولة في العرض (اختياري)
            </Label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-3 rounded-lg border border-border/50 bg-muted/30">
              {meals.length === 0 ? (
                <span className="text-xs text-muted-foreground">لا توجد وجبات متاحة</span>
              ) : (
                meals.map((meal) => (
                  <button
                    key={meal.id}
                    type="button"
                    onClick={() => toggleMealId(meal.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      newPromo.mealIds.includes(meal.id)
                        ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]'
                        : 'bg-muted border-border/50 text-muted-foreground hover:border-[#D4AF37]/30'
                    }`}
                  >
                    {meal.titleAr || meal.title}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* نص الزر */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">نص الزر (عربي)</Label>
              <Input
                value={newPromo.buttonTextAr}
                onChange={(e) => setNewPromo({ ...newPromo, buttonTextAr: e.target.value })}
                placeholder="اطلب الآن"
                className="bg-muted border-border/50"
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Button Text (English)</Label>
              <Input
                value={newPromo.buttonText}
                onChange={(e) => setNewPromo({ ...newPromo, buttonText: e.target.value })}
                placeholder="Order Now"
                className="bg-muted border-border/50"
                dir="ltr"
              />
            </div>
          </div>

          <Button
            onClick={handleCreatePromo}
            disabled={creatingPromo || !newPromo.bannerImageUrl}
            className="w-full gap-2 bg-[#D4AF37] text-black hover:bg-[#C9A431] py-6 text-base font-bold disabled:opacity-50"
          >
            {creatingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            إضافة العرض
          </Button>
        </CardContent>
      </Card>

      {/* Existing Promotions */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-[#D4AF37] flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            العروض الحالية ({promotions.length})
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPromotions}
            className="gap-2 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
          >
            <RefreshCw className="h-3.5 w-3.5" /> تحديث
          </Button>
        </CardHeader>
        <CardContent>
          {loadingPromos ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
            </div>
          ) : promotions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Megaphone className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p>لا توجد عروض حالياً</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {promotions.map((promo) => (
                  <motion.div
                    key={promo.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <Card className={`overflow-hidden border ${promo.isActive ? 'border-[#D4AF37]/30' : 'border-border/30 opacity-60'}`}>
                      <div className="relative aspect-[2.5/1]">
                        <img src={promo.bannerImageUrl} alt={promo.titleAr} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <div className="absolute bottom-2 right-3 left-3">
                          <p className="text-sm font-bold text-[#D4AF37] truncate">{promo.titleAr}</p>
                          {promo.title && <p className="text-xs text-white/60 truncate">{promo.title}</p>}
                        </div>
                        {/* شارة الخصم */}
                        {promo.discount > 0 && (
                          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                            -{promo.discount}%
                          </div>
                        )}
                      </div>
                      {/* تفاصيل السعر */}
                      <div className="px-3 pt-2 pb-1 bg-muted/30">
                        <div className="flex items-center gap-2">
                          {promo.oldPrice > 0 && (
                            <span className="text-xs text-muted-foreground line-through">
                              {promo.oldPrice.toFixed(2)} ج.م
                            </span>
                          )}
                          <span className="text-sm font-bold text-green-400">
                            {promo.price.toFixed(2)} ج.م
                          </span>
                        </div>
                        {/* الوجبات المرتبطة */}
                        {promo.mealItems && promo.mealItems.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {promo.mealItems.map((mi) => (
                              <span key={mi.id} className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37]/80">
                                {mi.meal?.titleAr || mi.meal?.title}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/30">
                        <div className="flex items-center gap-2">
                          <Switch checked={promo.isActive} onCheckedChange={() => handleTogglePromo(promo.id, promo.isActive)} />
                          <span className={`text-xs ${promo.isActive ? 'text-green-400' : 'text-muted-foreground'}`}>
                            {promo.isActive ? 'نشط' : 'متوقف'}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteTarget({ type: 'promotion', id: promo.id, name: promo.titleAr || promo.title })}
                          className="gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10 h-7 px-2"
                        >
                          <Trash2 className="h-3 w-3" /> حذف
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        deleteTarget={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}