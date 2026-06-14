'use client'

import { useState, useEffect } from 'react'
import { Edit3, Check, Loader2, Tag, ChefHat, Image, X, CircleDollarSign } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ImageUpload } from '@/components/Top/shared/image-upload'
import { PREP_AREAS } from '@/lib/saraya/constants'
import type { Meal, PreparationArea } from '@/lib/saraya/types'

interface EditMealDialogProps {
  meal: Meal | null
  onClose: () => void
  categories: { id: string; name: string }[]
  onSave: (data: { price?: number; imageUrl: string; preparationArea: PreparationArea; category?: string }) => Promise<void>
}

export function EditMealDialog({ meal, onClose, onSave, categories }: EditMealDialogProps) {
  const [editPrice, setEditPrice] = useState('')
  const [editImageUrl, setEditImageUrl] = useState('')
  const [editPrepArea, setEditPrepArea] = useState<PreparationArea>('KITCHEN')
  const [editCategory, setEditCategory] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (meal) {
      setEditPrice(meal.price.toString())
      setEditImageUrl(meal.imageUrl)
      setEditPrepArea(meal.preparationArea || 'KITCHEN')
      setEditCategory(meal.category || '')
    }
  }, [meal])

  const handleSave = async () => {
    setSaving(true)
    try {
      const data: { price?: number; imageUrl: string; preparationArea: PreparationArea; category?: string } = {
        imageUrl: editImageUrl,
        preparationArea: editPrepArea,
      }
      if (editPrice !== '') {
        data.price = parseFloat(editPrice)
      }
      if (editCategory) {
        data.category = editCategory
      }
      await onSave(data)
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = meal && (
    editPrice !== meal.price.toString() ||
    editImageUrl !== meal.imageUrl ||
    editPrepArea !== (meal.preparationArea || 'KITCHEN') ||
    editCategory !== (meal.category || '')
  )

  return (
    <Dialog open={!!meal} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="bg-card border-border/50 max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="border-b border-border/20 pb-4 mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border border-[#D4AF37]/10 flex items-center justify-center shrink-0">
                <Edit3 className="h-5 w-5 text-[#D4AF37]" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg">تعديل الطبق</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm truncate">
                  {meal?.titleAr || meal?.title}
                </DialogDescription>
              </div>
            </div>
            <button onClick={onClose} className="h-8 w-8 rounded-lg border border-border/30 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all flex items-center justify-center shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        {meal && (
          <div className="space-y-5 py-2">
            {/* Image */}
            <div className="rounded-xl border border-border/30 bg-muted/20 overflow-hidden">
              <div className="relative aspect-video bg-muted">
                {editImageUrl ? (
                  <img src={editImageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center gap-2">
                    <Image className="h-8 w-8 text-muted-foreground/30" />
                    <span className="text-[10px] text-muted-foreground/40">لا توجد صورة</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                  <ImageUpload
                    value={editImageUrl}
                    onChange={(url) => setEditImageUrl(url)}
                    label=""
                    aspect="wide"
                    placeholder="تغيير الصورة"
                  />
                </div>
              </div>
              {/* <div className="p-3 border-t border-border/20">
                <div className="flex items-center gap-2">
                  <ImageUpload
                    value={editImageUrl}
                    onChange={(url) => setEditImageUrl(url)}
                    label=""
                    aspect="wide"
                    placeholder="اختيار صورة"
                  />
                </div>
              </div> */}
            </div>

            {/* Price */}
            <div className="rounded-xl border border-border/30 bg-muted/20 p-4">
              <label className="block text-xs font-bold text-muted-foreground mb-2.5 flex items-center gap-1.5">
                <CircleDollarSign className="h-3.5 w-3.5 text-[#D4AF37]" />
                السعر
              </label>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/50">ج.م</span>
                <Input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="bg-background border-border/40 h-10 text-sm text-left pl-4 pr-12 rounded-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  step="0.01"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Category */}
            <div className="rounded-xl border border-border/30 bg-muted/20 p-4">
              <label className="block text-xs font-bold text-muted-foreground mb-2.5 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-[#D4AF37]" />
                التصنيف
              </label>
              {categories.length === 0 ? (
                <p className="text-xs text-muted-foreground/50">لا توجد تصنيفات</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setEditCategory(cat.name)}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all text-center ${
                        editCategory === cat.name
                          ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.15)]'
                          : 'border-border/40 bg-background/50 text-muted-foreground hover:border-[#D4AF37]/30 hover:text-foreground'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Preparation Area */}
            <div className="rounded-xl border border-border/30 bg-muted/20 p-4">
              <label className="block text-xs font-bold text-muted-foreground mb-2.5 flex items-center gap-1.5">
                <ChefHat className="h-3.5 w-3.5 text-[#D4AF37]" />
                جهة التحضير
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {PREP_AREAS.map((area) => {
                  const isSelected = editPrepArea === area.value
                  return (
                    <button
                      key={area.value}
                      onClick={() => setEditPrepArea(area.value as PreparationArea)}
                      className={`rounded-lg border px-3 py-2.5 text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                        isSelected
                          ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.15)]'
                          : 'border-border/40 bg-background/50 text-muted-foreground hover:border-[#D4AF37]/30 hover:text-foreground'
                      }`}
                    >
                      <span className={area.color}>{area.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-4 border-t border-border/20 mt-2">
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges || editPrice === ''}
            className="flex-1 gap-2 bg-[#D4AF37] text-black hover:bg-[#C9A431] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl h-11 text-sm"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            حفظ التعديلات
          </Button>
          <Button variant="outline" onClick={onClose} className="border-border/40 rounded-xl h-11 px-6 text-sm">
            إلغاء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
